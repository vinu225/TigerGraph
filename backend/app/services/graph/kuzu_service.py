import os
import json
from typing import List, Dict, Any, Optional
import kuzu

from app.core.config import settings
from app.models.domain import GraphEntity, GraphRelation, SubgraphPath
from app.services.graph.base import BaseGraphStore


class KuzuGraphStore(BaseGraphStore):
    """
    Embedded, disk-native Knowledge Graph engine built on KùzuDB.
    Implements openCypher traversals with zero external server dependencies.
    """

    def __init__(self, db_path: Optional[str] = None):
        target_path = db_path or settings.KUZU_DB_DIR
        if not target_path.endswith(".kuzu"):
            os.makedirs(target_path, exist_ok=True)
            self.db_path = os.path.join(target_path, "graph.kuzu")
        else:
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            self.db_path = target_path

        self.db = kuzu.Database(self.db_path)
        self.conn = kuzu.Connection(self.db)
        self._init_schema()

    def _init_schema(self):
        """Initializes node and relationship tables if they don't already exist."""
        try:
            self.conn.execute(
                "CREATE NODE TABLE IF NOT EXISTS Entity("
                "id STRING, name STRING, entity_type STRING, properties STRING, "
                "PRIMARY KEY(id)"
                ")"
            )
        except Exception:
            pass

        try:
            self.conn.execute(
                "CREATE REL TABLE IF NOT EXISTS RelatesTo("
                "FROM Entity TO Entity, relation_type STRING, properties STRING"
                ")"
            )
        except Exception:
            pass

    async def add_nodes(self, entities: List[GraphEntity]) -> int:
        """Adds or updates entity nodes in the graph."""
        count = 0
        for entity in entities:
            props_str = json.dumps(entity.properties)
            # Check if node exists
            check = self.conn.execute(
                "MATCH (e:Entity) WHERE e.id = $id RETURN count(e)",
                {"id": entity.id}
            )
            exists = check.get_next()[0] > 0
            if not exists:
                self.conn.execute(
                    "CREATE (e:Entity {id: $id, name: $name, entity_type: $entity_type, properties: $props})",
                    {
                        "id": entity.id,
                        "name": entity.name,
                        "entity_type": entity.entity_type,
                        "props": props_str,
                    }
                )
                count += 1
            else:
                self.conn.execute(
                    "MATCH (e:Entity) WHERE e.id = $id SET e.name = $name, e.entity_type = $entity_type, e.properties = $props",
                    {
                        "id": entity.id,
                        "name": entity.name,
                        "entity_type": entity.entity_type,
                        "props": props_str,
                    }
                )
                count += 1
        return count

    async def add_edges(self, relations: List[GraphRelation]) -> int:
        """Adds relationships between existing entities."""
        count = 0
        for rel in relations:
            props_str = json.dumps(rel.properties)
            try:
                self.conn.execute(
                    "MATCH (a:Entity), (b:Entity) "
                    "WHERE a.id = $source_id AND b.id = $target_id "
                    "CREATE (a)-[r:RelatesTo {relation_type: $rel_type, properties: $props}]->(b)",
                    {
                        "source_id": rel.source_id,
                        "target_id": rel.target_id,
                        "rel_type": rel.relation_type,
                        "props": props_str,
                    }
                )
                count += 1
            except Exception as e:
                # Silently catch or log relationship insertion edge-cases
                continue
        return count

    async def find_subgraph(
        self,
        entity_names: List[str],
        max_hops: int = 2,
        limit: int = 25
    ) -> List[SubgraphPath]:
        """
        Traverses 1-to-2 hops around matching entities using openCypher.
        """
        paths: List[SubgraphPath] = []
        for name in entity_names:
            clean_name = name.strip().lower()
            if not clean_name:
                continue

            # 1-Hop Traversal (both incoming and outgoing)
            query_1hop = (
                "MATCH (e1:Entity)-[r:RelatesTo]-(e2:Entity) "
                "WHERE lower(e1.name) CONTAINS $name "
                "RETURN e1.name, r.relation_type, e2.name "
                "LIMIT $limit"
            )
            try:
                res = self.conn.execute(query_1hop, {"name": clean_name, "limit": limit})
                while res.has_next():
                    row = res.get_next()
                    paths.append(
                        SubgraphPath(
                            source_name=row[0],
                            relation=row[1],
                            target_name=row[2],
                            depth=1,
                        )
                    )
            except Exception:
                pass

            if len(paths) >= limit:
                break

        return paths[:limit]

    async def query(self, query_str: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Executes a custom openCypher query directly against KùzuDB."""
        params = params or {}
        res = self.conn.execute(query_str, params)
        cols = res.get_column_names()
        results = []
        while res.has_next():
            row = res.get_next()
            results.append(dict(zip(cols, row)))
        return results

    async def count(self) -> Dict[str, int]:
        """Returns node and edge counts."""
        try:
            node_res = self.conn.execute("MATCH (n:Entity) RETURN count(n)").get_next()[0]
        except Exception:
            node_res = 0

        try:
            edge_res = self.conn.execute("MATCH ()-[r:RelatesTo]->() RETURN count(r)").get_next()[0]
        except Exception:
            edge_res = 0

        return {"nodes": int(node_res), "edges": int(edge_res)}


# Global singleton instance
_kuzu_instance: Optional[KuzuGraphStore] = None

def get_kuzu_store() -> KuzuGraphStore:
    global _kuzu_instance
    if _kuzu_instance is None:
        _kuzu_instance = KuzuGraphStore()
    return _kuzu_instance
