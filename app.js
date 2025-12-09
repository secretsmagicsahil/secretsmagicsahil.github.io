// =======================
// 1. Firebase config
// =======================
const firebaseConfig = {
  apiKey: "AIzaSyAiyjUJqHyMeAa4bk8tkSAxfna6td7ub94",
  authDomain: "haloween-heist.firebaseapp.com",
  databaseURL:
    "https://haloween-heist-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "haloween-heist",
  storageBucket: "haloween-heist.firebasestorage.app",
  messagingSenderId: "221767080142",
  appId: "1:221767080142:web:c0a166b7c5de731a3f589f",
};

let db;

// Host password – change this to whatever you want
const MASTER_PASSWORD = "jingle2025";

// Public teams & secret roles
const PUBLIC_TEAMS = [
  "Team Holly",
  "Team Snow",
  "Team Bells",
  "Team Carol",
  "Team Reindeer",
];

const SECRET_ROLES = [
  "Loyal to the Crown",
  "Inside Elf",
  "Double Agent",
  "Thief in Disguise",
  "Silent Guardian",
];

// =======================
// 2. Firebase helpers
// =======================
function initFirebase() {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.database();
}

function setGameValue(key, value) {
  return db.ref("game/" + key).set(value);
}

function subscribeToGameValue(key, callback) {
  db.ref("game/" + key).on("value", (snapshot) => {
    callback(snapshot.val());
  });
}

// Players DB helpers
function registerOrUpdatePlayer(name) {
  const storedId = localStorage.getItem("heist_player_id");

  // If this device already has an ID, just update the name
  if (storedId) {
    const ref = db.ref("players/" + storedId);
    ref.update({ name });
    return storedId;
  }

  // Fresh player – assign random team & secret role
  const team = randomFrom(PUBLIC_TEAMS);
  const secretRole = randomFrom(SECRET_ROLES);

  const ref = db.ref("players").push({
    name,
    team,
    secretRole,
    points: 0,
    joinedAt: firebase.database.ServerValue.TIMESTAMP,
  });

  const newId = ref.key;
  localStorage.setItem("heist_player_id", newId);
  localStorage.setItem(
    "heist_player_meta",
    JSON.stringify({ name, team, secretRole })
  );

  return newId;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// =======================
// 3. Entry point
// =======================
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

// =======================
// 4. HOST LOGIC
// =======================
function initHostPage() {
  // ---------- DOM refs ----------
  const missionInput = document.getElementById("missionInput");
  const updateMissionBtn = document.getElementById("updateMissionBtn");
  const clearMissionBtn = document.getElementById("clearMissionBtn");
  const hostMissionText = document.getElementById("hostMissionText");
  const hostPhaseText = document.getElementById("hostPhaseText");

  const hostPasswordForm = document.getElementById("hostPasswordForm");
  const hostPasswordInput = document.getElementById("hostPassword");
  const hostPanel = document.getElementById("hostPanel");
  const hostAuthSection = document.getElementById("hostAuthSection");

  const playersCountEl = document.getElementById("playersCount");
  const playersListEl = document.getElementById("playersList");

  const roundTimerDisplay = document.getElementById("roundTimerDisplay");
  const startTimerBtn = document.getElementById("startTimerBtn");
  const pauseTimerBtn = document.getElementById("pauseTimerBtn");
  const resetTimerBtn = document.getElementById("resetTimerBtn");

  // ---------- Password gate ----------
  if (hostPasswordForm && hostPanel && hostAuthSection) {
    hostPasswordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = hostPasswordInput.value.trim();

      if (value === MASTER_PASSWORD) {
        hostPasswordForm.classList.add("hidden");
        hostAuthSection.classList.add("hidden");
        hostPanel.classList.remove("hidden");
      } else {
        alert("Wrong password. Nice try, thief 😈");
        hostPasswordInput.value = "";
      }
    });
  }

  // ---------- Mission controls ----------
  if (updateMissionBtn && missionInput) {
    updateMissionBtn.addEventListener("click", () => {
      const text = missionInput.value.trim();
      setGameValue("mission", text || "");
    });
  }

  if (clearMissionBtn && missionInput) {
    clearMissionBtn.addEventListener("click", () => {
      missionInput.value = "";
      setGameValue("mission", "");
    });
  }

  // ---------- Phase buttons ----------
  document.querySelectorAll("[data-phase]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const phase = btn.getAttribute("data-phase");
      setGameValue("phase", phase);
    });
  });

  // ---------- Subscribe to mission + phase ----------
  subscribeToGameValue("mission", (value) => {
    if (!hostMissionText) return;
    hostMissionText.textContent =
      value && value.length ? value : "No mission set yet.";
  });

  subscribeToGameValue("phase", (value) => {
    if (!hostPhaseText) return;
    hostPhaseText.textContent = value || "–";
  });

  // ---------- Subscribe to players ----------
  if (playersCountEl && playersListEl) {
    const playersRef = db.ref("players");
    playersRef.on("value", (snapshot) => {
      const players = [];

      snapshot.forEach((child) => {
        const val = child.val() || {};
        players.push({
          id: child.key,
          name: val.name || "Unknown",
          team: val.team || "—",
          points:
            typeof val.points === "number"
              ? val.points
              : parseInt(val.points || "0", 10) || 0,
        });
      });

      // Update count
      playersCountEl.textContent = players.length;

      // Sort by points descending, then name
      players.sort(
        (a, b) =>
          b.points - a.points || a.name.localeCompare(b.name, "en", { sensitivity: "base" })
      );

      // Clear existing rows
      playersListEl.innerHTML = "";

      if (players.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 4;
        cell.style.textAlign = "center";
        cell.style.opacity = "0.7";
        cell.textContent = "Waiting for players to join…";
        row.appendChild(cell);
        playersListEl.appendChild(row);
        return;
      }

      players.forEach((player, index) => {
        const row = document.createElement("tr");
        row.classList.add("player-row");

        const rankCell = document.createElement("td");
        rankCell.textContent = index + 1;

        const nameCell = document.createElement("td");
        nameCell.textContent = player.name;

        const teamCell = document.createElement("td");
        teamCell.textContent = player.team;

        const pointsCell = document.createElement("td");
        pointsCell.textContent = player.points;

        row.appendChild(rankCell);
        row.appendChild(nameCell);
        row.appendChild(teamCell);
        row.appendChild(pointsCell);

        // Click row to edit points
        row.addEventListener("click", () => {
          const current = player.points;
          const input = prompt(
            `Set points for ${player.name}:`,
            String(current)
          );
          if (input === null) return; // cancelled

          const newPoints = parseInt(input, 10);
          if (Number.isNaN(newPoints)) {
            alert("Please enter a valid number.");
            return;
          }

          db.ref("players/" + player.id + "/points").set(newPoints);
        });

        playersListEl.appendChild(row);
      });
    });
  }

  // ---------- Round timer (local to host screen) ----------
  if (roundTimerDisplay && startTimerBtn && pauseTimerBtn && resetTimerBtn) {
    let timerSeconds = 30 * 60; // 30 minutes
    let timerInterval = null;

    function renderTimer() {
      const minutes = Math.floor(timerSeconds / 60);
      const seconds = timerSeconds % 60;
      roundTimerDisplay.textContent =
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");
    }

    function startTimer() {
      if (timerInterval) return;
      timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
          timerSeconds -= 1;
          renderTimer();
        } else {
          clearInterval(timerInterval);
          timerInterval = null;
        }
      }, 1000);
    }

    function pauseTimer() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }

    function resetTimer() {
      pauseTimer();
      timerSeconds = 30 * 60;
      renderTimer();
    }

    // Initial render
    renderTimer();

    startTimerBtn.addEventListener("click", startTimer);
    pauseTimerBtn.addEventListener("click", pauseTimer);
    resetTimerBtn.addEventListener("click", resetTimer);
  }
}

