"""
LLM Judge — Gemini-powered answer quality evaluator
=====================================================
Uses Gemini to score generated answers against ground truth.

Produces a 1-10 quality score with reasoning for each QA pair.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv

# Load env
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / "backend" / ".env")

import google.generativeai as genai

# ── Config ──
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("LLM_MODEL", "gemini-3-flash-preview")

EVAL_DIR     = Path(__file__).resolve().parent.parent
OUTPUTS_DIR  = EVAL_DIR / "outputs"

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("llm_judge")

JUDGE_PROMPT_TEMPLATE = """You are an expert healthcare evaluator. Compare the generated answer to the ground truth answer.

Rate the generated answer on a scale of 1 to 10:
- 10: Perfect match, all facts correct, complete coverage
- 7-9: Mostly correct with minor gaps or extra details
- 4-6: Partially correct, missing key facts or has some inaccuracies
- 1-3: Mostly incorrect or irrelevant

Ground Truth Answer:
{ground_truth}

Generated Answer:
{generated}

Respond in this exact JSON format only:
{{"score": <number 1-10>, "reasoning": "<brief explanation>"}}
"""


def judge_answer(question: str, ground_truth: str, generated: str) -> Dict:
    """Score a single generated answer against ground truth using Gemini."""
    if not generated or generated.strip() == "":
        return {"score": 0, "reasoning": "No answer generated (empty response)."}

    prompt = JUDGE_PROMPT_TEMPLATE.format(
        ground_truth=ground_truth,
        generated=generated,
    )

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Extract JSON from response
        import re
        json_match = re.search(r'\{[^}]+\}', raw)
        if json_match:
            result = json.loads(json_match.group())
            return {
                "score": int(result.get("score", 0)),
                "reasoning": result.get("reasoning", "No reasoning provided"),
            }
        else:
            return {"score": 0, "reasoning": f"Could not parse judge response: {raw[:200]}"}
    except Exception as e:
        logger.error("Judge failed: %s", e)
        return {"score": 0, "reasoning": f"Error: {str(e)}"}


def evaluate_pipeline_outputs(pipeline_name: str) -> List[Dict]:
    """Load a pipeline's output file and judge each answer."""
    output_file = OUTPUTS_DIR / f"{pipeline_name}.json"
    if not output_file.exists():
        logger.warning("Output file not found: %s", output_file)
        return []

    with open(output_file, "r", encoding="utf-8") as f:
        results = json.load(f)

    judged = []
    for item in results:
        logger.info("Judging Q%d [%s]...", item["id"], pipeline_name)

        score_data = judge_answer(
            question=item["question"],
            ground_truth=item["ground_truth_answer"],
            generated=item["generated_answer"],
        )

        judged.append({
            "id": item["id"],
            "pipeline": pipeline_name,
            "question": item["question"],
            "ground_truth_answer": item["ground_truth_answer"],
            "generated_answer": item["generated_answer"],
            "judge_score": score_data["score"],
            "judge_reasoning": score_data["reasoning"],
            "latency_seconds": item.get("latency_seconds", 0),
        })

        # Rate limit: small delay between Gemini calls
        time.sleep(1.0)

    return judged


def main():
    """Run LLM judge across all pipeline outputs."""
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not set. Please configure it in .env")
        sys.exit(1)

    logger.info("LLM Judge using: %s", GEMINI_MODEL)

    pipelines = ["llm_only", "traditional_rag", "graph_rag"]
    all_results = []

    for pipeline in pipelines:
        logger.info("=" * 50)
        logger.info("Evaluating pipeline: %s", pipeline.upper())
        logger.info("=" * 50)

        results = evaluate_pipeline_outputs(pipeline)
        all_results.extend(results)

        if results:
            scores = [r["judge_score"] for r in results]
            avg = sum(scores) / len(scores)
            logger.info("[%s] Average score: %.2f/10 (%d questions)", pipeline, avg, len(scores))

    # Save all judge results
    output_path = OUTPUTS_DIR / "llm_judge_results.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    logger.info("Saved judge results to %s", output_path)

    # Print summary
    print("\n" + "=" * 60)
    print("  LLM JUDGE RESULTS SUMMARY")
    print("=" * 60)
    for pipeline in pipelines:
        pipeline_results = [r for r in all_results if r["pipeline"] == pipeline]
        if pipeline_results:
            scores = [r["judge_score"] for r in pipeline_results]
            avg = sum(scores) / len(scores)
            print(f"  {pipeline:<20} avg_score: {avg:.2f}/10  ({len(scores)} questions)")
        else:
            print(f"  {pipeline:<20} [no results]")
    print("=" * 60)


if __name__ == "__main__":
    main()
