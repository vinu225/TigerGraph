from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.query import router as query_router
from app.api.routes.ingest import router as ingest_router
from app.api.routes.rag_query import router as rag_router
from app.api.routes.benchmark import (
    router as benchmark_router
)
from app.api.routes.live_query import (
    router as live_query_router
)



app = FastAPI(
    title="MedGraphRAG Benchmark API",
    description="Multi-Hop Healthcare Reasoning using GraphRAG",
    version="1.0.0",
)

# CORS — allow frontend in Docker and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(query_router)
app.include_router(ingest_router)
app.include_router(rag_router)
app.include_router(benchmark_router)
app.include_router(live_query_router)

@app.get("/")
async def root():
    return {
        "message": "GraphRAG Backend Running"
    }