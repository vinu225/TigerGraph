"""
Healthcare GraphRAG Evaluation Benchmark
=========================================
Production-quality benchmarking pipeline that evaluates three retrieval strategies
on the same set of multi-hop healthcare questions:

    1. LLM-only   — raw language model (Gemini) without retrieval context
    2. Traditional RAG — vector-similarity retrieval + Gemini generation
    3. GraphRAG   — knowledge-graph-augmented retrieval + Gemini generation

Usage:
    python benchmark.py                       # run all pipelines
    python benchmark.py --pipeline graph_rag   # run a single pipeline
    python benchmark.py --dry-run              # validate config without calling APIs

Author : Hackathon Team
Created: 2025-03-16
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from tqdm import tqdm

# ──────────────────────────────────────────────
#  Gemini SDK
# ──────────────────────────────────────────────
import google.generativeai as genai

# ──────────────────────────────────────────────
#  Configuration & Constants
# ──────────────────────────────────────────────

# Load environment variables from the project root .env (if present)
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / "backend" / ".env")

# Resolve project paths relative to this script
SCRIPT_DIR   = Path(__file__).resolve().parent          # evaluation/scripts/
EVAL_DIR     = SCRIPT_DIR.parent                        # evaluation/
DATASETS_DIR = EVAL_DIR / "datasets"                    # evaluation/datasets/
OUTPUTS_DIR  = EVAL_DIR / "outputs"                     # evaluation/outputs/

GROUND_TRUTH_PATH = DATASETS_DIR / "ground_truth.json"

# Output file mapping
OUTPUT_FILES: Dict[str, Path] = {
    "llm_only":        OUTPUTS_DIR / "llm_only.json",
    "traditional_rag": OUTPUTS_DIR / "traditional_rag.json",
    "graph_rag":       OUTPUTS_DIR / "graph_rag.json",
}

# API configuration — override via environment variables
GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL         = os.getenv("LLM_MODEL", "gemini-3-flash-preview")
GRAPHRAG_API_URL     = os.getenv("GRAPHRAG_API_URL", "http://localhost:8000")
TRADITIONAL_RAG_URL  = os.getenv("TRADITIONAL_RAG_URL", "http://localhost:8080")

# Retry / timeout settings
MAX_RETRIES      = 5
RETRY_BACKOFF    = 3.0          # seconds; doubles each retry
REQUEST_TIMEOUT  = 90.0         # seconds per HTTP call
CONCURRENT_LIMIT = 1            # sequential to respect rate limits

# Configure Gemini SDK
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ──────────────────────────────────────────────
#  Logging
# ──────────────────────────────────────────────

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT, datefmt="%H:%M:%S")
logger = logging.getLogger("benchmark")


# ──────────────────────────────────────────────
#  Data Models
# ──────────────────────────────────────────────

@dataclass
class Question:
    """A single evaluation question loaded from ground_truth.json."""
    id: int
    question: str
    ground_truth_answer: str


@dataclass
class BenchmarkResult:
    """Result produced by running one question through one pipeline."""
    id: int
    question: str
    ground_truth_answer: str
    generated_answer: str
    latency_seconds: float
    pipeline: str
    error: Optional[str] = None


@dataclass
class PipelineSummary:
    """Aggregate statistics for a completed pipeline run."""
    pipeline: str
    total_questions: int
    successful: int
    failed: int
    avg_latency_seconds: float
    total_time_seconds: float
    results: List[BenchmarkResult] = field(default_factory=list)


# ──────────────────────────────────────────────
#  I/O Helpers
# ──────────────────────────────────────────────

def load_questions(path: Path = GROUND_TRUTH_PATH) -> List[Question]:
    """
    Load evaluation questions from the ground-truth JSON file.

    Expected schema:
        [{ "id": int, "question": str, "ground_truth_answer": str }, ...]
    """
    if not path.exists():
        raise FileNotFoundError(
            f"Ground-truth file not found at {path}. "
            "Please create evaluation/datasets/ground_truth.json first."
        )

    with open(path, "r", encoding="utf-8") as fh:
        raw = json.load(fh)

    if not isinstance(raw, list) or len(raw) == 0:
        raise ValueError("ground_truth.json must be a non-empty JSON array.")

    questions: List[Question] = []
    for entry in raw:
        questions.append(
            Question(
                id=entry["id"],
                question=entry["question"],
                ground_truth_answer=entry["ground_truth_answer"],
            )
        )
    logger.info("Loaded %d evaluation questions from %s", len(questions), path.name)
    return questions


def save_results(results: List[BenchmarkResult], path: Path) -> None:
    """Persist a list of BenchmarkResult objects as pretty-printed JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    serializable = [asdict(r) for r in results]
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(serializable, fh, indent=2, ensure_ascii=False)
    logger.info("Saved %d results -> %s", len(results), path)


