# 🚀 MedGraphRAG Enterprise Scaling Architecture & Roadmap

This document outlines the strategic, architectural, and engineering roadmap to scale **MedGraphRAG** from its initial research/hackathon prototype (~16 documents, 22 nodes, 1 concurrent query) to an enterprise-grade healthcare intelligence platform capable of processing millions of clinical documents, billions of graph relationships, and thousands of concurrent clinical queries.

---

## 📊 Scale Comparison: Prototype vs. Enterprise Production

| Dimension | Hackathon Prototype (Current) | Enterprise Production Target |
|---|---|---|
| **Document Capacity** | 16 static documents (~28 KB total text) | 10M+ documents (EHR notes, pathology, claims, clinical trials) |
| **Knowledge Graph Scale** | 22 entities, 26 relationships (mock/static) | 50M+ vertices, 500M+ edges in distributed TigerGraph cluster |
| **Vector Index Scale** | Local ChromaDB on disk (~100 chunks) | 50M+ chunk vectors in TigerGraph Vector Search / Distributed Milvus |
| **Ingestion Throughput** | 1 PDF via synchronous FastAPI upload | 5,000+ docs/minute via Kafka + Celery/Temporal workers |
| **Query Concurrency** | 1 sequential query (~0.1 QPS) | 500+ concurrent clinical queries/sec (p95 < 1.2s) |
| **LLM Tier & Resilience** | Free-tier Gemini (rate-limited at 15 RPM) | Multi-provider fallback (Gemini Pro, Claude 3.5, local vLLM) + Redis Cache |
| **Data Formats** | Plaintext / Synthetic PDF | HL7 v2, FHIR R4, DICOM metadata, PDF, clinical text notes |

---

## 🏛️ Enterprise Target Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │       Client Layer (React / Mobile / EHR)    │
                               └──────────────────────┬───────────────────────┘
                                                      │ HTTPS / WSS / gRPC
                               ┌──────────────────────▼───────────────────────┐
                               │     Load Balancer & API Gateway (Kong/Nginx) │
                               └──────────┬───────────────────────┬───────────┘
                                          │                       │
               ┌──────────────────────────▼─────┐   ┌─────────────▼──────────────────┐
               │  Ingestion Service (FastAPI)    │   │ Query Orchestration (FastAPI)  │
               └──────────────┬─────────────────┘   └─────────────┬──────────────────┘
                              │ Event Stream                      │ Cache Check
               ┌──────────────▼─────────────────┐   ┌─────────────▼──────────────────┐
               │ Apache Kafka / RabbitMQ Queue  │   │  Redis Semantic Cache Layer     │
               └──────────────┬─────────────────┘   └─────────────┬──────────────────┘
                              │ Worker Pool                       │ Cache Miss
               ┌──────────────▼─────────────────┐   ┌─────────────▼──────────────────┐
               │ Celery / Ray Workers (NER/RE)  │   │ Hybrid Multi-Hop Retrieval     │
               └──────────────┬─────────────────┘   └─────────────┬──────────────────┘
                              │ Structured Write                  │
            ┌─────────────────┴─────────────────┐                 │
            ▼                                   ▼                 ▼
 ┌──────────────────────┐           ┌───────────────────────────────────────┐
 │   Document Lake      │           │      TigerGraph Enterprise Cluster    │
 │ (S3 / MinIO / Ceph)  │           │  - Native Distributed Graph Storage  │
 └──────────────────────┘           │  - Native HNSW Vector Index           │
                                    │  - Real-Time Multi-Hop GSQL Queries   │
                                    └───────────────────┬───────────────────┘
                                                        │ Sub-graph Context
                                            ┌───────────▼───────────────────┐
                                            │ LLM Gateway (LiteLLM / vLLM)  │
                                            │ - Gemini 1.5 Pro / Flash      │
                                            │ - On-Prem DeepSeek-R1 / Llama  │
                                            └───────────────────────────────┘
