// js/comparison.js
/*
  DevToolkit Tool Comparison Script
  Course: CSC 4110 Software Engineering
  Group 7

  Purpose
  - Let users select and compare developer tools
  - Limit selection to 6 tools to keep the UI readable
  - Show results as simple cards or a table
  - Allow signed in users to compare their favorites

  Notes
  - Reads tool data from data tools json
  - Runs fully on the client side
  - Favorites are read from Firestore when signed in
*/

;(function comparisonPage(){
  // Run after the page is ready
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  function start(){
    // Picker and search elements
    const listEl = document.getElementById("list");
    const searchEl = document.getElementById("search");

    // Result containers
    const tableWrap = document.getElementById("tableWrap");
    const tbody = document.getElementById("tbody");
    const cardsWrap = document.getElementById("cardsWrap");
    const cardsRow = document.getElementById("cardsRow");

    // Empty state and metadata
    const emptyEl = document.getElementById("empty");
    const simpleMeta = document.getElementById("simpleMeta");
    const tableMeta = document.getElementById("tableMeta");
    const diffBox = document.getElementById("diffBox");

    // Action buttons
    const compareBtn = document.getElementById("compareBtn");
    const compareFavBtn = document.getElementById("compareFavBtn");
    const clearBtn = document.getElementById("clearBtn");
    const modeSimpleBtn = document.getElementById("modeSimple");
    const modeTableBtn = document.getElementById("modeTable");

    // Selection UI
    const chips = document.getElementById("selectedChips");
    const selCount = document.getElementById("selCount");
    const countBadge = document.getElementById("countBadge");

    // If required elements are missing, do nothing
    if (!listEl || !searchEl || !compareBtn || !clearBtn || !emptyEl) return;

    // Firebase references (firebase js normally sets these)
    const auth = window.auth || (window.firebase && firebase.auth && firebase.auth());
    const db = window.db || (window.firebase && firebase.firestore && firebase.firestore());

    // In memory state
    const MAX = 6;
    let ALL = [];
    let MODE = "simple";
    let PICKED = new Map();

    // Simple toast for quick feedback
    function toast(msg, isErr){
      let el = document.getElementById("compareToast");
      if (!el){
        el = document.createElement("div");
        el.id = "compareToast";
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

    // Helpers to build small UI pieces
    function makeBadge(text, variant){
      const span = document.createElement("span");
      span.className = "dtBadge dtBadge" + variant;
      span.textContent = text || "";
      return span;
    }

    function safeText(v){
      return (v === null || v === undefined) ? "" : String(v);
    }

    // Search filtering
    function applySearch(){
      const q = (searchEl.value || "").toLowerCase().trim();
      if (!q) return ALL;

      return ALL.filter(t=>{
        const blob = (
          safeText(t.title) + " " +
          safeText(t.category) + " " +
          safeText(t.level) + " " +
          safeText(t.price) + " " +
          safeText(t.provider) + " " +
          safeText(t.blurb)
        ).toLowerCase();
        return blob.includes(q);
      });
    }

    // Render the picker list
    function renderPicker(items){
      listEl.innerHTML = "";

      if (!items.length){
        const empty = document.createElement("div");
        empty.className = "text-muted small";
        empty.textContent = "No matches.";
        listEl.appendChild(empty);
        return;
      }

      const frag = document.createDocumentFragment();

      items.forEach((t, idx)=>{
        const row = document.createElement("div");
        row.className = "toolRow";

        // Left checkbox
        const checkWrap = document.createElement("div");
        checkWrap.className = "form-check mt-1";

        const input = document.createElement("input");
        input.className = "form-check-input";
        input.type = "checkbox";
        input.checked = PICKED.has(String(t.id));
        input.setAttribute("aria-label", "Select " + safeText(t.title));

        checkWrap.appendChild(input);

        // Right content
        const body = document.createElement("div");
        body.className = "flex-grow-1";

        const title = document.createElement("div");
        title.className = "toolTitle";
        title.textContent = safeText(t.title);

        const sub1 = document.createElement("div");
        sub1.className = "toolSub";

        sub1.appendChild(makeBadge(safeText(t.category), "Light"));
        sub1.appendChild(makeBadge(safeText(t.level), levelVariant(t.level)));
        sub1.appendChild(makeBadge(safeText(t.price), priceVariant(t.price)));

        const sub2 = document.createElement("div");
        sub2.className = "toolSub mt-1";
        sub2.textContent = "Provider: " + (t.provider ? safeText(t.provider) : "");

        body.appendChild(title);
        body.appendChild(sub1);
        body.appendChild(sub2);

        row.appendChild(checkWrap);
        row.appendChild(body);

        input.addEventListener("change", ()=>{
          if (input.checked) addPick(t);
          else removePick(String(t.id));
        });

        frag.appendChild(row);
      });

      listEl.appendChild(frag);
    }

    // Badge variants
    function priceVariant(price){
      const p = safeText(price);
      if (p.toLowerCase() === "free") return "Good";
      if (p.toLowerCase() === "paid") return "Warn";
      if (p.toLowerCase() === "subscription") return "Warn";
      return "Neutral";
    }

    function levelVariant(level){
      const l = safeText(level).toLowerCase();
      if (l === "beginner") return "Info";
      if (l === "intermediate") return "Mid";
      if (l === "advanced") return "Hard";
      return "Neutral";
    }

    // Render selected chips
    function renderChips(){
      if (!chips) return;

      chips.innerHTML = "";

      PICKED.forEach((t, id)=>{
        const chip = document.createElement("span");
        chip.className = "chip";

        const label = document.createElement("span");
        label.textContent = safeText(t.title);

        const x = document.createElement("button");
        x.type = "button";
        x.className = "chipX";
        x.setAttribute("aria-label", "Remove " + safeText(t.title));
        x.textContent = "×";
        x.addEventListener("click", ()=> removePick(id));

        chip.appendChild(label);
        chip.appendChild(x);
        chips.appendChild(chip);
      });

      const count = PICKED.size;
      if (selCount) selCount.textContent = "(" + count + ")";
      if (countBadge) countBadge.textContent = count + " / " + MAX;
      compareBtn.disabled = count === 0;
    }

    // Add a tool to selection
    function addPick(t){
      if (!t) return;

      const id = String(t.id);

      // Do not add duplicates
      if (PICKED.has(id)){
        renderChips();
        return;
      }

      // Enforce max
      if (PICKED.size >= MAX){
        toast("You can compare up to " + MAX + " tools", true);
        renderPicker(applySearch());
        return;
      }

      PICKED.set(id, t);
      renderChips();
      renderPicker(applySearch());
    }

    // Remove a tool from selection
    function removePick(id){
      PICKED.delete(String(id));
      renderChips();
      renderPicker(applySearch());
      if (!PICKED.size) showEmpty();
    }

    // Show empty state
    function showEmpty(){
      emptyEl.classList.remove("d-none");

      if (tableWrap) tableWrap.classList.add("d-none");
      if (cardsWrap) cardsWrap.classList.add("d-none");

      if (diffBox){
        diffBox.classList.add("d-none");
        diffBox.innerHTML = "";
      }

      if (simpleMeta) simpleMeta.textContent = "";
      if (tableMeta) tableMeta.textContent = "";
    }

    // Render card comparison view
    function renderCards(items){
      if (!cardsRow || !cardsWrap) return;

      cardsRow.innerHTML = "";

      items.forEach(t=>{
        const col = document.createElement("div");
        col.className = "col-12 col-md-6";

        const card = document.createElement("div");
        card.className = "card h-100";

        const body = document.createElement("div");
        body.className = "card-body";

        const badges = document.createElement("div");
        badges.className = "mb-2";
        badges.appendChild(makeBadge(safeText(t.category), "Light"));
        badges.appendChild(makeBadge(safeText(t.level), levelVariant(t.level)));
        badges.appendChild(makeBadge(safeText(t.price), priceVariant(t.price)));

        const h = document.createElement("h3");
        h.className = "h6 mb-1";
        h.textContent = safeText(t.title);

        const prov = document.createElement("div");
        prov.className = "small text-subtle mb-2";
        prov.textContent = "Provider: " + (t.provider ? safeText(t.provider) : "—");

        const p = document.createElement("p");
        p.className = "small mb-3";
        p.textContent = t.blurb ? safeText(t.blurb) : "";

        const a = document.createElement("a");
        a.className = "btn btn-sm btn-outline-primary btnPill";
        a.href = t.url ? safeText(t.url) : "#";
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "Visit";

        body.appendChild(badges);
        body.appendChild(h);
        body.appendChild(prov);
        body.appendChild(p);
        body.appendChild(a);

        card.appendChild(body);
        col.appendChild(card);
        cardsRow.appendChild(col);
      });

      if (simpleMeta){
        simpleMeta.textContent = items.length + " tool" + (items.length === 1 ? "" : "s");
      }

      emptyEl.classList.add("d-none");
      cardsWrap.classList.remove("d-none");
      if (tableWrap) tableWrap.classList.add("d-none");

      renderDiff(items);
    }

    // Render table comparison view
    function renderTable(items){
      if (!tbody || !tableWrap) return;

      tbody.innerHTML = "";

      items.forEach(t=>{
        const tr = document.createElement("tr");

        const td1 = document.createElement("td");
        td1.className = "fw-semibold";
        td1.textContent = safeText(t.title);

        const td2 = document.createElement("td");
        td2.textContent = safeText(t.category);

        const td3 = document.createElement("td");
        td3.textContent = safeText(t.level);

        const td4 = document.createElement("td");
        td4.textContent = safeText(t.price);

        const td5 = document.createElement("td");
        td5.className = "text-muted";
        td5.textContent = t.provider ? safeText(t.provider) : "";

        const td6 = document.createElement("td");
        const a = document.createElement("a");
        a.className = "btn btn-sm btn-outline-primary btnPill";
        a.href = t.url ? safeText(t.url) : "#";
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "Visit";
        td6.appendChild(a);

        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);
        tr.appendChild(td5);
        tr.appendChild(td6);

        tbody.appendChild(tr);
      });

      if (tableMeta){
        tableMeta.textContent = items.length + " tool" + (items.length === 1 ? "" : "s");
      }

      emptyEl.classList.add("d-none");
      tableWrap.classList.remove("d-none");
      if (cardsWrap) cardsWrap.classList.add("d-none");

      renderDiff(items);
    }

    // Quick differences summary
    function renderDiff(items){
      if (!diffBox) return;

      if (!items || items.length < 2){
        diffBox.classList.add("d-none");
        diffBox.innerHTML = "";
        return;
      }

      const prices = new Set(items.map(x=>safeText(x.price)).filter(Boolean));
      const levels = new Set(items.map(x=>safeText(x.level)).filter(Boolean));
      const cats = new Set(items.map(x=>safeText(x.category)).filter(Boolean));

      const lines = [];
      if (prices.size > 1) lines.push("Pricing differs: " + Array.from(prices).join(", "));
      if (levels.size > 1) lines.push("Levels differ: " + Array.from(levels).join(", "));
      if (cats.size > 1) lines.push("Categories differ: " + Array.from(cats).join(", "));

      if (!lines.length){
        diffBox.classList.add("d-none");
        diffBox.innerHTML = "";
        return;
      }

      diffBox.classList.remove("d-none");
      diffBox.innerHTML = "";

      const h = document.createElement("div");
      h.className = "fw-semibold mb-1";
      h.textContent = "Quick differences";

      const ul = document.createElement("ul");
      ul.className = "small mb-0";

      lines.forEach(line=>{
        const li = document.createElement("li");
        li.textContent = line;
        ul.appendChild(li);
      });

      diffBox.appendChild(h);
      diffBox.appendChild(ul);
    }

    // Render selected tools
    function renderSelected(){
      const items = Array.from(PICKED.values());
      if (!items.length){
        showEmpty();
        return;
      }
      if (MODE === "simple") renderCards(items);
      else renderTable(items);
    }

    // Mode toggle
    if (modeSimpleBtn){
      modeSimpleBtn.addEventListener("click", ()=>{
        MODE = "simple";
        modeSimpleBtn.classList.add("active");
        if (modeTableBtn) modeTableBtn.classList.remove("active");
        renderSelected();
      });
    }

    if (modeTableBtn){
      modeTableBtn.addEventListener("click", ()=>{
        MODE = "table";
        modeTableBtn.classList.add("active");
        if (modeSimpleBtn) modeSimpleBtn.classList.remove("active");
        renderSelected();
      });
    }

    // Clear selection
    clearBtn.addEventListener("click", ()=>{
      PICKED.clear();
      renderChips();
      renderPicker(applySearch());
      showEmpty();
    });

    // Compare button
    compareBtn.addEventListener("click", renderSelected);

    // Search input debounce
    let tId = null;
    searchEl.addEventListener("input", ()=>{
      clearTimeout(tId);
      tId = setTimeout(()=>{
        renderPicker(applySearch());
      }, 120);
    });

    // Compare favorites button
    async function compareFavorites(){
      if (!auth || !db){
        toast("Sign in to compare favorites", true);
        return;
      }

      const user = auth.currentUser;
      if (!user){
        toast("Sign in to compare favorites", true);
        return;
      }

      try {
        const snap = await db
          .collection("users")
          .doc(user.uid)
          .collection("favorites")
          .get();

        if (snap.empty){
          toast("No favorites yet", true);
          return;
        }

        // Pick tools that match favorite doc ids
        const ids = [];
        snap.forEach(doc=>{
          ids.push(String(doc.id));
        });

        const found = [];
        ids.forEach(id=>{
          const t = ALL.find(x=>String(x.id) === id);
          if (t) found.push(t);
        });

        if (!found.length){
          toast("Favorites do not match tool ids yet", true);
          return;
        }

        PICKED.clear();

        found.slice(0, MAX).forEach(t=>{
          PICKED.set(String(t.id), t);
        });

        renderChips();
        renderPicker(applySearch());
        renderSelected();
        toast("Loaded favorites");
      } catch {
        toast("Could not load favorites", true);
      }
    }

    // Show compare favorites only when signed in
    function updateFavButton(user){
      if (!compareFavBtn) return;
      if (user) compareFavBtn.classList.remove("d-none");
      else compareFavBtn.classList.add("d-none");
    }

    if (compareFavBtn){
      compareFavBtn.addEventListener("click", compareFavorites);
    }

    if (auth && auth.onAuthStateChanged){
      auth.onAuthStateChanged(user=>{
        updateFavButton(user);
      });
    } else {
      updateFavButton(null);
    }

    // Init
    loadTools();

    async function loadTools(){
      try {
        const res = await fetch("data/tools.json");
        const data = await res.json();

        // Basic shape protection
        ALL = Array.isArray(data) ? data : [];

        ALL.sort((a, b)=>{
          return safeText(a.title).localeCompare(safeText(b.title));
        });

        renderPicker(ALL);
        renderChips();
        showEmpty();
      } catch {
        emptyEl.textContent = "Could not load tools.";
      }
    }
  }
})();
