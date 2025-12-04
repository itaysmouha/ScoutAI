// frontend/src/components/JobStatus.jsx
import { useEffect, useState } from "react";
import { getJob, getJobOutputUrl } from "../api";
import MetricsDashboard from "./MetricsDashboard";

export default function JobStatus({ jobId, pollMs = 2000, onDone }) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    let intervalId = null;

    async function poll() {
      try {
        const data = await getJob(jobId);
        if (!cancelled) {
          setJob(data);
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            onDone?.(data);
            if (intervalId) {
              clearInterval(intervalId);
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message ?? String(e));
      }
    }

    // first hit immediately then interval
    poll();
    intervalId = setInterval(poll, pollMs);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobId, pollMs, onDone]);

  async function handleDownloadOutput() {
    if (!jobId) return;
    try {
      setDownloading(true);
      setDownloadError("");
      const { outputUrl } = await getJobOutputUrl(jobId);
      if (outputUrl) {
        window.open(outputUrl, "_blank", "noopener,noreferrer");
      } else {
        setDownloadError("No output URL returned from server.");
      }
    } catch (e) {
      setDownloadError(e?.message ?? "Failed to fetch output URL");
    } finally {
      setDownloading(false);
    }
  }

  if (!jobId) return null;
  if (error) return <div className="error">Error: {error}</div>;
  if (!job) return <div className="pill">Loading status…</div>;

  const isDone = job.status === "COMPLETED" || job.status === "FAILED";
  const progressInfo = statusToProgress(job.status);

  return (
    <>
      <div className="job-card">
        <div className="job-card-header">
          <div>
            <h3 style={{ margin: 0 }}>Analysis Status</h3>
            <div className="job-subtitle">
              Job <code>{job.jobId}</code>
            </div>
          </div>
          <StatusPill status={job.status} />
        </div>

        <div className="job-meta">
          <div>
            <span className="label">Input object</span>
            <div className="value mono">{job.s3KeyInput}</div>
          </div>

          {job.createdAt && (
            <div>
              <span className="label">Created</span>
              <div className="value">
                {new Date(job.createdAt).toLocaleString()}
              </div>
            </div>
          )}

          {job.updatedAt && (
            <div>
              <span className="label">Last update</span>
              <div className="value">
                {new Date(job.updatedAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="progress-section">
          <div className="progress-label-row">
            <span className="label">Progress</span>
            <span className="progress-text">{progressInfo.text}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressInfo.percent * 100}%` }}
            />
          </div>
        </div>

        {/* Output + actions */}
        <div className="job-actions">
          {job.metricsKey && (
            <div>
              <span className="label">Metrics key</span>
              <div className="value mono small">{job.metricsKey}</div>
            </div>
          )}

          {job.s3KeyOutput && (
            <div className="output-block">
              <span className="label">Output</span>
              <div className="value mono small">{job.s3KeyOutput}</div>
              <button
                onClick={handleDownloadOutput}
                disabled={downloading || !isDone}
                className="pill-button"
              >
                {downloading ? "Preparing output…" : "View output file"}
              </button>
            </div>
          )}
        </div>

        {!isDone && (
          <p className="hint">
            You can keep this page open while we analyze the clip.
          </p>
        )}

        {job.error && <pre className="error">{job.error}</pre>}
        {downloadError && (
          <div className="error" style={{ marginTop: 4 }}>
            {downloadError}
          </div>
        )}

        <style jsx="true">{`
          .job-card {
            padding: 16px;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            margin-top: 16px;
            background: #f9fafb;
            color: #111827; /* ensure readable text on light card */
          }
          .job-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
          }
          .job-subtitle {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }
          .job-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
          }
          .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #6b7280;
          }
          .value {
            font-size: 13px;
            margin-top: 2px;
          }
          .mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
              "Liberation Mono", "Courier New", monospace;
            word-break: break-all;
          }
          .small {
            font-size: 12px;
          }
          .progress-section {
            margin-bottom: 16px;
          }
          .progress-label-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 4px;
          }
          .progress-text {
            font-size: 12px;
            color: #4b5563;
          }
          .progress-bar {
            position: relative;
            width: 100%;
            height: 8px;
            border-radius: 999px;
            background: #e5e7eb;
            overflow: hidden;
          }
          .progress-bar-fill {
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(90deg, #3b82f6, #22c55e);
            transition: width 0.4s ease;
          }
          .job-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .output-block {
            display: flex;
            flex-direction: column;
            gap: 4px;
            align-items: flex-start;
          }
          .pill-button {
            padding: 6px 14px;
            border-radius: 999px;
            border: 1px solid #d1d5db;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            background: #ffffff;
            color: #111827; /* ensure text is visible on white */
          }
          .pill-button:disabled {
            opacity: 0.6;
            cursor: default;
          }
          .pill-button:hover:not(:disabled) {
            border-color: #9ca3af;
            background: #f9fafb;
          }
          .hint {
            margin-top: 10px;
            font-size: 12px;
            color: #6b7280;
          }
          .pill {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            background: #eee;
            color: #111827;
          }
          .error {
            color: #b00020;
            white-space: pre-wrap;
            font-size: 12px;
          }
        `}</style>
      </div>

      {/* Show metrics dashboard when completed */}
      {job.status === "COMPLETED" && <MetricsDashboard jobId={jobId} />}
    </>
  );
}

function StatusPill({ status }) {
  const colors = {
    PENDING: "#9ca3af",
    PROCESSING: "#fbbf24",
    COMPLETED: "#22c55e",
    FAILED: "#ef4444",
  };
  return (
    <span
      style={{
        background: colors[status] ?? "#6b7280",
        color: "white",
        padding: "4px 12px",
        borderRadius: 999,
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      {status}
    </span>
  );
}

function statusToProgress(status) {
  switch (status) {
    case "PENDING":
      return { percent: 0.25, text: "Queued" };
    case "PROCESSING":
      return { percent: 0.6, text: "Analyzing clip…" };
    case "COMPLETED":
      return { percent: 1, text: "Analysis complete" };
    case "FAILED":
      return { percent: 1, text: "Failed" };
    default:
      return { percent: 0.15, text: status ?? "Unknown" };
  }
}