```

---

## 🗓️ 4-Phase Implementation Roadmap

### Phase 1: Real TigerGraph Integration & Production Ingestion (Weeks 1–4)
* **Goal**: Replace the in-memory/simulated GraphRAG fallback with direct, real-time GSQL traversal against TigerGraph.
1. **Schema Industrialization**:
   - Define production GSQL schema with indexed vertex attributes: `Patient`, `Condition`, `Medication`, `Encounter`, `Device`, `Provider`, `Facility`, `Claim`.
   - Implement relationship edges with timestamps and confidence scores: `DIAGNOSED_WITH`, `PRESCRIBED`, `PERFORMED_AT`, `SUPPLIED_BY`.
2. **True GraphRAG Retrieval Engine**:
   - Connect FastAPI backend directly to TigerGraph via `pyTigerGraph` with connection pooling.
   - Implement real sub-graph extraction: given extracted query entities, perform 2-to-3 hop bidirectional expansion via custom GSQL queries instead of naive chunk fetching.
3. **Async Ingestion Pipeline**:
   - Replace synchronous `ingest_pdf` with Celery + Redis background workers.
   - Decouple file upload from extraction, OCR, chunking, and embedding creation.

### Phase 2: High-Performance Vector & Hybrid Retrieval (Weeks 5–8)
* **Goal**: Eliminate ChromaDB scaling bottlenecks and achieve state-of-the-art hybrid search (Dense + Sparse + Graph).
1. **Unified Vector Storage in TigerGraph**:
   - Leverage TigerGraph's native vector search capability (storing embeddings as vertex attributes with HNSW indexing) to perform vector search directly inside the graph engine, eliminating synchronization lag between separate databases.
2. **Hybrid Search Reranker**:
   - Combine graph sub-graph paths with BM25 keyword search and dense semantic search.
   - Use a lightweight cross-encoder reranker (e.g., `bge-reranker-large` or Cohere Rerank) to select the top $N$ evidence snippets.
3. **Chunking 2.0 (Clinical-Aware)**:
   - Upgrade from basic character splitting to clinical boundary splitting (SOAP note sections, clinical encounter boundaries, and RxNorm/SNOMED-CT entity boundaries).

### Phase 3: High-Throughput Serving & Semantic Caching (Weeks 9–12)
* **Goal**: Scale query throughput from 0.1 QPS to 500+ QPS while slashing LLM inference costs by 60–80%.
1. **Redis Semantic Caching**:
   - Cache query embeddings and graph sub-structures in Redis with cosine similarity matching ($\tau \ge 0.94$).
   - Return cached verified answers immediately for frequent queries (e.g., standard drug-drug interaction protocols, insurance policy checks).
2. **LLM Routing & Load Balancing**:
   - Deploy `LiteLLM` proxy or vLLM routing layer:
     - Tier 1: Gemini 1.5 Flash (for entity extraction & query classification).
     - Tier 2: Gemini 1.5 Pro / Claude 3.5 Sonnet (for complex multi-hop diagnosis & causal synthesis).
     - Tier 3: Local fine-tuned medical models (BioMistral / Med-PaLM / Llama 3 Medical) for sensitive HIPAA on-prem deployments.
3. **Horizontal Auto-scaling**:
   - Package FastAPI services into Kubernetes Deployments with Horizontal Pod Autoscalers (HPA) targeting CPU and request queue depth.

### Phase 4: Enterprise Compliance, Observability & Security (Weeks 13–16)
* **Goal**: HIPAA/GDPR readiness, auditability, and automated quality tracking.
1. **HIPAA & Data Privacy**:
   - Automated PHI (Protected Health Information) de-identification pipeline (Microsoft Presidio or John Snow Labs NLP) prior to ingestion.
   - Role-Based Access Control (RBAC) enforced at both TigerGraph query level and API Gateway.
2. **Production Observability**:
   - Distributed tracing via OpenTelemetry and Jaeger across API $\to$ TigerGraph $\to$ LLM.
   - Live Prometheus metrics for latency percentiles (p50, p95, p99), token consumption, and retrieval recall.
3. **Automated Continuous Evaluation (CI/CD)**:
   - Automated regression benchmarking on every code commit using RAGAS and BERTScore against the 500+ clinical test suite.

---

## 💻 Actionable Code Refactor Blueprint

### 1. Direct TigerGraph Client with Connection Pooling
```python
# backend/app/core/tigergraph_client.py
from pyTigerGraph import TigerGraphConnection
from app.core.config import settings

class TigerGraphPool:
    _instance = None

    @classmethod
    def get_connection(cls) -> TigerGraphConnection:
        if cls._instance is None:
            cls._instance = TigerGraphConnection(
                host=settings.TG_HOST,
                graphname=settings.TG_GRAPHNAME,
                username=settings.TG_USERNAME,
                password=settings.TG_PASSWORD,
                restppPort=settings.TG_RESTPP_PORT,
                gsPort=settings.TG_GS_PORT,
                useCert=True
            )
            cls._instance.getToken()
        return cls._instance
```

### 2. Multi-Hop Graph Traversal Query (GSQL)
```gsql
CREATE QUERY multi_hop_patient_trace(VERTEX<Patient> target_patient, INT max_hops=3) FOR GRAPH MyGraph {
    OrAccum @visited = false;
    ListAccum<EDGE> @@path_edges;

    Start = { target_patient };
    
    Start = SELECT s FROM Start:s
            POST-ACCUM s.@visited += true;

    Current = Start;
    WHILE Current.size() > 0 LIMIT max_hops DO
        Current = SELECT t FROM Current:s -( :e )-> :t
                  WHERE t.@visited == false
                  ACCUM @@path_edges += e
                  POST-ACCUM t.@visited += true;
    END;

    PRINT @@path_edges;
}
```

### 3. Asynchronous Worker Job Dispatch (Celery)
```python
# backend/app/tasks/ingestion_tasks.py
from celery import Celery

celery_app = Celery("rag_tasks", broker="redis://redis:6379/0", backend="redis://redis:6379/1")

@celery_app.task(bind=True, max_retries=3)
def process_document_pipeline(self, file_path: str, tenant_id: str):
    # 1. OCR & Parsing
    # 2. Clinical NER & Entity Resolution
    # 3. TigerGraph Vertex/Edge Upsert
    # 4. Dense Vector Generation & Indexing
    return {"status": "SUCCESS", "file": file_path}
```

---

## 🏁 Summary Impact
By executing this scaling plan:
1. **Query Capacity**: Increases from **1 query sequentially** to **500+ queries/second**.
2. **Knowledge Capacity**: Expands from **16 documents / 22 nodes** to **10,000,000+ documents and 50M+ entities**.
3. **Cost Efficiency**: Semantic caching and smart routing reduce LLM API operational expenditure by up to **75%**.
4. **Reliability**: Eliminates single-point-of-failure fallbacks with high-availability clustering and automatic retries.
