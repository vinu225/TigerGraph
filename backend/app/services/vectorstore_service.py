from langchain_chroma import Chroma

from app.services.embedding_service import get_embedding_model

CHROMA_PATH = "vector_store"

def get_vectorstore():

    embeddings = get_embedding_model()

    vectorstore = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings
    )

    return vectorstore