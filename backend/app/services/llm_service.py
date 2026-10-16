import time
import traceback

from google import genai

from app.core.config import settings
from app.utils.pricing import calculate_cost

client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)

async def generate_llm_response(query: str):

    start_time = time.time()

    try:
        response = client.models.generate_content(
            model=settings.LLM_MODEL,
            contents=query
        )
    except Exception as e:
        error_msg = str(e)
        if "RESOURCE_EXHAUSTED" in error_msg or "quota" in error_msg.lower() or "429" in error_msg:
            raise Exception(
                "API_KEY_EXHAUSTED: Your Google Gemini API key has run out of quota. "
                "Please update your API key in the backend .env file and restart."
            )
        raise

    latency = round(time.time() - start_time, 2)

    usage = getattr(response, "usage_metadata", None)

    prompt_tokens = 0
    completion_tokens = 0
    total_tokens = 0

    if usage:
        prompt_tokens = getattr(
            usage,
            "prompt_token_count",
            0
        )

        completion_tokens = getattr(
            usage,
            "candidates_token_count",
            0
        )

        total_tokens = (
            prompt_tokens + completion_tokens
        )

    cost = calculate_cost(
        prompt_tokens,
        completion_tokens
    )

    return {
        "answer": response.text,
        "tokens_used": total_tokens,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "latency": latency,
        "cost": cost
    }