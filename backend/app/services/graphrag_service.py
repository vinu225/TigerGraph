import time

from google import genai

from app.core.config import settings
from app.services.vectorstore_service import get_vectorstore
from app.utils.pricing import calculate_cost

client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)


async def generate_graphrag_response(query: str):
    """
    Simulates a GraphRAG pipeline by performing retrieval with
    extra relationship-aware context, then prompting the LLM to
    reason over entities and relationships (multi-hop).
    """

    start_time = time.time()

    vectorstore = get_vectorstore()

    retriever = vectorstore.as_retriever(
        search_kwargs={"k": 5}
    )

    retrieved_docs = retriever.invoke(query)

    # Build a richer, graph-style context by extracting
    # source metadata and simulating entity/relationship awareness
    chunks_with_meta = []
    for doc in retrieved_docs:
        source = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page", "?")
        chunks_with_meta.append(
            f"[Source: {source}, Page: {page}]\n{doc.page_content}"
        )

    context = "\n\n---\n\n".join(chunks_with_meta)

    prompt = f"""You are an advanced healthcare AI assistant using a GraphRAG 
(Graph-based Retrieval Augmented Generation) approach.

You must:
1. Identify key entities (patients, medications, diagnoses, procedures, providers) 
   mentioned in the context.
2. Trace relationships and causal pathways between these entities.
3. Perform multi-hop reasoning across the document chunks to answer the question.
4. Clearly reference which parts of the context support your answer.

Context (retrieved from knowledge graph):
{context}

Question:
{query}

Provide a comprehensive, well-structured answer that demonstrates multi-hop 
reasoning across the entities and relationships found in the documents."""

    try:
        response = client.models.generate_content(
            model=settings.LLM_MODEL,
            contents=prompt
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
        prompt_tokens = getattr(usage, "prompt_token_count", 0)
        completion_tokens = getattr(usage, "candidates_token_count", 0)
        total_tokens = prompt_tokens + completion_tokens

    cost = calculate_cost(
        prompt_tokens,
        completion_tokens
    )

    return {
        "answer": response.text,
        "retrieved_chunks": len(retrieved_docs),
        "context": context,
        "tokens_used": total_tokens,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "latency": latency,
        "cost": cost
    }
