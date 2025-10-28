import { useEffect, useState } from "react";
import { getJob } from "../api";

export default function JobStatus({ jobId, pollMs = 2000, onDone }) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    async function poll() {
      try {
        const data = await getJob(jobId);
        if (!cancelled) {
          setJob(data);
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            onDone?.(data);
          }
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    // first hit immediately then interval
    poll();
    const id = setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [jobId, pollMs, onDone]);

  if (!jobId) return null;
  if (error) return <div className="error">Error: {error}</div>;
  if (!job) return <div className="pill">Loading status…</div>;

  return (
    <div className="card">
      <h3>Job Status</h3>
      <div><b>Job ID:</b> {job.jobId}</div>
      <div><b>Status:</b> <StatusPill status={job.status} /></div>
      <div><b>Input:</b> {job.s3KeyInput}</div>
      {job.metricsKey && <div><b>Metrics:</b> {job.metricsKey}</div>}
      {job.s3KeyOutput && <div><b>Output:</b> {job.s3KeyOutput}</div>}
      {job.error && <pre className="error">{job.error}</pre>}
      <style jsx="true">{`
        .card { padding: 12px; border: 1px solid #ddd; border-radius: 10px; margin-top: 10px; }
        .pill { display:inline-block; padding: 4px 10px; border-radius: 999px; background:#eee; }
        .error { color: #b00020; white-space: pre-wrap; }
      `}</style>
    </div>
  );
}

function StatusPill({ status }) {
  const colors = {
    PENDING: "#999",
    PROCESSING: "#f0ad4e",
    COMPLETED: "#28a745",
    FAILED: "#dc3545",
  };
  return (
    <span style={{
      background: colors[status] ?? "#666",
      color: "white",
      padding: "4px 10px",
      borderRadius: 999,
      fontWeight: 600
    }}>
      {status}
    </span>
  );
}
