// learn.js
/*
  DevToolkit Learn Page Script
  Course: CSC 4110 Software Engineering
  Group 7

  Purpose:
  1. Provide a guided learning roadmap by level
  2. Let users track progress locally
  3. Let signed in users save and restore progress using Firestore

  Notes:
  1. Local progress is stored in localStorage
  2. Account sync uses Firestore at users uid learn plan
  3. This file is only for learn html
*/

;(function LearnPage(){
  // Firebase references come from firebase.js
  const fb = window.firebase || null;
  const auth = window.auth || (fb && fb.auth ? fb.auth() : null);
  const db = window.db || (fb && fb.firestore ? fb.firestore() : null);

  // DOM elements
  const levelBtns = {
    Beginner: document.getElementById("levelBeginner"),
    Intermediate: document.getElementById("levelIntermediate"),
    Advanced: document.getElementById("levelAdvanced")
  };

  const modulesRow = document.getElementById("modulesRow");
  const planCount = document.getElementById("planCount");
  const planProg = document.getElementById("planProgress");
  const saveBtn = document.getElementById("savePlan");
  const resetBtn = document.getElementById("resetPlan");
  const exportBtn = document.getElementById("exportPlan");

  // Storage and data
  const LOCAL_KEY = "dt.learn.plan.v1";
  const TOOLS_URL = "data/tools.json";

  // Learning presets
  const PRESETS = {
    Beginner: [
      { id: "b_html", title: "HTML foundations", blurb: "Tags, semantics, links, images.", links: ["tool_freecodecamp"] },
      { id: "b_css", title: "CSS basics", blurb: "Box model, flexbox, grid.", links: ["tool_tailwind"] },
      { id: "b_git", title: "Git and GitHub", blurb: "Commits, branches, pull requests.", links: ["tool_git", "tool_github"] },
      { id: "b_js", title: "JavaScript basics", blurb: "Variables, functions, events.", links: ["tool_freecodecamp"] },
      { id: "b_project", title: "Mini project", blurb: "Build and deploy a simple website.", links: ["tool_vite", "tool_vercel"] }
    ],
    Intermediate: [
      { id: "i_layout", title: "Responsive layouts", blurb: "Grid, clamp, responsive images.", links: ["tool_tailwind"] },
      { id: "i_fetch", title: "APIs and fetch", blurb: "Fetch JSON, errors, loading states.", links: ["tool_postman", "tool_insomnia"] },
      { id: "i_ts", title: "TypeScript intro", blurb: "Types, interfaces, narrowing.", links: ["tool_typescript"] },
      { id: "i_fw", title: "Framework basics", blurb: "Pick React, Vue, or Svelte.", links: ["tool_react", "tool_vue", "tool_svelte"] },
      { id: "i_deploy", title: "Deploy and env vars", blurb: "Ship your app and manage secrets.", links: ["tool_vercel", "tool_netlify", "tool_render"] }
    ],
    Advanced: [
      { id: "a_perf", title: "Performance and accessibility", blurb: "Lighthouse, Core Web Vitals, ARIA.", links: ["tool_lighthouse"] },
      { id: "a_state", title: "State and data layer", blurb: "Caching, pagination, data modeling.", links: ["tool_prisma", "tool_supabase"] },
      { id: "a_auth", title: "Auth patterns", blurb: "Sessions, JWTs, providers.", links: ["tool_firebase"] },
      { id: "a_tests", title: "Testing strategy", blurb: "Unit, integration, E2E, CI basics.", links: ["tool_jest", "tool_playwright", "tool_github_actions"] },
      { id: "a_observe", title: "Deploy and observe", blurb: "Logs, metrics, monitoring.", links: ["tool_grafana", "tool_prometheus"] }
    ]
  };

  // Tools lookup loaded from tools.json when available
  let TOOL_MAP = {};

  // Toast notification
  function toast(msg, isErr){
    let el = document.getElementById("learn_toast");

    if (!el){
      el = document.createElement("div");
      el.id = "learn_toast";
      el.setAttribute("role", "status");
      el.style.position = "fixed";
      el.style.right = "16px";
      el.style.bottom = "16px";
      el.style.zIndex = "9999";
      el.style.padding = "10px 12px";
      el.style.borderRadius = "10px";
      el.style.color = "#fff";
      el.style.background = "#111";
      el.style.boxShadow = "0 6px 20px rgba(0,0,0,.25)";
      el.style.font = "14px/1.3 system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      document.body.appendChild(el);
    }

    el.style.background = isErr ? "#b00020" : "#111";
    el.style.opacity = "1";
    el.textContent = msg;

    clearTimeout(el._t1);
    clearTimeout(el._t2);

    el._t1 = setTimeout(()=>{ el.style.opacity = "0"; }, 1400);
    el._t2 = setTimeout(()=>{
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 1900);
  }

  // Timestamp helper for Firestore
  function serverTs(){
    try {
      const fv = fb && fb.firestore && fb.firestore.FieldValue;
      if (fv && typeof fv.serverTimestamp === "function") return fv.serverTimestamp();
    } catch {}
    return new Date();
  }

  // Local storage helpers
  function loadLocal(){
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveLocal(){
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(plan));
    } catch {}
  }

  // Normalize plan shape
  function normalizePlan(p){
    const out = {
      level: "Beginner",
      done: [],
      updatedAt: 0
    };

    if (p && typeof p === "object"){
      if (p.level && PRESETS[p.level]) out.level = p.level;
      if (Array.isArray(p.done)) out.done = p.done.filter(Boolean);
      if (typeof p.updatedAt === "number") out.updatedAt = p.updatedAt;
    }

    // Make sure done IDs belong to the selected level
    const allowed = new Set((PRESETS[out.level] || []).map(m => m.id));
    out.done = out.done.filter(id => allowed.has(id));

    // Remove duplicates
    out.done = Array.from(new Set(out.done));

    return out;
  }

  let plan = normalizePlan(loadLocal() || null);

  // Rendering helpers
  function renderLevelButtons(){
    Object.entries(levelBtns).forEach(([name, btn])=>{
      if (!btn) return;

      btn.classList.toggle("active", plan.level === name);

      btn.onclick = ()=>{
        if (plan.level === name) return;

        plan.level = name;
        plan.done = [];
        plan.updatedAt = Date.now();
        plan = normalizePlan(plan);

        saveLocal();
        renderLevelButtons();
        renderModules();
      };
    });
  }

  function renderModuleLinks(linkIds){
    if (!Array.isArray(linkIds) || !linkIds.length) return "";

    const items = linkIds
      .map(id => TOOL_MAP[id])
      .filter(Boolean)
      .slice(0, 4);

    if (!items.length) return "";

    const linksHtml = items.map(t=>{
      const title = t.title || t.name || "Resource";
      const url = t.url || "#";
      return `<a href="${url}" target="_blank" rel="noopener">${title}</a>`;
    });

    return `
      <div class="small text-muted mt-2">
        Suggested resources: ${linksHtml.join(" , ")}
      </div>
    `;
  }

  function renderModules(){
    const mods = PRESETS[plan.level] || [];
    if (!modulesRow) return;

    modulesRow.innerHTML = "";

    mods.forEach(m=>{
      const col = document.createElement("div");
      const checked = plan.done.includes(m.id);

      col.className = "col-12 col-md-6";
      col.innerHTML = `
        <div class="card h-100">
          <div class="card-body">
            <div class="form-check mb-1">
              <input class="form-check-input" id="mod_${m.id}" type="checkbox" ${checked ? "checked" : ""}>
              <label class="form-check-label fw-semibold" for="mod_${m.id}">${m.title}</label>
            </div>
            <p class="small text-subtle mb-2">${m.blurb}</p>
            ${renderModuleLinks(m.links)}
          </div>
        </div>
      `;

      const input = col.querySelector("input");
      if (input){
        input.addEventListener("change", (e)=>{
          if (e.target.checked){
            if (!plan.done.includes(m.id)) plan.done.push(m.id);
          } else {
            plan.done = plan.done.filter(x => x !== m.id);
          }

          plan.updatedAt = Date.now();
          plan = normalizePlan(plan);

          saveLocal();
          updateProgress();
        });
      }

      modulesRow.appendChild(col);
    });

    updateProgress();
  }

  function updateProgress(){
    const total = (PRESETS[plan.level] || []).length;
    const done = plan.done.length;

    const pct = total ? Math.round((done / total) * 100) : 0;

    if (planCount) planCount.textContent = `${done}/${total}`;
    if (planProg){
      planProg.style.width = pct + "%";
      planProg.textContent = pct + "%";
    }
  }

  // Firestore sync
  function planRef(uid){
    return db.collection("users").doc(uid).collection("learn").doc("plan");
  }

  async function restoreFromAccount(user){
    if (!user || !db) return;

    try {
      const snap = await planRef(user.uid).get();
      if (!snap.exists) return;

      const data = snap.data() || {};
      const serverPlan = normalizePlan({
        level: data.level,
        done: data.done,
        updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0
      });

      const localPlan = normalizePlan(plan);

      // Pick the best plan without bothering the user    
      let chosen = localPlan;

      if (serverPlan.done.length > localPlan.done.length) chosen = serverPlan;
      else if (serverPlan.done.length === localPlan.done.length){
        if ((serverPlan.updatedAt || 0) > (localPlan.updatedAt || 0)) chosen = serverPlan;
      }

      plan = normalizePlan(chosen);
      saveLocal();

      renderLevelButtons();
      renderModules();

      toast("Plan restored from your account");
    } catch (err) {
      console.error("[learn] restore failed", err);
    }
  }

  async function saveToAccount(){
    const user = auth && auth.currentUser;

    if (!user){
      toast("Sign in to save to your account", true);
      const next = encodeURIComponent(location.pathname + location.search + (location.hash || ""));
      location.href = `signin.html?next=${next}`;
      return;
    }

    if (!db){
      toast("Database not ready", true);
      return;
    }

    try {
      const payload = {
        level: plan.level,
        done: plan.done,
        updatedAt: Date.now(),
        savedAt: serverTs()
      };

      await planRef(user.uid).set(payload, { merge: true });

      plan.updatedAt = payload.updatedAt;
      saveLocal();

      toast("Plan saved to your account");
    } catch (err) {
      console.error("[learn] save failed", err);
      toast("Could not save to account", true);
    }
  }

  // Export
  function exportPlan(){
    const mods = PRESETS[plan.level] || [];
    const lines = [];

    lines.push(`DevToolkit Learn Plan`);
    lines.push(`Level: ${plan.level}`);
    lines.push("");

    mods.forEach(m=>{
      const mark = plan.done.includes(m.id) ? "[x]" : "[ ]";
      lines.push(`${mark} ${m.title}`);
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "learn-plan.txt";
    a.click();
  }

  // Button events
  if (resetBtn){
    resetBtn.onclick = ()=>{
      plan.done = [];
      plan.updatedAt = Date.now();
      plan = normalizePlan(plan);
      saveLocal();
      renderModules();
      toast("Plan reset");
    };
  }

  if (exportBtn){
    exportBtn.onclick = exportPlan;
  }

  if (saveBtn){
    saveBtn.onclick = saveToAccount;
  }

  // Init
  async function loadTools(){
    try {
      const res = await fetch(TOOLS_URL, { cache: "no-store" });
      const list = await res.json();
      const map = {};
      (Array.isArray(list) ? list : []).forEach(t=>{
        if (t && t.id) map[t.id] = t;
      });
      TOOL_MAP = map;
    } catch {
      TOOL_MAP = {};
    }
  }

  async function start(){
    await loadTools();

    plan = normalizePlan(plan);
    saveLocal();

    renderLevelButtons();
    renderModules();

    // Restore from Firestore if user is signed in
    if (auth && auth.onAuthStateChanged){
      auth.onAuthStateChanged(user=>{
        if (user) restoreFromAccount(user);
      });
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
