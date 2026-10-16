from pydantic import BaseModel
from typing import Optional


class PipelineResult(BaseModel):
    answer: str
    tokens_used: int
    prompt_tokens: int
    completion_tokens: int
    latency: float
    cost: float


class QueryResponse(BaseModel):
    query: str
    llm_only: PipelineResult


class RagPipelineResult(BaseModel):
    answer: str
    retrieved_chunks: int
    context: str
    tokens_used: int
    prompt_tokens: int
    completion_tokens: int
    latency: float
    cost: float


class RagQueryResponse(BaseModel):
    query: str
    rag_response: RagPipelineResult


class BenchmarkResponse(BaseModel):
    query: str
    llm_only: PipelineResult
    traditional_rag: RagPipelineResult


class LiveQueryResponse(BaseModel):
    query: str
    llm_only: PipelineResult
    traditional_rag: RagPipelineResult
    graph_rag: RagPipelineResult


class JudgeScore(BaseModel):
    score: int
    reasoning: str


class LiveJudgeResponse(BaseModel):
    query: str
    llm_only: PipelineResult
    traditional_rag: RagPipelineResult
    graph_rag: RagPipelineResult
    judge: dict[str, JudgeScore]