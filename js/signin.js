// js/signin.js
/*
  DevToolkit – Sign In Handler
  Course: CSC 4110 – Software Engineering
  Group 7

  Purpose:
  1. Authenticate users using Firebase Authentication
  2. Show clear success or error feedback on the page
  3. Redirect users back to the original page using ?next=
  4. Default to index.html if next is missing or unsafe
*/

;(function signIn(){

  // Stop if this page does not have the sign in form
  const form = document.getElementById('signinForm');
  if (!form) return;

  // Prefer the global auth from firebase.js, fallback to firebase.auth()
  const auth =
    window.auth ||
    (window.firebase && firebase.auth && firebase.auth());

  // Quick DOM helper
  function el(id){
    return document.getElementById(id);
  }

  // UI helpers
  function show(node, text){
    if (!node) return;
    if (typeof text === 'string') node.textContent = text;
    node.classList.remove('d-none');
  }

  function hide(node){
    if (!node) return;
    node.classList.add('d-none');
  }

  // Returns a safe redirect target
  function getRedirectTarget(){
    let next = '';

    try {
      next = new URL(location.href).searchParams.get('next') || '';
    } catch {
      next = '';
    }

    if (!next) return 'index.html';

    let decoded = '';
    try {
      decoded = decodeURIComponent(next);
    } catch {
      decoded = next;
    }

    const target = String(decoded || '').trim();
    if (!target) return 'index.html';

    // Block external redirects
    if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('//')) {
      return 'index.html';
    }

    return target;
  }

  // Firebase error codes contain hyphens, so normalize for comparisons
  function normalizeCode(code){
    const h = String.fromCharCode(45);
    return String(code || '').split(h).join('').toLowerCase();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const emailEl = el('email');
    const passEl = el('password');

    const successMsg = el('signinMsg');
    const errorMsg = el('signinError');

    hide(successMsg);
    hide(errorMsg);

    const email = (emailEl && emailEl.value ? emailEl.value : '').trim();
    const password = (passEl && passEl.value ? passEl.value : '');

    // Basic front end validation
    if (!email || !password) {
      show(errorMsg, 'Please enter your email and password.');
      return;
    }

    if (!auth) {
      show(errorMsg, 'Firebase is not ready. Please refresh and try again.');
      return;
    }

    auth
      .signInWithEmailAndPassword(email, password)
      .then(function () {
        show(successMsg, 'Signed in successfully. Redirecting…');

        const target = getRedirectTarget();

        // Short delay so the user sees feedback
        setTimeout(function () {
          location.href = target;
        }, 250);
      })
      .catch(function (error) {
        const code = normalizeCode(error && error.code ? error.code : '');

        let msg = 'Sign in failed. Please try again.';

        if (code === 'authinvalidemail') msg = 'That email looks invalid.';
        else if (code === 'authusernotfound') msg = 'No account found for that email.';
        else if (code === 'authwrongpassword') msg = 'Incorrect password.';
        else if (code === 'authtoomanyrequests') msg = 'Too many attempts. Try again later.';
        else if (error && error.message) msg = error.message;

        show(errorMsg, msg);
      });
  });

})();
