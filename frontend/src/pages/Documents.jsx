import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Filter, Users, Building2, Pill, Tag, ChevronRight } from 'lucide-react';
import { documents } from '../data/mockData';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const TYPE_COLORS = { Clinical: '#6366f1', 'Supply Chain': '#f59e0b', Equipment: '#f472b6', Insurance: '#ef4444', Administrative: '#06b6d4' };
const TYPE_ICONS = { Clinical: Users, 'Supply Chain': Building2, Equipment: Tag, Insurance: FileText, Administrative: FileText };

export default function Documents() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selected, setSelected] = useState(null);

  const types = ['All', ...new Set(documents.map((d) => d.type))];
  const filtered = documents.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.summary.toLowerCase().includes(search.toLowerCase()) ||
      d.entities.some((e) => e.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === 'All' || d.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Document <span className="text-gradient">Library</span></h2>
        <p className="text-sm text-gray-500">15 synthetic healthcare documents powering the knowledge graph</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents, entities, or keywords..."
            className="w-full bg-surface-lighter border border-surface-lighter focus:border-primary rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-colors placeholder:text-gray-600" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {types.map((t) => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${filterType === t ? 'bg-primary text-white' : 'glass text-gray-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((doc) => {
          const Icon = TYPE_ICONS[doc.type] || FileText;
          const color = TYPE_COLORS[doc.type] || '#6366f1';
          return (
            <motion.div key={doc.id} variants={fadeUp}
              onClick={() => setSelected(selected?.id === doc.id ? null : doc)}
              className={`glass rounded-2xl p-5 cursor-pointer transition-all hover:border-primary/30 ${selected?.id === doc.id ? 'border-primary/40 glow-primary' : ''}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{doc.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: `${color}20`, color }}>{doc.type}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">{doc.summary}</p>
              <div className="flex flex-wrap gap-1.5">
                {doc.entities.slice(0, 3).map((e) => (
                  <span key={e} className="text-xs px-2 py-1 rounded-lg bg-surface-lighter text-gray-400">{e}</span>
                ))}
                {doc.entities.length > 3 && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-surface-lighter text-gray-500">+{doc.entities.length - 3}</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Detail Panel */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${TYPE_COLORS[selected.type]}15` }}>
              <FileText className="w-6 h-6" style={{ color: TYPE_COLORS[selected.type] }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{selected.title}</h3>
              <span className="text-xs" style={{ color: TYPE_COLORS[selected.type] }}>{selected.type}</span>
            </div>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">{selected.summary}</p>
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Extracted Entities</h4>
            <div className="flex flex-wrap gap-2">
              {selected.entities.map((e) => (
                <span key={e} className="text-sm px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary-light">{e}</span>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-surface-lighter">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Relationships</h4>
            <div className="space-y-2">
              {selected.entities.slice(0, 2).map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-primary-light">{e}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-accent">{['treated_by', 'admitted_to', 'prescribed', 'supplied_by', 'delayed_by'][i % 5]}</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-neon-green">{selected.entities[Math.min(i + 1, selected.entities.length - 1)]}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: '15' },
          { label: 'Clinical Records', value: documents.filter((d) => d.type === 'Clinical').length },
          { label: 'Supply Chain', value: documents.filter((d) => d.type === 'Supply Chain').length },
          { label: 'Unique Entities', value: new Set(documents.flatMap((d) => d.entities)).size },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gradient">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
