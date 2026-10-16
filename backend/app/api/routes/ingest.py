import os

from fastapi import APIRouter, UploadFile, File

from app.services.rag_ingestion_service import ingest_pdf

router = APIRouter(prefix="/api")

UPLOAD_DIR = "datasets/raw"

os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/ingest")
async def upload_pdf(file: UploadFile = File(...)):

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    result = await ingest_pdf(file_path)

    return result