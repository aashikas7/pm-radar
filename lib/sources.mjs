// Real sources only. Each returns normalized raw jobs; unreachable sources are skipped.
export const COMPANIES = {
  ashby: ["sarvam", "supabase", "PostHog"],
  lever: ["meesho", "fampay", "paytm"],
  greenhouse: ["razorpaysoftwareprivatelimited"],
};

const FX = { USD: 88, EUR: 95, GBP: 112, INR: 1, SGD: 65, AUD: 58, CAD: 64 };
const PM_YES = /product (manager|owner|lead)|\bapm\b|associate product/i;
const PM_NO = /product (marketing|design|operations|analyst)|project|program|engineering manager/i;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const EMAIL_BAD = /(example\.|noreply|no-reply|donotreply|sentry|wixpress|\.(png|jpe?g|gif|svg|webp)$)/i;
const HR_LIKE = /^(hr|careers?|jobs?|recruit\w*|talent|people|hiring|apply|resume|cv)/i;
const DOMAINS = {
  "AI / GenAI": /\b(ai|genai|llm|machine learning|ml)\b/i, Security: /security|fraud|risk|identity/i,
  Logistics: /logistic|supply chain|fleet|shipping/i, "Cloud & infra": /cloud|infrastructure|kubernetes|devops|postgres|observability/i,
  "B2B SaaS": /\bb2b\b|saas|enterprise/i, Edtech: /edtech|learning|education|student/i,
  "Developer tools": /developer|\bapi\b|sdk|platform/i, "E-commerce": /e-?commerce|marketplace|merchant|retail/i,
  Payments: /payment|upi|checkout|acquir/i, Fintech: /fintech|banking|neobank|wallet/i,
  "Consumer / B2C": /\bb2c\b|consumer/i, "Lending & credit": /lending|credit|loan/i,
  Gaming: /gaming|igaming|game/i, Healthtech: /health|pharma|clinical/i,
};
const KW = ["sql","analytics","roadmap","b2b","saas","fintech","payments","ai","genai","llm","growth","experimentation","a/b","okr","stakeholder","agile","scrum","api","platform","marketplace","mobile","ux","strategy","data","ml","lending","ecommerce","enterprise"];

