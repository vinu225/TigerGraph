import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Benchmark from './pages/Benchmark';
import LiveUpload from './pages/LiveUpload';
import Documents from './pages/Documents';
import GraphView from './pages/GraphView';
import Architecture from './pages/Architecture';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />}>
        <Route index element={<Benchmark />} />
        <Route path="benchmark" element={<Benchmark />} />
        <Route path="live" element={<LiveUpload />} />
        <Route path="documents" element={<Documents />} />
        <Route path="graph" element={<GraphView />} />
        <Route path="architecture" element={<Architecture />} />
      </Route>
    </Routes>
  );
}
