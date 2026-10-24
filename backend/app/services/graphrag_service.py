import time
import re
from typing import List
from app.services.vector.factory import get_vector_store
from app.services.graph.factory import get_graph_store
from app.services.llm_service import generate_llm_response


def extract_potential_entities(query: str) -> List[str]:
    """
    Extracts capitalized multi-word phrases and key nouns from query
    as entity candidates for graph lookup.
    """
    # Match capitalized terms (e.g. "Mercy Hospital", "Amoxicillin", "Dr. Smith")
    candidates = re.findall(r"\b[A-Z][a-zA-Z0-9_\-\.]+(?:\s+[A-Z][a-zA-Z0-9_\-\.]+)*\b", query)
    # Also include significant words longer than 4 chars
    words = [w for w in re.findall(r"\b[a-zA-Z]{5,}\b", query) if w.lower() not in {"which", "where", "there", "about", "could", "would", "patient", "hospital"}]
    combined = list(set(candidates + words))
    return combined[:6]


async def generate_graphrag_response(query: str):
    """
    Executes true GraphRAG:
    1. Hybrid retrieval across documents in LanceDB (BM25 + Dense Vectors).
    2. Multi-hop traversal across entities & relationships in KùzuDB (openCypher).
    3. Graph-augmented synthesis via Qwen 2.5 / configured LLM.
    """
    start_time = time.time()

    vectorstore = get_vector_store()
    graphstore = get_graph_store()

    # Step 1: Hybrid Document Retrieval from LanceDB
    retrieved_chunks = await vectorstore.search(query, top_k=5, query_type="hybrid")

    chunks_with_meta = []
    for doc in retrieved_chunks:
        source = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page", "?")
        chunks_with_meta.append(f"[Source: {source}, Page: {page}]\n{doc.text}")

    doc_context = "\n\n---\n\n".join(chunks_with_meta)

    # Step 2: Knowledge Graph Traversal from KùzuDB
    candidates = extract_potential_entities(query)
    graph_paths = await graphstore.find_subgraph(candidates, max_hops=2, limit=25)

    graph_triples = []
    for p in graph_paths:
        graph_triples.append(f"({p.source_name}) -[{p.relation}]-> ({p.target_name})")

    if graph_triples:
        graph_context = "Knowledge Graph Entity Pathways:\n" + "\n".join(graph_triples)
    else:
        graph_context = "Knowledge Graph Entity Pathways: (No direct matching entity nodes found in graph store)"

    # Step 3: Synthesis Prompt
    system_prompt = (
        "You are an advanced healthcare AI assistant using a GraphRAG "
        "(Graph-based Retrieval Augmented Generation) approach.\n"
        "You must:\n"
        "1. Trace relationships and causal pathways between entities using the graph context.\n"
        "2. Perform multi-hop reasoning across the document chunks to answer the question.\n"
        "3. Explicitly reference supporting evidence from the context."
    )

    prompt = (
        f"Context from Knowledge Graph:\n{graph_context}\n\n"
        f"Context from Retrieved Documents:\n{doc_context}\n\n"
        f"Question:\n{query}\n\n"
        "Provide a comprehensive, evidence-grounded answer demonstrating multi-hop reasoning."
    )

    llm_result = await generate_llm_response(prompt, system_prompt=system_prompt)
    latency = round(time.time() - start_time, 2)

    return {
        "answer": llm_result["answer"],
        "retrieved_chunks": len(retrieved_chunks),
        "graph_paths_found": len(graph_paths),
        "graph_context": graph_context,
        "context": doc_context,
        "tokens_used": llm_result["tokens_used"],
        "prompt_tokens": llm_result["prompt_tokens"],
        "completion_tokens": llm_result["completion_tokens"],
        "latency": latency,
        "cost": llm_result["cost"],
        "model": llm_result["model"]
    }
