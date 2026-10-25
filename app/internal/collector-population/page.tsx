"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PopulationJob = {
  id: string;
  toyline: string;
  source_platform: string;
  search_query: string | null;
  max_listings: number;
  minimum_confidence: number | null;
  status: string;
  only_new_listings: boolean;
  processed_count: number;
  suggestion_count: number;
  matched_existing_count: number;
  skipped_count: number;
  failed_count: number;
  error_message: string | null;
  configuration: Record<string, any>;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

type PopulationListing = {
  id: string;
  title: string | null;
  listing_url: string | null;
  processing_status: string;
  builder_action: string | null;
  confidence: number | null;
  suggestion_ids: string[];
  skip_reason: string | null;
  error_message: string | null;
  image_urls: string[] | null;
  builder_result: Record<string, any> | null;
};

export default function CollectorPopulationPage() {
  const [jobs, setJobs] = useState<PopulationJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<PopulationJob | null>(null);
  const [listings, setListings] = useState<PopulationListing[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const runningJobIdRef = useRef<string | null>(null);
  const [form, setForm] = useState({
    toyline: "Dino Riders",
    searchQuery: "Dino Riders Tyco vintage",
    // TODO V1:
    // Replace temporary development limits with the Population Queue Controller
    // (target pending review queue architecture).
    maxListings: "60",
    minimumConfidence: "0.60",
    onlyNewListings: true,
    concurrency: "2",
    // TODO V1:
    // Replace temporary development limits with the Population Queue Controller
    // (target pending review queue architecture).
    maxAiCalls: "60",
    delayBetweenBatchesMs: "0",
  });

  async function loadJobs() {
    const response = await fetch("/api/internal/collector-population/jobs");
    const data = await response.json();
    if (data.success) {
      setJobs(data.jobs || []);
      if (!selectedJobId && data.jobs?.[0]?.id) {
        setSelectedJobId(data.jobs[0].id);
      }
    }
  }

  async function loadJob(jobId: string | null) {
    if (!jobId) {
      setSelectedJob(null);
      setListings([]);
      return;
    }

    const response = await fetch(`/api/internal/collector-population/jobs/${jobId}`);
    const data = await response.json();
    if (data.success) {
      if (runningJobIdRef.current === jobId && data.job?.status === "pending") {
        return;
      }

      setSelectedJob(data.job);
      setListings(data.listings || []);
    }
  }

  async function createJob(runImmediately = false) {
    setStatusMessage(null);
    setErrorMessage(null);
    const response = await fetch("/api/internal/collector-population/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        toyline: form.toyline,
        searchQuery: form.searchQuery,
        maxListings: Number(form.maxListings),
        minimumConfidence: Number(form.minimumConfidence),
        onlyNewListings: form.onlyNewListings,
        configuration: {
          concurrency: Number(form.concurrency),
          maxAiCalls: Number(form.maxAiCalls),
          delayBetweenBatchesMs: Number(form.delayBetweenBatchesMs),
        },
      }),
    });
    const data = await response.json();
    if (!data.success) {
      setErrorMessage(data.error || "Could not create population job.");
      return;
    }

    setSelectedJobId(data.job.id);
    setStatusMessage(`Created job ${data.job.id}`);
    await loadJobs();
    await loadJob(data.job.id);

    if (runImmediately) {
      runningJobIdRef.current = data.job.id;
      const runningJob = { ...data.job, status: "running" };
      setSelectedJob(runningJob);
      setJobs((jobs) =>
        jobs.map((job) => (job.id === data.job.id ? runningJob : job))
      );
      await runJob(data.job.id);
    }
  }

  async function runJob(jobId = selectedJobId) {
    if (!jobId) return;
    setStatusMessage("Population job running...");
    setErrorMessage(null);
    runningJobIdRef.current = jobId;
    setSelectedJob((job) =>
      job && job.id === jobId ? { ...job, status: "running" } : job
    );
    const response = await fetch(
      `/api/internal/collector-population/jobs/${jobId}/run`,
      { method: "POST" }
    );
    const data = await response.json();
    if (!data.success) {
      runningJobIdRef.current = null;
      setErrorMessage(data.error || "Population job failed.");
      return;
    }

    runningJobIdRef.current = null;
    setStatusMessage(`Job finished: ${data.result.status}`);
    await loadJobs();
    await loadJob(jobId);
  }

  async function cancelJob() {
    if (!selectedJobId) return;
    const response = await fetch(
      `/api/internal/collector-population/jobs/${selectedJobId}/cancel`,
      { method: "POST" }
    );
    const data = await response.json();
    if (!data.success) {
      setErrorMessage(data.error || "Could not cancel job.");
      return;
    }

    runningJobIdRef.current = null;
    setStatusMessage("Job cancelled.");
    await loadJobs();
    await loadJob(selectedJobId);
  }

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    loadJob(selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    if (!selectedJobId || selectedJob?.status !== "running") return;

    const timer = window.setInterval(() => {
      loadJobs();
      loadJob(selectedJobId);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [selectedJobId, selectedJob?.status]);

  return (
    <main style={pageStyle}>
      <section style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Internal Admin</p>
          <h1 style={titleStyle}>Collector Population</h1>
          <p style={subtitleStyle}>
            Gather marketplace listings, run Collector Builder, and fill the AI Inbox without approving knowledge automatically.
          </p>
        </div>
        <Link href="/internal/collector-review" style={secondaryButtonStyle}>
          Open AI Inbox
        </Link>
      </section>

      {statusMessage && <div style={successBannerStyle}>{statusMessage}</div>}
      {errorMessage && <div style={errorBannerStyle}>{errorMessage}</div>}

      <section style={layoutStyle}>
        <aside style={panelStyle}>
          <h2 style={sectionTitleStyle}>New Job</h2>
          <Input label="Toyline" value={form.toyline} onChange={(toyline) => setForm({ ...form, toyline })} />
          <Input label="Search query" value={form.searchQuery} onChange={(searchQuery) => setForm({ ...form, searchQuery })} />
          <Input label="Max listings" value={form.maxListings} onChange={(maxListings) => setForm({ ...form, maxListings })} />
          <Input label="Minimum confidence" value={form.minimumConfidence} onChange={(minimumConfidence) => setForm({ ...form, minimumConfidence })} />
          <Input label="Concurrency" value={form.concurrency} onChange={(concurrency) => setForm({ ...form, concurrency })} />
          <Input label="Max AI calls" value={form.maxAiCalls} onChange={(maxAiCalls) => setForm({ ...form, maxAiCalls })} />
          <Input label="Delay between batches ms" value={form.delayBetweenBatchesMs} onChange={(delayBetweenBatchesMs) => setForm({ ...form, delayBetweenBatchesMs })} />
          <label style={checkboxStyle}>
            <input
              type="checkbox"
              checked={form.onlyNewListings}
              onChange={(event) =>
                setForm({ ...form, onlyNewListings: event.target.checked })
              }
            />
            Only new listings
          </label>
          <div style={buttonRowStyle}>
            <button style={primaryButtonStyle} onClick={() => createJob(false)}>
              Create job
            </button>
            <button style={primaryButtonStyle} onClick={() => createJob(true)}>
              Create and run
            </button>
          </div>
        </aside>

        <section style={panelStyle}>
          <div style={jobHeaderStyle}>
            <h2 style={sectionTitleStyle}>Jobs</h2>
            <button style={secondaryButtonStyle} onClick={loadJobs}>Refresh</button>
          </div>
          <div style={jobListStyle}>
            {jobs.map((job) => (
              <button
                key={job.id}
                style={{
                  ...jobCardStyle,
                  ...(selectedJobId === job.id ? selectedJobCardStyle : {}),
                }}
                onClick={() => setSelectedJobId(job.id)}
              >
                <strong>{job.toyline}</strong>
                <span>{job.search_query}</span>
                <span>{job.status} · {new Date(job.created_at).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </section>
      </section>

      {selectedJob && (
        <section style={panelStyle}>
          <div style={jobHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>{selectedJob.status}</p>
              <h2 style={sectionTitleStyle}>{selectedJob.toyline}</h2>
              <p style={mutedStyle}>{selectedJob.search_query}</p>
            </div>
            <div style={buttonRowStyle}>
              <button style={primaryButtonStyle} onClick={() => runJob()}>
                Run
              </button>
              <button style={dangerButtonStyle} onClick={cancelJob}>
                Cancel
              </button>
            </div>
          </div>

          <JobProgressPanel job={selectedJob} />

          <div style={statsGridStyle}>
            <Stat label="Processed" value={selectedJob.processed_count} />
            <Stat label="Suggestions" value={selectedJob.suggestion_count} />
            <Stat label="Matched existing" value={selectedJob.matched_existing_count} />
            <Stat label="Skipped" value={selectedJob.skipped_count} />
            <Stat label="Failed" value={selectedJob.failed_count} />
            <Stat label="AI calls" value={selectedJob.configuration?.attemptedAiCalls || 0} />
          </div>

          {selectedJob.error_message && (
            <div style={errorBannerStyle}>{selectedJob.error_message}</div>
          )}

          <h3 style={smallTitleStyle}>Listings</h3>
          <div style={listingGridStyle}>
            {listings.map((listing) => (
              <div key={listing.id} style={listingCardStyle}>
                <strong>{listing.title || "Untitled"}</strong>
                <span>{listing.processing_status} · {listing.builder_action || "no builder action"}</span>
                <span>Confidence: {listing.confidence ? Math.round(listing.confidence * 100) : "—"}%</span>
                {listing.suggestion_ids?.length > 0 && (
                  <Link href="/internal/collector-review" style={inlineLinkStyle}>
                    {listing.processing_status === "skipped_low_confidence"
                      ? "Controleer lage zekerheid in AI Inbox"
                      : "Open AI Inbox suggestion"}
                  </Link>
                )}
                {listing.listing_url && (
                  <a href={listing.listing_url} target="_blank" rel="noreferrer" style={inlineLinkStyle}>
                    eBay listing
                  </a>
                )}
                {listing.skip_reason && <span>{listing.skip_reason}</span>}
                {listing.error_message && <span style={{ color: "#fca5a5" }}>{listing.error_message}</span>}
                {listing.processing_status === "skipped_low_confidence" && (
                  <LowConfidenceDetails listing={listing} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function LowConfidenceDetails({ listing }: { listing: PopulationListing }) {
  const proposal = listing.builder_result?.proposal || {};
  const reasons = Array.isArray(proposal.reasoning) ? proposal.reasoning : [];
  const missing = Array.isArray(proposal.missing_information)
    ? proposal.missing_information
    : [];
  const images = listing.image_urls || [];

  return (
    <details style={lowConfidenceDetailsStyle}>
      <summary style={lowConfidenceSummaryStyle}>Waarom deze zekerheid?</summary>
      {images.length > 0 && (
        <div style={lowConfidenceImagesStyle}>
          {images.slice(0, 6).map((url, index) => (
            <img key={url} src={url} alt={`Listing foto ${index + 1}`} style={lowConfidenceImageStyle} />
          ))}
        </div>
      )}
      <strong>AI-redenering</strong>
      {reasons.length > 0 ? reasons.map((reason: string) => <span key={reason}>• {reason}</span>) : <span>Geen reden opgeslagen.</span>}
      <strong>Ontbrekende informatie</strong>
      {missing.length > 0 ? missing.map((item: string) => <span key={item}>• {item}</span>) : <span>Niets vermeld.</span>}
    </details>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <input style={inputStyle} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={statStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function JobProgressPanel({ job }: { job: PopulationJob }) {
  const maxListings = Math.max(0, Number(job.max_listings || 0));
  const processed = Math.max(0, Number(job.processed_count || 0));
  const progress = maxListings > 0 ? Math.min(100, (processed / maxListings) * 100) : 0;
  const aiCalls = Number(job.configuration?.attemptedAiCalls || 0);
  const duplicates = Number(job.configuration?.skippedDuplicates || 0);
  const eta = estimateJobEta(job);

  return (
    <div style={progressPanelStyle}>
      <div style={progressHeaderStyle}>
        <div>
          <span style={progressLabelStyle}>Progress</span>
          <strong>{processed} / {maxListings || "—"} listings</strong>
        </div>
        <div style={progressStatusStyle}>{formatJobStatus(job.status)}</div>
      </div>
      <div style={progressTrackStyle} aria-label="Population job progress">
        <div style={{ ...progressFillStyle, width: `${progress}%` }} />
      </div>
      <div style={progressMetaGridStyle}>
        <ProgressMeta label="Processed" value={`${processed} / ${maxListings || "—"}`} />
        <ProgressMeta label="AI calls" value={aiCalls} />
        <ProgressMeta label="Suggestions" value={job.suggestion_count} />
        <ProgressMeta label="Duplicates" value={duplicates} />
        <ProgressMeta label="Skipped" value={job.skipped_count} />
        <ProgressMeta label="ETA" value={eta} />
      </div>
    </div>
  );
}

function ProgressMeta({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={progressMetaStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatJobStatus(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function estimateJobEta(job: PopulationJob) {
  if (job.status !== "running" || !job.started_at || job.processed_count <= 0) {
    return "Calculating...";
  }

  const maxListings = Number(job.max_listings || 0);
  const remaining = maxListings - Number(job.processed_count || 0);
  const elapsedMs = Date.now() - new Date(job.started_at).getTime();

  if (maxListings <= 0 || remaining <= 0 || elapsedMs <= 0) {
    return "Calculating...";
  }

  const msPerListing = elapsedMs / Number(job.processed_count || 1);
  const remainingMs = remaining * msPerListing;
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.max(0, Math.round((remainingMs % 60000) / 1000));

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

const pageStyle = { maxWidth: "1400px", margin: "0 auto", padding: "32px 28px 56px", color: "#f8fafc" };
const headerStyle = { display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "18px" };
const eyebrowStyle = { margin: 0, color: "#67e8f9", fontWeight: 800, textTransform: "uppercase" as const, fontSize: "12px", letterSpacing: "0.08em" };
const titleStyle = { margin: "4px 0", fontSize: "42px", lineHeight: 1.05 };
const subtitleStyle = { margin: 0, color: "#cbd5e1", maxWidth: "760px" };
const layoutStyle = { display: "grid", gridTemplateColumns: "360px 1fr", gap: "14px", alignItems: "start", marginBottom: "14px" };
const panelStyle = { border: "1px solid rgba(148,163,184,0.22)", background: "rgba(15,23,42,0.82)", borderRadius: "8px", padding: "14px" };
const sectionTitleStyle = { margin: "0 0 12px", fontSize: "22px" };
const smallTitleStyle = { margin: "18px 0 10px", fontSize: "16px" };
const fieldStyle = { display: "grid", gap: "5px", color: "#cbd5e1", fontSize: "13px", marginBottom: "10px" };
const inputStyle = { boxSizing: "border-box" as const, width: "100%", border: "1px solid rgba(148,163,184,0.35)", borderRadius: "6px", background: "#020617", color: "#f8fafc", padding: "9px 10px" };
const checkboxStyle = { display: "flex", gap: "8px", alignItems: "center", color: "#cbd5e1", marginBottom: "12px" };
const buttonRowStyle = { display: "flex", gap: "8px", flexWrap: "wrap" as const };
const primaryButtonStyle = { border: "1px solid rgba(34,211,238,0.42)", background: "rgba(8,145,178,0.45)", color: "#f8fafc", borderRadius: "7px", padding: "9px 12px", fontWeight: 800, cursor: "pointer" };
const secondaryButtonStyle = { textDecoration: "none", border: "1px solid rgba(148,163,184,0.35)", background: "rgba(15,23,42,0.8)", color: "#f8fafc", borderRadius: "7px", padding: "9px 12px", fontWeight: 700, cursor: "pointer" };
const dangerButtonStyle = { border: "1px solid rgba(251,113,133,0.5)", background: "rgba(190,18,60,0.4)", color: "#ffe4e6", borderRadius: "7px", padding: "9px 12px", fontWeight: 800, cursor: "pointer" };
const successBannerStyle = { border: "1px solid rgba(34,197,94,0.4)", background: "rgba(22,101,52,0.35)", color: "#dcfce7", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px" };
const errorBannerStyle = { border: "1px solid rgba(251,113,133,0.5)", background: "rgba(127,29,29,0.4)", color: "#ffe4e6", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px" };
const jobHeaderStyle = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" };
const jobListStyle = { display: "grid", gap: "8px" };
const jobCardStyle = { display: "grid", gap: "4px", textAlign: "left" as const, border: "1px solid rgba(148,163,184,0.2)", background: "rgba(2,6,23,0.45)", color: "#f8fafc", borderRadius: "8px", padding: "10px", cursor: "pointer" };
const selectedJobCardStyle = { borderColor: "#22d3ee", background: "rgba(14,165,233,0.18)" };
const statsGridStyle = { display: "grid", gridTemplateColumns: "repeat(6, minmax(120px, 1fr))", gap: "10px", marginTop: "12px" };
const statStyle = { display: "grid", gap: "4px", border: "1px solid rgba(148,163,184,0.16)", borderRadius: "8px", padding: "10px", color: "#cbd5e1" };
const progressPanelStyle = { border: "1px solid rgba(34,211,238,0.22)", borderRadius: "8px", padding: "12px", background: "rgba(8,47,73,0.24)", marginTop: "12px" };
const progressHeaderStyle = { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", marginBottom: "10px" };
const progressLabelStyle = { display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "2px" };
const progressStatusStyle = { border: "1px solid rgba(34,211,238,0.28)", borderRadius: "999px", padding: "5px 9px", color: "#cffafe", fontWeight: 800, fontSize: "12px" };
const progressTrackStyle = { height: "10px", borderRadius: "999px", overflow: "hidden", background: "rgba(15,23,42,0.85)", border: "1px solid rgba(148,163,184,0.16)" };
const progressFillStyle = { height: "100%", borderRadius: "999px", background: "#22d3ee", transition: "width 220ms ease" };
const progressMetaGridStyle = { display: "grid", gridTemplateColumns: "repeat(6, minmax(100px, 1fr))", gap: "8px", marginTop: "10px" };
const progressMetaStyle = { display: "grid", gap: "2px", color: "#cbd5e1", fontSize: "12px", minWidth: 0 };
const mutedStyle = { color: "#94a3b8", margin: 0 };
const listingGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" };
const listingCardStyle = { display: "grid", gap: "5px", border: "1px solid rgba(148,163,184,0.16)", borderRadius: "8px", padding: "10px", color: "#cbd5e1", background: "rgba(2,6,23,0.38)" };
const lowConfidenceDetailsStyle = { display: "grid", gap: "6px", marginTop: "5px", borderTop: "1px solid rgba(148,163,184,0.16)", paddingTop: "7px" };
const lowConfidenceSummaryStyle = { color: "#67e8f9", cursor: "pointer", fontWeight: 700 };
const lowConfidenceImagesStyle = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "5px", margin: "7px 0" };
const lowConfidenceImageStyle = { width: "100%", aspectRatio: "1 / 1", objectFit: "cover" as const, borderRadius: "5px" };
const inlineLinkStyle = { color: "#67e8f9", textDecoration: "none", fontWeight: 700 };
