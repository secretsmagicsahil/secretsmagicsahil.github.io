// 1. Your Firebase configuration
// Replace the placeholders with your actual Firebase config from the console.
const firebaseConfig = {
    apiKey: "AIzaSyAiyjUJqHyMeAa4bk8tkSAxfna6td7ub94",
    authDomain: "haloween-heist.firebaseapp.com",
    databaseURL: "https://haloween-heist-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "haloween-heist",
    storageBucket: "haloween-heist.firebasestorage.app",
    messagingSenderId: "221767080142",
    appId: "1:221767080142:web:c0a166b7c5de731a3f589f"
  };
  
  let db;
  
  // Initialise Firebase once
  function initFirebase() {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
  }
  
  // Utility: update shared game state
  function setGameValue(key, value) {
    return db.ref("game/" + key).set(value);
  }
  
  // Utility: listen to updates
  function subscribeToGameValue(key, callback) {
    db.ref("game/" + key).on("value", (snapshot) => {
      callback(snapshot.val());
    });
  }
  
  window.addEventListener("load", () => {
    initFirebase();
  
    const hostControls = document.getElementById("hostControls");
    const playerView = document.getElementById("playerView");
  
    if (hostControls) {
      initHostPage();
    }
  
    if (playerView) {
      initPlayerPage();
    }
  });
  
  // ---------------- HOST LOGIC ----------------
  
  function initHostPage() {
    const missionInput = document.getElementById("missionInput");
    const updateMissionBtn = document.getElementById("updateMissionBtn");
    const clearMissionBtn = document.getElementById("clearMissionBtn");
    const hostMissionText = document.getElementById("hostMissionText");
    const hostPhaseText = document.getElementById("hostPhaseText");
  
    // Update mission in Firebase
    updateMissionBtn.addEventListener("click", () => {
      const text = missionInput.value.trim();
      setGameValue("mission", text || "");
    });
  
    // Clear mission
    clearMissionBtn.addEventListener("click", () => {
      missionInput.value = "";
      setGameValue("mission", "");
    });
  
    // Phase buttons
    document.querySelectorAll("[data-phase]").forEach(btn => {
      btn.addEventListener("click", () => {
        const phase = btn.getAttribute("data-phase");
        setGameValue("phase", phase);
      });
    });
  
    // Subscribe to live mission + phase
    subscribeToGameValue("mission", (value) => {
      hostMissionText.textContent = value && value.length
        ? value
        : "No mission set yet.";
    });
  
    subscribeToGameValue("phase", (value) => {
      hostPhaseText.textContent = value || "–";
    });
  }
  
  // ---------------- PLAYER LOGIC ----------------
  
  function initPlayerPage() {
    const joinSection = document.getElementById("joinSection");
    const gameSection = document.getElementById("gameSection");
    const playerNameInput = document.getElementById("playerName");
    const joinBtn = document.getElementById("joinBtn");
    const displayName = document.getElementById("displayName");
    const playerPhaseText = document.getElementById("playerPhaseText");
    const playerMissionText = document.getElementById("playerMissionText");
  
    joinBtn.addEventListener("click", () => {
      const name = playerNameInput.value.trim();
      if (!name) {
        alert("Enter a name or codename first!");
        return;
      }
      displayName.textContent = name;
      joinSection.classList.add("hidden");
      gameSection.classList.remove("hidden");
      // (Optional) You could also push this player to Firebase here.
    });
  
    // Even before joining, they can see mission/phase (nice for late joiners)
    subscribeToGameValue("mission", (value) => {
      playerMissionText.textContent = value && value.length
        ? value
        : "Waiting for mission...";
    });
  
    subscribeToGameValue("phase", (value) => {
      playerPhaseText.textContent = value || "–";
    });
  }  