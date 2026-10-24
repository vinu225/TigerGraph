import os
import json
from typing import List, Optional
import lancedb
from lancedb.index import FTS
import pyarrow as pa

from app.core.config import settings
from app.models.domain import DocumentChunk
from app.services.vector.base import BaseVectorStore
from app.services.embedding_service import get_embedding_model


class LanceDBStore(BaseVectorStore):
    """
    Disk-native columnar vector and document storage backed by LanceDB.
    Supports high-density storage and sub-millisecond hybrid search (Vector + BM25).
    """

    TABLE_NAME = "document_chunks"

    def __init__(self, db_dir: Optional[str] = None):
        self.db_dir = db_dir or settings.LANCEDB_DIR
        os.makedirs(self.db_dir, exist_ok=True)
        self.db = lancedb.connect(self.db_dir)
        self.embedding_model = get_embedding_model()
        self._ensure_table()

    def _ensure_table(self):
        """Ensures the document chunks table exists in LanceDB."""
        if self.TABLE_NAME not in self.db.table_names():
            # Sample embedding to determine vector dimension
            sample_dim = len(self.embedding_model.embed_query("init"))
            schema = pa.schema([
                pa.field("id", pa.string()),
                pa.field("text", pa.string()),
                pa.field("vector", pa.list_(pa.float32(), sample_dim)),
                pa.field("source", pa.string()),
                pa.field("page", pa.int64()),
                pa.field("metadata_json", pa.string())
            ])
            self.table = self.db.create_table(self.TABLE_NAME, schema=schema, mode="create")
        else:
            self.table = self.db.open_table(self.TABLE_NAME)

    async def add_chunks(self, chunks: List[DocumentChunk]) -> int:
        """
        Batches and appends document chunks to LanceDB on disk.
        Automatically generates embeddings if not precomputed.
        """
        if not chunks:
            return 0

        # Compute embeddings for chunks missing vectors
        texts_to_embed = [c.text for c in chunks if c.vector is None]
        if texts_to_embed:
            vectors = self.embedding_model.embed_documents(texts_to_embed)
            vec_idx = 0
            for c in chunks:
                if c.vector is None:
                    c.vector = vectors[vec_idx]
                    vec_idx += 1

        records = []
        for c in chunks:
            source = c.metadata.get("source", "unknown")
            page = int(c.metadata.get("page", 0))
            records.append({
                "id": c.id,
                "text": c.text,
                "vector": [float(v) for v in c.vector],
                "source": str(source),
                "page": page,
                "metadata_json": json.dumps(c.metadata)
            })

        self.table.add(records)

        # Refresh Full-Text Search (BM25) index
        try:
            self.table.create_index("text", config=FTS(), replace=True)
        except Exception:
            pass

        return len(records)

    async def search(
        self,
        query: str,
        top_k: int = 5,
        query_type: str = "hybrid"
    ) -> List[DocumentChunk]:
        """
        Performs hybrid (vector + BM25), pure vector, or pure FTS retrieval.
        """
        if self.table.count_rows() == 0:
            return []

        query_vec = [float(v) for v in self.embedding_model.embed_query(query)]

        try:
            if query_type == "hybrid":
                results = (
                    self.table.search(query_type="hybrid")
                    .vector(query_vec)
                    .text(query)
                    .limit(top_k)
                    .to_list()
                )
            elif query_type == "fts":
                results = (
                    self.table.search(query, query_type="fts")
                    .limit(top_k)
                    .to_list()
                )
            else:  # "vector"
                results = (
                    self.table.search(query_vec)
                    .limit(top_k)
                    .to_list()
                )
        except Exception:
            # Fallback to standard vector search if FTS index is building
            results = (
                self.table.search(query_vec)
                .limit(top_k)
                .to_list()
            )

        output_chunks: List[DocumentChunk] = []
        for r in results:
            try:
                meta = json.loads(r.get("metadata_json", "{}"))
            except Exception:
                meta = {}
            meta["source"] = r.get("source", "unknown")
            meta["page"] = r.get("page", 0)

            output_chunks.append(
                DocumentChunk(
                    id=str(r.get("id")),
                    text=str(r.get("text")),
                    metadata=meta,
                    vector=r.get("vector")
                )
            )

        return output_chunks

    async def count(self) -> int:
        """Returns the total number of document chunks stored."""
        return self.table.count_rows()

    async def clear(self) -> None:
        """Clears and reinitializes the table."""
        sample_dim = len(self.embedding_model.embed_query("init"))
        schema = pa.schema([
            pa.field("id", pa.string()),
            pa.field("text", pa.string()),
            pa.field("vector", pa.list_(pa.float32(), sample_dim)),
            pa.field("source", pa.string()),
            pa.field("page", pa.int64()),
            pa.field("metadata_json", pa.string())
        ])
        self.table = self.db.create_table(self.TABLE_NAME, schema=schema, mode="overwrite")


# Global singleton instance
_lancedb_instance: Optional[LanceDBStore] = None

def get_lancedb_store() -> LanceDBStore:
    global _lancedb_instance
    if _lancedb_instance is None:
        _lancedb_instance = LanceDBStore()
    return _lancedb_instance
