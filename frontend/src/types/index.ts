// Type definitions for ScoutAI frontend

export interface Job {
  jobId: string;
  s3KeyInput: string;
  s3KeyOutput?: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  userId: string;
  metricsKey?: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PresignedUploadResponse {
  key: string;
  url: string;
}

export interface CreateJobRequest {
  s3_key_input: string;
  user_id: string;
}

export interface MetricsSummary {
  playersDetected?: number;
  frames?: number;
  durationSeconds?: number;
}

export interface TeamMetrics {
  name: string;
  shots?: number;
  xg?: number;
  possessionPercent?: number;
}

export interface TeamsMetrics {
  home?: TeamMetrics;
  away?: TeamMetrics;
}

export interface PlayerMetrics {
  name: string;
  distanceKm?: number;
  topSpeedKmh?: number;
  touches?: number;
}

// Mirrors services/worker/metrics_schema.py (the worker omits unset optional fields)
export interface Metrics {
  schemaVersion: 1;
  jobId: string;
  generatedAt: string;
  summary?: MetricsSummary;
  teams?: TeamsMetrics;
  topPlayers?: PlayerMetrics[];
}

export interface JobMetricsResponse {
  jobId: string;
  metrics: Metrics;
}

export interface JobOutputResponse {
  jobId: string;
  outputUrl: string;
}
