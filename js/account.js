// js/account.js
/*
  DevToolkit Account Page Logic
  Course: CSC 4110 Software Engineering
  Group 7

  Purpose
  - Populate user profile information on the account page
  - Display favorites, suggestions, and contacts for the signed in user
  - Handle logout and authentication state changes

  Notes
  - Uses Firebase Authentication and Firestore when available
  - Gracefully degrades if Firebase is unavailable
  - Prevents account.html from breaking when backend is missing
*/

;(function accountPage(){

    const state = {
      unsubscribers: []
    };
  
    function byId(id){
      return document.getElementById(id);
    }
  
    function setText(id, value){
      const el = byId(id);
      if (el) el.textContent = value ?? "";
    }
  
    function toggleEmpty(listId, emptyId){
      const list = byId(listId);
      const empty = byId(emptyId);
      if (!list || !empty) return;
  
      const hasItems = list.children.length > 0;
      empty.classList.toggle("d-none", hasItems);
    }
  
    function renderSimpleList(listId, items){
      const list = byId(listId);
      if (!list) return;
  
      list.innerHTML = "";
      for (const item of items){
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = item;
        list.appendChild(li);
      }
    }
  
    // Attach logout behavior to the logout button if present
    async function wireLogout(auth){
      const btn = byId("logoutBtn");
      if (!btn) return;
  
      btn.addEventListener("click", async (e)=>{
        e.preventDefault();
        try {
          await auth.signOut();
        } catch (_) {
          // Do not block redirect if sign out fails
        } finally {
          window.location.assign("signin.html");
        }
      });
    }
  
    // Initialize Firebase services if available
    function startWithFirebase(){
      const app =
        window.firebase?.apps?.length
          ? window.firebase.app()
          : null;
  
      if (!app) return null;
  
      const auth = window.firebase.auth();
      const db = window.firebase.firestore?.();
      return { auth, db };
    }
  
    // Subscribe to user collections and update UI in real time
    function watchCollections(db, uid){
  
      if (!db){
        renderSimpleList("favoritesList", []);
        renderSimpleList("suggestionsList", []);
        renderSimpleList("contactsList", []);
        toggleEmpty("favoritesList", "favoritesEmpty");
        toggleEmpty("suggestionsList", "suggestionsEmpty");
        toggleEmpty("contactsList", "contactsEmpty");
        return;
      }
  
      // Favorites
      const favRef = db.collection("users").doc(uid).collection("favorites");
      const unsubFav = favRef.onSnapshot(
        snap=>{
          const items = snap.docs.map(d=>d.data()?.title || d.id);
          renderSimpleList("favoritesList", items);
          toggleEmpty("favoritesList", "favoritesEmpty");
  
          const section = byId("favorites");
          if (section){
            section.classList.toggle("d-none", items.length === 0);
          }
        },
        ()=>{
          renderSimpleList("favoritesList", []);
          toggleEmpty("favoritesList", "favoritesEmpty");
        }
      );
      state.unsubscribers.push(unsubFav);
  
      // Suggestions
      const sugRef = db.collection("users").doc(uid).collection("suggestions");
      const unsubSug = sugRef.onSnapshot(
        snap=>{
          const items = snap.docs.map(d=>d.data()?.text || d.id);
          renderSimpleList("suggestionsList", items);
          toggleEmpty("suggestionsList", "suggestionsEmpty");
        },
        ()=>{
          renderSimpleList("suggestionsList", []);
          toggleEmpty("suggestionsList", "suggestionsEmpty");
        }
      );
      state.unsubscribers.push(unsubSug);
  
      // Contacts
      const conRef = db.collection("users").doc(uid).collection("contacts");
      const unsubCon = conRef.onSnapshot(
        snap=>{
          const items = snap.docs.map(d=>d.data()?.name || d.id);
          renderSimpleList("contactsList", items);
          toggleEmpty("contactsList", "contactsEmpty");
        },
        ()=>{
          renderSimpleList("contactsList", []);
          toggleEmpty("contactsList", "contactsEmpty");
        }
      );
      state.unsubscribers.push(unsubCon);
    }
  
    // Handle authenticated user state
    function onAuthed(auth, db, user){
      setText("accName", user.displayName || user.email || "Account");
      setText("accEmail", user.email || "");
      wireLogout(auth);
      watchCollections(db, user.uid);
    }
  
    // Clean up active Firestore listeners
    function cleanup(){
      for (const unsub of state.unsubscribers){
        try { unsub && unsub(); } catch(_) {}
      }
      state.unsubscribers = [];
    }
  
    function run(){
  
      // Redirect if user is not authenticated
      if (typeof window.protectAuthed === "function"){
        window.protectAuthed();
      }
  
      const env = startWithFirebase();
      if (!env){
        setText("accName", "Account");
        setText("accEmail", "");
        toggleEmpty("favoritesList", "favoritesEmpty");
        toggleEmpty("suggestionsList", "suggestionsEmpty");
        toggleEmpty("contactsList", "contactsEmpty");
        return;
      }
  
      const { auth, db } = env;
  
      cleanup();
      const unsub = auth.onAuthStateChanged(user=>{
        cleanup();
  
        if (user){
          onAuthed(auth, db, user);
        } else {
          setText("accName", "Account");
          setText("accEmail", "");
          renderSimpleList("favoritesList", []);
          renderSimpleList("suggestionsList", []);
          renderSimpleList("contactsList", []);
          toggleEmpty("favoritesList", "favoritesEmpty");
          toggleEmpty("suggestionsList", "suggestionsEmpty");
          toggleEmpty("contactsList", "contactsEmpty");
        }
      });
  
      state.unsubscribers.push(unsub);
    }
  
    // Run after the DOM is ready
    if (document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", run);
    } else {
      run();
    }
  
  })();
  