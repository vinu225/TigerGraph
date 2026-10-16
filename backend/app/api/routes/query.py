from fastapi import APIRouter

from app.models.request_models import QueryRequest
from app.models.response_models import QueryResponse
from app.services.llm_service import generate_llm_response

router = APIRouter(prefix="/api")

@router.post("/query", response_model=QueryResponse)
async def query_pipeline(request: QueryRequest):

    llm_result = await generate_llm_response(request.query)

    return {
        "query": request.query,
        "llm_only": llm_result
    }