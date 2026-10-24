from abc import ABC, abstractmethod
from typing import List, Optional
from app.models.domain import DocumentChunk


class BaseVectorStore(ABC):
    """
    Abstract interface for any vector/document database.
    Implementations can be LanceDB, Chroma, Milvus, Pinecone, Qdrant, etc.
    """

    @abstractmethod
    async def add_chunks(self, chunks: List[DocumentChunk]) -> int:
        """
        Store a batch of document chunks and their vectors.
        Returns the number of chunks successfully stored.
        """
        pass

    @abstractmethod
    async def search(
        self,
        query: str,
        top_k: int = 5,
        query_type: str = "hybrid"  # "hybrid", "vector", or "fts"
    ) -> List[DocumentChunk]:
        """
        Retrieve relevant document chunks using hybrid, vector, or keyword search.
        """
        pass

    @abstractmethod
    async def count(self) -> int:
        """
        Return the total number of document chunks currently stored.
        """
        pass

    @abstractmethod
    async def clear(self) -> None:
        """
        Reset or clear the vector index.
        """
        pass
