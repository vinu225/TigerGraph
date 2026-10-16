from fastapi import APIRouter

from app.models.request_models import QueryRequest
from app.models.response_models import BenchmarkResponse

from app.services.llm_service import generate_llm_response
from app.services.rag_service import generate_rag_response

router = APIRouter(prefix="/api")


@router.post(
    "/benchmark",
    response_model=BenchmarkResponse
)
async def benchmark(request: QueryRequest):

    llm_result = await generate_llm_response(
        request.query
    )

    rag_result = await generate_rag_response(
        request.query
    )

    return {
        "query": request.query,
        "llm_only": llm_result,
        "traditional_rag": rag_result
    }