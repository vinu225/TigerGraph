# Healthcare GraphRAG Evaluation Report

## Pipeline Configuration
- LLM Provider: Google Gemini
- Embedding: Google text-embedding-004 (GraphRAG) / all-MiniLM-L6-v2 (Traditional RAG)

## LLM Judge Scores

| Pipeline | Avg Score | Questions |
|----------|-----------|-----------|
| llm_only | 0.00/10 | 7 |
| traditional_rag | 0.00/10 | 7 |
| graph_rag | 0.00/10 | 7 |

## BERTScore Results

| Pipeline | Avg F1 |
|----------|--------|
| llm_only | 0.5153 |
| traditional_rag | 0.4963 |
| graph_rag | 0.6793 |
