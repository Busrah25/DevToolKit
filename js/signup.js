// js/signup.js
/*
  DevToolkit – Sign Up Handler
  Course: CSC 4110 – Software Engineering
  Group 7

  Purpose:
  - Create a new user account using Firebase Authentication
  - Store the user's display name (from the form) in Firebase Auth
  - Send an email verification link
  - Sign out after signup so verification is encouraged before use
  - Redirect to sign in and preserve ?next= for protected pages

  Notes:
  - We keep redirect targets safe to avoid open redirects
*/

;(function signUp(){

  const form = document.getElementById('signupForm');
  if (!form) return;

  // Prefer global auth from firebase.js
  const auth =
    window.auth ||
    (window.firebase && firebase.auth && firebase.auth());

  function el(id){
    return document.getElementById(id);
  }

  function show(node, text){
    if (!node) return;
    if (typeof text === 'string') node.textContent = text;
    node.classList.remove('d-none');
  }

  function hide(node){
    if (!node) return;
    node.classList.add('d-none');
  }

  function qs(name){
    try {
      return new URL(location.href).searchParams.get(name) || '';
    } catch {
      return '';
    }
  }

  // Keeps redirect safe (no external URLs)
  function safeNextParam(){
    const raw = qs('next');
    if (!raw) return '';

    let decoded = '';
    try { decoded = decodeURIComponent(raw); }
    catch { decoded = raw; }

    const target = String(decoded || '').trim();
    if (!target) return '';

    if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('//')) {
      return '';
    }

    return target;
  }

  // Firebase error codes have hyphens, normalize for comparisons
  function normalizeCode(code){
    const h = String.fromCharCode(45);
    return String(code || '').split(h).join('').toLowerCase();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const nameEl = el('name');
    const emailEl = el('email');
    const passEl = el('password');

    const successMsg = el('signupMsg');
    const errorMsg = el('signupError');

    hide(successMsg);
    hide(errorMsg);

    const fullName = (nameEl && nameEl.value ? nameEl.value : '').trim();
    const email = (emailEl && emailEl.value ? emailEl.value : '').trim();
    const password = (passEl && passEl.value ? passEl.value : '');

    // Basic front end checks
    if (!fullName) {
      show(errorMsg, 'Please enter your name.');
      return;
    }
    if (!email) {
      show(errorMsg, 'Please enter your email.');
      return;
    }
    if (!password || password.length < 6) {
      show(errorMsg, 'Password must be at least 6 characters.');
      return;
    }
    if (!auth) {
      show(errorMsg, 'Firebase is not ready. Please refresh and try again.');
      return;
    }

    auth
      .createUserWithEmailAndPassword(email, password)
      .then(function (cred) {
        const user = cred && cred.user ? cred.user : null;
        if (!user) throw new Error('Account created, but user object was missing.');

        // Set display name in Firebase Auth profile
        return user.updateProfile({ displayName: fullName }).then(function () {
          return user;
        });
      })
      .then(function (user) {
        // Send verification email
        // Action link sends them back to signin.html
        const continueUrl = location.origin + '/signin.html';

        return user.sendEmailVerification({ url: continueUrl }).then(function () {
          return user;
        });
      })
      .then(function () {
        // Sign out so they see the "verify your email" banner on sign in
        return auth.signOut();
      })
      .then(function () {
        show(
          successMsg,
          'Account created. Verification email sent. Redirecting to sign in…'
        );

        const email = (el('email') && el('email').value ? el('email').value : '').trim();
        const next = safeNextParam();

        setTimeout(function () {
          const u = new URL('signin.html', location.origin);
          u.searchParams.set('verify', 'sent');
          if (email) u.searchParams.set('email', email);
          if (next) u.searchParams.set('next', encodeURIComponent(next));
          location.href = u.toString();
        }, 700);
      })
      .catch(function (err) {
        const code = normalizeCode(err && err.code ? err.code : '');

        let msg = 'Failed to create account. Please try again.';

        if (code === 'authweakpassword') {
          msg = 'Password is too weak. Use at least 6 characters.';
        } else if (code === 'authemailalreadyinuse') {
          msg = 'That email is already in use. Try signing in instead.';
        } else if (code === 'authinvalidemail') {
          msg = 'That email looks invalid.';
        } else if (err && err.message) {
          msg = err.message;
        }

        show(errorMsg, msg);
      });
  });

})();