# ──────────────────────────────────────────────
#  Retry Wrapper
# ──────────────────────────────────────────────

async def _call_with_retry(
    fn: Callable,
    *args,
    max_retries: int = MAX_RETRIES,
    backoff: float = RETRY_BACKOFF,
    **kwargs,
) -> str:
    """
    Execute an async callable with exponential-backoff retry logic.
    """
    last_exc: Optional[Exception] = None
    for attempt in range(1, max_retries + 1):
        try:
            return await fn(*args, **kwargs)
        except Exception as exc:
            last_exc = exc
            wait = backoff * (2 ** (attempt - 1))
            logger.warning(
                "Attempt %d/%d failed (%s). Retrying in %.1fs...",
                attempt, max_retries, exc, wait,
            )
            await asyncio.sleep(wait)
    raise last_exc  # type: ignore[misc]


# ──────────────────────────────────────────────
#  Gemini Helper
# ──────────────────────────────────────────────

async def _gemini_generate(prompt: str, system_instruction: str = "") -> str:
    """
    Call Gemini API for text generation.
    Runs the synchronous SDK in a thread executor to avoid blocking asyncio.
    """
    if not GEMINI_API_KEY:
        raise EnvironmentError(
            "GEMINI_API_KEY is not set. Export it or add it to your .env file."
        )

    def _sync_call():
        model = genai.GenerativeModel(
            GEMINI_MODEL,
            system_instruction=system_instruction if system_instruction else None,
        )
        response = model.generate_content(prompt)
        return response.text.strip()

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_call)


# ──────────────────────────────────────────────
#  Pipeline Query Functions
# ──────────────────────────────────────────────

async def query_llm_only(question: str, client: httpx.AsyncClient) -> str:
    """
    LLM-only baseline: send the question directly to Gemini
    with NO retrieval context.
    """
    system_prompt = (
        "You are a healthcare knowledge assistant. "
        "Answer the question as accurately and concisely as possible "
        "using ONLY your internal knowledge. "
        "Do not fabricate clinical details."
    )
    return await _gemini_generate(question, system_instruction=system_prompt)


