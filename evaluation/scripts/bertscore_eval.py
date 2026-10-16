"""
BERTScore Semantic Similarity Evaluation (Corrected)
======================================================
Computes BERTScore (Precision, Recall, F1) for each pipeline's generated
answers against ground-truth references.

Key corrections from v1:
    - Removed rescale_with_baseline=True (caused negative scores)
    - Using microsoft/deberta-xlarge-mnli for stable scores
    - Raw scores in valid 0-1 range
    - Proper null/empty answer handling

Usage:
    python bertscore_eval.py
    python bertscore_eval.py --model microsoft/deberta-xlarge-mnli
    python bertscore_eval.py --verbose
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from tqdm import tqdm

# ──────────────────────────────────────────────
#  Path Configuration
# ──────────────────────────────────────────────

SCRIPT_DIR   = Path(__file__).resolve().parent
EVAL_DIR     = SCRIPT_DIR.parent
DATASETS_DIR = EVAL_DIR / "datasets"
OUTPUTS_DIR  = EVAL_DIR / "outputs"

GROUND_TRUTH_PATH = DATASETS_DIR / "ground_truth.json"
RESULTS_OUTPUT    = OUTPUTS_DIR / "bertscore_results.json"

PIPELINE_NAMES = ["llm_only", "traditional_rag", "graph_rag"]

# microsoft/deberta-xlarge-mnli provides stable, high-quality scores
DEFAULT_MODEL = "microsoft/deberta-xlarge-mnli"
FALLBACK_MODEL = "roberta-large"

# ──────────────────────────────────────────────
#  Logging
# ──────────────────────────────────────────────

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT, datefmt="%H:%M:%S")
logger = logging.getLogger("bertscore_eval")


# ──────────────────────────────────────────────
#  Data Models
# ──────────────────────────────────────────────

@dataclass
class QuestionScore:
    """BERTScore metrics for a single question."""
    id: int
    question: str
    precision: float
    recall: float
    f1: float


@dataclass
class PipelineScores:
    """Aggregate BERTScore metrics for one pipeline."""
    pipeline: str
    average_precision: float
    average_recall: float
    average_f1: float
    num_questions: int
    compute_time_seconds: float
    per_question_scores: List[Dict] = field(default_factory=list)


# ──────────────────────────────────────────────
#  I/O Helper Functions
# ──────────────────────────────────────────────

def load_ground_truth(path: Path = GROUND_TRUTH_PATH) -> Dict[int, Dict]:
    """
    Load the ground-truth QA dataset keyed by question ID.

    Returns:
        { id: { "question": str, "ground_truth_answer": str } }
    """
    if not path.exists():
        raise FileNotFoundError(f"Ground-truth file not found: {path}")

    with open(path, "r", encoding="utf-8") as fh:
        raw = json.load(fh)

    gt_map: Dict[int, Dict] = {}
    for entry in raw:
        gt_map[entry["id"]] = {
            "question": entry["question"],
            "ground_truth_answer": entry["ground_truth_answer"],
        }

    logger.info("Loaded %d ground-truth questions from %s", len(gt_map), path.name)
    return gt_map


def load_pipeline_results(pipeline_name: str) -> Optional[List[Dict]]:
    """Load a pipeline's output JSON file."""
    output_file = OUTPUTS_DIR / f"{pipeline_name}.json"
    if not output_file.exists():
        logger.warning("Output file not found for '%s': %s", pipeline_name, output_file)
        return None

    with open(output_file, "r", encoding="utf-8") as fh:
        results = json.load(fh)

    logger.info("Loaded %d results from %s", len(results), output_file.name)
    return results


