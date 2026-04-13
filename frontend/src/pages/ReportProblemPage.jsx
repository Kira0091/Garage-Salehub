import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { reportsAPI } from "../services/api";
import { alertError, alertSuccess } from "../utils/alerts";

export default function ReportProblemPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("bug");
  const [screenshot, setScreenshot] = useState(null);
  const [sending, setSending] = useState(false);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const data = await reportsAPI.mine();
      setReports(data || []);
    } catch {
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim()) {
      await alertError("Please enter a title.", "Missing title");
      return;
    }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("type", type);
      if (screenshot) fd.append("screenshot", screenshot);
      await reportsAPI.create(fd);
      setTitle("");
      setDescription("");
      setType("bug");
      setScreenshot(null);
      await loadReports();
      await alertSuccess("Report submitted", "Thanks. We will review your report.");
    } catch (error) {
      await alertError(error.message || "Failed to submit report");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 960 }}>
        <div className="page-header">
          <h1 className="page-title">Report a Problem</h1>
          <p className="page-subtitle">Submit bugs, feature requests, or other issues.</p>
        </div>

        <form className="card" style={{ padding: 18, marginBottom: 20 }} onSubmit={onSubmit}>
          <div className="input-group" style={{ marginBottom: 10 }}>
            <label>Title *</label>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: 10 }}>
            <label>Type</label>
            <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="bug">Bug</option>
              <option value="feature_request">Feature request</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="input-group" style={{ marginBottom: 10 }}>
            <label>Description</label>
            <textarea className="input-field" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="input-group" style={{ marginBottom: 14 }}>
            <label>Screenshot (optional)</label>
            <input className="input-field" type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/dashboard" className="btn btn-ghost">Back</Link>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>

        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ marginBottom: 12 }}>My Reports</h3>
          {loadingReports ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : reports.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--gray-500)" }}>No reports yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {reports.map((report) => (
                <div key={report.id} style={{ borderBottom: "1px solid var(--gray-100)", paddingBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{report.title}</strong>
                    <span className={`badge ${report.status === "resolved" ? "badge-green" : "badge-yellow"}`}>{report.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 4 }}>
                    {report.type} | {new Date(report.created_at).toLocaleString("en-PH")}
                  </div>
                  {report.description && <div style={{ fontSize: 13, marginTop: 6 }}>{report.description}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
