(() => {
  const links = [
    ["index.html", "Utama"],
    ["upload.html", "Muat Naik Gambar"],
    ["gallery.html", "Galeri"],
    ["admin-login.html", "Admin"]
  ];

  let current = location.pathname.split("/").pop() || "index.html";
  if (current === "admin.html") current = "admin-login.html";

  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <a class="site-brand" href="index.html">Walimatulurus</a>
    <button class="menu-btn" type="button" aria-label="Buka menu" aria-expanded="false" aria-controls="menuDrawer">
      <span></span><span></span><span></span>
    </button>
  `;

  const overlay = document.createElement("div");
  overlay.className = "menu-overlay";

  const drawer = document.createElement("nav");
  drawer.className = "menu-drawer";
  drawer.id = "menuDrawer";
  drawer.innerHTML = "<h3>Menu</h3>" + links.map(([href, label]) =>
    `<a href="${href}"${href === current ? ' class="active"' : ""}>${label}</a>`
  ).join("");

  // Lapisan wallpaper (diputar bila landscape)
  const bg = document.createElement("div");
  bg.className = "wallpaper";

  document.body.prepend(header);
  document.body.prepend(bg);
  document.body.append(overlay, drawer);

  const btn = header.querySelector(".menu-btn");
  const setOpen = (open) => {
    drawer.classList.toggle("open", open);
    overlay.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  };

  btn.addEventListener("click", () => setOpen(!drawer.classList.contains("open")));
  overlay.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
})();