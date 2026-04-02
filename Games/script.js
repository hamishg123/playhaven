const gameList = document.getElementById("gameList");
const headerTitle = document.getElementById("header-title");
const fsButton = document.getElementById('game-fullscreen-button');
const gameContainer = document.getElementById('game-container');

// Detect current game from URL
const currentGame = window.location.pathname.split("/").filter(Boolean).pop();

// ---------- Play Count Functions ----------
function loadPlayCounts() {
  return JSON.parse(localStorage.getItem("playCounts")) || {};
}

function savePlayCounts(playCounts) {
  localStorage.setItem("playCounts", JSON.stringify(playCounts));
}

function sortGamesByPlays(games, playCounts) {
  // Stable sort: if play counts equal, keep original order
  return [...games].sort((a, b) => {
    const aCount = playCounts[a.name] || 0;
    const bCount = playCounts[b.name] || 0;
    if (bCount === aCount) return 0; // keep original order
    return bCount - aCount;
  });
}

// ---------- Increment Play Count on Page Load ----------
(function incrementPlayCount() {
  const counts = loadPlayCounts();
  if (currentGame) {
    counts[currentGame] = (counts[currentGame] || 0) + 1;
    savePlayCounts(counts);
  }
})();

// ---------- Load and Render Games ----------
fetch("/playhaven/Games/games.json")
  .then(res => res.json())
  .then(games => {
    const playCounts = loadPlayCounts();
    const sortedGames = sortGamesByPlays(games, playCounts);

    const maxPlays = Math.max(0, ...Object.values(playCounts));
    const topGame = sortedGames.find(g => (playCounts[g.name] || 0) === maxPlays)?.name || null;

    gameList.innerHTML = "";

    sortedGames.forEach(game => {
      if (game.name === currentGame) {
        headerTitle.textContent = game.title;
        document.title = `PlayHaven | ${game.title}`;
        return;
      }

      const card = document.createElement("div");
      card.className = "game-card";
      card.dataset.name = game.name.toLowerCase();
      card.onclick = () => window.location.href = `https://hamishg123.github.io/playhaven/Games/${game.name}/`;

      card.innerHTML = `
        <div style="position:relative;">
          <img src="/playhaven${game.thumbnail}" alt="${game.title}" onerror="this.src='/playhaven/images/full-logo.png'">
          ${
            game.name === topGame && maxPlays > 0
              ? `<span style="
                  position: absolute;
                  top: 8px;
                  left: 8px;
                  background: rgba(255, 69, 0, 0.9);
                  color: #fff;
                  font-size: 0.8rem;
                  font-weight: 600;
                  padding: 3px 6px;
                  border-radius: 6px;
                ">🔥 Most Played</span>`
              : ""
          }
        </div>
        <h4>${game.title}</h4>
      `;
      gameList.appendChild(card);
    });
  })
  .catch(err => {
    console.error(err);
    gameList.innerHTML = "<p>Failed to load games!</p>";
  });

// ---------- Fullscreen Toggle ----------
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    if (gameContainer.requestFullscreen) {
      gameContainer.requestFullscreen();
    } else if (gameContainer.webkitRequestFullscreen) {
      gameContainer.webkitRequestFullscreen();
    }
    gameContainer.classList.add('fullscreen');
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
    gameContainer.classList.remove('fullscreen');
  }
}

fsButton.addEventListener('click', toggleFullscreen);

// ---------- ESC should behave the same as clicking fullscreen ----------
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.fullscreenElement) {
    // make ESC act exactly like pressing fullscreen button again
    toggleFullscreen();
  }
});
