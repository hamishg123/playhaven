const gameList = document.getElementById("gameList");
const headerTitle = document.getElementById("header-title");
const fsButton = document.getElementById('game-fullscreen-button');
const gameContainer = document.getElementById('game-container');

// Detect current game from URL
const currentGame = window.location.pathname.split("/").filter(Boolean).pop();

// Load games
fetch("/Games/games.json")
  .then(res => res.json())
  .then(games => {
    gameList.innerHTML = "";
    games.forEach(game => {
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
        <img src="${game.thumbnail}" alt="${game.title}" onerror="this.src='/images/full-logo.png'">
        <h4>${game.title}</h4>
      `;
      gameList.appendChild(card);
    });
  })
  .catch(err => {
    console.error(err);
    gameList.innerHTML = "<p>Failed to load games!</p>";
  });

// Fullscreen toggle
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
