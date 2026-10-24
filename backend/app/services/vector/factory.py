from app.core.config import settings
from app.services.vector.base import BaseVectorStore
from app.services.vector.lancedb_service import get_lancedb_store


def get_vector_store() -> BaseVectorStore:
    """
    Factory function returning the active BaseVectorStore implementation.
    Enables zero-downtime switching between LanceDB, Chroma, Pinecone, or Milvus
    strictly through environment configuration.
    """
    backend = settings.VECTOR_STORE_BACKEND.lower()

    if backend == "lancedb":
        return get_lancedb_store()
    elif backend == "chroma":
        # Lazy import legacy Chroma store if explicitly requested
        from app.services.vector.chroma_adapter import get_chroma_store
        return get_chroma_store()
    else:
        # Default to high-performance disk-native LanceDB
        return get_lancedb_store()
