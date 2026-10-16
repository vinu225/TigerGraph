import axios from 'axios';

// Use relative URLs — the frontend nginx proxies /api/ to the backend.
// For local dev (npm run dev), fallback to localhost:5000.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Error interceptor ──
// Catches API-key-exhausted / quota errors and surfaces them clearly.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.response?.data?.error?.message || '';

    if (
      status === 429 ||
      status === 403 ||
      /quota/i.test(detail) ||
      /exhausted/i.test(detail) ||
      /rate.?limit/i.test(detail) ||
      /API_KEY/i.test(detail) ||
      /RESOURCE_EXHAUSTED/i.test(detail)
    ) {
      const msg =
        '🔑 API Key Quota Exhausted — Your Google Gemini API key has run out of quota. ' +
        'Please update your API key in the backend .env file and restart the server.';
      error.friendlyMessage = msg;
    }

    return Promise.reject(error);
  }
);

// ── Existing endpoints ──
export const queryGraphRAG = (question) => api.post('/api/query', { query: question });
export const queryTraditionalRAG = (question) => api.post('/api/rag-query', { query: question });
export const queryLLMOnly = (question) => api.post('/api/query', { query: question });
export const runBenchmark = (question) => api.post('/api/benchmark', { query: question });

// ── Document ingestion ──
export const ingestDocument = (formData) =>
  api.post('/api/ingest', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

// ── Live Upload pipeline endpoints ──
export const liveQuery = (question) => api.post('/api/live-query', { query: question });
export const liveJudge = (question) => api.post('/api/live-judge', { query: question });

export default api;
