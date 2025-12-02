// src/pages/Upload.jsx
import { useRef, useState } from "react";
import { getPresignedUploadUrl, createJob } from "../api.js";
import JobStatus from "../components/JobStatus.jsx";

export default function Upload() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
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
        user_id: "user-42", // replace with real user once auth is added
      });

      setJobId(job.jobId);
      setMessage("Upload complete. Job created.");
      // (optional) clear the file input
      fileInputRef.current && (fileInputRef.current.value = "");
      setSelectedFile(null);
    } catch (e) {
      setMessage(`Error: ${e?.message || String(e)}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="wrap">
      <h2>ScoutAI — Upload Match Video</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4"
        onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
      />

      <div className="actions">
        <button disabled={!selectedFile || uploading} onClick={handleUpload}>
          {uploading ? "Uploading…" : "Upload & Create Job"}
        </button>
      </div>

      {uploading && <Spinner label="Uploading to S3…" />}

      {message && <div className="msg">{message}</div>}

      <JobStatus jobId={jobId} onDone={(job) => console.log("Job finished:", job)} />

      <style jsx="true">{`
        .wrap { max-width: 640px; margin: 20px auto; padding: 16px; }
        .actions { margin: 12px 0; }
        button {
          padding: 10px 16px; border: none; border-radius: 8px;
          background: #0d6efd; color: white; font-weight: 600; cursor: pointer;
        }
        button[disabled] { opacity: 0.5; cursor: not-allowed; }
        .msg { margin-top: 10px; }
      `}</style>
    </div>
  );
}

function Spinner({ label = "Loading…" }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
      <div style={{
        width: 16, height: 16, borderRadius: "50%",
        border: "2px solid #0d6efd", borderTopColor: "transparent",
        animation: "spin 0.8s linear infinite"
      }} />
      <span>{label}</span>
      <style jsx="true">{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
