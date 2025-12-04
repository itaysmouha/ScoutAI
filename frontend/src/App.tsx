import { Routes, Route, Link, Navigate } from "react-router-dom";
import Upload from "./pages/Upload";
import Analyses from "./pages/Analyses";
import JobDetail from "./pages/JobDetail";

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <nav style={{ marginBottom: 12, display: "flex", gap: 12 }}>
        <Link to="/">Upload</Link>
        <Link to="/analyses">My Analyses</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Upload />} />
        <Route path="/analyses" element={<Analyses />} />
        <Route path="/jobs/:jobId" element={<JobDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
