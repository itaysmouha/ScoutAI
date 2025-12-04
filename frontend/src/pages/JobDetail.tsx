import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import JobStatus from "../components/JobStatus";
import { getJobOutputUrl } from "../api";
import "./JobDetail.css";

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const [outputUrl, setOutputUrl] = useState("");
  const [loadingOutput, setLoadingOutput] = useState(false);
  const [outputError, setOutputError] = useState("");

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    async function loadOutput() {
      try {
        setLoadingOutput(true);
        setOutputError("");
        const res = await getJobOutputUrl(jobId!);
        if (!cancelled) {
          setOutputUrl(res.outputUrl || "");
        }
      } catch (e) {
        if (!cancelled) {
          setOutputError((e as Error)?.message ?? "Failed to fetch output URL");
        }
      } finally {
        if (!cancelled) {
          setLoadingOutput(false);
        }
      }
    }

    loadOutput();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (!jobId) {
    return (
      <div className="job-detail">
        <p>Invalid job ID.</p>
        <Link to="/analyses" className="job-detail-back-link">
          ← Back to My Analyses
        </Link>
      </div>
    );
  }

  return (
    <div className="job-detail">
      {/* Back link */}
      <div className="job-detail-back-row">
        <Link to="/analyses" className="job-detail-back-link">
          ← Back to My Analyses
        </Link>
      </div>

      {/* Heading */}
      <header className="job-detail-header">
        <h1 className="job-detail-title">Analysis details</h1>
        <p className="job-detail-subtitle">
          Full status, metrics, and output for job <code>{jobId}</code>.
        </p>
      </header>

      {/* Status + metrics */}
      <JobStatus jobId={jobId} />

      {/* Output viewer */}
      <section className="job-detail-output-section">
        <h2 className="job-detail-output-title">Output preview</h2>
        <p className="job-detail-output-subtitle">
          Once the analysis is complete, you'll be able to view the annotated clip
          (or other output) here.
        </p>

        {loadingOutput && (
          <div className="job-detail-output-loading">Loading output…</div>
        )}

        {outputError && (
          <div className="job-detail-output-error">
            {outputError}
          </div>
        )}

        {!loadingOutput && !outputUrl && !outputError && (
          <div className="job-detail-output-placeholder">
            No output available yet. The job may still be processing.
          </div>
        )}

        {outputUrl && (
          <div className="job-detail-output-card">
            <video
              controls
              className="job-detail-video"
            >
              <source src={outputUrl} type="video/mp4" />
              Your browser does not support the video tag.{" "}
              <a href={outputUrl} target="_blank" rel="noreferrer">
                Download output
              </a>
            </video>

            <div className="job-detail-output-note">
              If playback doesn't work, you can{" "}
              <a
                href={outputUrl}
                target="_blank"
                rel="noreferrer"
                className="job-detail-output-link"
              >
                open or download the output file
              </a>
              .
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
