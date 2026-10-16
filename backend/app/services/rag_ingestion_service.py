import os

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.services.vectorstore_service import get_vectorstore

UPLOAD_DIR = "datasets/raw"

async def ingest_pdf(file_path: str):

    loader = PyPDFLoader(file_path)

    documents = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = text_splitter.split_documents(documents)

    vectorstore = get_vectorstore()

    vectorstore.add_documents(chunks)

    return {
        "status": "success",
        "chunks_created": len(chunks),
        "file_name": os.path.basename(file_path)
    }