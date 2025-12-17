// /js/reset.js
/*
  DevToolkit Password Reset
  Course: CSC 4110 Software Engineering
  Group 7

  Purpose
  1. Handle password reset flow via Firebase Auth
  2. Keep messaging generic to avoid account enumeration
  3. Reflect auth state in the account menu
  4. Provide accessible, non-blocking UI feedback

  Notes
  1. Requires firebase-app-compat.js and firebase-auth-compat.js (loaded before this file)
  2. Requires site Firebase initialization in js/firebase.js
  3. Page elements are defined in reset.html; selectors guarded to avoid crashes
*/

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    // Soft checks to avoid runtime crashes if scripts load out-of-order.
    if (typeof firebase === "undefined" || !firebase.apps || firebase.apps.length === 0) {
      console.error("[reset.js] Firebase is not initialized. Ensure js/firebase.js runs before this file.");
      return;
    }
    if (!firebase.auth) {
      console.error("[reset.js] firebase.auth compat SDK missing. Include firebase-auth-compat.js.");
      return;
    }

    // Elements (guard each in case HTML changes)
    const $ = (sel) => document.querySelector(sel);
    const resetForm = $("#resetForm");
    const emailInput = $("#resetEmail");
    const successEl = $("#resetSuccess");
    const errorEl = $("#resetError");
    const hintEl = $("#resetHint");
    const accountMenu = $("#accountMenu");
    const accountBtn = $("#accountBtn");

    // Helpers
    const setHidden = (el, hide) => {
      if (!el) return;
      el.classList.toggle("d-none", !!hide);
    };

    const disableForm = (disabled) => {
      if (!resetForm) return;
      [...resetForm.elements].forEach((el) => (el.disabled = !!disabled));
    };

    const setStatus = ({ success = "", error = "" }) => {
      if (successEl) {
        successEl.textContent = success;
        setHidden(successEl, !success);
        if (success) successEl.focus({ preventScroll: true });
      }
      if (errorEl) {
        errorEl.textContent = error;
        setHidden(errorEl, !error);
        if (error) errorEl.focus({ preventScroll: true });
      }
    };

    // Basic email sanity check (client-side only; real validation is server-side)
    const isEmail = (val) => /^\S+@\S+\.\S+$/.test(val);

    // Auth wiring (generic UI, no leakage)
    const auth = firebase.auth();

    // Toggle account dropdown items
    const applyAuthVisibility = (user) => {
      if (!accountMenu) return;
      accountMenu
        .querySelectorAll("[data-show-auth]")
        .forEach((el) => el.classList.toggle("d-none", !user));
      accountMenu
        .querySelectorAll("[data-hide-auth]")
        .forEach((el) => el.classList.toggle("d-none", !!user));
      if (accountBtn) accountBtn.textContent = user ? "Account" : "Account";
    };

    auth.onAuthStateChanged((user) => {
      applyAuthVisibility(user);
      // Hint only when signed-in—helps the user but keeps page generic otherwise.
      if (user && hintEl) {
        hintEl.innerHTML = `You’re signed in as <strong>${user.email || "your account"}</strong>. We’ll send a reset link to the email you enter.`;
        setHidden(hintEl, false);
      } else if (hintEl) {
        hintEl.textContent = "";
        setHidden(hintEl, true);
      }
    });

    // Submit handler
    if (resetForm) {
      resetForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        setStatus({ success: "", error: "" });

        const email = (emailInput?.value || "").trim();
        if (!email || !isEmail(email)) {
          setStatus({ error: "Please enter a valid email address." });
          emailInput?.focus();
          return;
        }

        disableForm(true);
        try {
          await auth.sendPasswordResetEmail(email);
          // Always show generic success, regardless of whether user exists.
          setStatus({
            success:
              "If an account exists, a reset link was sent. Check your inbox.",
          });
          if (emailInput) emailInput.value = "";
        } catch (err) {
          // Do not reveal specifics; log for developers only.
          console.warn("[reset.js] sendPasswordResetEmail error:", err);
          setStatus({
            success:
              "If an account exists, a reset link was sent. Check your inbox.",
          });
        } finally {
          disableForm(false);
        }
      });
    } else {
      console.error("[reset.js] #resetForm not found.");
    }
  });
})();
