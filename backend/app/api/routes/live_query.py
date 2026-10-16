import asyncio
import traceback

from fastapi import APIRouter, HTTPException

from app.models.request_models import QueryRequest
from app.models.response_models import LiveQueryResponse
from app.services.llm_service import generate_llm_response
from app.services.rag_service import generate_rag_response
from app.services.graphrag_service import generate_graphrag_response
from app.services.evaluation_service import llm_judge_evaluate

router = APIRouter(prefix="/api")


@router.post("/live-query")
async def live_query(request: QueryRequest):
    """
    Runs the user's query through all 3 pipelines concurrently:
    LLM-only, Traditional RAG, and GraphRAG.
    Returns all three responses.
    """

    try:
        llm_task = generate_llm_response(request.query)
        rag_task = generate_rag_response(request.query)
        graphrag_task = generate_graphrag_response(request.query)

        llm_result, rag_result, graphrag_result = await asyncio.gather(
            llm_task, rag_task, graphrag_task
        )

        return {
            "query": request.query,
            "llm_only": llm_result,
            "traditional_rag": rag_result,
            "graph_rag": graphrag_result,
        }

    except Exception as e:
        error_msg = str(e)
        if "API_KEY_EXHAUSTED" in error_msg:
            raise HTTPException(status_code=429, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.post("/live-judge")
async def live_judge(request: QueryRequest):
    """
    Runs the query through all 3 pipelines, then evaluates
    all answers using LLM-as-Judge.
    Returns pipeline answers + judge scores.
    """

    try:
        llm_task = generate_llm_response(request.query)
        rag_task = generate_rag_response(request.query)
        graphrag_task = generate_graphrag_response(request.query)

        llm_result, rag_result, graphrag_result = await asyncio.gather(
            llm_task, rag_task, graphrag_task
        )

        # Prepare answers dict for the judge
        answers = {
            "llm_only": llm_result["answer"],
            "traditional_rag": rag_result["answer"],
            "graph_rag": graphrag_result["answer"],
        }

        judge_results = await llm_judge_evaluate(
            question=request.query,
            answers=answers
        )

        return {
            "query": request.query,
            "llm_only": llm_result,
            "traditional_rag": rag_result,
            "graph_rag": graphrag_result,
            "judge": judge_results,
        }

    except Exception as e:
        error_msg = str(e)
        if "API_KEY_EXHAUSTED" in error_msg:
            raise HTTPException(status_code=429, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
