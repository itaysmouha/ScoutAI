// frontend/src/components/MetricsDashboard.jsx
import { useEffect, useState } from "react";
import { getJobMetrics } from "../api";

export default function MetricsDashboard({ jobId }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await getJobMetrics(jobId);
        if (cancelled) return;
        setMetrics(res.metrics);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load metrics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (!jobId) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <h2 style={{ marginBottom: 12 }}>Analysis Dashboard</h2>

      {loading && <div>Loading metrics…</div>}
      {error && <div style={{ color: "red" }}>Error: {error}</div>}

      {!loading && metrics && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          {/* Summary card */}
          {metrics.summary && (
            <Card title="Match Summary">
              <MetricRow label="Players detected" value={metrics.summary.playersDetected} />
              <MetricRow label="Frames analyzed" value={metrics.summary.frames} />
              {metrics.summary.durationSeconds != null && (
                <MetricRow
                  label="Duration (sec)"
                  value={metrics.summary.durationSeconds.toFixed(1)}
                />
              )}
            </Card>
          )}

          {/* Teams card */}
          {metrics.teams && (
            <Card title="Teams Overview">
              {metrics.teams.home && (
                <>
                  <h4 style={{ margin: "4px 0" }}>{metrics.teams.home.name} (Home)</h4>
                  <MetricRow label="Shots" value={metrics.teams.home.shots} />
                  <MetricRow label="xG" value={metrics.teams.home.xg} />
                  <MetricRow
                    label="Possession (%)"
                    value={metrics.teams.home.possessionPercent}
                  />
                </>
              )}
              {metrics.teams.away && (
                <>
                  <h4 style={{ margin: "8px 0 4px" }}>{metrics.teams.away.name} (Away)</h4>
                  <MetricRow label="Shots" value={metrics.teams.away.shots} />
                  <MetricRow label="xG" value={metrics.teams.away.xg} />
                  <MetricRow
                    label="Possession (%)"
                    value={metrics.teams.away.possessionPercent}
                  />
                </>
              )}
            </Card>
          )}

          {/* Top players card */}
          {Array.isArray(metrics.topPlayers) && metrics.topPlayers.length > 0 && (
            <Card title="Top Players">
              {metrics.topPlayers.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "4px 0",
                    borderBottom: idx < metrics.topPlayers.length - 1 ? "1px solid #333" : "none",
                  }}
                >
                  <strong>{p.name}</strong>
                  <MetricRow label="Distance (km)" value={p.distanceKm} />
                  <MetricRow label="Top speed (km/h)" value={p.topSpeedKmh} />
                  <MetricRow label="Touches" value={p.touches} />
                </div>
              ))}
            </Card>
          )}

          {/* Raw JSON fallback card (nice for debugging / future dev) */}
          <Card title="Raw Metrics JSON">
            <pre
              style={{
                maxHeight: 200,
                overflow: "auto",
                fontSize: 12,
                backgroundColor: "#111",
                padding: 8,
                borderRadius: 4,
              }}
            >
              {JSON.stringify(metrics, null, 2)}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div
      style={{
        borderRadius: 8,
        border: "1px solid #444",
        padding: 12,
        backgroundColor: "#1f2933", // dark-ish card
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>{title}</h3>
      {children}
    </div>
  );
}

function MetricRow({ label, value }) {
  if (value === undefined || value === null) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ color: "#cbd5f5" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{String(value)}</span>
    </div>
  );
}
