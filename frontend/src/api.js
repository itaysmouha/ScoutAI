const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

export async function getPresignedUploadUrl(contentType = "video/mp4") {
  const res = await fetch(`${API_BASE}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType }),
  });
  if (!res.ok) throw new Error(`Presign failed: ${res.status}`);
  return res.json(); // { key, url }
}

export async function createJob({ s3_key_input, user_id }) {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ s3_key_input, user_id }),
  });
  if (!res.ok) throw new Error(`Create job failed: ${res.status}`);
  return res.json(); // job item
}

export async function getJob(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Get job failed: ${res.status}`);
  return res.json(); // job item
}
