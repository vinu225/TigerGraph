import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, Filter } from 'lucide-react';
import { graphNodes, graphLinks } from '../data/mockData';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const NODE_TYPES = {
  patient: { color: '#6366f1', label: 'Patients', size: 20 },
  doctor: { color: '#06b6d4', label: 'Doctors', size: 16 },
  hospital: { color: '#10b981', label: 'Hospitals', size: 22 },
  supplier: { color: '#f59e0b', label: 'Suppliers', size: 16 },
  insurance: { color: '#ef4444', label: 'Insurance', size: 16 },
  device: { color: '#f472b6', label: 'Devices', size: 14 },
  medication: { color: '#a78bfa', label: 'Medications', size: 14 },
};

function SimpleGraph({ nodes, links, activeTypes, selectedNode, onSelectNode }) {
  const svgRef = useRef(null);
  const [positions, setPositions] = useState({});
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null);
  const [dragStart, setDragStart] = useState(null);

  useEffect(() => {
    const w = 900, h = 600;
    const pos = {};
    const filtered = nodes.filter((n) => activeTypes.includes(n.type));
    const angleStep = (2 * Math.PI) / filtered.length;
    filtered.forEach((node, i) => {
      const layer = node.type === 'patient' ? 0.35 : node.type === 'hospital' ? 0.55 : 0.75;
      const angle = angleStep * i - Math.PI / 2;
      pos[node.id] = {
        x: w / 2 + Math.cos(angle) * (w * layer * 0.45) + (Math.random() - 0.5) * 40,
        y: h / 2 + Math.sin(angle) * (h * layer * 0.45) + (Math.random() - 0.5) * 40,
      };
    });
    setPositions(pos);
  }, [nodes, activeTypes]);

  const filteredNodes = nodes.filter((n) => activeTypes.includes(n.type));
  const filteredLinks = links.filter((l) => positions[l.source] && positions[l.target]);

  const handleMouseDown = (e, nodeId) => {
    e.stopPropagation();
    setDragging(nodeId);
    setDragStart({ x: e.clientX, y: e.clientY, origX: positions[nodeId].x, origY: positions[nodeId].y });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !dragStart) return;
    const dx = (e.clientX - dragStart.x) / zoom;
    const dy = (e.clientY - dragStart.y) / zoom;
    setPositions((prev) => ({ ...prev, [dragging]: { x: dragStart.origX + dx, y: dragStart.origY + dy } }));
  }, [dragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => { setDragging(null); setDragStart(null); }, []);

  return (
    <div className="relative w-full h-[600px] glass rounded-2xl overflow-hidden">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button onClick={() => setZoom((z) => Math.min(z + 0.2, 3))} className="w-8 h-8 glass rounded-lg flex items-center justify-center hover:bg-surface-lighter">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => setZoom((z) => Math.max(z - 0.2, 0.3))} className="w-8 h-8 glass rounded-lg flex items-center justify-center hover:bg-surface-lighter">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-8 h-8 glass rounded-lg flex items-center justify-center hover:bg-surface-lighter">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
      <svg ref={svgRef} width="100%" height="100%" className="cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {filteredLinks.map((link, i) => {
            const s = positions[link.source];
            const t = positions[link.target];
            if (!s || !t) return null;
            const isHighlighted = selectedNode && (link.source === selectedNode || link.target === selectedNode);
            return (
              <g key={i}>
                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={isHighlighted ? '#6366f1' : '#334155'} strokeWidth={isHighlighted ? 2 : 1}
                  opacity={selectedNode ? (isHighlighted ? 1 : 0.15) : 0.6} />
                <text x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 6}
                  fill={isHighlighted ? '#94a3b8' : '#475569'} fontSize="8" textAnchor="middle"
                  opacity={selectedNode ? (isHighlighted ? 1 : 0) : 0.5}>
                  {link.label}
                </text>
              </g>
            );
          })}
          {/* Nodes */}
          {filteredNodes.map((node) => {
            const p = positions[node.id];
            if (!p) return null;
            const meta = NODE_TYPES[node.type];
            const isSelected = selectedNode === node.id;
            const isConnected = selectedNode && links.some((l) =>
              (l.source === selectedNode && l.target === node.id) || (l.target === selectedNode && l.source === node.id));
            const opacity = selectedNode ? (isSelected || isConnected ? 1 : 0.15) : 1;
            return (
              <g key={node.id} cursor="pointer" opacity={opacity}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onClick={() => onSelectNode(isSelected ? null : node.id)}>
                {isSelected && (
                  <circle cx={p.x} cy={p.y} r={meta.size + 6} fill="none" stroke={meta.color} strokeWidth="2" opacity="0.4">
                    <animate attributeName="r" values={`${meta.size + 4};${meta.size + 10};${meta.size + 4}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={p.x} cy={p.y} r={meta.size} fill={`${meta.color}30`} stroke={meta.color} strokeWidth={isSelected ? 2.5 : 1.5} />
                <text x={p.x} y={p.y + meta.size + 14} fill="#e2e8f0" fontSize="9" textAnchor="middle" fontWeight="500">
                  {node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

export default function GraphView() {
  const [activeTypes, setActiveTypes] = useState(Object.keys(NODE_TYPES));
  const [selectedNode, setSelectedNode] = useState(null);

  const toggleType = (type) => {
    setActiveTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  };

  const selectedData = graphNodes.find((n) => n.id === selectedNode);
  const connectedLinks = graphLinks.filter((l) => l.source === selectedNode || l.target === selectedNode);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Knowledge <span className="text-gradient">Graph</span></h2>
        <p className="text-sm text-gray-500">Interactive visualization of healthcare entities and their relationships</p>
      </div>

      {/* Type Filters */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap gap-2">
        <Filter className="w-4 h-4 text-gray-500 mr-1 mt-2" />
        {Object.entries(NODE_TYPES).map(([type, meta]) => (
          <button key={type} onClick={() => toggleType(type)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTypes.includes(type) ? 'border' : 'opacity-40 glass'
            }`}
            style={activeTypes.includes(type) ? { background: `${meta.color}15`, borderColor: `${meta.color}40`, color: meta.color } : {}}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
            {meta.label}
            <span className="text-gray-500">({graphNodes.filter((n) => n.type === type).length})</span>
          </button>
        ))}
      </motion.div>

      {/* Graph */}
      <SimpleGraph nodes={graphNodes} links={graphLinks} activeTypes={activeTypes}
        selectedNode={selectedNode} onSelectNode={setSelectedNode} />

      {/* Selected Node Detail */}
      {selectedData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${NODE_TYPES[selectedData.type].color}20` }}>
              <div className="w-4 h-4 rounded-full" style={{ background: NODE_TYPES[selectedData.type].color }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{selectedData.label}</h3>
              <span className="text-xs capitalize" style={{ color: NODE_TYPES[selectedData.type].color }}>
                {selectedData.type}
              </span>
            </div>
          </div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Connections ({connectedLinks.length})
          </h4>
          <div className="space-y-2">
            {connectedLinks.map((link, i) => {
              const otherId = link.source === selectedNode ? link.target : link.source;
              const otherNode = graphNodes.find((n) => n.id === otherId);
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-lighter/50 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ background: otherNode ? NODE_TYPES[otherNode.type]?.color : '#666' }} />
                  <span className="text-gray-300">{otherNode?.label || otherId}</span>
                  <span className="ml-auto text-xs px-2 py-1 rounded-lg bg-surface-lighter text-gray-500">{link.label}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Nodes', value: graphNodes.length },
          { label: 'Edges', value: graphLinks.length },
          { label: 'Entity Types', value: Object.keys(NODE_TYPES).length },
          { label: 'Avg Degree', value: (graphLinks.length * 2 / graphNodes.length).toFixed(1) },
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
