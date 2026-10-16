import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Brain, Shield, Zap, ArrowRight, GitBranch, BarChart3, Search } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

function FloatingNode({ x, y, delay, size = 6 }) {
  return (
    <motion.div
      className="absolute rounded-full bg-primary/20 border border-primary/30"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{ y: [0, -15, 0], opacity: [0.3, 0.8, 0.3] }}
      transition={{ duration: 4, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function FloatingEdge({ x1, y1, x2, y2, delay }) {
  return (
    <motion.div className="absolute" style={{ left: `${Math.min(x1, x2)}%`, top: `${Math.min(y1, y2)}%` }}
      initial={{ opacity: 0 }} animate={{ opacity: [0, 0.2, 0] }}
      transition={{ duration: 5, delay, repeat: Infinity }}>
      <svg width="200" height="200" className="overflow-visible">
        <line x1="0" y1="0" x2={`${(x2 - x1) * 2}`} y2={`${(y2 - y1) * 2}`}
          stroke="#6366f1" strokeWidth="0.5" strokeDasharray="4 4" />
      </svg>
    </motion.div>
  );
}

const features = [
  { icon: Brain, title: 'Multi-Hop Reasoning', desc: 'Traverse knowledge graphs to connect clinical entities across multiple documents and trace causal chains.', color: 'text-primary-light' },
  { icon: GitBranch, title: 'Knowledge Graph RAG', desc: 'Graph-augmented retrieval captures relationships that traditional vector search misses entirely.', color: 'text-accent' },
  { icon: BarChart3, title: 'Quantified Superiority', desc: 'GraphRAG achieves 0.68 F1 vs 0.50 for Traditional RAG — a 32% improvement in semantic alignment.', color: 'text-neon-green' },
  { icon: Shield, title: 'Healthcare Safety', desc: 'Trace medication interactions, equipment failures, and supply chain disruptions across the care continuum.', color: 'text-neon-pink' },
];

const stats = [
  { value: '0.6793', label: 'GraphRAG F1', sub: 'BERTScore' },
  { value: '32%', label: 'Improvement', sub: 'vs LLM-only' },
  { value: '76.6%', label: 'Recall', sub: 'Semantic Coverage' },
  { value: '15', label: 'Documents', sub: 'Healthcare Corpus' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      {[...Array(12)].map((_, i) => (
        <FloatingNode key={i} x={10 + Math.random() * 80} y={10 + Math.random() * 80} delay={i * 0.5} size={4 + Math.random() * 8} />
      ))}
      {[...Array(6)].map((_, i) => (
        <FloatingEdge key={`e${i}`} x1={10 + i * 15} y1={20 + i * 10} x2={20 + i * 12} y2={30 + i * 8} delay={i * 0.8} />
      ))}

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-light" />
          </div>
          <span className="text-lg font-semibold tracking-tight">HealthGraph<span className="text-primary-light">RAG</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/dashboard/benchmark" className="text-sm text-gray-400 hover:text-white transition-colors">Benchmark</Link>
          <Link to="/dashboard" className="px-5 py-2.5 bg-primary hover:bg-primary-dark rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-primary/25">
            Launch Platform
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
        <motion.div className="text-center max-w-4xl mx-auto" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.15 } } }}>
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-primary-light mb-8">
            <Zap className="w-4 h-4" /> Powered by Gemini + TigerGraph
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
            Healthcare <span className="text-gradient">GraphRAG</span>
            <br />Intelligence System
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Multi-hop reasoning over healthcare knowledge graphs. Trace medication interactions, equipment failures, and supply chain disruptions that traditional RAG cannot see.
          </motion.p>
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-4">
            <Link to="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-dark rounded-xl text-base font-semibold transition-all hover:shadow-xl hover:shadow-primary/25 glow-primary">
              Launch Platform <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/dashboard/benchmark" className="inline-flex items-center gap-2 px-8 py-4 glass hover:bg-surface-lighter rounded-xl text-base font-medium transition-all">
              <BarChart3 className="w-5 h-5" /> View Benchmark
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats Row */}
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl mx-auto"
          initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.6 } } }}>
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="glass rounded-2xl p-6 text-center hover:glow-primary transition-shadow">
              <div className="text-3xl font-bold text-gradient mb-1">{s.value}</div>
              <div className="text-sm font-medium text-gray-300">{s.label}</div>
              <div className="text-xs text-gray-500 mt-1">{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-8 pb-32">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp}
              className="glass rounded-2xl p-6 hover:border-primary/30 transition-all group hover:glow-primary">
              <div className="w-12 h-12 rounded-xl bg-surface-lighter flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Comparison Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-32">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-center mb-4">Why <span className="text-gradient">GraphRAG</span> Wins</motion.h2>
          <motion.p variants={fadeUp} className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Traditional RAG retrieves relevant chunks. GraphRAG traces entity relationships across the entire knowledge graph.
          </motion.p>
          <motion.div variants={fadeUp} className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'LLM Only', f1: '0.5153', emoji: '⚠️', desc: 'Hallucinates details. Cannot access private healthcare documents.', border: 'border-danger/30' },
              { name: 'Traditional RAG', f1: '0.4963', emoji: '📄', desc: 'Retrieves chunks but misses cross-document relationships.', border: 'border-warning/30' },
              { name: 'GraphRAG', f1: '0.6793', emoji: '🏆', desc: 'Traces multi-hop entity paths. Highest precision and recall.', border: 'border-success/30 glow-accent' },
            ].map((p) => (
              <div key={p.name} className={`glass rounded-2xl p-6 border ${p.border} transition-all`}>
                <div className="text-2xl mb-3">{p.emoji}</div>
                <h3 className="text-lg font-semibold mb-1">{p.name}</h3>
                <div className="text-3xl font-bold text-gradient mb-3">{p.f1}</div>
                <div className="text-xs text-gray-500 mb-3">BERTScore F1</div>
                <p className="text-sm text-gray-400">{p.desc}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-lighter py-8 text-center text-sm text-gray-500">
        Healthcare GraphRAG Intelligence System — Hackathon 2025
      </footer>
    </div>
  );
}
