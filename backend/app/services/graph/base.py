from abc import ABC, abstractmethod
from typing import List, Dict, Any
from app.models.domain import GraphEntity, GraphRelation, SubgraphPath


class BaseGraphStore(ABC):
    """
    Abstract interface for any Knowledge Graph database.
    Implementations can be KùzuDB, Neo4j, TigerGraph, Memgraph, NetworkX, etc.
    """

    @abstractmethod
    async def add_nodes(self, entities: List[GraphEntity]) -> int:
        """
        Store entity nodes in the graph.
        """
        pass

    @abstractmethod
    async def add_edges(self, relations: List[GraphRelation]) -> int:
        """
        Store relationship edges between entities.
        """
        pass

    @abstractmethod
    async def find_subgraph(
        self,
        entity_names: List[str],
        max_hops: int = 2,
        limit: int = 25
    ) -> List[SubgraphPath]:
        """
        Traverse causal and relational pathways around target entities.
        """
        pass

    @abstractmethod
    async def query(self, query_str: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Execute raw Cypher / GSQL / graph query.
        """
        pass

    @abstractmethod
    async def count(self) -> Dict[str, int]:
        """
        Return total node and edge counts: {"nodes": N, "edges": M}.
        """
        pass
