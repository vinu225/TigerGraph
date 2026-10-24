from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class DocumentChunk(BaseModel):
    """
    Canonical representation of a document text chunk,
    agnostic of the underlying vector database.
    """
    id: str = Field(description="Unique chunk identifier")
    text: str = Field(description="The textual content of the chunk")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata such as source file, page, timestamps")
    vector: Optional[List[float]] = Field(default=None, description="Dense embedding vector")


class GraphEntity(BaseModel):
    """
    Canonical representation of an entity node in the Knowledge Graph.
    """
    id: str = Field(description="Unique entity ID (e.g., lowercase slug or UUID)")
    name: str = Field(description="Human-readable entity name (e.g., 'Metformin', 'Patient_101')")
    entity_type: str = Field(default="Entity", description="Node label or category (e.g., 'Drug', 'Condition', 'Hospital')")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Arbitrary entity attributes")


class GraphRelation(BaseModel):
    """
    Canonical representation of a relationship edge between two entities.
    """
    source_id: str = Field(description="ID of the starting entity")
    target_id: str = Field(description="ID of the target entity")
    relation_type: str = Field(description="Edge label (e.g., 'TREATS', 'PRESCRIBED_TO', 'LOCATED_AT')")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Arbitrary edge attributes")


class SubgraphPath(BaseModel):
    """
    A path or triple retrieved during multi-hop graph traversal.
    """
    source_name: str
    relation: str
    target_name: str
    depth: int = 1
