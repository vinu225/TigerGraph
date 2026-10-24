"""
Backward-compatibility wrapper for vector store access.
Delegates to the unified BaseVectorStore factory.
"""
from app.services.vector.factory import get_vector_store

def get_vectorstore():
    return get_vector_store()