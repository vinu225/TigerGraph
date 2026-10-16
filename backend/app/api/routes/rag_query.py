from fastapi import APIRouter

from app.models.request_models import QueryRequest
from app.models.response_models import RagQueryResponse

from app.services.rag_service import generate_rag_response

router = APIRouter(prefix="/api")

@router.post("/rag-query", response_model=RagQueryResponse)
async def rag_query(request: QueryRequest):

    rag_result = await generate_rag_response(request.query)

    return {
        "query": request.query,
        "rag_response": rag_result
    }