import os
import uuid
from typing import Dict, Any

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.models.domain import DocumentChunk, GraphEntity, GraphRelation
from app.services.vector.factory import get_vector_store
from app.services.graph.factory import get_graph_store
from app.services.llm_service import extract_entities_and_triples

UPLOAD_DIR = "data/raw"


async def ingest_pdf(file_path: str) -> Dict[str, Any]:
    """
    Ingests a PDF document:
    1. Splits into overlapping text chunks.
    2. Stores chunks & embeddings in the active BaseVectorStore (LanceDB).
    3. Extracts entities & relationships into the active BaseGraphStore (KùzuDB).
    """
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    split_docs = text_splitter.split_documents(documents)

    doc_chunks = []
    file_name = os.path.basename(file_path)

    for i, doc in enumerate(split_docs):
        chunk_id = f"{file_name}_chunk_{i}_{uuid.uuid4().hex[:6]}"
        metadata = dict(doc.metadata) if doc.metadata else {}
        metadata["source"] = file_name
        metadata["chunk_index"] = i

        doc_chunks.append(
            DocumentChunk(
                id=chunk_id,
                text=doc.page_content,
                metadata=metadata
            )
        )

    # 1. Store in Vector Store
    vectorstore = get_vector_store()
    stored_count = await vectorstore.add_chunks(doc_chunks)

    # 2. Extract Entities into Knowledge Graph
    graphstore = get_graph_store()
    entities_added = 0
    relations_added = 0

    # Extract sample entities from first few representative chunks to avoid excessive API calls
    sample_text = "\n\n".join([c.text for c in doc_chunks[:3]])
    extracted = await extract_entities_and_triples(sample_text)

    if extracted.get("entities"):
        nodes = [
            GraphEntity(
                id=e.get("id") or str(uuid.uuid4()),
                name=e.get("name") or "Unknown",
                entity_type=e.get("type") or "Entity"
            )
            for e in extracted["entities"] if e.get("name")
        ]
        entities_added = await graphstore.add_nodes(nodes)

    if extracted.get("relations"):
        edges = [
            GraphRelation(
                source_id=r.get("source"),
                target_id=r.get("target"),
                relation_type=r.get("relation") or "RELATES_TO"
            )
            for r in extracted["relations"] if r.get("source") and r.get("target")
        ]
        relations_added = await graphstore.add_edges(edges)

    return {
        "status": "success",
        "chunks_created": stored_count,
        "entities_extracted": entities_added,
        "relations_extracted": relations_added,
        "file_name": file_name
    }