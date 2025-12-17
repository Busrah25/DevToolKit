// js/careers.js
/*
  DevToolkit Careers Page Script
  Course: CSC 4110 Software Engineering
  Group 7

  Purpose
  - Provide job search shortcuts
  - Track career readiness skills
  - Track job applications

  Notes
  - Saves locally when signed out
  - Syncs to Firebase when signed in
  - Uses the existing user rules by saving inside users uid learn docs
*/

;(function careersPage(){
  // Run after the page is ready
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  function start(){
    // Shorthand DOM helper
    function $(id){ return document.getElementById(id); }

    // Job search inputs and buttons
    const roleInput = $("roleInput");
    const locInput  = $("locInput");
    const btnLinkedIn = $("openLinkedIn");
    const btnIndeed   = $("openIndeed");
    const btnGHJobs   = $("openGHJobs");

    // Skill checklist elements
    const skillList   = $("skillList");
    const skillCount  = $("skillCount");
    const skillProg   = $("skillProgress");
    const resetSkills = $("resetSkills");
    const exportSkills= $("exportSkills");
    const signedOutChecklist = $("careersSignedOut");

    // Application tracker elements
    const appForm    = $("appForm");
    const appRole    = $("appRole");
    const appCompany = $("appCompany");
    const appStatus  = $("appStatus");
    const appNotes   = $("appNotes");
    const appsTbody  = $("appTbody");
    const signedOutApps = $("appsSignedOut");

    // If Careers page ids are missing, do nothing
    if (!skillList || !appsTbody) return;

    // Firebase references (firebase.js normally sets window.auth and window.db)
    const auth = window.auth || (window.firebase && firebase.auth && firebase.auth());
    const db   = window.db   || (window.firebase && firebase.firestore && firebase.firestore());

    // We store careers data under users uid learn docs to match the rules
    const DOC_CHECKLIST = "careersChecklist";
    const DOC_APPS = "careersApps";

    function serverTs(){
      try {
        return firebase.firestore.FieldValue.serverTimestamp();
      } catch {
        return new Date();
      }
    }

    // Local storage keys
    const SKILL_KEY = "dt.careers.skills.v2";
    const APP_KEY   = "dt.careers.apps.v1";

    // Default checklist items
    const skills = [
      "Build a responsive page with HTML and CSS.",
      "Use Git and GitHub for version control.",
      "Fetch and use data from APIs.",
      "Explain projects clearly and confidently.",
      "Deploy a small web application.",
      "Debug errors step by step.",
      "Write strong resume bullet points.",
      "Apply basic accessibility practices.",
      "Improve page performance.",
      "Practice interviews."
    ];

    // App state
    let checkedSet = new Set();
    let apps = [];
    let currentUser = null;

    // Tiny toast for quick feedback
    function toast(msg, isErr){
      let el = document.getElementById("careersToast");
      if (!el){
        el = document.createElement("div");
        el.id = "careersToast";
        el.setAttribute("role", "status");
        el.style.position = "fixed";
        el.style.right = "16px";
        el.style.bottom = "16px";
        el.style.zIndex = "9999";
        el.style.maxWidth = "360px";
        el.style.padding = "10px 12px";
        el.style.borderRadius = "10px";
        el.style.color = "#fff";
        el.style.fontSize = "14px";
        el.style.lineHeight = "1.3";
        el.style.boxShadow = "0 6px 20px rgba(0,0,0,.25)";
        document.body.appendChild(el);
      }

      el.style.background = isErr ? "#b00020" : "#111";
      el.textContent = msg;

      clearTimeout(el._t);
      el._t = setTimeout(()=>{
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 1400);
    }

    // Signed in vs signed out banners
    function setSignedOutUI(isSignedIn){
      if (signedOutChecklist){
        if (isSignedIn) signedOutChecklist.classList.add("d-none");
        else signedOutChecklist.classList.remove("d-none");
      }
      if (signedOutApps){
        if (isSignedIn) signedOutApps.classList.add("d-none");
        else signedOutApps.classList.remove("d-none");
      }
    }

    // Job search helpers
    function enc(v){ return encodeURIComponent((v || "").trim()); }
    function val(el){ return (el && el.value) ? el.value : ""; }

    if (btnLinkedIn){
      btnLinkedIn.addEventListener("click", ()=>{
        const url =
          "https://www.linkedin.com/jobs/search/?keywords=" + enc(val(roleInput)) +
          "&location=" + enc(val(locInput));
        window.open(url, "_blank", "noopener");
      });
    }

    if (btnIndeed){
      btnIndeed.addEventListener("click", ()=>{
        const url =
          "https://www.indeed.com/jobs?q=" + enc(val(roleInput)) +
          "&l=" + enc(val(locInput));
        window.open(url, "_blank", "noopener");
      });
    }

    if (btnGHJobs){
      btnGHJobs.addEventListener("click", ()=>{
        // GitHub Jobs is gone, so this is just a community style search page
        const q = (val(roleInput) + " " + val(locInput)).trim();
        const url = "https://github.com/search?q=" + enc(q) + "&type=repositories";
        window.open(url, "_blank", "noopener");
      });
    }

    // Checklist rendering
    function renderSkills(){
      skillList.innerHTML = "";

      skills.forEach((text, i)=>{
        const li = document.createElement("li");

        const wrap = document.createElement("div");
        wrap.className = "form-check";

        const input = document.createElement("input");
        input.className = "form-check-input";
        input.type = "checkbox";
        input.checked = checkedSet.has(i);

        const label = document.createElement("label");
        label.className = "form-check-label";
        label.textContent = text;

        input.addEventListener("change", ()=>{
          if (input.checked) checkedSet.add(i);
          else checkedSet.delete(i);
          updateSkillProgress();
          saveChecklist();
        });

        wrap.appendChild(input);
        wrap.appendChild(label);
        li.appendChild(wrap);
        skillList.appendChild(li);
      });

      updateSkillProgress();
    }

    function updateSkillProgress(){
      const total = skills.length || 1;
      const pct = Math.round((checkedSet.size / total) * 100);

      if (skillCount) skillCount.textContent = checkedSet.size + "/" + total;
      if (skillProg){
        skillProg.style.width = pct + "%";
        skillProg.textContent = pct + "%";
      }
    }

    function loadChecklistLocal(){
      try {
        const arr = JSON.parse(localStorage.getItem(SKILL_KEY) || "[]");
        checkedSet = new Set(Array.isArray(arr) ? arr : []);
      } catch {
        checkedSet = new Set();
      }
      renderSkills();
    }

    function saveChecklistLocal(){
      localStorage.setItem(SKILL_KEY, JSON.stringify(Array.from(checkedSet)));
    }

    async function loadChecklistRemote(uid){
      if (!db) throw new Error("No db");
      const snap = await db.collection("users").doc(uid).collection("learn").doc(DOC_CHECKLIST).get();
      if (!snap.exists) return false;

      const data = snap.data() || {};
      const arr = Array.isArray(data.checked) ? data.checked : [];
      checkedSet = new Set(arr);
      return true;
    }

    async function saveChecklistRemote(uid){
      if (!db) throw new Error("No db");
      await db.collection("users")
        .doc(uid)
        .collection("learn")
        .doc(DOC_CHECKLIST)
        .set(
          { checked: Array.from(checkedSet), updatedAt: serverTs() },
          { merge: true }
        );
    }

    async function saveChecklist(){
      // Always keep local updated, even when signed in (nice fallback)
      saveChecklistLocal();

      if (!currentUser) return;
      try {
        await saveChecklistRemote(currentUser.uid);
      } catch {
        // If remote fails, local is still saved
      }
    }

    if (resetSkills){
      resetSkills.addEventListener("click", ()=>{
        checkedSet.clear();
        renderSkills();
        saveChecklist();
      });
    }

    if (exportSkills){
      exportSkills.addEventListener("click", ()=>{
        const lines = skills.map((t, i)=>{
          return (checkedSet.has(i) ? "[x] " : "[ ] ") + t;
        }).join("\n");

        const blob = new Blob([lines], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "skills_checklist.txt";
        a.click();
        toast("Exported checklist");
      });
    }

    // Applications
    function makeId(){
      try {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      } catch {}
      return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    function loadAppsLocal(){
      try {
        const arr = JSON.parse(localStorage.getItem(APP_KEY) || "[]");
        apps = Array.isArray(arr) ? arr : [];
      } catch {
        apps = [];
      }
      renderApps(apps);
    }

    function saveAppsLocal(){
      localStorage.setItem(APP_KEY, JSON.stringify(apps));
    }

    async function loadAppsRemote(uid){
      if (!db) throw new Error("No db");
      const snap = await db.collection("users").doc(uid).collection("learn").doc(DOC_APPS).get();
      if (!snap.exists) return false;

      const data = snap.data() || {};
      const arr = Array.isArray(data.apps) ? data.apps : [];
      apps = arr;
      return true;
    }

    async function saveAppsRemote(uid){
      if (!db) throw new Error("No db");
      await db.collection("users")
        .doc(uid)
        .collection("learn")
        .doc(DOC_APPS)
        .set(
          { apps: apps, updatedAt: serverTs() },
          { merge: true }
        );
    }

    async function saveApps(){
      saveAppsLocal();

      if (!currentUser) return;
      try {
        await saveAppsRemote(currentUser.uid);
      } catch {
        // local fallback is already saved
      }
    }

    function tdText(text){
      const td = document.createElement("td");
      td.textContent = text || "";
      return td;
    }

    function renderApps(rows){
      appsTbody.innerHTML = "";

      rows.forEach(r=>{
        const tr = document.createElement("tr");

        tr.appendChild(tdText(r.role));
        tr.appendChild(tdText(r.company));
        tr.appendChild(tdText(r.status));
        tr.appendChild(tdText(r.notes));

        const td = document.createElement("td");
        td.className = "text-end";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-sm btn-outline-primary";
        btn.textContent = "Delete";
        btn.setAttribute("data_del", r._id);

        td.appendChild(btn);
        tr.appendChild(td);
        appsTbody.appendChild(tr);
      });
    }

    if (appsTbody){
      appsTbody.addEventListener("click", (e)=>{
        const btn = e.target.closest("[data_del]");
        if (!btn) return;

        const id = btn.getAttribute("data_del");
        apps = apps.filter(a=>a._id !== id);
        renderApps(apps);
        saveApps();
        toast("Deleted application");
      });
    }

    if (appForm){
      appForm.addEventListener("submit", (e)=>{
        e.preventDefault();

        const row = {
          _id: makeId(),
          role: (appRole && appRole.value ? appRole.value : "").trim(),
          company: (appCompany && appCompany.value ? appCompany.value : "").trim(),
          status: (appStatus && appStatus.value ? appStatus.value : "Applied"),
          notes: (appNotes && appNotes.value ? appNotes.value : "").trim()
        };

        if (!row.role || !row.company){
          toast("Please enter a role and company", true);
          return;
        }

        apps.push(row);
        saveApps();
        renderApps(apps);

        appForm.reset();
        toast("Added application");
      });
    }

    // Main load flow
    async function loadForSignedOut(){
      currentUser = null;
      setSignedOutUI(false);
      loadChecklistLocal();
      loadAppsLocal();
    }

    async function loadForSignedIn(user){
      currentUser = user;
      setSignedOutUI(true);

      // Try remote first, fall back to local if needed
      let okChecklist = false;
      let okApps = false;

      try { okChecklist = await loadChecklistRemote(user.uid); } catch {}
      try { okApps = await loadAppsRemote(user.uid); } catch {}

      if (!okChecklist) loadChecklistLocal();
      else renderSkills();

      if (!okApps) loadAppsLocal();
      else renderApps(apps);

      // If local had data but remote was empty, push local up once
      try {
        if (!okChecklist) await saveChecklistRemote(user.uid);
      } catch {}

      try {
        if (!okApps) await saveAppsRemote(user.uid);
      } catch {}
    }

    // Watch auth changes
    if (auth && auth.onAuthStateChanged){
      auth.onAuthStateChanged((user)=>{
        if (user) loadForSignedIn(user);
        else loadForSignedOut();
      });
    } else {
      // No Firebase available
      loadForSignedOut();
    }
  }
})();