def save_results(data: Dict, path: Path = RESULTS_OUTPUT) -> None:
    """Save the final BERTScore results to JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
    logger.info("Saved BERTScore results -> %s", path)


# ──────────────────────────────────────────────
#  BERTScore Computation
# ──────────────────────────────────────────────

def compute_bertscore(
    candidates: List[str],
    references: List[str],
    model_type: str = DEFAULT_MODEL,
) -> Tuple[List[float], List[float], List[float]]:
    """
    Compute BERTScore for candidate-reference pairs.

    IMPORTANT: rescale_with_baseline is set to False to produce
    raw scores in the valid [0, 1] range. The baseline rescaling
    can produce negative values for low-similarity pairs, which
    is misleading for evaluation.

    Args:
        candidates: Generated answers.
        references: Ground-truth answers.
        model_type: Transformer model for scoring.

    Returns:
        (precisions, recalls, f1_scores) — all in [0, 1] range.
    """
    from bert_score import score as bert_score_fn

    logger.info(
        "Computing BERTScore (model=%s, %d pairs, no baseline rescaling)...",
        model_type, len(candidates),
    )

    # Try the requested model, fall back to roberta-large if download fails
    try:
        P, R, F1 = bert_score_fn(
            cands=candidates,
            refs=references,
            model_type=model_type,
            lang="en",
            verbose=False,
            rescale_with_baseline=False,
        )
    except Exception as exc:
        if model_type != FALLBACK_MODEL:
            logger.warning(
                "Model '%s' failed (%s). Falling back to '%s'...",
                model_type, exc, FALLBACK_MODEL,
            )
            P, R, F1 = bert_score_fn(
                cands=candidates,
                refs=references,
                model_type=FALLBACK_MODEL,
                lang="en",
                verbose=False,
                rescale_with_baseline=False,
            )
        else:
            raise

    precisions = [round(p.item(), 6) for p in P]
    recalls    = [round(r.item(), 6) for r in R]
    f1_scores  = [round(f.item(), 6) for f in F1]

    # Sanity check: log any out-of-range values
    for i, (p, r, f) in enumerate(zip(precisions, recalls, f1_scores)):
        if p < 0 or r < 0 or f < 0:
            logger.warning(
                "Negative score detected at index %d: P=%.4f R=%.4f F1=%.4f",
                i, p, r, f,
            )

    return precisions, recalls, f1_scores


def aggregate_scores(
    question_scores: List[QuestionScore],
) -> Tuple[float, float, float]:
    """Compute average P, R, F1 from per-question scores."""
    if not question_scores:
        return 0.0, 0.0, 0.0

    n = len(question_scores)
    avg_p  = round(sum(q.precision for q in question_scores) / n, 6)
    avg_r  = round(sum(q.recall for q in question_scores) / n, 6)
    avg_f1 = round(sum(q.f1 for q in question_scores) / n, 6)

    return avg_p, avg_r, avg_f1


# ──────────────────────────────────────────────
#  Pipeline Evaluation
# ──────────────────────────────────────────────

def evaluate_pipeline(
    pipeline_name: str,
    ground_truth: Dict[int, Dict],
    model_type: str = DEFAULT_MODEL,
) -> Optional[PipelineScores]:
    """
    Evaluate a single pipeline against ground truth using BERTScore.
    """
    results = load_pipeline_results(pipeline_name)
    if results is None:
        return None

    # Align generated answers with ground-truth by question ID
    candidates: List[str] = []
    references: List[str] = []
    question_ids: List[int] = []
    questions: List[str] = []

    for item in results:
        qid = item["id"]
        if qid not in ground_truth:
            logger.warning("Q%d not in ground truth, skipping.", qid)
            continue

        # Handle empty/null generated answers safely
        generated = item.get("generated_answer", "")
        if not generated or not isinstance(generated, str) or generated.strip() == "":
            generated = "No answer was generated."
            logger.warning("Q%d [%s]: empty generated answer, using placeholder.", qid, pipeline_name)

        gt_answer = ground_truth[qid]["ground_truth_answer"]
        if not gt_answer or not isinstance(gt_answer, str) or gt_answer.strip() == "":
            logger.warning("Q%d: empty ground truth answer, skipping.", qid)
            continue

        candidates.append(generated.strip())
        references.append(gt_answer.strip())
        question_ids.append(qid)
        questions.append(ground_truth[qid]["question"])

    if not candidates:
        logger.error("No valid candidate-reference pairs for '%s'.", pipeline_name)
        return None

    logger.info("[%s] %d valid question pairs aligned.", pipeline_name, len(candidates))

    # Print raw predictions vs references for debugging
    for i, qid in enumerate(question_ids):
        logger.debug(
            "Q%d candidate[:80]: %s...", qid, candidates[i][:80]
        )
        logger.debug(
            "Q%d reference[:80]: %s...", qid, references[i][:80]
        )

    # Compute BERTScore
    start_time = time.perf_counter()
    precisions, recalls, f1_scores = compute_bertscore(
        candidates, references, model_type
    )
    compute_time = round(time.perf_counter() - start_time, 3)

    # Build per-question scores and print raw values
    question_score_list: List[QuestionScore] = []
    print(f"\n  Raw BERTScore values for [{pipeline_name}]:")
    print(f"  {'QID':<6} {'Precision':>10} {'Recall':>10} {'F1':>10}")
    print("  " + "-" * 40)

    for i, qid in enumerate(question_ids):
        qs = QuestionScore(
            id=qid,
            question=questions[i],
            precision=precisions[i],
            recall=recalls[i],
            f1=f1_scores[i],
        )
        question_score_list.append(qs)
        print(f"  Q{qid:<5} {precisions[i]:>10.4f} {recalls[i]:>10.4f} {f1_scores[i]:>10.4f}")

    # Aggregate
    avg_p, avg_r, avg_f1 = aggregate_scores(question_score_list)

    print(f"  {'MEAN':<6} {avg_p:>10.4f} {avg_r:>10.4f} {avg_f1:>10.4f}")
    print()

    pipeline_scores = PipelineScores(
        pipeline=pipeline_name,
        average_precision=avg_p,
        average_recall=avg_r,
        average_f1=avg_f1,
        num_questions=len(question_score_list),
        compute_time_seconds=compute_time,
        per_question_scores=[asdict(qs) for qs in question_score_list],
    )

    logger.info(
        "[%s] Avg P=%.4f  R=%.4f  F1=%.4f  (%.1fs)",
        pipeline_name, avg_p, avg_r, avg_f1, compute_time,
    )

    return pipeline_scores


# ──────────────────────────────────────────────
#  Ranking & Leaderboard
# ──────────────────────────────────────────────

def print_leaderboard(all_scores: Dict[str, PipelineScores]) -> None:
    """Print a formatted leaderboard ranked by average F1."""

    ranked = sorted(
        all_scores.values(),
        key=lambda s: s.average_f1,
        reverse=True,
    )

    print("\n")
    print("=" * 76)
    print("  BERTScore EVALUATION LEADERBOARD")
    print("=" * 76)
    print(
        f"  {'Rank':<6} {'Pipeline':<20} {'Avg F1':>10} {'Avg P':>10} "
        f"{'Avg R':>10} {'N':>4} {'Time':>10}"
    )
    print("-" * 76)

    for rank, ps in enumerate(ranked, 1):
        marker = " << BEST" if rank == 1 else ""
        print(
            f"  {rank:<6} {ps.pipeline:<20} {ps.average_f1:>10.4f} "
            f"{ps.average_precision:>10.4f} {ps.average_recall:>10.4f} "
            f"{ps.num_questions:>4} {ps.compute_time_seconds:>8.1f}s{marker}"
        )

    print("-" * 76)

    best = ranked[0]
    print(f"\n  Best pipeline: {best.pipeline} (F1={best.average_f1:.4f})")
    print(f"  Model: {DEFAULT_MODEL}")
    print(f"  Questions evaluated: {best.num_questions}")
    print()

    # Per-question breakdown for best pipeline
    print("  Per-question F1 (best pipeline):")
    print(f"  {'QID':<6} {'F1':>8} {'P':>8} {'R':>8}")
    print("  " + "-" * 34)
    for qs in best.per_question_scores:
        print(f"  Q{qs['id']:<5} {qs['f1']:>8.4f} {qs['precision']:>8.4f} {qs['recall']:>8.4f}")

    print("=" * 76)
    print()


# ──────────────────────────────────────────────
#  CLI & Main
# ──────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="BERTScore Evaluation for Healthcare GraphRAG Benchmark",
    )
    parser.add_argument(
        "--model", type=str, default=DEFAULT_MODEL,
        help=f"Transformer model for scoring (default: {DEFAULT_MODEL}).",
    )
    parser.add_argument(
        "--pipeline", choices=PIPELINE_NAMES, default=None,
        help="Evaluate only a specific pipeline.",
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Enable debug logging (prints raw predictions).",
    )
    return parser.parse_args()


def main() -> None:
    """Main entry point."""
    args = parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    print("\n" + "=" * 76)
    print("  [+] BERTScore Semantic Similarity Evaluation (Corrected)")
    print("=" * 76)

    logger.info("BERTScore model         : %s", args.model)
    logger.info("Baseline rescaling      : DISABLED (raw scores in 0-1 range)")
    logger.info("Ground truth            : %s", GROUND_TRUTH_PATH)
    logger.info("Output directory        : %s", OUTPUTS_DIR)

    # Load ground truth
    try:
        ground_truth = load_ground_truth()
    except FileNotFoundError as exc:
        logger.error(str(exc))
        sys.exit(1)

    # Determine pipelines
    pipelines = [args.pipeline] if args.pipeline else PIPELINE_NAMES
    logger.info("Pipelines to evaluate   : %s", ", ".join(pipelines))

    # Evaluate
    all_scores: Dict[str, PipelineScores] = {}
    total_start = time.perf_counter()

    for pipeline_name in tqdm(
        pipelines,
        desc="  Evaluating",
        bar_format="{l_bar}{bar:30}{r_bar}",
        colour="cyan",
    ):
        try:
            scores = evaluate_pipeline(pipeline_name, ground_truth, args.model)
            if scores:
                all_scores[pipeline_name] = scores
        except Exception as exc:
            logger.error("Failed to evaluate '%s': %s", pipeline_name, exc)
            import traceback
            traceback.print_exc()

    total_time = round(time.perf_counter() - total_start, 3)
    logger.info("Total evaluation time: %.1fs", total_time)

    if not all_scores:
        logger.error("No pipelines were successfully evaluated.")
        sys.exit(1)

    # Build output JSON
    output_data = {}
    for name, ps in all_scores.items():
        output_data[name] = {
            "average_precision": ps.average_precision,
            "average_recall": ps.average_recall,
            "average_f1": ps.average_f1,
            "num_questions": ps.num_questions,
            "compute_time_seconds": ps.compute_time_seconds,
            "per_question_scores": ps.per_question_scores,
        }

    # Save
    save_results(output_data)

    # Leaderboard
    print_leaderboard(all_scores)

    logger.info("BERTScore evaluation complete.")


if __name__ == "__main__":
    main()
