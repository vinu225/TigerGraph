import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, X, Send, Bot, AlertTriangle,
  CheckCircle, Loader2, Info, Brain, Database,
  GitBranch, Trophy, Clock, Coins, Hash, KeyRound
} from 'lucide-react';
import { ingestDocument, liveQuery, liveJudge } from '../services/api';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const PIPELINE_META = {
  llm_only: { label: 'LLM Only', icon: Brain, color: '#ef4444', bg: 'bg-danger/10', border: 'border-danger/20' },
  traditional_rag: { label: 'Traditional RAG', icon: Database, color: '#f59e0b', bg: 'bg-warning/10', border: 'border-warning/20' },
  graph_rag: { label: 'GraphRAG', icon: GitBranch, color: '#6366f1', bg: 'bg-primary/10', border: 'border-primary/20' },
};

/* ── API Key Alert Component ── */
function ApiKeyAlert({ message, onDismiss }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border-2 border-red-500/40 shadow-lg shadow-red-500/10"
    >
      <KeyRound className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-400">API Key Exhausted</p>
        <p className="text-xs text-red-300/80 mt-1">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-300">
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

/* ── Error Alert Component ── */
function ErrorAlert({ message, onDismiss }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 rounded-xl bg-danger/5 border border-danger/20"
    >
      <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
      <p className="text-xs text-danger flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-danger hover:text-red-300">
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

function extractErrorMessage(err) {
  // Check for our custom friendly message from interceptor
  if (err.friendlyMessage) return { isApiKey: true, message: err.friendlyMessage };

  const detail = err.response?.data?.detail || '';
  const status = err.response?.status;

  // Check for API key / quota errors
  if (
    status === 429 ||
    /API_KEY_EXHAUSTED/i.test(detail) ||
    /quota/i.test(detail) ||
    /RESOURCE_EXHAUSTED/i.test(detail)
  ) {
    return {
      isApiKey: true,
      message:
        'Your Google Gemini API key has run out of quota or been rate-limited. ' +
        'Please replace the API key in backend/.env and restart the server.',
    };
  }

  // Network / connection errors
  if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
    return {
      isApiKey: false,
      message: 'Cannot connect to the backend server. Make sure the backend is running on port 5000.',
    };
  }

  // Generic error
  return {
    isApiKey: false,
    message: detail || err.message || 'An unknown error occurred.',
  };
}

export default function LiveUpload() {
  const [files, setFiles] = useState([]);
  const [indexed, setIndexed] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [question, setQuestion] = useState('');
  const [querying, setQuerying] = useState(false);
  const [results, setResults] = useState(null);
  const [judging, setJudging] = useState(false);
  const [judgeResults, setJudgeResults] = useState(null);

  // Error states
  const [apiKeyError, setApiKeyError] = useState(null);
  const [generalError, setGeneralError] = useState(null);

  const onDrop = useCallback((accepted) => {
    setFiles((prev) => [
      ...prev,
      ...accepted.map((f) => ({ file: f, name: f.name, size: f.size, status: 'ready' })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'], 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const clearErrors = () => {
    setApiKeyError(null);
    setGeneralError(null);
  };

  /* ── Index: upload each file to /api/ingest ── */
  const handleIndex = async () => {
    setIndexing(true);
    clearErrors();
    setFiles((prev) => prev.map((f) => ({ ...f, status: 'indexing' })));

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i].file);

        await ingestDocument(formData);

        setFiles((prev) =>
          prev.map((f, j) => (j === i ? { ...f, status: 'done' } : f))
        );
      }
      setIndexed(true);
    } catch (err) {
      console.error('Ingestion failed:', err);
      const { isApiKey, message } = extractErrorMessage(err);
      if (isApiKey) setApiKeyError(message);
      else setGeneralError(message);
      setFiles((prev) =>
        prev.map((f) => (f.status === 'indexing' ? { ...f, status: 'ready' } : f))
      );
    } finally {
      setIndexing(false);
    }
  };

  /* ── Query: call /api/live-query (all 3 pipelines) ── */
  const handleQuery = async () => {
    if (!question.trim()) return;
    setQuerying(true);
    setResults(null);
    setJudgeResults(null);
    clearErrors();

    try {
      const response = await liveQuery(question);
      const data = response.data;

      setResults({
        llm_only: data.llm_only,
        traditional_rag: data.traditional_rag,
        graph_rag: data.graph_rag,
      });
    } catch (err) {
      console.error('Query failed:', err);
      const { isApiKey, message } = extractErrorMessage(err);
      if (isApiKey) setApiKeyError(message);
      else setGeneralError(message);
    } finally {
      setQuerying(false);
    }
  };

  /* ── Judge: call /api/live-judge (all 3 + LLM judge) ── */
  const handleJudge = async () => {
    setJudging(true);
    clearErrors();

    try {
      const response = await liveJudge(question);
      const data = response.data;

      // Update pipeline results with fresh data
      setResults({
        llm_only: data.llm_only,
        traditional_rag: data.traditional_rag,
        graph_rag: data.graph_rag,
      });
      setJudgeResults(data.judge);
    } catch (err) {
      console.error('Judge failed:', err);
      const { isApiKey, message } = extractErrorMessage(err);
      if (isApiKey) setApiKeyError(message);
      else setGeneralError(message);
    } finally {
      setJudging(false);
    }
  };

  // Find the winner pipeline from judge results
  const getWinner = () => {
    if (!judgeResults) return null;
    let best = null;
    for (const [pipeline, result] of Object.entries(judgeResults)) {
      if (!best || (result.score || 0) > (best.score || 0)) {
        best = { pipeline, ...result };
      }
    }
    return best;
  };

  const winner = getWinner();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">
          Live Upload <span className="text-gradient">Mode</span>
        </h2>
        <p className="text-sm text-gray-500">
          Upload your own documents, ask questions, and compare pipeline responses in real-time
        </p>
      </div>

      {/* API Key Alert — always at the top */}
      <ApiKeyAlert message={apiKeyError} onDismiss={() => setApiKeyError(null)} />

      {/* General Error Alert */}
      <ErrorAlert message={generalError} onDismiss={() => setGeneralError(null)} />

      {/* Notice */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex items-start gap-3 p-4 rounded-xl bg-accent/5 border border-accent/20"
      >
        <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-accent">Evaluation Notice</p>
          <p className="text-xs text-gray-400 mt-1">
            Ground-truth references are unavailable for uploaded datasets. Therefore only qualitative{' '}
            <strong className="text-gray-300">LLM-as-Judge</strong> evaluation is used. BERTScore
            requires fixed reference answers and is disabled for this mode.
          </p>
        </div>
      </motion.div>

      {/* Upload Area */}
      {!indexed && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="space-y-4"
        >
          <motion.div
            variants={fadeUp}
            {...getRootProps()}
            className={`glass rounded-2xl p-10 text-center cursor-pointer transition-all border-2 border-dashed ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-surface-lighter hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload
              className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-primary-light' : 'text-gray-500'}`}
            />
            <p className="text-sm font-medium mb-1">
              {isDragActive ? 'Drop files here' : 'Drag & drop your documents'}
            </p>
            <p className="text-xs text-gray-500">Supports .txt and .pdf files</p>
          </motion.div>

          {files.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary-light shrink-0" />
                  <span className="text-sm flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-gray-500">{(f.size / 1024).toFixed(1)} KB</span>
                  {f.status === 'indexing' && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
                  {f.status === 'done' && <CheckCircle className="w-4 h-4 text-success" />}
                  {f.status === 'ready' && (
                    <button onClick={() => removeFile(i)} className="text-gray-500 hover:text-danger">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={handleIndex}
                disabled={indexing || files.length === 0}
                className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {indexing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Indexing & Building Knowledge
                    Graph...
                  </>
                ) : (
                  'Index Documents & Build Graph'
                )}
              </button>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Indexed Success */}
      {indexed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-5 flex items-center gap-3 border border-success/20"
        >
          <CheckCircle className="w-5 h-5 text-success shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-success">
              {files.length} document{files.length > 1 ? 's' : ''} indexed successfully
            </p>
            <p className="text-xs text-gray-500">Knowledge graph built. Ready for queries.</p>
          </div>
          <button
            onClick={() => {
              setIndexed(false);
              setFiles([]);
              setResults(null);
              setJudgeResults(null);
              clearErrors();
            }}
            className="text-xs text-gray-500 hover:text-white"
          >
            Reset
          </button>
        </motion.div>
      )}

      {/* Query Interface */}
      {indexed && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="space-y-6"
        >
          <motion.div variants={fadeUp} className="glass rounded-2xl p-5">
            <label className="text-sm font-medium mb-3 block">
              Ask a question about your documents
            </label>
            <div className="flex gap-3">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !querying && handleQuery()}
                placeholder="e.g., What medication interactions were found across patient records?"
                className="flex-1 bg-surface-lighter border border-surface-lighter focus:border-primary rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder:text-gray-600"
              />
              <button
                onClick={handleQuery}
                disabled={querying || !question.trim()}
                className="px-6 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0"
              >
                {querying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {querying ? 'Querying 3 Pipelines...' : 'Query'}
              </button>
            </div>
          </motion.div>

          {/* Results */}
          <AnimatePresence>
            {results && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Winner Banner */}
                {winner && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl p-5 border border-primary/30 bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <Trophy className="w-6 h-6 text-yellow-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Winner:{' '}
                          <span style={{ color: PIPELINE_META[winner.pipeline]?.color || '#fff' }}>
                            {PIPELINE_META[winner.pipeline]?.label || winner.pipeline}
                          </span>
                          <span className="ml-2 text-yellow-400">
                            Score: {winner.score}/10
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{winner.reasoning}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {Object.entries(results).map(([pipeline, pipelineData]) => {
                  const meta = PIPELINE_META[pipeline];
                  if (!meta) return null;
                  const judge = judgeResults?.[pipeline];
                  const isWinner = winner?.pipeline === pipeline;
                  const Icon = meta.icon;

                  return (
                    <motion.div
                      key={pipeline}
                      variants={fadeUp}
                      className={`glass rounded-2xl p-5 border ${
                        isWinner
                          ? 'border-yellow-400/40 ring-1 ring-yellow-400/20'
                          : meta.border
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-4 h-4" style={{ color: meta.color }} />
                        <h4 className="text-sm font-semibold" style={{ color: meta.color }}>
                          {meta.label}
                        </h4>
                        {isWinner && <Trophy className="w-4 h-4 text-yellow-400 ml-1" />}
                        {judge && (
                          <span
                            className="ml-auto text-xs px-3 py-1 rounded-full font-mono"
                            style={{ background: `${meta.color}20`, color: meta.color }}
                          >
                            Judge Score: {judge.score}/10
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-300 leading-relaxed">
                        {pipelineData?.answer || 'No response received.'}
                      </p>

                      {/* Metrics Row */}
                      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-white/5">
                        {pipelineData?.latency != null && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{pipelineData.latency}s</span>
                          </div>
                        )}
                        {pipelineData?.tokens_used != null && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Hash className="w-3 h-3" />
                            <span>{pipelineData.tokens_used} tokens</span>
                          </div>
                        )}
                        {pipelineData?.cost != null && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Coins className="w-3 h-3" />
                            <span>${Number(pipelineData.cost).toFixed(6)}</span>
                          </div>
                        )}
                        {pipelineData?.retrieved_chunks != null && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Database className="w-3 h-3" />
                            <span>{pipelineData.retrieved_chunks} chunks</span>
                          </div>
                        )}
                      </div>

                      {judge && (
                        <div className="mt-3 p-3 rounded-xl bg-surface-lighter/50">
                          <p className="text-xs text-gray-500">
                            <strong>Reasoning:</strong> {judge.reasoning}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* Judge Button */}
                {!judgeResults && (
                  <button
                    onClick={handleJudge}
                    disabled={judging}
                    className="w-full py-3 glass hover:bg-surface-lighter rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 border border-primary/20"
                  >
                    {judging ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Running LLM-as-Judge
                        Evaluation...
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4" /> Run LLM-as-Judge Evaluation
                      </>
                    )}
                  </button>
                )}

                {/* BERTScore Disabled Notice */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/5 border border-warning/20">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-400">
                    <strong className="text-warning">BERTScore Disabled:</strong> BERTScore requires
                    fixed reference answers and therefore is disabled for uploaded datasets. Only
                    LLM-as-Judge qualitative evaluation is available in Live mode.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
