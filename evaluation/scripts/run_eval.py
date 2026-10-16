"""
Evaluation Pipeline Runner
============================
Orchestrates the full evaluation: benchmark -> BERTScore -> LLM Judge -> Report.

Usage:
    python run_eval.py              # run everything
    python run_eval.py --step judge # run only LLM judge
"""

from __future__ import annotations

import argparse
import json
import logging
import subprocess
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("run_eval")

SCRIPT_DIR = Path(__file__).resolve().parent
EVAL_DIR = SCRIPT_DIR.parent
OUTPUTS_DIR = EVAL_DIR / "outputs"


def run_benchmark():
    """Run the benchmark pipeline."""
    logger.info("=" * 50)
    logger.info("STEP 1: Running Benchmark Pipeline")
    logger.info("=" * 50)
    result = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "benchmark.py")],
        cwd=str(EVAL_DIR.parent),
    )
    return result.returncode == 0


def run_bertscore():
    """Run BERTScore evaluation."""
    logger.info("=" * 50)
    logger.info("STEP 2: Running BERTScore Evaluation")
    logger.info("=" * 50)
    bertscore_script = SCRIPT_DIR / "bertscore_eval.py"
    if not bertscore_script.exists():
        logger.warning("bertscore_eval.py not found, skipping.")
        return True
    result = subprocess.run(
        [sys.executable, str(bertscore_script)],
        cwd=str(EVAL_DIR.parent),
    )
    return result.returncode == 0


def run_llm_judge():
    """Run LLM Judge evaluation."""
    logger.info("=" * 50)
    logger.info("STEP 3: Running LLM Judge (Gemini)")
    logger.info("=" * 50)
    result = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "llm_judge.py")],
        cwd=str(EVAL_DIR.parent),
    )
    return result.returncode == 0


def generate_report():
    """Generate a combined evaluation report."""
    logger.info("=" * 50)
    logger.info("STEP 4: Generating Report")
    logger.info("=" * 50)

    report_lines = [
        "# Healthcare GraphRAG Evaluation Report",
        "",
        "## Pipeline Configuration",
        "- LLM Provider: Google Gemini",
        "- Embedding: Google text-embedding-004 (GraphRAG) / all-MiniLM-L6-v2 (Traditional RAG)",
        "",
    ]

    # Load LLM Judge results
    judge_path = OUTPUTS_DIR / "llm_judge_results.json"
    if judge_path.exists():
        with open(judge_path, "r") as f:
            judge_results = json.load(f)

        report_lines.append("## LLM Judge Scores")
        report_lines.append("")
        report_lines.append("| Pipeline | Avg Score | Questions |")
        report_lines.append("|----------|-----------|-----------|")

        for pipeline in ["llm_only", "traditional_rag", "graph_rag"]:
            pr = [r for r in judge_results if r["pipeline"] == pipeline]
            if pr:
                scores = [r["judge_score"] for r in pr]
                avg = sum(scores) / len(scores)
                report_lines.append(f"| {pipeline} | {avg:.2f}/10 | {len(scores)} |")

        report_lines.append("")

    # Load BERTScore results
    bert_path = OUTPUTS_DIR / "bertscore_results.json"
    if bert_path.exists():
        with open(bert_path, "r") as f:
            bert_results = json.load(f)
        report_lines.append("## BERTScore Results")
        report_lines.append("")
        report_lines.append("| Pipeline | Avg F1 |")
        report_lines.append("|----------|--------|")
        for pipeline in ["llm_only", "traditional_rag", "graph_rag"]:
            pr = [r for r in bert_results if r.get("pipeline") == pipeline]
            if pr:
                f1s = [r.get("f1", 0) for r in pr]
                avg_f1 = sum(f1s) / len(f1s) if f1s else 0
                report_lines.append(f"| {pipeline} | {avg_f1:.4f} |")
        report_lines.append("")

    report_path = OUTPUTS_DIR / "benchmark_report.md"
    report_path.write_text("\n".join(report_lines), encoding="utf-8")
    logger.info("Report saved to %s", report_path)


def main():
    parser = argparse.ArgumentParser(description="Run evaluation pipeline")
    parser.add_argument(
        "--step",
        choices=["benchmark", "bertscore", "judge", "report", "all"],
        default="all",
        help="Which step to run (default: all)",
    )
    args = parser.parse_args()

    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

    if args.step == "all":
        run_benchmark()
        run_bertscore()
        run_llm_judge()
        generate_report()
    elif args.step == "benchmark":
        run_benchmark()
    elif args.step == "bertscore":
        run_bertscore()
    elif args.step == "judge":
        run_llm_judge()
    elif args.step == "report":
        generate_report()

    logger.info("Done.")


if __name__ == "__main__":
    main()
