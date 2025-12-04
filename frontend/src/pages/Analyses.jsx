// src/pages/Analyses.jsx
import { useEffect, useState } from "react";
import { listJobs } from "../api";
import JobStatus from "../components/JobStatus";

const DEMO_USER_ID = "user-42"; // same as in createJob for now

export default function Analyses() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await listJobs(DEMO_USER_ID);
        if (!cancelled) {
          setJobs(data);
          if (data.length > 0 && !selectedJobId) {
            setSelectedJobId(data[0].jobId);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load jobs");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-5">
      {/* Left: jobs table */}
      <section className="md:col-span-2 space-y-3">
        <div>
          <h1 className="text-xl font-semibold">My Analyses</h1>
          <p className="text-sm text-gray-600">
            History of your uploaded clips and their analysis status.
          </p>
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
                          {job.jobId}
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
