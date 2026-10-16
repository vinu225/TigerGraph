import json

from google import genai

from app.core.config import settings

client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)


async def llm_judge_evaluate(
    question: str,
    answers: dict[str, str]
):
    """
    Uses an LLM-as-Judge to evaluate and score multiple pipeline
    answers for a given question. Returns a score (1-10) and
    reasoning for each pipeline.

    Args:
        question: The user's original question.
        answers: Dict mapping pipeline name to its answer text.
                 e.g. {"llm_only": "...", "traditional_rag": "...", "graph_rag": "..."}

    Returns:
        Dict mapping pipeline name to {"score": int, "reasoning": str}
    """

    answers_block = ""
    for pipeline, answer in answers.items():
        answers_block += f"\n### {pipeline}\n{answer}\n"

    prompt = f"""You are an expert evaluator acting as an LLM-as-Judge. 
Your task is to evaluate and compare multiple AI-generated answers to the same question.

**Question:**
{question}

**Answers from different pipelines:**
{answers_block}

**Evaluation Criteria:**
1. **Relevance** (0-3): How well does the answer address the question?
2. **Accuracy** (0-3): Are the facts and claims correct based on the information provided?
3. **Completeness** (0-2): Does the answer cover all important aspects?
4. **Specificity** (0-2): Does the answer provide specific details rather than generic statements?

**Instructions:**
- Score each answer on a scale of 1-10 (sum of criteria above).
- Provide a brief reasoning (2-3 sentences) for each score.
- Be fair and objective. Judge based on quality, not length.

**Response Format (respond ONLY with valid JSON, no markdown fences):**
{{
  {", ".join(f'"{p}": {{"score": <int 1-10>, "reasoning": "<string>"}}' for p in answers.keys())}
}}"""

    response = client.models.generate_content(
        model=settings.LLM_MODEL,
        contents=prompt
    )

    response_text = response.text.strip()

    # Strip markdown code fences if present
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        # Remove first line (```json or ```) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        response_text = "\n".join(lines)

    try:
        judge_results = json.loads(response_text)
    except json.JSONDecodeError:
        # Fallback: return neutral scores if parsing fails
        judge_results = {
            pipeline: {
                "score": 5,
                "reasoning": "Unable to parse judge response. Assigned neutral score."
            }
            for pipeline in answers.keys()
        }

    # Ensure all pipelines have results
    for pipeline in answers.keys():
        if pipeline not in judge_results:
            judge_results[pipeline] = {
                "score": 5,
                "reasoning": "No evaluation returned for this pipeline."
            }

    return judge_results
