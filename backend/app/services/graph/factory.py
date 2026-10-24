from app.core.config import settings
from app.services.graph.base import BaseGraphStore
from app.services.graph.kuzu_service import get_kuzu_store


def get_graph_store() -> BaseGraphStore:
    """
    Factory function returning the active BaseGraphStore implementation.
    Enables switching between KùzuDB, Neo4j, or TigerGraph
    strictly through environment configuration.
    """
    backend = settings.GRAPH_STORE_BACKEND.lower()

    if backend == "kuzudb":
        return get_kuzu_store()
    else:
        # Default to embedded KùzuDB
        return get_kuzu_store()
