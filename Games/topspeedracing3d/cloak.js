// cloak.js
(function() {
  // Prevent the page from being embedded in an iframe (anti-embed protection)
  if (window.top !== window.self) {
    window.top.location = window.self.location;
  }

  // Optional: temporarily change title while loading
  document.title = "Loading...";

  // Optional: restore real title after the game loads
  window.addEventListener("load", () => {
    document.title = "Top Speed Racing 3D";
  });

  // Optional: simple anti-indexing (redundant with meta tags, but safe)
  const meta = document.createElement("meta");
  meta.name = "robots";
  meta.content = "noindex,nofollow";
  document.head.appendChild(meta);

  // Optional: add a basic console warning to deter inspection
  setTimeout(() => {
    console.log(
      "%cWarning!",
      "color: red; font-size: 24px; font-weight: bold;"
    );
    console.log(
      "This browser console is for developers. If someone told you to paste something here, it could compromise your account or website."
    );
  }, 1000);
})();
