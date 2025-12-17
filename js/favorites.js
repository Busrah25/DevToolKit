// js/favorites.js
/*
  DevToolkit Favorites Script
  Course: CSC 4110 Software Engineering
  Group 7

  Purpose
  1. Let signed in users save and remove favorite tools
  2. Store favorites in Firestore under each user
  3. Keep favorite buttons and the Home favorites section in sync

  Notes
  1. Uses Firebase compat SDK to match the rest of the project
  2. If Firebase is not ready, the page still works (it just cannot save)
*/

;(function favoritesModule(){
  const fb = window.firebase || null;

  const auth =
    window.auth ||
    (fb && fb.auth ? fb.auth() : null);

  const db =
    window.db ||
    (fb && fb.firestore ? fb.firestore() : null);

  let favIdSet = new Set();
  let unsubFavListener = null;

  // Small toast used for quick feedback
  function toast(msg, isErr){
    let el = document.getElementById("fav_toast");

    if (!el){
      el = document.createElement("div");
      el.id = "fav_toast";
      el.setAttribute("role", "status");
      el.style.position = "fixed";
      el.style.right = "16px";
      el.style.bottom = "16px";
      el.style.maxWidth = "320px";
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

    el._t1 = setTimeout(()=>{
      el.style.opacity = "0";
    }, 1400);

    el._t2 = setTimeout(()=>{
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 1900);
  }

  // Firestore timestamp helper
  function serverTs(){
    try {
      const fv = fb && fb.firestore && fb.firestore.FieldValue;
      if (fv && typeof fv.serverTimestamp === "function") return fv.serverTimestamp();
    } catch {}
    return new Date();
  }

  // Shortcut to a user favorites collection
  function favCol(uid){
    if (!db) return null;
    return db.collection("users").doc(uid).collection("favorites");
  }

  // Update all favorite buttons on the current page
  function updateFavoriteButtons(){
    const buttons = Array.from(document.querySelectorAll(".fav-toggle"));
    if (!buttons.length) return;

    const user = auth && auth.currentUser;

    // Signed out state
    if (!user){
      buttons.forEach(btn=>{
        btn.classList.remove("is-favorited");
        btn.textContent = "♡ Favorite";
        btn.disabled = false;
        btn.setAttribute("aria-pressed", "false");
      });
      return;
    }

    // Signed in state
    buttons.forEach(btn=>{
      const id = btn.getAttribute("data-id") || "";
      const isFav = favIdSet.has(id);

      btn.classList.toggle("is-favorited", isFav);
      btn.textContent = isFav ? "♥ Favorited" : "♡ Favorite";
      btn.disabled = false;
      btn.setAttribute("aria-pressed", isFav ? "true" : "false");
    });
  }

  // Home page favorites section (index html)
  function updateHomeFavoritesSection(user){
    const section = document.getElementById("favoritesSection");
    const empty = document.getElementById("favEmpty");
    const grid = document.getElementById("favGrid");

    // If the page does not have the Home favorites UI, stop here
    if (!section || !empty || !grid) return;

    // Signed out means hide the entire section
    if (!user){
      section.classList.add("d-none");
      empty.classList.add("d-none");
      grid.innerHTML = "";
      return;
    }

    // Signed in means show the section (data loads from Firestore listener)
    section.classList.remove("d-none");
  }

  // Render favorites into Home favorites grid
  function renderHomeFavoritesFromSnapshot(snap){
    const empty = document.getElementById("favEmpty");
    const grid = document.getElementById("favGrid");
    if (!empty || !grid) return;

    grid.innerHTML = "";

    if (!snap || snap.empty){
      empty.classList.remove("d-none");
      return;
    }

    empty.classList.add("d-none");

    snap.forEach(doc=>{
      const data = doc.data() || {};
      const title = data.title || doc.id;
      const url = data.url || "#";

      const col = document.createElement("div");
      col.className = "col-12 col-sm-6 col-lg-4";

      const savedAt =
        data.createdAt && data.createdAt.seconds
          ? new Date(data.createdAt.seconds * 1000).toLocaleString()
          : "";

      col.innerHTML = `
        <div class="card h-100">
          <div class="card-body">
            <h3 class="h6 mb-2">${escapeHtml(title)}</h3>
            <div class="small text-subtle mb-3">
              ${savedAt ? "Saved: " + escapeHtml(savedAt) : ""}
            </div>
            <div class="d-flex gap-2">
              <a class="btn btn-sm btn-outline-primary"
                 href="${escapeAttr(url)}"
                 target="_blank"
                 rel="noopener">
                Open
              </a>
              <button class="btn btn-sm btn-outline-danger"
                      type="button"
                      data-home-remove="${escapeAttr(doc.id)}">
                Remove
              </button>
            </div>
          </div>
        </div>
      `;

      grid.appendChild(col);
    });
  }

  // Basic escaping for titles (keeps things safe if text comes from user input later)
  function escapeHtml(s){
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttr(s){
    return escapeHtml(s);
  }

  // Listen to favorites in realtime and keep UI in sync
  function startFavoriteListener(user){
    stopFavoriteListener();

    if (!user || !db) {
      favIdSet = new Set();
      updateFavoriteButtons();
      return;
    }

    const col = favCol(user.uid);
    if (!col) return;

    unsubFavListener = col
      .orderBy("createdAt", "desc")
      .onSnapshot(
        snap=>{
          const next = new Set();
          snap.forEach(d=> next.add(d.id));
          favIdSet = next;

          updateFavoriteButtons();

          // If we are on index page, also render the favorites section
          const hasHomeUI =
            document.getElementById("favoritesSection") &&
            document.getElementById("favGrid") &&
            document.getElementById("favEmpty");

          if (hasHomeUI){
            renderHomeFavoritesFromSnapshot(snap);
          }
        },
        err=>{
          console.error("[favorites] snapshot error", err);
          toast("Favorites could not be loaded", true);
        }
      );
  }

  function stopFavoriteListener(){
    if (typeof unsubFavListener === "function"){
      try { unsubFavListener(); } catch {}
    }
    unsubFavListener = null;
  }

  // Public helper for other pages (optional)
  window.subscribeFavorites = function subscribeFavorites(uid, cb){
    if (!db) return null;

    const col = favCol(uid);
    if (!col) return null;

    return col.onSnapshot(snap=>{
      const map = {};
      snap.forEach(d=>{ map[d.id] = true; });
      cb(map);
    });
  };

  // Add a favorite
  async function addFavorite(uid, payload){
    const col = favCol(uid);
    if (!col) throw new Error("favorites collection not available");

    const id = payload.id;
    await col.doc(id).set(
      {
        title: payload.title || id,
        url: payload.url || "#",
        createdAt: serverTs()
      },
      { merge: true }
    );
  }

  // Remove a favorite
  async function removeFavorite(uid, id){
    const col = favCol(uid);
    if (!col) throw new Error("favorites collection not available");
    await col.doc(id).delete();
  }

  // Favorite button click handling (works on Tools page and anywhere else)
  document.addEventListener("click", async (e)=>{
    const btn = e.target.closest(".fav-toggle");
    if (!btn) return;

    const user = auth && auth.currentUser;

    // Signed out user gets redirected to sign in
    if (!user){
      const next = encodeURIComponent(
        location.pathname +
        location.search +
        (location.hash || "")
      );
      location.href = "signin.html?next=" + next;
      return;
    }

    const id = btn.getAttribute("data-id") || "";
    const title = btn.getAttribute("data-title") || id;
    const url = btn.getAttribute("data-url") || "#";

    if (!id) return;

    btn.disabled = true;

    try {
      if (btn.classList.contains("is-favorited")){
        await removeFavorite(user.uid, id);
        toast("Removed from favorites");
      } else {
        await addFavorite(user.uid, { id, title, url });
        toast("Saved to favorites");
      }
    } catch (err) {
      console.error("[favorites] update failed", err);
      toast("Could not update favorites", true);
    } finally {
      btn.disabled = false;
    }
  });

  // Remove from Home favorites cards
  document.addEventListener("click", async (e)=>{
    const btn = e.target.closest("[data-home-remove]");
    if (!btn) return;

    const user = auth && auth.currentUser;
    if (!user) return;

    const id = btn.getAttribute("data-home-remove") || "";
    if (!id) return;

    btn.disabled = true;

    try {
      await removeFavorite(user.uid, id);
      toast("Removed from favorites");
    } catch (err) {
      console.error("[favorites] home remove failed", err);
      toast("Could not remove favorite", true);
    } finally {
      btn.disabled = false;
    }
  });

  // Start syncing based on auth state
  function init(){
    const user = auth && auth.currentUser;

    updateHomeFavoritesSection(user);
    startFavoriteListener(user);
    updateFavoriteButtons();
  }

  if (auth && typeof auth.onAuthStateChanged === "function"){
    auth.onAuthStateChanged(user=>{
      updateHomeFavoritesSection(user);
      startFavoriteListener(user);
      updateFavoriteButtons();
    });
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();