// /js/tools.js  
/*
  DevToolkit – Tools Page Logic
  Course: CSC 4110 – Software Engineering
  Group 7

  Purpose:
  - Display all developer tools from tools.json
  - Support searching and filtering by category, level, and price
  - Allow signed in users to view and manage favorite tools
  - Prevent redirect loops by waiting for Firebase auth state once

  Notes:
  - All logic runs client side
  - Favorites mode is enabled using ?fav=1
  - Firebase auth state is resolved before accessing user data
*/

;(function ToolsPage(){

  const cardsEl = document.getElementById('cards');
  const emptyEl = document.getElementById('emptyState');
  const searchBox = document.getElementById('searchBox');

  function badge(cls, txt){ return `<span class="badge ${cls} me-1">${txt}</span>`; }
  function priceBadge(p){
    if (p === 'Free') return badge('bg-success', p);
    if (p === 'Paid' || p === 'Subscription') return badge('bg-warning text-dark', p);
    return badge('bg-secondary', p || '—');
  }
  function levelBadge(l){
    if (l === 'Beginner') return badge('bg-primary', l);
    if (l === 'Intermediate') return badge('bg-info text-dark', l);
    if (l === 'Advanced') return badge('bg-danger', l);
    if (l === 'All levels') return badge('bg-secondary', l);
    return badge('bg-secondary', l || '—');
  }
  function categoryBadge(c){
    const map = { DevOps:'bg-dark', General:'bg-dark', Testing:'bg-primary', Cloud:'bg-info text-dark', Data:'bg-info text-dark' };
    return badge(map[c] || 'bg-secondary', c || '—');
  }

  function getURL(){ try { return new URL(location.href); } catch { return null; } }
  function getQuery(){ const u = getURL(); return u ? (u.searchParams.get('q')?.trim() || '') : ''; }
  function isFavoritesMode(){ const u = getURL(); return !!(u && u.searchParams.get('fav') === '1'); }

  function matchesQuery(tool, q){
    if (!q) return true;
    const hay = `${tool.title} ${tool.blurb || ''} ${tool.provider || ''} ${tool.category || ''}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function applyFilters(all){
    const cat = document.getElementById('categoryFilter')?.value || '';
    const lvl = document.getElementById('levelFilter')?.value || '';
    const prc = document.getElementById('priceFilter')?.value || '';
    const q = (searchBox?.value || getQuery()).trim();

    return all.filter(t => {
      if (cat && t.category !== cat) return false;
      if (lvl && t.level !== lvl) return false;
      if (prc && t.price !== prc) return false;
      if (!matchesQuery(t, q)) return false;
      return true;
    });
  }

  function cardHtml(t){
    return `
      <div class="card h-100 shadow-sm tool-card">
        <div class="card-body">
          ${priceBadge(t.price)}${categoryBadge(t.category)}${levelBadge(t.level)}
          <h2 class="h5 card-title mt-2">${t.title}</h2>
          <p class="card-text">${t.blurb || ''}</p>
          <p class="small text-muted mb-3">Provider: ${t.provider || ''}</p>
          <a href="${t.url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Visit</a>
          <button class="btn btn-outline-primary btn-sm ms-2 fav-toggle"
                  data-show-auth
                  data-id="${t.id}"
                  data-title="${t.title}"
                  data-url="${t.url}">
            ♡ Favorite
          </button>
        </div>
      </div>
    `;
  }

  function render(tools){
    cardsEl.innerHTML = '';
    if (!tools.length){
      emptyEl?.classList.remove('d-none');
      return;
    }
    emptyEl?.classList.add('d-none');

    const frag = document.createDocumentFragment();
    tools.forEach(t => {
      const col = document.createElement('div');
      col.className = 'col-md-4';
      col.innerHTML = cardHtml(t);
      frag.appendChild(col);
    });
    cardsEl.appendChild(frag);

    if (typeof window.refreshFavoriteButtons === 'function'){
      window.refreshFavoriteButtons();
    }
  }

  async function loadAllTools(){
    const res = await fetch('data/tools.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function waitForAuthOnce(){
    const a = window.auth || (window.firebase && firebase.auth && firebase.auth());
    return new Promise(resolve => {
      if (!a || !a.onAuthStateChanged) return resolve(null);
      const unsub = a.onAuthStateChanged(user => { unsub(); resolve(user); });
    });
  }

  // normalize any favorites payload 
  function toFavId(item){
    try{
      if (item && typeof item.data === 'function'){ // Firestore doc
        const data = item.data() || {};
        const id = item.id || data.id || data.toolId || data.tool_id;
        return id != null ? String(id).toLowerCase() : null;
      }
      if (typeof item === 'string') return item.toLowerCase();
      const id = item?.id ?? item?.toolId ?? item?.tool_id ?? item?.docId;
      return id != null ? String(id).toLowerCase() : null;
    } catch { return null; }
  }
  function normalizeFavorites(items){
    const set = new Set();
    if (!items) return set;

    if (Array.isArray(items)){
      items.forEach(it => { const id = toFavId(it); if (id) set.add(id); });
    } else if (items && typeof items.forEach === 'function' && Array.isArray(items.docs)){
      items.docs.forEach(doc => { const id = toFavId(doc); if (id) set.add(id); });
    } else if (typeof items === 'object'){
      Object.keys(items).forEach(k => set.add(String(k).toLowerCase())); // map {id:true}
    }
    return set;
  }

  function wireFilters(all, favoritesIds){
    const recalc = () => {
      const base = applyFilters(all);
      const out = isFavoritesMode()
        ? base.filter(t => favoritesIds.has(String(t.id).toLowerCase()))
        : base;
      render(out);
    };

    if (searchBox){
      const q = getQuery(); if (q) searchBox.value = q;
      searchBox.addEventListener('input', recalc);
    }
    ['categoryFilter','levelFilter','priceFilter'].forEach(id=>{
      document.getElementById(id)?.addEventListener('change', recalc);
    });

    return recalc;
  }

  async function start(){
    try {
      const all = await loadAllTools();
      let favIds = new Set();                    // always lower-case IDs
      const rerender = wireFilters(all, favIds);

      if (!isFavoritesMode()){
        render(applyFilters(all));
        return;
      }

      const user = await waitForAuthOnce();
      if (!user){
        const next = encodeURIComponent('tools.html?fav=1');
        location.href = `signin.html?next=${next}`;
        return;
      }

      if (!window.subscribeFavorites) throw new Error('favorites.js not loaded');

      window.subscribeFavorites(user.uid, items => {
        favIds = normalizeFavorites(items);      // accept map/array/snapshot/strings
        const filtered = applyFilters(all).filter(t => favIds.has(String(t.id).toLowerCase()));
        render(filtered);
      });

      // initial render while waiting for first snapshot
      rerender();

    } catch (e) {
      console.error('[tools] init failed', e);
      if (emptyEl){
        emptyEl.textContent = isFavoritesMode()
          ? 'Failed to load your favorites.'
          : 'Failed to load tools.';
        emptyEl.classList.remove('d-none');
      }
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
