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
  return [...games].sort((a, b) => {
    const aCount = playCounts[a.name] || 0;
    const bCount = playCounts[b.name] || 0;
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
fetch("/Games/games.json")
  .then(res => res.json())
  .then(games => {
    const playCounts = loadPlayCounts();
    const sortedGames = sortGamesByPlays(games, playCounts);

    // Determine most-played game
    const topGame = Object.entries(playCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

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
      card.onclick = () => window.location.href = `/Games/${game.name}/`;

      card.innerHTML = `
        <div style="position:relative;">
          <img src="${game.thumbnail}" alt="${game.title}" onerror="this.src='/images/full-logo.png'">
          ${
            game.name === topGame
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
fsButton.addEventListener('click', () => {
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
    }
    gameContainer.classList.remove('fullscreen');
  }
});
