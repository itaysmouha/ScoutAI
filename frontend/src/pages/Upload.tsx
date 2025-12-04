import { useRef, useState } from "react";
import { getPresignedUploadUrl, createJob } from "../api";
import JobStatus from "../components/JobStatus";
import type { Job } from "../types";

export default function Upload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [jobId, setJobId] = useState("");

  async function handleUpload() {
    setMessage("");
    setJobId("");
    const file = selectedFile;

    if (!file) {
      setMessage("Please choose an MP4 file first.");
      return;
    }
    if (file.type !== "video/mp4") {
      setMessage(`Content-Type must be video/mp4, got: ${file.type || "unknown"}`);
      return;
    }

    try {
      setUploading(true);

      // 1) Get presigned URL + key from your API
      const { key, url } = await getPresignedUploadUrl("video/mp4");

      // 2) Upload directly to S3 with fetch (must match Content-Type used to presign)
      const putRes = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: file,
      });
      if (!putRes.ok) {
        const txt = await putRes.text().catch(() => "");
        throw new Error(`S3 upload failed (${putRes.status}). ${txt}`);
      }

      // 3) Create a job referencing that S3 key
      const job = await createJob({
        s3_key_input: key,
        user_id: "user-42", // TODO: replace with real user once auth is added
      });

      setJobId(job.jobId);
      setMessage("Upload complete. Analysis job created.");
      // (optional) clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFile(null);
    } catch (e) {
      setMessage(`Error: ${(e as Error)?.message || String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  const hasJob = Boolean(jobId);

  return (
    <div className="upload-layout">
      {/* Left: upload panel */}
      <section className="upload-panel">
        <h1 className="title">Upload a match clip</h1>
        <p className="subtitle">
          ScoutAI will analyze your video, detect players, and generate
          advanced metrics automatically. Start with a short MP4 clip.
        </p>

        <div className="card">
          <label className="dropzone">
            <div className="dropzone-inner">
              <div className="dropzone-icon">📹</div>
              <div>
                <div className="dropzone-title">
                  {selectedFile ? "Change video file" : "Choose a video file"}
                </div>
                <div className="dropzone-text">
                  {selectedFile
                    ? selectedFile.name
                    : "Click to select an MP4 file from your computer"}
                </div>
                <div className="dropzone-hint">MP4 only · Max size depends on your S3 setup</div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4"
              style={{ display: "none" }}
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {selectedFile && (
            <div className="file-meta">
              <span className="meta-label">Selected:</span>
              <span className="meta-value">{selectedFile.name}</span>
              <span className="meta-size">
                ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </span>
            </div>
          )}

          <div className="actions">
            <button
              disabled={!selectedFile || uploading}
              onClick={handleUpload}
              className="primary-button"
            >
              {uploading ? "Uploading…" : "Upload & Create Job"}
            </button>
          </div>

          {uploading && <Spinner label="Uploading to S3…" />}

          {message && (
            <div className={`msg ${message.startsWith("Error") ? "msg-error" : "msg-info"}`}>
              {message}
            </div>
          )}

          <ul className="tips">
            <li>Use a short clip to keep processing fast.</li>
            <li>For best results, prefer a stable broadcast-style camera angle.</li>
          </ul>
        </div>
      </section>

      {/* Right: job status + metrics */}
      <section className="status-panel">
        <h2 className="status-title">Analysis status</h2>
        <p className="status-subtitle">
          Once you upload a clip, you'll see the live analysis progress and metrics here.
        </p>

        {hasJob ? (
          <JobStatus jobId={jobId} onDone={(job: Job) => console.log("Job finished:", job)} />
        ) : (
          <div className="status-placeholder">
            <div className="placeholder-icon">📊</div>
            <div className="placeholder-text">
              No active analysis yet. Upload a match clip to get started.
            </div>
          </div>
        )}
      </section>

      <style>{`
        .upload-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
          gap: 24px;
          align-items: flex-start;
        }

        @media (max-width: 900px) {
          .upload-layout {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        .title {
          margin: 0 0 4px;
          font-size: 24px;
          font-weight: 700;
        }

        .subtitle {
          margin: 0 0 16px;
          font-size: 13px;
          color: #6b7280;
        }

        .card {
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .dropzone {
          display: block;
          border-radius: 12px;
          border: 2px dashed #d1d5db;
          padding: 14px;
          background: #f3f4f6;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .dropzone:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .dropzone-inner {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dropzone-icon {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: #1d4ed8;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .dropzone-title {
          font-weight: 600;
          font-size: 14px;
        }

        .dropzone-text {
          font-size: 12px;
          color: #4b5563;
        }

        .dropzone-hint {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 4px;
        }

        .file-meta {
          margin-top: 10px;
          font-size: 12px;
          color: #374151;
        }

        .meta-label {
          font-weight: 600;
        }

        .meta-value {
          margin-left: 4px;
        }

        .meta-size {
          margin-left: 4px;
          color: #6b7280;
        }

        .actions {
          margin: 14px 0 8px;
        }

        .primary-button {
          padding: 9px 18px;
          border: none;
          border-radius: 999px;
          background: linear-gradient(90deg, #3b82f6, #22c55e);
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }

        .primary-button[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .msg {
          margin-top: 8px;
          font-size: 12px;
          padding: 6px 8px;
          border-radius: 6px;
        }

        .msg-info {
          background: #ecfdf5;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .msg-error {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .tips {
          margin-top: 12px;
          padding-left: 18px;
          font-size: 11px;
          color: #6b7280;
        }

        .status-panel {
          padding-top: 4px;
        }

        .status-title {
          margin: 0 0 4px;
          font-size: 18px;
          font-weight: 600;
        }

        .status-subtitle {
          margin: 0 0 12px;
          font-size: 12px;
          color: #6b7280;
        }

        .status-placeholder {
          margin-top: 8px;
          border-radius: 12px;
          border: 1px dashed #e5e7eb;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #6b7280;
          font-size: 13px;
          background: #fafafa;
        }

        .placeholder-icon {
          font-size: 24px;
        }

        .placeholder-text {
          text-align: center;
        }
      `}</style>
    </div>
  );
}

interface SpinnerProps {
  label?: string;
}

function Spinner({ label = "Loading…" }: SpinnerProps) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "2px solid #0d6efd",
          borderTopColor: "transparent",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span style={{ fontSize: 12 }}>{label}</span>
      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
