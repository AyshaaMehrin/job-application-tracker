
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api/applications";

const statuses = ["Applied", "Interview", "Offer", "Rejected", "Accepted", "Declined"];

const nextStatuses = {
  Applied: ["Interview", "Rejected"],
  Interview: ["Offer", "Rejected"],
  Offer: ["Accepted", "Declined"],
  Rejected: [],
  Accepted: [],
  Declined: []
};

const today = new Date().toLocaleDateString("en-CA");

const emptyForm = {
  company: "",
  role: "",
  jobType: "Full-time",
  appliedDate: today,
  expectedSalary: "",
  notes: ""
};

function App() {
  const [applications, setApplications] = useState([]);
  const [counts, setCounts] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Something went wrong");
    }

    return result.data;
  }

  async function loadApplications() {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("company", search.trim());
      if (filter) params.set("status", filter);

      const data = await request(`${API}?${params.toString()}`);
      setApplications(data.applications);
      setCounts(data.counts);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadApplications();
  }, [search, filter]);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submitForm(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const payload = {
        company: form.company,
        role: form.role,
        jobType: form.jobType,
        expectedSalary: form.expectedSalary,
        notes: form.notes
      };

      if (!editing) {
        payload.appliedDate = form.appliedDate;
      }

      await request(
        editing ? `${API}/${editing._id}` : API,
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify(payload)
        }
      );

      setMessage(editing ? "Application updated successfully!" : "Application added successfully!");
      setForm(emptyForm);
      setEditing(null);
      await loadApplications();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(app) {
    setEditing(app);
    setForm({
      company: app.company,
      role: app.role,
      jobType: app.jobType,
      appliedDate: String(app.appliedDate).slice(0, 10),
      expectedSalary: app.expectedSalary ?? "",
      notes: app.notes ?? ""
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function changeStatus(app, status) {
    setError("");
    setMessage("");

    try {
      await request(`${API}/${app._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setMessage("Application status updated!");
      await loadApplications();
      if (selected?._id === app._id) {
        setSelected(await request(`${API}/${app._id}`));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteApplication(app) {
    if (!window.confirm(`Delete the application to ${app.company} - ${app.role}?`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await request(`${API}/${app._id}`, { method: "DELETE" });
      setMessage("Application deleted.");
      if (selected?._id === app._id) setSelected(null);
      await loadApplications();
    } catch (err) {
      setError(err.message);
    }
  }

  async function showDetails(app) {
    try {
      setSelected(await request(`${API}/${app._id}`));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-icon">J</span>
          <span>JobTrack<span className="brand-dot">.</span></span>
        </a>
        <span className="topbar-label">JOB SEARCH WORKSPACE</span>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">YOUR CAREER, ORGANIZED</span>
          <h1>Keep your next move<br />within <span>reach.</span></h1>
          <p>One place for every application, interview and opportunity.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-circle">↗</div>
          <div className="art-card">
            <span>APPLICATIONS</span>
            <strong>{Object.values(counts).reduce((a, b) => a + b, 0)}</strong>
            <small>Every opportunity counts.</small>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        {statuses.map((status) => (
          <button
            key={status}
            className={`stat-card ${filter === status ? "stat-active" : ""}`}
            onClick={() => setFilter(filter === status ? "" : status)}
          >
            <span className={`status-dot dot-${status.toLowerCase()}`} />
            <span className="stat-label">{status}</span>
            <strong>{counts[status] || 0}</strong>
          </button>
        ))}
      </section>

      <section className="workspace">
        <div className="form-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR OPPORTUNITIES</span>
              <h2>{editing ? "Edit application" : "Add an application"}</h2>
            </div>
            <span className="heading-icon">{editing ? "✎" : "+"}</span>
          </div>

          {message && <div className="notice success">{message}</div>}
          {error && <div className="notice error">{error}</div>}

          <form onSubmit={submitForm}>
            <label>Company name *
              <input name="company" value={form.company} onChange={updateField} placeholder="e.g. Google" required />
            </label>

            <label>Job role *
              <input name="role" value={form.role} onChange={updateField} placeholder="e.g. Software Engineer" required />
            </label>

            <div className="form-row">
              <label>Job type *
                <select name="jobType" value={form.jobType} onChange={updateField} required>
                  <option>Full-time</option>
                  <option>Internship</option>
                  <option>Contract</option>
                </select>
              </label>

              {!editing && (
                <label>Applied date *
                  <input type="date" name="appliedDate" value={form.appliedDate} max={today} onChange={updateField} required />
                </label>
              )}
            </div>

            <label>Expected salary <span className="optional">(optional)</span>
              <input type="number" name="expectedSalary" value={form.expectedSalary} onChange={updateField} min="0" placeholder="e.g. 600000" />
            </label>

            <label>Notes <span className="optional">(optional)</span>
              <textarea name="notes" value={form.notes} onChange={updateField} rows="3" placeholder="Interview details, contact person, reminders..." />
            </label>

            <div className="form-actions">
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? "Saving..." : editing ? "Save changes →" : "+ Add application"}
              </button>
              {editing && (
                <button type="button" className="secondary-button" onClick={() => { setEditing(null); setForm(emptyForm); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
          <p className="form-footnote">* Required fields. Your application ID is generated automatically.</p>
        </div>

        <div className="list-panel">
          <div className="section-heading list-heading">
            <div>
              <span className="eyebrow">YOUR PIPELINE</span>
              <h2>Applications <span className="total-count">{applications.length}</span></h2>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies..." />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>

          <div className="application-list">
            {applications.length === 0 ? (
              <div className="empty-state">
                <span>▤</span>
                <h3>No applications found</h3>
                <p>Add your first job application or adjust your filters.</p>
              </div>
            ) : applications.map((app) => (
              <article className="application-card" key={app._id}>
                <div className="card-top">
                  <div className="company-avatar">{app.company.slice(0, 1).toUpperCase()}</div>
                  <div className="company-info">
                    <h3>{app.company}</h3>
                    <p>{app.role}</p>
                  </div>
                  <span className={`status-badge badge-${app.status.toLowerCase()}`}>{app.status}</span>
                </div>

                <div className="card-meta">
                  <span>▦ {new Date(app.appliedDate).toLocaleDateString()}</span>
                  <span>{app.jobType}</span>
                </div>

                <div className="application-id">{app.applicationId}</div>

                {app.isOverdue && (
                  <div className="overdue-badge">⚠ Follow-up Overdue</div>
                )}

                <div className="card-actions">
                  <button className="text-button" onClick={() => showDetails(app)}>Details ↗</button>
                  <button className="text-button" onClick={() => startEdit(app)}>Edit</button>
                  <button
                    className="text-button delete-button"
                    disabled={["Interview", "Offer"].includes(app.status)}
                    title={["Interview", "Offer"].includes(app.status) ? "Cannot delete during Interview or Offer" : "Delete application"}
                    onClick={() => deleteApplication(app)}
                  >Delete</button>
                </div>

                {nextStatuses[app.status].length > 0 && (
                  <label className="status-control">Update status
                    <select value="" onChange={(e) => e.target.value && changeStatus(app, e.target.value)}>
                      <option value="">Choose next status...</option>
                      {nextStatuses[app.status].map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </label>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section className="details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            <span className="eyebrow">APPLICATION DETAILS</span>
            <h2>{selected.company}</h2>
            <p className="modal-role">{selected.role}</p>
            <div className="detail-grid">
              <div><span>Application ID</span><strong>{selected.applicationId}</strong></div>
              <div><span>Status</span><strong>{selected.status}</strong></div>
              <div><span>Applied</span><strong>{new Date(selected.appliedDate).toLocaleDateString()}</strong></div>
              <div><span>Follow-up date</span><strong>{new Date(selected.followUpDate).toLocaleDateString()}</strong></div>
              <div><span>Job type</span><strong>{selected.jobType}</strong></div>
              <div><span>Expected salary</span><strong>{selected.expectedSalary ?? "Not specified"}</strong></div>
            </div>
            {selected.notes && <p className="modal-notes">{selected.notes}</p>}
            <h3 className="timeline-title">Status history</h3>
            <div className="timeline">
              {selected.statusHistory.map((entry, index) => (
                <div className="timeline-item" key={`${entry.status}-${entry.date}-${index}`}>
                  <span className="timeline-marker" />
                  <div><strong>{entry.status}</strong><p>{new Date(entry.date).toLocaleString()}</p></div>
                </div>
              ))}
            </div>
            {selected.isOverdue && <div className="overdue-badge">⚠ Follow-up Overdue</div>}
          </section>
        </div>
      )}

      <footer>JOBTRACK <span>·</span> YOUR NEXT CHAPTER STARTS HERE</footer>
    </main>
  );
}

export default App;
