import { NavLink, Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, BarChart3, Upload, FileText, GitBranch, Cpu, LayoutDashboard } from 'lucide-react';

const navItems = [
  { to: '/dashboard/benchmark', icon: BarChart3, label: 'Benchmark' },
  { to: '/dashboard/live', icon: Upload, label: 'Live Upload' },
  { to: '/dashboard/documents', icon: FileText, label: 'Documents' },
  { to: '/dashboard/graph', icon: GitBranch, label: 'Knowledge Graph' },
  { to: '/dashboard/architecture', icon: Cpu, label: 'Architecture' },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen glass-strong border-r border-surface-lighter flex flex-col fixed left-0 top-0 z-30">
        <Link to="/" className="flex items-center gap-3 px-6 py-5 border-b border-surface-lighter">
          <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-light" />
          </div>
          <span className="text-sm font-semibold tracking-tight">HealthGraph<span className="text-primary-light">RAG</span></span>
        </Link>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-primary/15 text-primary-light border border-primary/20' : 'text-gray-400 hover:text-gray-200 hover:bg-surface-lighter'
                }`
              }>
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 pb-4">
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">Model</div>
            <div className="text-sm font-medium text-primary-light">gemini-3-flash-preview</div>
            <div className="text-xs text-gray-500 mt-2 mb-1">Embeddings</div>
            <div className="text-sm font-medium text-accent">all-MiniLM-L6-v2</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        <header className="sticky top-0 z-20 glass-strong border-b border-surface-lighter px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Healthcare GraphRAG Platform</h1>
            <p className="text-xs text-gray-500">Multi-hop Reasoning · Knowledge Graph · Evaluation Pipeline</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-gray-400">All Systems Operational</span>
          </div>
        </header>
        <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="p-8">
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
