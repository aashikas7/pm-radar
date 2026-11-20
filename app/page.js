"use client";
import { useEffect, useMemo, useState, useCallback } from "react";

const REFRESH_MS = 15 * 60 * 1000; // baked data rebuilds hourly via GitHub Actions; poll occasionally for a newer build
const WHERE = ["Remote · India", "Hybrid · Bengaluru", "Remote · Anywhere", "On-site · Bengaluru"];
const LEVELS = ["APM", "PM", "Senior PM"];
const AGE = { "24h": 1, "7 days": 7, "30 days": 30, Any: 9999 };
const KW = ["sql","analytics","roadmap","b2b","saas","fintech","payments","ai","genai","llm","growth","experimentation","a/b","okr","stakeholder","agile","scrum","api","platform","marketplace","mobile","ux","strategy","data","ml","lending","ecommerce","enterprise"];

const ago = (iso) => {
  if (!iso) return "Date n/a";
  const d = (Date.now() - new Date(iso)) / 864e5;
  return d < 1 ? "Today" : d < 2 ? "1 day ago" : Math.floor(d) + " days ago";
};
const ist = (iso) => iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }) + " IST" : "—";

export default function Page() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("fit");
  const [where, setWhere] = useState([]);
  const [levels, setLevels] = useState([]);
  const [domains, setDomains] = useState([]);
  const [age, setAge] = useState("7 days");
  const [kind, setKind] = useState("All");
  const [range, setRange] = useState([0, 150]);
  const [listedOnly, setListedOnly] = useState(false);
  const [hrOnly, setHrOnly] = useState(false);
  const [target, setTarget] = useState([30, 50]);
  const [resume, setResume] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("data/jobs.json");
      if (!r.ok) throw new Error("Scan failed (" + r.status + ")");
      setData(await r.json()); setErr("");
    } catch (e) { setErr(e.message + ". Showing the last scan."); }
    setBusy(false);
  }, []);
  useEffect(() => { load(); const t = setInterval(load, REFRESH_MS); return () => clearInterval(t); }, [load]);

  const onResume = async (f) => {
    if (!f) return;
    const t = (await f.text()).toLowerCase();
    const skills = KW.filter((k) => t.includes(k));
    const yrs = Math.max(0, ...[...t.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/g)].map((m) => +m[1]));
    setResume({ name: f.name, skills, yrs });
  };

  const jobs = useMemo(() => {
    if (!data) return [];
    const s = q.toLowerCase();
    const list = data.jobs.map((j) => {
      const m = resume ? j.kw.filter((k) => resume.skills.includes(k)).length : 0;
      return { ...j, fit: Math.min(100, j.score + Math.min(15, m * 3)), matched: m };
    }).filter((j) =>
      (!s || (j.title + j.company + j.region + j.where).toLowerCase().includes(s)) &&
      (!where.length || where.includes(j.where)) && (!levels.length || levels.includes(j.level)) &&
      (!domains.length || j.domains.some((d) => domains.includes(d))) &&
      (age === "Any" || !j.posted || (Date.now() - new Date(j.posted)) / 864e5 <= AGE[age]) &&
      (kind === "All" || j.kind === (kind === "Company careers" ? "company" : "board")) &&
      j.hi >= range[0] && j.lo <= range[1] && (!listedOnly || j.listed) && (!hrOnly || j.emails.length));
    const by = { fit: (a, b) => b.fit - a.fit, new: (a, b) => new Date(b.posted || 0) - new Date(a.posted || 0), pay: (a, b) => b.hi - a.hi };
    return list.sort(by[sort]);
  }, [data, q, where, levels, domains, age, kind, range, listedOnly, hrOnly, sort, resume]);

  const count = (f) => (data ? data.jobs.filter(f).length : 0);
  const allDomains = useMemo(() => {
    const c = {}; (data?.jobs || []).forEach((j) => j.domains.forEach((d) => (c[d] = (c[d] || 0) + 1)));
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [data]);
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const meets = data ? data.jobs.filter((j) => j.hi >= target[0] && j.lo <= target[1]).length : 0;

  const digest = jobs.slice(0, 10).map((j, i) => `${i + 1}. ${j.title} — ${j.company}\n   ${j.where} · ${j.listed ? "" : "est. "}₹${j.lo}–${j.hi} LPA\n   ${j.url}${j.emails[0] ? "\n   HR: " + j.emails[0] : ""}`).join("\n\n");
  const dText = "PM Radar — top 10 matches\n\n" + digest;

  return (
    <main className="wrap">
      <header className="top">
        <div><h1>PM Radar</h1><p className="sub">Your APM / PM job agent</p></div>
        <div className="stats">
          <div><span><i className="live" />Last scan</span><b>{data ? ist(data.scannedAt) : "Scanning…"}</b></div>
          <div><span>Sources</span><b>{data ? `${data.sources.ok}/${data.sources.total}` : "—"}</b></div>
          <div><span>Postings read</span><b>{data ? data.read.toLocaleString("en-IN") : "—"}</b></div>
        </div>
      </header>

      <h2>{data ? `${data.jobs.length} APM & PM roles matched to you` : "Scanning live sources…"}</h2>
      <p className="lede">Pulled from global remote boards and company career pages. Ranked by location priority, pay, freshness and resume fit. Data rebuilds automatically every hour.
        {" "}<button className="btn" onClick={load} disabled={busy}>{busy ? "Refreshing…" : "Refresh now"}</button></p>
      {err && <p className="err">{err}</p>}

      <div className="grid">
        <aside className="side">
          <section className="box">
            <h3>Your profile</h3>
            <div className="row">Target ₹
              <input type="text" inputMode="numeric" style={{ width: 60 }} value={target[0]} onChange={(e) => setTarget([+e.target.value || 0, target[1]])} /> –
              <input type="text" inputMode="numeric" style={{ width: 60 }} value={target[1]} onChange={(e) => setTarget([target[0], +e.target.value || 0])} /> LPA</div>
            <p className="sub">{meets} roles meet it</p>
            <div className="chips">{WHERE.map((w, i) => <span key={w} className="chip">P{i + 1} {w} <small>{count((j) => j.where === w)}</small></span>)}</div>
          </section>

          <section className="box">
            <h3>Upload your resume</h3>
            <input type="file" accept=".txt,.md,text/plain" onChange={(e) => onResume(e.target.files[0])} aria-label="Resume file" />
            <p className="sub">{resume ? `${resume.name}: ${resume.skills.length} skills matched${resume.yrs ? `, ${resume.yrs} yrs` : ""}. Fit scores updated.` : "Text resume (.txt). Skills are read in your browser and never uploaded."}</p>
          </section>

          <section className="box">
            <h3>Filters</h3>
            <div className="lbl">Salary range (₹ LPA): {range[0]} – {range[1]}{range[1] >= 150 ? "+" : ""}</div>
            <input type="range" min="0" max="150" value={range[1]} onChange={(e) => setRange([range[0], +e.target.value])} aria-label="Max salary" />
            <label className="row"><input type="checkbox" checked={listedOnly} onChange={(e) => setListedOnly(e.target.checked)} /> Listed pay only</label>
            <label className="row"><input type="checkbox" checked={hrOnly} onChange={(e) => setHrOnly(e.target.checked)} /> Has HR email</label>
            <div className="lbl">Where</div>
            <div className="chips">{WHERE.map((w) => <button key={w} className={"chip" + (where.includes(w) ? " on" : "")} onClick={() => toggle(where, setWhere, w)}>{w}<small>{count((j) => j.where === w)}</small></button>)}</div>
            <div className="lbl">Level</div>
            <div className="chips">{LEVELS.map((l) => <button key={l} className={"chip" + (levels.includes(l) ? " on" : "")} onClick={() => toggle(levels, setLevels, l)}>{l}<small>{count((j) => j.level === l)}</small></button>)}</div>
            <div className="lbl">Posted</div>
            <div className="chips">{Object.keys(AGE).map((a) => <button key={a} className={"chip" + (age === a ? " on" : "")} onClick={() => setAge(a)}>{a}</button>)}</div>
            <div className="lbl">Source</div>
            <div className="chips">{["All", "Company careers", "Job boards"].map((k) => <button key={k} className={"chip" + (kind === k ? " on" : "")} onClick={() => setKind(k)}>{k}</button>)}</div>
            <div className="lbl">Domain</div>
            <div className="chips">{allDomains.map(([d, n]) => <button key={d} className={"chip" + (domains.includes(d) ? " on" : "")} onClick={() => toggle(domains, setDomains, d)}>{d}<small>{n}</small></button>)}</div>
            <p><button className="btn" style={{ marginTop: 12 }} onClick={() => { setWhere([]); setLevels([]); setDomains([]); setAge("7 days"); setKind("All"); setRange([0, 150]); setListedOnly(false); setHrOnly(false); setQ(""); }}>Reset filters</button></p>
          </section>
        </aside>

        <section>
          <div className="bar">
            <input type="search" placeholder="Search roles, companies or locations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              <option value="fit">Best overall fit</option><option value="new">Newest</option><option value="pay">Highest pay</option></select>
            <a className="btn" target="_blank" rel="noreferrer" href={"https://wa.me/?text=" + encodeURIComponent(dText)}>WhatsApp top 10</a>
            <a className="btn" href={"mailto:?subject=" + encodeURIComponent("PM Radar — today's matches") + "&body=" + encodeURIComponent(dText)}>Email digest</a>
          </div>
          <p className="sub">{jobs.length} of {data?.jobs.length || 0} roles</p>

          {!data && <p className="empty">Scanning sources…</p>}
          {data && !jobs.length && <p className="empty">No roles match these filters. Reset the filters to see all {data.jobs.length}.</p>}
          {jobs.map((j) => (
            <article className="job" key={j.id}>
              <div>
                <h3>{j.title}</h3>
                <p className="meta">{j.company} · {ago(j.posted)} · via {j.via}</p>
                <div className="tags"><span>{j.where}</span><span>{j.level}</span>{j.region && <span>{j.region.slice(0, 40)}</span>}{j.exp && <span>{j.exp[0]}{j.exp[1] ? "–" + j.exp[1] : "+"} yrs exp</span>}{j.domains.slice(0, 2).map((d) => <span key={d}>{d}</span>)}</div>
                <div className="pay">{j.listed ? "" : "Est. "}₹{j.lo}–{j.hi} LPA<small>{j.listed ? "Listed pay" : "Estimated market band, not employer-listed"}{j.hi >= target[0] && j.lo <= target[1] ? " · meets target" : ""}</small></div>
                {j.emails.length > 0 && (
                  <div className="hrbox"><b>HR contact</b>
                    {j.emails.map((e) => <span key={e}><a href={`mailto:${e}?subject=${encodeURIComponent("Application: " + j.title)}`}>{e}</a>{" "}
                      <button className="chip" onClick={() => navigator.clipboard?.writeText(e)}>Copy</button></span>)}
                    <small className="sub">Published in the job posting</small></div>)}
              </div>
              <div className="fit"><strong>{j.fit}</strong><small>fit score out of 100</small>
                {j.matched > 0 && <small>{j.matched} skills matched</small>}
                <a className="btn p" href={j.url} target="_blank" rel="noreferrer">Apply to {j.company}</a></div>
            </article>
          ))}
          <p className="sub">Pay in ₹ LPA. Listed salaries are converted at approximate rates; roles without pay show an estimated band for the level. Always confirm on the original posting.</p>
        </section>
      </div>
    </main>
  );
              }
