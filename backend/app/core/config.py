from dotenv import load_dotenv
import os

load_dotenv()

class Settings:

    APP_NAME = os.getenv("APP_NAME")
    DEBUG = os.getenv("DEBUG")

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    LLM_MODEL = os.getenv("LLM_MODEL")

    LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY")
    LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2")
    LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT")

settings = Settings()