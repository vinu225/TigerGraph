# Healthcare GraphRAG Intelligence Platform — Frontend

> A world-class React frontend for comparing LLM-only, Traditional RAG, and GraphRAG pipelines on multi-hop healthcare reasoning tasks.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero section with animated graph background and key stats |
| Benchmark | `/dashboard/benchmark` | BERTScore leaderboard, charts, QA pair comparison |
| Live Upload | `/dashboard/live` | Drag-drop documents, query, LLM-as-Judge evaluation |
| Documents | `/dashboard/documents` | 15-document library with search, filters, entity tags |
| Knowledge Graph | `/dashboard/graph` | Interactive SVG graph with node filtering and zoom |
| Architecture | `/dashboard/architecture` | Pipeline flow diagram and tech stack overview |

## Two Modes

### Mode 1 — Benchmark / Research Mode
- Uses fixed evaluation dataset (7 multi-hop healthcare QA pairs)
- BERTScore + LLM-as-Judge evaluation
- Shows leaderboard, precision/recall/F1 charts, per-question comparison

### Mode 2 — Live Upload Mode
- Upload custom TXT/PDF documents
- Query across all 3 pipelines simultaneously
- **Only LLM-as-Judge** evaluation (no BERTScore — no ground truth available)

## Tech Stack

- **React 19** + **Vite 8**
- **Tailwind CSS v4** (dark healthcare theme, glassmorphism)
- **Framer Motion** (page transitions, micro-animations)
- **Recharts** (bar, line, radar charts)
- **Lucide React** (icons)
- **React Router DOM v7** (nested routing)
- **Axios** (API layer)
- **React Dropzone** (file upload)

## Environment Variables

Copy `.env.example` to `.env` and adjust API URLs:

```
VITE_API_URL=http://localhost:8000
VITE_RAG_URL=http://localhost:8080
VITE_BACKEND_URL=http://localhost:8002
```

## Key Benchmark Results

| Pipeline | BERTScore F1 | Recall |
|----------|-------------|--------|
| **GraphRAG** | **0.6793** | **0.7663** |
| LLM Only | 0.5153 | 0.5378 |
| Traditional RAG | 0.4963 | 0.5347 |

> GraphRAG achieves **32% higher semantic alignment** than LLM-only.
