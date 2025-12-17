// js/auth.js
/*
  DevToolkit Authentication UI Logic
  Course: CSC 4110 Software Engineering
  Group 7

  Purpose
  - Control the Account dropdown based on signed in state
  - Show and hide UI elements for signed in vs signed out users
  - Guard clicks that require authentication

  Notes
  - Uses Firebase Authentication
  - Works across all pages using shared ids and data attributes
*/

;(function authMenu(){
  // Safe way to access Firebase Auth
  function getAuth(){
    return (
      window.auth ||
      (window.firebase && firebase.auth && firebase.auth())
    );
  }

  // Show or hide elements that depend on login state
  function toggleDataAuth(isSignedIn){
    // Elements visible only when signed in
    document.querySelectorAll("[data-show-auth]").forEach(el=>{
      if (isSignedIn){
        el.classList.remove("d-none");
        el.style.display = "";
      } else {
        el.classList.add("d-none");
        el.style.display = "none";
      }
    });

    // Elements visible only when signed out
    document.querySelectorAll("[data-hide-auth]").forEach(el=>{
      if (isSignedIn){
        el.classList.add("d-none");
        el.style.display = "none";
      } else {
        el.classList.remove("d-none");
        el.style.display = "";
      }
    });
  }

  // Build the dropdown if the page does not already include data show hide items
  function renderMenuIfNeeded(menu, user){
    if (!menu) return;

    // If this menu already has auth tagged items, do not overwrite it
    const hasTaggedItems =
      menu.querySelector("[data-show-auth]") ||
      menu.querySelector("[data-hide-auth]");

    if (hasTaggedItems) return;

    if (user){
      menu.innerHTML = `
        <li>
          <span class="dropdown-item-text small text-muted">
            Signed in as<br><strong>${user.email || "Account"}</strong>
          </span>
        </li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" href="account.html">My Account</a></li>
        <li><button id="logoutBtn" class="dropdown-item text-danger" type="button">Logout</button></li>
      `;
    } else {
      menu.innerHTML = `
        <li><a class="dropdown-item" href="signin.html">Sign In</a></li>
        <li><a class="dropdown-item" href="signup.html">Sign Up</a></li>
      `;
    }
  }

  // Attach logout handler wherever a logout button exists
  function bindLogout(authInstance){
    if (!authInstance) return;

    document.querySelectorAll("#logoutBtn").forEach(btn=>{
      // Prevent double binding across re renders
      if (btn.dataset.logoutBound === "1") return;
      btn.dataset.logoutBound = "1";

      btn.addEventListener("click", (e)=>{
        // Supports both button and link
        if (btn.tagName.toLowerCase() === "a") e.preventDefault();

        authInstance.signOut().then(()=>{
          location.href = "index.html";
        }).catch(()=>{
          alert("Logout failed. Please try again.");
        });
      });
    });
  }

  // Redirect users to sign in when clicking protected actions
  function installRequireAuthGuard(authInstance){
    document.addEventListener("click", (e)=>{
      const target = e.target.closest("[data-require-auth]");
      if (!target) return;

      const user = authInstance && authInstance.currentUser;
      if (user) return;

      e.preventDefault();

      const next = encodeURIComponent(
        location.pathname + location.search + (location.hash || "")
      );

      location.href = "signin.html?next=" + next;
    });
  }

  function start(){
    const authInstance = getAuth();
    if (!authInstance) return;

    const menu = document.getElementById("accountMenu");

    // One time setup
    installRequireAuthGuard(authInstance);

    // Watch sign in state changes
    authInstance.onAuthStateChanged((user)=>{
      toggleDataAuth(!!user);
      renderMenuIfNeeded(menu, user);
      bindLogout(authInstance);

      // Let other scripts refresh UI when auth changes
      if (typeof window.refreshFavoriteButtons === "function"){
        window.refreshFavoriteButtons();
      }
    });
  }

  // Run after DOM is ready
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