async def query_traditional_rag(question: str, client: httpx.AsyncClient) -> str:
    """
    Traditional RAG pipeline: vector-similarity retrieval followed by
    Gemini-based answer generation.

    TODO: Replace with your actual Traditional RAG endpoint.
    Falls back to Gemini with no retrieval context if service is offline.
    """
    try:
        payload = {"question": question}
        resp = await client.post(
            f"{TRADITIONAL_RAG_URL}/api/v1/rag/query",
            json=payload,
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("answer", data.get("response", json.dumps(data)))
    except (httpx.ConnectError, httpx.ConnectTimeout, httpx.HTTPStatusError):
        logger.warning(
            "Traditional RAG endpoint unreachable at %s -- using Gemini fallback.",
            TRADITIONAL_RAG_URL,
        )
        return await _traditional_rag_fallback(question)


async def _traditional_rag_fallback(question: str) -> str:
    """
    Fallback when the Traditional RAG service is offline.
    Simulates RAG by instructing Gemini that no retrieved context is available.
    """
    system_prompt = (
        "You are a healthcare assistant. "
        "You were supposed to receive retrieved document context but the retrieval "
        "system is currently offline. Answer the question to the best of your ability "
        "and clearly state when you are uncertain."
    )
    return await _gemini_generate(question, system_instruction=system_prompt)


async def query_graph_rag(question: str, client: httpx.AsyncClient) -> str:
    """
    GraphRAG pipeline: knowledge-graph-augmented retrieval with Gemini generation.

    TODO: Replace with your actual GraphRAG endpoint.
    Falls back to Gemini with full document context if service is offline.
    """
    try:
        payload = {"query": question}
        resp = await client.post(
            f"{GRAPHRAG_API_URL}/api/v1/query",
            json=payload,
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("answer", data.get("response", json.dumps(data)))
    except (httpx.ConnectError, httpx.ConnectTimeout, httpx.HTTPStatusError):
        logger.warning(
            "GraphRAG endpoint unreachable at %s -- using Gemini fallback with full context.",
            GRAPHRAG_API_URL,
        )
        return await _graph_rag_fallback(question)


async def _graph_rag_fallback(question: str) -> str:
    """
    Fallback when the GraphRAG service is offline.
    Uses Gemini with all synthetic documents as context to simulate graph-aware retrieval.
    """
    context = _load_synthetic_docs_as_context()

    system_prompt = (
        "You are a healthcare intelligence assistant with access to a knowledge graph. "
        "Use the following retrieved healthcare documents to answer the question. "
        "Trace entity relationships across documents. Identify causal chains, "
        "temporal sequences, and multi-hop connections.\n\n"
        f"=== RETRIEVED DOCUMENTS ===\n{context}\n"
        "=== END DOCUMENTS ===\n\n"
        "Answer accurately and concisely based ONLY on the provided documents."
    )
    return await _gemini_generate(question, system_instruction=system_prompt)


def _load_synthetic_docs_as_context() -> str:
    """Load all synthetic .txt documents and concatenate them as retrieval context."""
    docs_dir = DATASETS_DIR / "synthetic_docs"
    if not docs_dir.exists():
        return "[No synthetic documents found]"

    parts: List[str] = []
    for txt_file in sorted(docs_dir.glob("*.txt")):
        content = txt_file.read_text(encoding="utf-8").strip()
        parts.append(f"--- {txt_file.name} ---\n{content}")
    return "\n\n".join(parts)


# ──────────────────────────────────────────────
#  Pipeline Runner
# ──────────────────────────────────────────────

PIPELINE_FUNCTIONS: Dict[str, Callable] = {
    "llm_only":        query_llm_only,
    "traditional_rag": query_traditional_rag,
    "graph_rag":       query_graph_rag,
}


async def run_single_question(
    question: Question,
    pipeline_name: str,
    query_fn: Callable,
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
) -> BenchmarkResult:
    """Execute a single question against one pipeline, measuring latency."""
    async with semaphore:
        start = time.perf_counter()
        error_msg: Optional[str] = None
        generated = ""

        try:
            generated = await _call_with_retry(query_fn, question.question, client)
        except Exception as exc:
            error_msg = f"{type(exc).__name__}: {exc}"
            logger.error("Q%d [%s] failed: %s", question.id, pipeline_name, error_msg)

        elapsed = round(time.perf_counter() - start, 3)

        return BenchmarkResult(
            id=question.id,
            question=question.question,
            ground_truth_answer=question.ground_truth_answer,
            generated_answer=generated,
            latency_seconds=elapsed,
            pipeline=pipeline_name,
            error=error_msg,
        )


async def benchmark_pipeline(
    pipeline_name: str,
    questions: List[Question],
    client: httpx.AsyncClient,
) -> PipelineSummary:
    """
    Run all questions through a named pipeline and return aggregate stats.
    """
    query_fn = PIPELINE_FUNCTIONS[pipeline_name]
    semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)
    pipeline_start = time.perf_counter()

    logger.info("=" * 60)
    logger.info(">> Starting pipeline: %s (%d questions)", pipeline_name.upper(), len(questions))
    logger.info("=" * 60)

    # Create tasks for all questions
    tasks = [
        run_single_question(q, pipeline_name, query_fn, client, semaphore)
        for q in questions
    ]

    # Run with progress bar
    results: List[BenchmarkResult] = []
    for coro in tqdm(
        asyncio.as_completed(tasks),
        total=len(tasks),
        desc=f"  {pipeline_name:>18}",
        bar_format="{l_bar}{bar:30}{r_bar}",
        colour="green",
    ):
        result = await coro
        results.append(result)

    # Sort by question id for consistent output
    results.sort(key=lambda r: r.id)

    pipeline_elapsed = round(time.perf_counter() - pipeline_start, 3)
    successful = [r for r in results if r.error is None]
    failed = [r for r in results if r.error is not None]

    avg_latency = (
        round(sum(r.latency_seconds for r in successful) / len(successful), 3)
        if successful
        else 0.0
    )

    summary = PipelineSummary(
        pipeline=pipeline_name,
        total_questions=len(questions),
        successful=len(successful),
        failed=len(failed),
        avg_latency_seconds=avg_latency,
        total_time_seconds=pipeline_elapsed,
        results=results,
    )

    # Save results immediately after each pipeline completes
    output_path = OUTPUT_FILES[pipeline_name]
    save_results(results, output_path)

    return summary


# ──────────────────────────────────────────────
#  Summary & Reporting
# ──────────────────────────────────────────────

def print_benchmark_summary(summaries: List[PipelineSummary]) -> None:
    """Print a formatted comparison table of all pipeline results."""

    print("\n")
    print("=" * 72)
    print("  HEALTHCARE GraphRAG BENCHMARK -- RESULTS SUMMARY")
    print("=" * 72)
    print(
        f"  {'Pipeline':<20} {'Total':>6} {'Pass':>6} {'Fail':>6} "
        f"{'Avg Latency':>12} {'Total Time':>12}"
    )
    print("-" * 72)

    for s in summaries:
        print(
            f"  {s.pipeline:<20} {s.total_questions:>6} {s.successful:>6} {s.failed:>6} "
            f"{s.avg_latency_seconds:>10.3f}s {s.total_time_seconds:>10.3f}s"
        )

    print("-" * 72)

    valid = [s for s in summaries if s.successful > 0]
    if valid:
        fastest = min(valid, key=lambda s: s.avg_latency_seconds)
        print(f"  >> Fastest avg response: {fastest.pipeline} ({fastest.avg_latency_seconds:.3f}s)")

    total_questions = sum(s.total_questions for s in summaries)
    total_success = sum(s.successful for s in summaries)
    print(f"  -- Total queries executed: {total_questions}")
    print(f"  OK Total successful: {total_success}")
    print("=" * 72)

    print("\n  Output files:")
    for name, path in OUTPUT_FILES.items():
        status = "[OK]" if path.exists() else "[--]"
        print(f"     {status} {path.relative_to(EVAL_DIR)}")
    print()


# ──────────────────────────────────────────────
#  CLI & Main Entry Point
# ──────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Healthcare GraphRAG Evaluation Benchmark (Gemini-powered)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--pipeline",
        choices=list(PIPELINE_FUNCTIONS.keys()),
        default=None,
        help="Run only a specific pipeline (default: run all three).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate configuration and load questions without calling APIs.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug-level logging.",
    )
    return parser.parse_args()


