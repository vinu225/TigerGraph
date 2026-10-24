from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "MedGraphRAG Platform")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")  # "ollama", "openrouter", "groq", "gemini"
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "qwen/qwen-2.5-7b-instruct:free")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # Legacy / Fallback Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-3-flash-preview")

    # Vector Store Settings
    VECTOR_STORE_BACKEND: str = os.getenv("VECTOR_STORE_BACKEND", "lancedb")  # "lancedb" or "chroma"
    LANCEDB_DIR: str = os.getenv("LANCEDB_DIR", "data/lancedb")

    # Knowledge Graph Settings
    GRAPH_STORE_BACKEND: str = os.getenv("GRAPH_STORE_BACKEND", "kuzudb")    # "kuzudb" or "mock"
    KUZU_DB_DIR: str = os.getenv("KUZU_DB_DIR", "data/kuzudb")

    # Embedding Settings
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")

    # Observability
    LANGCHAIN_API_KEY: str = os.getenv("LANGCHAIN_API_KEY", "")
    LANGCHAIN_TRACING_V2: str = os.getenv("LANGCHAIN_TRACING_V2", "false")
    LANGCHAIN_PROJECT: str = os.getenv("LANGCHAIN_PROJECT", "MedGraphRAG")

settings = Settings()