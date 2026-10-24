import time
import json
import re
from typing import Dict, Any, Optional

from app.core.config import settings
from app.utils.pricing import calculate_cost


def get_llm_client():
    """
    Returns an initialized LLM client and model name based on LLM_PROVIDER.
    Supports Ollama (Qwen 2.5), OpenRouter Free, Groq, and Gemini.
    """
    provider = settings.LLM_PROVIDER.lower()

    if provider == "ollama":
        from openai import OpenAI
        client = OpenAI(
            base_url=settings.OLLAMA_BASE_URL,
            api_key="ollama"
        )
        return "openai_compatible", client, settings.OLLAMA_MODEL

    elif provider == "openrouter":
        from openai import OpenAI
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY or "none"
        )
        return "openai_compatible", client, settings.OPENROUTER_MODEL

    elif provider == "groq":
        from openai import OpenAI
        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=settings.GROQ_API_KEY or "none"
        )
        return "openai_compatible", client, "llama-3.1-8b-instant"

    elif provider == "gemini":
        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return "gemini", client, settings.LLM_MODEL

    else:
        # Default to Ollama with Qwen 2.5
        from openai import OpenAI
        client = OpenAI(
            base_url=settings.OLLAMA_BASE_URL,
            api_key="ollama"
        )
        return "openai_compatible", client, settings.OLLAMA_MODEL


async def generate_llm_response(query: str, system_prompt: Optional[str] = None):
    """
    Unified LLM completion function across Ollama, OpenRouter, Groq, and Gemini.
    """
    start_time = time.time()
    client_type, client, model_name = get_llm_client()

    answer = ""
    prompt_tokens = 0
    completion_tokens = 0

    if client_type == "openai_compatible":
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": query})

        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.2
            )
            answer = response.choices[0].message.content or ""
            if response.usage:
                prompt_tokens = response.usage.prompt_tokens or 0
                completion_tokens = response.usage.completion_tokens or 0
        except Exception as e:
            # Automatic fallback: if Ollama is not yet started, provide clear instruction
            if "connection error" in str(e).lower() or "11434" in str(e):
                raise Exception(
                    f"OLLAMA_OFFLINE: Could not reach Ollama at {settings.OLLAMA_BASE_URL}. "
                    f"Please run 'ollama run {settings.OLLAMA_MODEL}' or set LLM_PROVIDER=openrouter in backend/.env"
                )
            raise e

    else:
        # Gemini legacy path
        full_content = f"{system_prompt}\n\n{query}" if system_prompt else query
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=full_content
            )
            answer = response.text or ""
            usage = getattr(response, "usage_metadata", None)
            if usage:
                prompt_tokens = getattr(usage, "prompt_token_count", 0)
                completion_tokens = getattr(usage, "candidates_token_count", 0)
        except Exception as e:
            error_msg = str(e)
            if "RESOURCE_EXHAUSTED" in error_msg or "quota" in error_msg.lower() or "429" in error_msg:
                raise Exception(
                    "API_KEY_EXHAUSTED: Your Google Gemini API key has run out of quota. "
                    "Switch to LLM_PROVIDER=ollama (Qwen 2.5) in backend/.env to remove rate limits."
                )
            raise e

    latency = round(time.time() - start_time, 2)
    total_tokens = prompt_tokens + completion_tokens

    # Zero cost for local Ollama and OpenRouter Free
    if settings.LLM_PROVIDER.lower() in ["ollama", "openrouter"]:
        cost = 0.0
    else:
        cost = calculate_cost(prompt_tokens, completion_tokens)

    return {
        "answer": answer,
        "tokens_used": total_tokens,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "latency": latency,
        "cost": cost,
        "model": model_name
    }


async def extract_entities_and_triples(text: str) -> Dict[str, Any]:
    """
    Extracts structured entities and relationship triples from text using Qwen/LLM.
    Returns: {"entities": [...], "relations": [...]}
    """
    system_prompt = (
        "You are an expert medical knowledge graph extractor. "
        "Extract key entities (Hospital, Drug, Condition, Patient, Manufacturer) "
        "and relationships between them. "
        "Return ONLY a valid JSON object with keys 'entities' and 'relations'. "
        "Example format:\n"
        "{\n"
        '  "entities": [{"id": "mercy_hosp", "name": "Mercy Hospital", "type": "Hospital"}],\n'
        '  "relations": [{"source": "mercy_hosp", "target": "amox", "relation": "STOCKS"}]\n'
        "}"
    )

    try:
        res = await generate_llm_response(text, system_prompt=system_prompt)
        raw_text = res["answer"]
        # Extract json between ```json or direct braces
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return {"entities": [], "relations": []}
    except Exception:
        # Non-blocking fallback if LLM offline during text ingestion
        return {"entities": [], "relations": []}