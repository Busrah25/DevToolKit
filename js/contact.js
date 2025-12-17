/*
  DevToolkit Contact Form Logic
  Course: CSC 4110 Software Engineering
  Group 7

  Purpose
  1. Handle Contact form behavior
  2. Validate input using HTML5 + Bootstrap
  3. Open the default email client
  4. Save a copy to Firestore if signed in

  Notes
  1. Signed out users can still send messages
  2. Signed in users have messages saved to:
     /users/{uid}/contacts
*/

;(function contactModule(){

    const TEAM_EMAILS =
      "hi2757@wayne.edu," +
      "hk7748@wayne.edu," +
      "hl2754@wayne.edu," +
      "hk9059@wayne.edu";
  
    const form = document.getElementById("contactForm");
    if (!form) return;
  
    const status = document.getElementById("contactStatus");
    const clearBtn = document.getElementById("clearContact");
  
    // define elements
    const nameEl = document.getElementById("name");
    const emailEl = document.getElementById("email");
    const msgEl = document.getElementById("message");
  
    function show(msg, type="success"){
      status.className = `alert alert-${type}`;
      status.textContent = msg;
      status.classList.remove("d-none");
    }
  
    clearBtn?.addEventListener("click", ()=>{
      form.reset();
      form.classList.remove("was-validated");
      status.classList.add("d-none");
    });
  
    form.addEventListener("submit", async e=>{
      e.preventDefault();
  
      if (!form.checkValidity()){
        form.classList.add("was-validated");
        show("Please complete all required fields.", "danger");
        return;
      }
  
      const name = nameEl.value.trim();
      const email = emailEl.value.trim();
      const message = msgEl.value.trim();
  
      // Save to Firestore if signed in
      try {
        const auth = firebase?.auth();
        const user = auth?.currentUser;
  
        if (user){
          await firebase.firestore()
            .collection("users")
            .doc(user.uid)
            .collection("contacts")
            .add({
              name,
              email,
              message,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
      } catch (err){
        console.warn("[contact] Firestore save failed:", err);
      }
  
      // Open email client
      const subject = `DevToolkit Contact from ${name}`;
      const body =
        `Message:\n${message}\n\nFrom:\n${name} <${email}>`;
  
      const mailto =
        "mailto:" + TEAM_EMAILS +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
  
      window.location.href = mailto;
  
      // UI confirmation
      show("Message ready to send in your email app!");
      form.reset();
      form.classList.remove("was-validated");
    });
  
  })();
  