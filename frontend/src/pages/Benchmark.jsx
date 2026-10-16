import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, Legend } from 'recharts';
import { Trophy, ChevronDown, ChevronUp, Clock, Target, Crosshair, TrendingUp, Zap } from 'lucide-react';
import { bertScoreResults, perQuestionBertScores, benchmarkLatency, groundTruth, pipelineAnswers } from '../data/mockData';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const COLORS = { llm_only: '#ef4444', traditional_rag: '#f59e0b', graph_rag: '#6366f1' };
const LABELS = { llm_only: 'LLM Only', traditional_rag: 'Traditional RAG', graph_rag: 'GraphRAG' };

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary-light' }) {
  return (
    <motion.div variants={fadeUp} className="glass rounded-2xl p-5 hover:glow-primary transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-surface-lighter flex items-center justify-center">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </motion.div>
  );
}

function LeaderboardCard() {
  const pipelines = ['graph_rag', 'llm_only', 'traditional_rag'];
  return (
    <motion.div variants={fadeUp} className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-semibold">BERTScore Leaderboard</h3>
      </div>
      <div className="space-y-3">
        {pipelines.map((p, i) => {
          const d = bertScoreResults[p];
          const isFirst = i === 0;
          return (
            <div key={p} className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isFirst ? 'bg-primary/10 border border-primary/20 glow-primary' : 'bg-surface-lighter/50'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${isFirst ? 'bg-primary text-white' : 'bg-surface-lighter text-gray-400'}`}>
                #{i + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{LABELS[p]}</div>
                <div className="flex gap-4 mt-1">
                  <span className="text-xs text-gray-500">P: {d.average_precision.toFixed(4)}</span>
                  <span className="text-xs text-gray-500">R: {d.average_recall.toFixed(4)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold" style={{ color: COLORS[p] }}>{d.average_f1.toFixed(4)}</div>
                <div className="text-xs text-gray-500">F1 Score</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 p-3 rounded-xl bg-success/10 border border-success/20">
        <p className="text-xs text-success font-medium">
          <TrendingUp className="w-3 h-3 inline mr-1" />
          GraphRAG achieved 32% higher semantic alignment than LLM-only and 37% higher than Traditional RAG.
        </p>
      </div>
    </motion.div>
  );
}

function QACard({ qa, index }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div variants={fadeUp} className="glass rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-surface-lighter/30 transition-colors">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary-light shrink-0">
          Q{qa.id}
        </div>
        <p className="flex-1 text-sm font-medium leading-relaxed">{qa.question}</p>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4">
              <div className="p-4 rounded-xl bg-success/5 border border-success/20">
                <div className="text-xs font-semibold text-success mb-2 uppercase tracking-wider">Ground Truth</div>
                <p className="text-sm text-gray-300 leading-relaxed">{qa.ground_truth_answer}</p>
              </div>
              {['graph_rag', 'traditional_rag', 'llm_only'].map((p) => {
                const ans = pipelineAnswers[p]?.find((a) => a.id === qa.id);
                const score = perQuestionBertScores[p]?.find((s) => s.id === qa.id);
                return (
                  <div key={p} className="p-4 rounded-xl bg-surface-lighter/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS[p] }}>{LABELS[p]}</span>
                      {score && <span className="text-xs px-2 py-1 rounded-full bg-surface-lighter font-mono">F1: {score.f1.toFixed(4)}</span>}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{ans?.answer || 'No answer available'}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Benchmark() {
  const [activeTab, setActiveTab] = useState('overview');

  const barData = Object.keys(bertScoreResults).map((p) => ({
    name: LABELS[p],
    F1: +(bertScoreResults[p].average_f1 * 100).toFixed(1),
    Precision: +(bertScoreResults[p].average_precision * 100).toFixed(1),
    Recall: +(bertScoreResults[p].average_recall * 100).toFixed(1),
  }));

  const radarData = ['Precision', 'Recall', 'F1', 'Speed', 'Coverage'].map((metric) => {
    const row = { metric };
    if (metric === 'Precision') { row.GraphRAG = 61; row.Traditional = 46; row.LLM = 50; }
    else if (metric === 'Recall') { row.GraphRAG = 77; row.Traditional = 53; row.LLM = 54; }
    else if (metric === 'F1') { row.GraphRAG = 68; row.Traditional = 50; row.LLM = 52; }
    else if (metric === 'Speed') { row.GraphRAG = 70; row.Traditional = 85; row.LLM = 60; }
    else { row.GraphRAG = 90; row.Traditional = 55; row.LLM = 35; }
    return row;
  });

  const perQData = groundTruth.map((q) => ({
    name: `Q${q.id}`,
    GraphRAG: +(perQuestionBertScores.graph_rag[q.id - 1]?.f1 * 100).toFixed(1),
    'Trad. RAG': +(perQuestionBertScores.traditional_rag[q.id - 1]?.f1 * 100).toFixed(1),
    'LLM Only': +(perQuestionBertScores.llm_only[q.id - 1]?.f1 * 100).toFixed(1),
  }));

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'qa', label: 'QA Pairs' },
    { id: 'charts', label: 'Analytics' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Benchmark <span className="text-gradient">Research Mode</span></h2>
        <p className="text-sm text-gray-500">7 multi-hop healthcare questions · 15 synthetic documents · BERTScore + LLM Judge evaluation</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === t.id ? 'bg-primary text-white' : 'glass text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }} className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Target} label="Best F1 Score" value="0.6793" sub="GraphRAG (BERTScore)" color="text-primary-light" />
            <StatCard icon={Crosshair} label="Best Recall" value="76.63%" sub="GraphRAG semantic coverage" color="text-accent" />
            <StatCard icon={TrendingUp} label="Improvement" value="+32%" sub="vs LLM-only baseline" color="text-neon-green" />
            <StatCard icon={Clock} label="Avg Latency" value="10.0s" sub="GraphRAG response time" color="text-warning" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <LeaderboardCard />
            {/* BERTScore Chart */}
            <motion.div variants={fadeUp} className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">BERTScore Comparison (%)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="F1" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Precision" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Recall" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Per-Question Chart */}
          <motion.div variants={fadeUp} className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Per-Question F1 Scores (%)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={perQData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="GraphRAG" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="Trad. RAG" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="LLM Only" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Radar */}
          <motion.div variants={fadeUp} className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Multi-Dimensional Comparison</h3>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
                <Radar name="GraphRAG" dataKey="GraphRAG" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Traditional RAG" dataKey="Traditional" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                <Radar name="LLM Only" dataKey="LLM" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'qa' && (
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }} className="space-y-4">
          <p className="text-sm text-gray-400">Click any question to expand and compare pipeline outputs with ground truth.</p>
          {groundTruth.map((qa, i) => <QACard key={qa.id} qa={qa} index={i} />)}
        </motion.div>
      )}

      {activeTab === 'charts' && (
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }} className="space-y-6">
          <motion.div variants={fadeUp} className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Latency Comparison</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={Object.keys(benchmarkLatency).map((p) => ({ name: LABELS[p], 'Avg (s)': benchmarkLatency[p].avg_latency, 'Total (s)': benchmarkLatency[p].total_time }))} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="Avg (s)" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Total (s)" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
          <motion.div variants={fadeUp} className="grid md:grid-cols-3 gap-4">
            {Object.keys(LABELS).map((p) => {
              const bs = bertScoreResults[p];
              return (
                <div key={p} className="glass rounded-2xl p-5">
                  <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS[p] }}>{LABELS[p]}</h4>
                  {['average_precision', 'average_recall', 'average_f1'].map((m) => (
                    <div key={m} className="flex justify-between items-center py-2 border-b border-surface-lighter last:border-0">
                      <span className="text-xs text-gray-500 capitalize">{m.replace('average_', '')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-surface-lighter overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${bs[m] * 100}%`, background: COLORS[p] }} />
                        </div>
                        <span className="text-xs font-mono">{bs[m].toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
