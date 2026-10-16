import { motion } from 'framer-motion';
import { FileText, Brain, Database, GitBranch, BarChart3, Cpu, ArrowRight, Zap, Server, Search, Layers } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const pipelineSteps = [
  { icon: FileText, title: 'Document Ingestion', desc: '15 synthetic healthcare documents (clinical records, supply chain reports, equipment logs, insurance claims) are parsed and chunked.', color: '#06b6d4' },
  { icon: Layers, title: 'Embedding Generation', desc: 'Text chunks are embedded using all-MiniLM-L6-v2 (384-dim) for Traditional RAG and text-embedding-004 via Google GenAI for GraphRAG.', color: '#a78bfa' },
  { icon: GitBranch, title: 'Knowledge Graph Construction', desc: 'Entities (patients, doctors, hospitals, medications) and relationships (treated_by, prescribed, delayed_by) are extracted and stored in TigerGraph.', color: '#6366f1' },
  { icon: Search, title: 'Retrieval & Multi-Hop Reasoning', desc: 'GraphRAG traverses entity relationships across multiple hops to find connected evidence that traditional vector search misses.', color: '#10b981' },
  { icon: Brain, title: 'LLM Generation', desc: 'Gemini gemini-3-flash-preview synthesizes the retrieved context into a coherent, evidence-grounded answer.', color: '#f472b6' },
  { icon: BarChart3, title: 'Evaluation Pipeline', desc: 'BERTScore (semantic similarity) and LLM-as-Judge (qualitative scoring) evaluate answer quality against ground truth.', color: '#f59e0b' },
];

const techStack = [
  { category: 'Frontend', items: [
    { name: 'React 19', desc: 'UI framework' },
    { name: 'Tailwind CSS v4', desc: 'Utility-first styling' },
    { name: 'Framer Motion', desc: 'Animations' },
    { name: 'Recharts', desc: 'Data visualization' },
  ]},
  { category: 'Backend', items: [
    { name: 'FastAPI', desc: 'REST API server' },
    { name: 'Gemini API', desc: 'gemini-3-flash-preview' },
    { name: 'FAISS', desc: 'Vector similarity search' },
    { name: 'LangChain', desc: 'RAG orchestration' },
  ]},
  { category: 'Graph Layer', items: [
    { name: 'TigerGraph', desc: 'Graph database' },
    { name: 'GraphRAG', desc: 'Graph-augmented retrieval' },
    { name: 'text-embedding-004', desc: 'GenAI embeddings' },
    { name: 'Docker', desc: 'Container orchestration' },
  ]},
  { category: 'Evaluation', items: [
    { name: 'BERTScore', desc: 'Semantic similarity (deberta-xlarge-mnli)' },
    { name: 'LLM Judge', desc: 'Gemini-powered scoring' },
    { name: 'all-MiniLM-L6-v2', desc: 'Local embedding model' },
    { name: 'Python 3.13', desc: 'Evaluation scripts' },
  ]},
];

export default function Architecture() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1">System <span className="text-gradient">Architecture</span></h2>
        <p className="text-sm text-gray-500">End-to-end pipeline from document ingestion to evaluation</p>
      </div>

      {/* Pipeline Flow */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
        <h3 className="text-lg font-semibold mb-4">Pipeline Flow</h3>
        <div className="space-y-4">
          {pipelineSteps.map((step, i) => (
            <motion.div key={step.title} variants={fadeUp} className="flex items-start gap-4">
              {/* Step Number + Line */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}>
                  <step.icon className="w-5 h-5" style={{ color: step.color }} />
                </div>
                {i < pipelineSteps.length - 1 && (
                  <div className="w-px h-8 bg-surface-lighter mt-2 relative">
                    <ArrowRight className="w-3 h-3 text-gray-600 absolute -bottom-1 -left-1.5 rotate-90" />
                  </div>
                )}
              </div>
              {/* Content */}
              <div className="glass rounded-2xl p-5 flex-1 hover:border-primary/20 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${step.color}20`, color: step.color }}>
                    STEP {i + 1}
                  </span>
                  <h4 className="text-sm font-semibold">{step.title}</h4>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Architecture Diagram */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
        className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-6">System Overview</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Traditional RAG */}
          <div className="space-y-3">
            <div className="text-center p-3 rounded-xl bg-warning/10 border border-warning/20">
              <Database className="w-6 h-6 text-warning mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-warning">Traditional RAG</h4>
            </div>
            <div className="space-y-2">
              {['Document Chunks', 'FAISS Vector Store', 'Cosine Similarity', 'Top-K Retrieval', 'LLM Generation'].map((s) => (
                <div key={s} className="text-xs text-gray-400 p-2 rounded-lg bg-surface-lighter/50 text-center">{s}</div>
              ))}
            </div>
            <div className="text-center p-2 rounded-lg bg-warning/5 border border-warning/10">
              <span className="text-xs text-warning font-mono">F1: 0.4963</span>
            </div>
          </div>

          {/* GraphRAG */}
          <div className="space-y-3">
            <div className="text-center p-3 rounded-xl bg-primary/10 border border-primary/20 glow-primary">
              <GitBranch className="w-6 h-6 text-primary-light mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-primary-light">GraphRAG</h4>
              <span className="text-xs text-primary-light/60">★ Best Pipeline</span>
            </div>
            <div className="space-y-2">
              {['Entity Extraction', 'TigerGraph Storage', 'Multi-Hop Traversal', 'Relationship Context', 'Graph-Augmented LLM'].map((s) => (
                <div key={s} className="text-xs text-gray-300 p-2 rounded-lg bg-primary/5 border border-primary/10 text-center">{s}</div>
              ))}
            </div>
            <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-xs text-primary-light font-mono font-bold">F1: 0.6793</span>
            </div>
          </div>

          {/* LLM Only */}
          <div className="space-y-3">
            <div className="text-center p-3 rounded-xl bg-danger/10 border border-danger/20">
              <Brain className="w-6 h-6 text-danger mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-danger">LLM Only</h4>
            </div>
            <div className="space-y-2">
              {['No Document Access', 'Parametric Knowledge', 'No Retrieval', 'No Context', 'Hallucination Risk'].map((s) => (
                <div key={s} className="text-xs text-gray-400 p-2 rounded-lg bg-surface-lighter/50 text-center">{s}</div>
              ))}
            </div>
            <div className="text-center p-2 rounded-lg bg-danger/5 border border-danger/10">
              <span className="text-xs text-danger font-mono">F1: 0.5153</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tech Stack */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
        <h3 className="text-lg font-semibold mb-4">Tech Stack</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {techStack.map((cat) => (
            <motion.div key={cat.category} variants={fadeUp} className="glass rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-gradient mb-3">{cat.category}</h4>
              <div className="space-y-3">
                {cat.items.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-light shrink-0" />
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Key Metrics Summary */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
        className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Key Findings</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { emoji: '🏆', text: 'GraphRAG achieves 0.6793 F1 — 32% better than LLM-only and 37% better than Traditional RAG' },
            { emoji: '🔍', text: 'GraphRAG Recall of 76.6% captures multi-hop entity relationships across 15 healthcare documents' },
            { emoji: '⚡', text: 'All pipelines powered by Gemini gemini-3-flash-preview — zero OpenAI dependency' },
            { emoji: '🩺', text: 'Healthcare-specific: traces medication interactions, equipment failures, supply chain disruptions' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-surface-lighter/50">
              <span className="text-xl">{f.emoji}</span>
              <p className="text-sm text-gray-300 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
