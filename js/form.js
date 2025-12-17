/*
  DevToolkit Suggest Form Logic
  Course: CSC 4110 Software Engineering
  Group 7

  Purpose
  1. Handle the Suggest form behavior
  2. Validate input using HTML5 + Bootstrap
  3. Open the default email client for submission
  4. If signed in, save a copy to Firestore

  Notes
  1. Signed out users can still email suggestions
  2. Signed in users have suggestions saved to:
     /users/{uid}/suggestions
*/

;(function suggestModule(){

  
    const TEAM_EMAILS =
      "hi2757@wayne.edu," +
      "hk7748@wayne.edu," +
      "hl2754@wayne.edu," +
      "hg0080@wayne.edu," +
      "hk9059@wayne.edu";
  

  const fb = window.firebase || null;
  const auth = window.auth || (fb && fb.auth ? fb.auth() : null);
  const db = window.db || (fb && fb.firestore ? fb.firestore() : null);

  function serverTs(){
    try { return fb.firestore.FieldValue.serverTimestamp(); }
    catch { return new Date(); }
  }

  function initCounters(){
    document.querySelectorAll("[data-count]").forEach(span=>{
      const field = document.getElementById(span.dataset.count);
      if (!field) return;
      const update = ()=> span.textContent = field.value.length;
      update();
      field.addEventListener("input", update);
    });
  }

  function openMail(subject, body){
    const mailto =
      "mailto:" + TEAM_EMAILS +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    window.location.href = mailto;
  }

  async function saveIfSignedIn(data){
    const user = auth?.currentUser;
    if (!user || !db) return;

    await db.collection("users")
      .doc(user.uid)
      .collection("suggestions")
      .add({
        ...data,
        uid: user.uid,
        createdAt: serverTs()
      });
  }

  function wireSuggest(){
    const form = document.getElementById("suggestForm");
    if (!form) return;

    const clearBtn = document.getElementById("clearSuggest");

    form.addEventListener("submit", async e=>{
      e.preventDefault();

      if (!form.checkValidity()){
        form.classList.add("was-validated");
        return;
      }

      const data = {
        title: toolName.value.trim(),
        url: toolUrl.value.trim(),
        category: category.value,
        level: level.value,
        message: notes.value.trim()
      };

      try { await saveIfSignedIn(data); }
      catch (err){ console.warn("[suggest] Firestore save failed:", err); }

      const body = [
        "New DevToolkit Suggestion",
        "",
        "Resource name:", data.title,
        "",
        "URL:", data.url,
        "",
        "Category:", data.category,
        "",
        "Level:", data.level,
        "",
        "Why this is helpful:",
        data.message
      ].join("\n");

      openMail("DevToolkit Resource Suggestion", body);

      setTimeout(()=>{
        form.reset();
        form.classList.remove("was-validated");
        initCounters();
      }, 250);
    });

    clearBtn?.addEventListener("click", ()=>{
      form.reset();
      form.classList.remove("was-validated");
      initCounters();
    });
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", ()=>{
        initCounters();
        wireSuggest();
      })
    : (initCounters(), wireSuggest());

})();
