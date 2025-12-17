// js/firebase.js
/*
  DevToolkit Firebase Initialization
  Course: CSC 4110 Software Engineering
  Group 7

  Purpose
  1. Initialize Firebase once for the whole site
  2. Expose Firebase Auth and Firestore as window.auth and window.db
  3. Prevent duplicate initialization across pages

  Notes
  1. Uses Firebase compat SDK scripts loaded in the HTML
  2. Must load before auth.js, favorites.js, and any page scripts that use auth or db
*/

;(function initFirebase(){
  // Make sure the Firebase SDK loaded before this file
  if (!window.firebase || typeof firebase.initializeApp !== "function") {
    console.error("[firebase] SDK not found. Check script order in the HTML.");
    return;
  }

  // Firebase project configuration (DevToolkit project)
  var firebaseConfig = {
    apiKey: "AIzaSyADTv5SUt-IwKB65c038pMSiWH_a4wViLk",
    authDomain: "devtoolkit-8263c.firebaseapp.com",
    projectId: "devtoolkit-8263c",
    storageBucket: "devtoolkit-8263c.appspot.com",
    messagingSenderId: "657906699324",
    appId: "1:657906699324:web:35c8f6736401a322a64739"
  };

  // Initialize only once
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Expose Firebase Auth globally
  if (!window.auth && firebase.auth) {
    window.auth = firebase.auth();
  }

  // Expose Firestore globally (only if the Firestore SDK is loaded on this page)
  if (!window.db && firebase.firestore) {
    window.db = firebase.firestore();
  }

  // Helpful log for debugging during development
  console.log("[firebase] ready");
})();