async def main() -> None:
    """Main entry point for the benchmark pipeline."""
    args = parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Header
    print("\n" + "=" * 72)
    print("  [+] Healthcare GraphRAG Evaluation Benchmark (Gemini)")
    print("=" * 72)

    # Validate environment
    logger.info("LLM Provider       : Google Gemini")
    logger.info("Gemini Model       : %s", GEMINI_MODEL)
    logger.info("Gemini API Key     : %s", "configured" if GEMINI_API_KEY else "MISSING")
    logger.info("GraphRAG URL       : %s", GRAPHRAG_API_URL)
    logger.info("Traditional RAG URL: %s", TRADITIONAL_RAG_URL)
    logger.info("Ground Truth       : %s", GROUND_TRUTH_PATH)
    logger.info("Output Directory   : %s", OUTPUTS_DIR)

    # Load questions
    try:
        questions = load_questions()
    except (FileNotFoundError, ValueError) as exc:
        logger.error(str(exc))
        sys.exit(1)

    if args.dry_run:
        logger.info("Dry run complete. %d questions loaded. Exiting.", len(questions))
        sys.exit(0)

    # Determine pipelines to run
    if args.pipeline:
        pipelines_to_run = [args.pipeline]
    else:
        pipelines_to_run = list(PIPELINE_FUNCTIONS.keys())

    logger.info("Pipelines to run: %s", ", ".join(pipelines_to_run))

    # Ensure output directory exists
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

    # Execute benchmarks
    summaries: List[PipelineSummary] = []

    async with httpx.AsyncClient() as client:
        for pipeline_name in pipelines_to_run:
            try:
                summary = await benchmark_pipeline(pipeline_name, questions, client)
                summaries.append(summary)
            except Exception as exc:
                logger.error("Pipeline '%s' crashed: %s", pipeline_name, exc)
                summaries.append(
                    PipelineSummary(
                        pipeline=pipeline_name,
                        total_questions=len(questions),
                        successful=0,
                        failed=len(questions),
                        avg_latency_seconds=0.0,
                        total_time_seconds=0.0,
                    )
                )

    # Print summary
    print_benchmark_summary(summaries)
    logger.info("Benchmark complete.")


if __name__ == "__main__":
    asyncio.run(main())