// =======================
// 5. PLAYER LOGIC
// =======================
function initPlayerPage() {
  const joinSection = document.getElementById("joinSection");
  const gameSection = document.getElementById("gameSection");
  const playerNameInput = document.getElementById("playerName");
  const joinBtn = document.getElementById("joinBtn");
  const displayName = document.getElementById("displayName");
  const playerPhaseText = document.getElementById("playerPhaseText");
  const playerMissionText = document.getElementById("playerMissionText");

  // 🔹 NEW: get refs for the player whiteboard elements
  const playerBoardDisplay = document.getElementById("playerBoardDisplay");
  const playerBoardInput = document.getElementById("playerBoardInput");
  const playerBoardSaveBtn = document.getElementById("playerBoardSaveBtn");

  if (!joinSection || !gameSection || !playerNameInput || !joinBtn) {
    console.warn("Player page: some elements missing");
  }

  // Join button: assign name, send to Firebase, show game section
  joinBtn.addEventListener("click", () => {
    const name = playerNameInput.value.trim();
    if (!name) {
      alert("Enter a name or codename first!");
      return;
    }

    // Register / update player in DB
    registerOrUpdatePlayer(name);

    if (displayName) {
      displayName.textContent = name;
    }
    joinSection.classList.add("hidden");
    gameSection.classList.remove("hidden");
  });

  // They can still see phase/mission even before joining
  subscribeToGameValue("mission", (value) => {
    if (!playerMissionText) return;
    playerMissionText.textContent =
      value && value.length ? value : "Waiting for mission...";
  });

  subscribeToGameValue("phase", (value) => {
    if (!playerPhaseText) return;
    playerPhaseText.textContent = value || "–";
  });

  // 🔹 NEW: subscribe to the shared player board message
  subscribeToGameValue("playerBoardMessage", (value) => {
    if (!playerBoardDisplay) return;

    const text = value && value.length ? value : "(no message yet)";
    playerBoardDisplay.textContent = text;

    // Optional: keep the input in sync too,
    // but only if the user isn't currently typing.
    if (playerBoardInput && document.activeElement !== playerBoardInput) {
      playerBoardInput.value = value || "";
    }
  });

  // 🔹 NEW: allow players to save/update the shared message
  if (playerBoardSaveBtn && playerBoardInput) {
    playerBoardSaveBtn.addEventListener("click", () => {
      const newText = playerBoardInput.value.trim();

      if (!newText) {
        alert("Type something before saving!");
        return;
      }

      // This writes to: /game/playerBoardMessage in Realtime DB
      setGameValue("playerBoardMessage", newText);
    });
  }
}
