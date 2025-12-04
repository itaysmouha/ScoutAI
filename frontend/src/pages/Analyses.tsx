import { useEffect, useState, MouseEvent } from "react";
import { Link } from "react-router-dom";
import { listJobs } from "../api";
import JobStatus from "../components/JobStatus";
import type { Job } from "../types";

const DEMO_USER_ID = "user-42"; // same as in createJob for now

export default function Analyses() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadJobs() {
    try {
      setLoading(true);
      setError("");
      const data = await listJobs(DEMO_USER_ID);
      setJobs(data);
      if (data.length > 0 && !selectedJobId) {
        setSelectedJobId(data[0].jobId);
      }
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-5">
      {/* Left: jobs table */}
      <section className="md:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">My Analyses</h1>
            <p className="text-sm text-gray-600">
              History of your uploaded clips and their analysis status.
            </p>
          </div>
          <button
            onClick={loadJobs}
            disabled={loading}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 600,
              color: "white",
              background: loading ? "#9ca3af" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 2px 8px rgba(102, 126, 234, 0.3)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => !loading && ((e.target as HTMLButtonElement).style.transform = "translateY(-1px)")}
            onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => ((e.target as HTMLButtonElement).style.transform = "translateY(0)")}
          >
            {loading ? "⟳ Refreshing…" : "↻ Refresh"}
          </button>
        </div>

        {loading && <div className="text-sm text-gray-600">Loading jobs…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {!loading && !error && jobs.length === 0 && (
          <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-md p-3">
            No jobs yet. Upload a match clip from the{" "}
            <span className="font-medium">Upload</span> page to see them here.
          </div>
        )}

        {jobs.length > 0 && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Job
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const isSelected = job.jobId === selectedJobId;
                  return (
                    <tr
                      key={job.jobId}
                      onClick={() => setSelectedJobId(job.jobId)}
                      className={
                        "cursor-pointer hover:bg-blue-50 " +
                        (isSelected ? "bg-blue-50" : "")
                      }
                    >
                      <td className="px-3 py-2 align-top">
                        <div className="font-mono text-xs text-gray-800 truncate">
                          <Link to={`/jobs/${job.jobId}`} className="text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}>
                            {job.jobId}
                          </Link>
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {job.s3KeyInput}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {job.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-gray-500">
                        {job.createdAt
                          ? new Date(job.createdAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Right: job details/status */}
      <section className="md:col-span-3">
        <h2 className="text-lg font-semibold mb-2">Analysis details</h2>
        {selectedJobId ? (
          <JobStatus jobId={selectedJobId} />
        ) : (
          <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-md p-4">
            Select a job on the left to view its details and metrics.
          </div>
        )}
      </section>
    </div>
  );
}
