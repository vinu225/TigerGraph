import time
from app.services.vector.factory import get_vector_store
from app.services.llm_service import generate_llm_response


async def generate_rag_response(query: str):
    """
    Executes standard RAG:
    1. Retrieves top chunks via LanceDB hybrid search.
    2. Prompts Qwen 2.5 / configured LLM grounded strictly on context.
    """
    start_time = time.time()
    vectorstore = get_vector_store()

    # Retrieve top 3 relevant chunks via hybrid search
    retrieved_chunks = await vectorstore.search(query, top_k=3, query_type="hybrid")

    context_snippets = []
    for doc in retrieved_chunks:
        source = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page", "?")
        context_snippets.append(f"[Source: {source}, Page: {page}]\n{doc.text}")

    context = "\n\n---\n\n".join(context_snippets)

    system_prompt = "You are a helpful healthcare AI assistant. Answer the question ONLY using the provided context."
    prompt = f"Context:\n{context}\n\nQuestion:\n{query}"

    llm_result = await generate_llm_response(prompt, system_prompt=system_prompt)
    latency = round(time.time() - start_time, 2)

    return {
        "answer": llm_result["answer"],
        "retrieved_chunks": len(retrieved_chunks),
        "context": context,
        "tokens_used": llm_result["tokens_used"],
        "prompt_tokens": llm_result["prompt_tokens"],
        "completion_tokens": llm_result["completion_tokens"],
        "latency": latency,
        "cost": llm_result["cost"],
        "model": llm_result["model"]
    }