async function get(url, json = true) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(url, { signal: c.signal, next: { revalidate: 300 }, headers: { "user-agent": "PMRadar/2.0", accept: json ? "application/json" : "*/*" } });
    if (!r.ok) throw new Error(url + " " + r.status);
    return json ? await r.json() : await r.text();
  } finally { clearTimeout(t); }
}
const text = (h) => String(h || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

// HR emails: only addresses literally present in the posting (text or mailto links).
export function findEmails(raw) {
  const all = [...new Set((String(raw || "").match(EMAIL) || []).map((e) => e.toLowerCase().replace(/\.$/, "")))].filter((e) => !EMAIL_BAD.test(e));
  all.sort((a, b) => Number(HR_LIKE.test(b)) - Number(HR_LIKE.test(a)));
  return all.slice(0, 2);
}

// Specific non-India countries/regions. A remote role restricted to one of these is not
// India-relevant: exclude it instead of mislabeling it "Remote · India" or "Anywhere".
const NON_INDIA = /(united states|usa|u\.s\.|\bus\b|canada|united kingdom|\buk\b|england|scotland|ireland|europe|germany|france|spain|netherlands|italy|sweden|norway|denmark|finland|switzerland|austria|belgium|poland|portugal|greece|czech|romania|hungary|estonia|latvia|lithuania|ukraine|russia|australia|new zealand|latin|brazil|mexico|argentina|colombia|chile|peru|uruguay|costa rica|philippines|thailand|vietnam|indonesia|malaysia|singapore|japan|korea|china|hong kong|taiwan|uae|dubai|abu dhabi|saudi|qatar|bahrain|kuwait|oman|israel|turkey|south africa|nigeria|kenya|egypt|ghana|morocco|pakistan|bangladesh|sri lanka|nepal)/i;

function bucket(loc, remote, blob) {
  const L = (loc || "").toLowerCase();
  const blr = /bengaluru|bangalore/.test(L);
  const india = blr || /\bindia\b/.test(L);
  const worldwide = /worldwide|anywhere|global|no location/.test(L);
  // Restricted to specific non-India location(s), with India not eligible.
  const foreignOnly = NON_INDIA.test(L) && !india && !worldwide;
  if (blr && !remote) return /hybrid/.test(blob.toLowerCase()) ? { b: "Hybrid · Bengaluru", p: 2 } : { b: "On-site · Bengaluru", p: 4 };
  if (remote || /remote/.test(L)) {
    if (foreignOnly) return null;
    return india ? { b: "Remote · India", p: 1 } : { b: "Remote · Anywhere", p: 3 };
  }
  return null;
}

function mk(x) {
  if (!PM_YES.test(x.title) || PM_NO.test(x.title)) return null;
  const html = x.html || x.desc || "";
  const desc = text(html);
  const loc = bucket(x.loc, x.remote, x.title + " " + desc.slice(0, 600) + " " + (x.loc || ""));
  if (!loc) return null;
  const level = /associate|\bapm\b/i.test(x.title) ? "APM" : /senior|\bsr\b\.?|lead|principal|group|head|director/i.test(x.title) ? "Senior PM" : "PM";
  const fx = FX[(x.cur || "USD").toUpperCase()] || 0;
  let lo = null, hi = null;
  if (x.min && fx && x.min > 5000) { lo = Math.round((x.min * fx) / 1e5); hi = Math.round(((x.max || x.min) * fx) / 1e5); }
  const listed = lo != null;
  if (!listed) {
    const base = { APM: [12, 25], PM: [28, 48], "Senior PM": [45, 70] }[level];
    const m = loc.p === 3 ? 1.25 : 1; lo = Math.round(base[0] * m); hi = Math.round(base[1] * m);
  }
  const em = desc.match(/(\d{1,2})\s*(?:\+|-|–|to)?\s*(\d{1,2})?\s*\+?\s*(?:years|yrs)/i);
  const exp = em ? [Number(em[1]), em[2] ? Number(em[2]) : null] : null;
  const blob = x.title + " " + desc;
  const posted = x.posted ? new Date(x.posted).toISOString() : null;
  return {
    id: (x.company + "|" + x.title + "|" + (x.loc || "")).toLowerCase(),
    title: x.title.trim(), company: x.company, url: x.url, via: x.via, kind: x.kind, posted,
    where: loc.b, prio: loc.p, region: x.loc || "", level, lo, hi, listed, exp,
    domains: Object.keys(DOMAINS).filter((d) => DOMAINS[d].test(blob)),
    kw: KW.filter((k) => new RegExp("\\b" + k.replace("/", "\\/") + "\\b", "i").test(blob)),
    emails: findEmails(html + " " + desc),
  };
}

const fns = [];
const src = (name, kind, fn) => fns.push({ name, kind, fn });

src("Himalayas", "board", async () => (await get("https://himalayas.app/jobs/api/search?q=product%20manager&sort=recent")).jobs.map((j) => ({
  title: j.title, company: j.companyName, url: j.applicationLink || j.guid, posted: j.pubDate ? j.pubDate * 1000 : null,
  loc: (j.locationRestrictions || []).join(", "), remote: true, html: j.description, min: j.minSalary, max: j.maxSalary, cur: j.currency, via: "Himalayas", kind: "board" })));
src("Remotive", "board", async () => (await get("https://remotive.com/api/remote-jobs?category=product&limit=150")).jobs.map((j) => ({
  title: j.title, company: j.company_name, url: j.url, posted: j.publication_date, loc: j.candidate_required_location, remote: true, html: j.description, via: "Remotive", kind: "board" })));
src("RemoteOK", "board", async () => (await get("https://remoteok.com/api")).filter((j) => j.position).map((j) => ({
  title: j.position, company: j.company, url: j.url, posted: j.date, loc: j.location || "Worldwide", remote: true, html: j.description, min: j.salary_min, max: j.salary_max, cur: "USD", via: "RemoteOK", kind: "board" })));
src("We Work Remotely", "board", async () => {
  const xml = await get("https://weworkremotely.com/categories/remote-product-jobs.rss", false);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const g = (t) => (m[1].match(new RegExp("<" + t + ">(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</" + t + ">")) || [])[1] || "";
    const [company, ...rest] = g("title").split(": ");
    return { title: rest.join(": ") || company, company: rest.length ? company : "Unknown", url: g("link"), posted: g("pubDate"), loc: g("region") || "Worldwide", remote: true, html: g("description"), via: "We Work Remotely", kind: "board" };
  });
});
for (const o of COMPANIES.ashby) src("Ashby " + o, "company", async () => (await get(`https://api.ashbyhq.com/posting-api/job-board/${o}?includeCompensation=true`)).jobs.map((j) => ({
  title: j.title, company: o, url: j.jobUrl, posted: j.publishedAt, loc: j.location, remote: j.isRemote, html: j.descriptionHtml || j.descriptionPlain, via: o + " careers", kind: "company" })));
for (const o of COMPANIES.lever) src("Lever " + o, "company", async () => (await get(`https://api.lever.co/v0/postings/${o}?mode=json`)).map((j) => ({
  title: j.text, company: o, url: j.hostedUrl, posted: j.createdAt, loc: j.categories?.location, remote: j.workplaceType === "remote", html: (j.description || "") + (j.lists || []).map((l) => l.content).join(" ") + (j.additional || ""), via: o + " careers", kind: "company" })));
for (const o of COMPANIES.greenhouse) src("Greenhouse " + o, "company", async () => (await get(`https://boards-api.greenhouse.io/v1/boards/${o}/jobs?content=true`)).jobs.map((j) => ({
  title: j.title, company: o, url: j.absolute_url, posted: j.updated_at, loc: j.location?.name, remote: false, html: j.content, via: o + " careers", kind: "company" })));

export async function scanAll() {
  const res = await Promise.allSettled(fns.map((s) => s.fn()));
  let ok = 0, read = 0; const seen = new Map();
  res.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    ok++; read += r.value.length;
    for (const raw of r.value) {
      let j; try { j = mk({ ...raw, company: raw.company || "Unknown" }); } catch { j = null; }
      if (j && !seen.has(j.id)) seen.set(j.id, j);
    }
  });
  const target = [30, 50];
  const jobs = [...seen.values()].map((j) => {
    const age = j.posted ? (Date.now() - new Date(j.posted)) / 864e5 : 60;
    const score = { 1: 30, 2: 26, 3: 20, 4: 16 }[j.prio] + (j.hi >= target[0] && j.lo <= target[1] ? 20 : 8) + (age <= 1 ? 20 : age <= 7 ? 14 : age <= 30 ? 8 : 2) + (j.listed ? 5 : 0) + (j.level === "APM" ? 5 : 10) + (!j.exp || (j.exp[0] >= 2 && j.exp[0] <= 7) ? 10 : 0);
    return { ...j, score: Math.min(100, score + 5) };
  }).sort((a, b) => b.score - a.score);
  return { scannedAt: new Date().toISOString(), sources: { ok, total: fns.length }, read, jobs };
                                                                                                                                                                                                                                     }
