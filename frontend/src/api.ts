import type {
  Job,
  PresignedUploadResponse,
  CreateJobRequest,
  JobMetricsResponse,
  JobOutputResponse,
} from "./types";

const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "http://127.0.0.1:8000";

export async function getPresignedUploadUrl(
  contentType: string = "video/mp4"
): Promise<PresignedUploadResponse> {
  const res = await fetch(`${API_BASE}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType }),
  });
  if (!res.ok) throw new Error(`Presign failed: ${res.status}`);
  return res.json();
}

export async function createJob(params: CreateJobRequest): Promise<Job> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Create job failed: ${res.status}`);
  return res.json();
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Get job failed: ${res.status}`);
  return res.json();
}

export async function getJobMetrics(jobId: string): Promise<JobMetricsResponse> {
  const res = await fetch(
    `${API_BASE}/jobs/${encodeURIComponent(jobId)}/metrics`
  );
  if (!res.ok) {
    throw new Error(`getJobMetrics failed: ${res.status}`);
  }
  return res.json();
}

export async function getJobOutputUrl(jobId: string): Promise<JobOutputResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/output`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch output URL: ${res.status} ${text}`);
  }
  return res.json();
}

export async function listJobs(userId?: string): Promise<Job[]> {
  const url = new URL(`${API_BASE}/jobs`);
  if (userId) {
    url.searchParams.append("userId", userId);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`List jobs failed: ${res.status}`);
  return res.json();
}
