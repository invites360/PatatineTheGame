// =============================================================
//  GARA PATATINE — app
// =============================================================
const $app = document.getElementById("app");
const $modal = document.getElementById("modal");
const $music = document.getElementById("music");

const LS = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

const state = {
  me: LS.get("gp_me"),
  view: "select",
  selIndex: 0,
  voteTarget: null,
  draft: {},
  data: null,
  statsPick: null,
  bonusPick: null,
  adminPwd: (() => { try { return sessionStorage.getItem("gp_admin") || ""; } catch { return ""; } })(),
  musicOn: false,
};
if (state.me && PLAYER_BY_ID[state.me]) state.view = "home";
else state.me = null;

// ---------------------------------------------------------- UTILS
const P = (id) => PLAYER_BY_ID[id];
const others = (id) => PLAYERS.filter((p) => p.id !== id);
const sumVote = (v) => CATEGORIES.reduce((s, c) => s + (v[c.key] || 0), 0);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const fmt = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d).replace(".", ",") : "–");
const chipName = (id) => (state.data?.chips[id]?.name || "").trim();
const chipLabel = (id) => chipName(id) || "Patatine misteriose";

function toast(msg, err = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "show" + (err ? " err" : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.className = ""), 2400);
}

function confetti(n = 28, chars = ["🥔", "🌶️", "🧀", "🔺", "🥑", "⭐"]) {
  for (let i = 0; i < n; i++) {
    const el = document.createElement("div");
    el.className = "confetti";
    el.textContent = chars[i % chars.length];
    el.style.left = Math.random() * 100 + "vw";
    el.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
    el.style.animationDelay = Math.random() * 0.4 + "s";
    el.style.fontSize = 18 + Math.random() * 18 + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

function openModal(html) {
  $modal.innerHTML = `<div class="modal-box">${html}</div>`;
  $modal.classList.remove("hidden");
}
function closeModal() { $modal.classList.add("hidden"); $modal.innerHTML = ""; }
$modal.addEventListener("click", (e) => { if (e.target === $modal || e.target.closest("[data-close]")) closeModal(); });

function confirmModal(title, text, okLabel = "Conferma") {
  return new Promise((resolve) => {
    openModal(`<h3>${title}</h3><p>${text}</p>
      <div class="modal-actions"><button class="btn ghost small" data-no>Annulla</button><button class="btn small" data-ok>${okLabel}</button></div>`);
    $modal.querySelector("[data-ok]").onclick = () => { closeModal(); resolve(true); };
    $modal.querySelector("[data-no]").onclick = () => { closeModal(); resolve(false); };
  });
}

// ---------------------------------------------------------- INSTALLA APP
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let installEvt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvt = e;
  if (state.view === "home") render();
});
window.addEventListener("appinstalled", () => { installEvt = null; LS.set("gp_install_hide", true); toast("App installata! 🥔"); if (state.view === "home") render(); });

function installBanner() {
  if (isStandalone() || LS.get("gp_install_hide")) return "";
  if (installEvt) {
    return `<div class="install"><span class="ico">📲</span><span class="tx"><b>Installa l'app</b>Gioca a schermo intero dalla home del telefono.</span>
      <button class="btn small yellow" data-install>Installa</button><button class="x" data-install-hide aria-label="Chiudi">✕</button></div>`;
  }
  if (isIOS()) {
    return `<div class="install"><span class="ico">📲</span><span class="tx"><b>Mettila nella Home</b>Tocca <span class="share">⬆︎</span> Condividi e poi “Aggiungi alla schermata Home”.</span>
      <button class="x" data-install-hide aria-label="Chiudi">✕</button></div>`;
  }
  return "";
}
function bindInstall() {
  const b = $app.querySelector("[data-install]");
  if (b) b.onclick = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    await installEvt.userChoice.catch(() => null);
    installEvt = null;
    render();
  };
  const x = $app.querySelector("[data-install-hide]");
  if (x) x.onclick = () => { LS.set("gp_install_hide", true); render(); };
}

// ---------------------------------------------------------- MUSICA
function setMusic(on) {
  state.musicOn = on;
  if (on) { $music.volume = 0.6; $music.play().catch(() => { state.musicOn = false; updateSoundBtn(); }); }
  else $music.pause();
  updateSoundBtn();
}
function updateSoundBtn() {
  const b = document.querySelector(".sound-btn");
  if (b) b.textContent = state.musicOn ? "🔊" : "🔇";
}
function fadeOutMusic() {
  if ($music.paused) return;
  const iv = setInterval(() => {
    $music.volume = Math.max(0, $music.volume - 0.08);
    if ($music.volume <= 0.01) { clearInterval(iv); $music.pause(); $music.volume = 0.6; state.musicOn = false; }
  }, 60);
}

// ---------------------------------------------------------- DATI
async function refresh() {
  try {
    state.data = await Store.load();
  } catch (e) {
    console.error(e);
    toast("Errore di connessione: " + e.message, true);
    if (!state.data) state.data = { chips: {}, votes: [], reveal: false, bonusVoters: [], bonusResults: [] };
  }
}
Store.onChange(async () => {
  await refresh();
  // non ridisegnare mentre si sta votando o compilando l'admin
  if (["vote", "admin", "select"].includes(state.view)) return;
  render();
});

function myVote(target) { return state.data.votes.find((v) => v.voter === state.me && v.target === target); }

function computeRanking() {
  const d = state.data;
  const bonusCount = {};
  if (d.reveal) d.bonusResults.forEach((b) => (bonusCount[b.target] = (bonusCount[b.target] || 0) + 1));
  return PLAYERS.map((p) => {
    const vs = d.votes.filter((v) => v.target === p.id);
    const catAvg = Object.fromEntries(CATEGORIES.map((c) => [c.key, mean(vs.map((v) => v[c.key]))]));
    // punteggio di gara = somma di TUTTI i voti ricevuti (le medie servono solo alle statistiche)
    const totals = vs.map(sumVote);
    const base = totals.reduce((s, t) => s + t, 0);
    const avgTotal = mean(totals);
    const bonus = (bonusCount[p.id] || 0) * BONUS_POINTS;
    const sd = totals.length > 1 ? Math.sqrt(mean(totals.map((t) => (t - mean(totals)) ** 2))) : 0;
    return { player: p, votes: vs, n: vs.length, catAvg, base, avgTotal, bonus, bonusN: bonusCount[p.id] || 0, total: base + bonus, sd };
  }).sort((a, b) => b.total - a.total || b.n - a.n);
}

// ---------------------------------------------------------- RENDER
function render() {
  const v = state.view;
  if (v === "select") return renderSelect();
  if (!state.data) { $app.innerHTML = `<div class="spinner"><span class="chip">🥔</span><br>Apro il pacco…</div>`; return; }
  const body = {
    home: renderHome,
    vote: renderVote,
    summary: renderSummary,
    stats: renderStats,
    bonus: renderBonus,
    admin: renderAdmin,
  }[v]();
  $app.innerHTML = header() + `<main class="screen">${body}</main>` + tabbar();
  bindCommon();
  const binder = { home: bindHome, vote: bindVote, summary: () => {}, stats: bindStats, bonus: bindBonus, admin: bindAdmin }[v];
  binder();
}

function go(view, extra = {}) {
  Object.assign(state, extra, { view });
  render();
  window.scrollTo(0, 0);
}

function header() {
  const me = P(state.me);
  const titles = { home: "Gara Patatine", vote: "Assaggia & Vota", summary: "Riepilogo", stats: "Statistiche", bonus: "Bonus Segreto", admin: "Admin" };
  return `<header class="salsa-top">
    <h1>${titles[state.view] || "Gara Patatine"}</h1>
    <span class="mode-pill ${Store.mode}">${Store.mode === "local" ? "Locale" : "Live"}</span>
    <button class="me-badge" data-change-me title="Cambia personaggio"><img src="${me.face}" alt="${esc(me.name)}"></button>
  </header>`;
}

function tabbar() {
  const tabs = [["home", "🗳️", "Vota"], ["summary", "🏆", "Classifica"], ["stats", "📊", "Stats"], ["bonus", "⭐", "Bonus"], ["admin", "🔐", "Admin"]];
  const cur = state.view === "vote" ? "home" : state.view;
  return `<nav class="tabbar">${tabs.map(([k, i, l]) => `<button data-go="${k}" class="${cur === k ? "on" : ""}"><span class="ico">${i}</span>${l}</button>`).join("")}</nav>`;
}

function bindCommon() {
  $app.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => go(b.dataset.go)));
  const ch = $app.querySelector("[data-change-me]");
  if (ch) ch.onclick = async () => {
    if (await confirmModal("Cambi personaggio?", "Torni alla schermata di selezione.", "Sì, cambio")) {
      state.selIndex = Math.max(0, PLAYER_IDS.indexOf(state.me));
      go("select");
    }
  };
}

// ============================================================ SELEZIONE
function renderSelect() {
  const n = PLAYERS.length;
  const i = ((state.selIndex % n) + n) % n;
  state.selIndex = i;
  const pos = (k) => {
    const d = ((k - i + n) % n);
    if (d === 0) return "center";
    if (d === 1) return "right";
    if (d === n - 1) return "left";
    if (d === 2) return "far-right";
    if (d === n - 2) return "far-left";
    return "hidden-slot";
  };
  const size = Math.min(210, Math.round(window.innerWidth * 0.52));
  $app.innerHTML = `
  <section class="select-screen">
    <button class="sound-btn" aria-label="Musica">${state.musicOn ? "🔊" : "🔇"}</button>
    <div class="select-head">
      <h1 class="title">Scegli il tuo<br>campione!</h1>
      <div class="blink">◄ PLAYER SELECT ►</div>
    </div>
    <div class="stage" id="stage">
      <div class="spotlight"></div>
      ${PLAYERS.map((p, k) => `<div class="slot ${pos(k)}" data-k="${k}">${toonHTML(p, { size, label: p.short.toUpperCase(), mood: pos(k) === "center" ? "idle" : "still" })}</div>`).join("")}
      <button class="arrow l" data-dir="-1" aria-label="Precedente">◄</button>
      <button class="arrow r" data-dir="1" aria-label="Successivo">►</button>
    </div>
    <div class="nameplate"><span class="name">${esc(PLAYERS[i].name)}</span></div>
    <div class="dots">${PLAYERS.map((p, k) => `<button class="${k === i ? "on" : ""}" data-k="${k}" aria-label="${esc(p.name)}"><img src="${p.face}" alt=""></button>`).join("")}</div>
    <div class="select-cta"><button class="btn yellow block" id="pick">SONO IO! 🥔</button></div>
  </section>`;

  const move = (d) => { state.selIndex += d; renderSelectUpdate(); };
  $app.querySelectorAll("[data-dir]").forEach((b) => (b.onclick = () => move(+b.dataset.dir)));
  $app.querySelectorAll(".dots button").forEach((b) => (b.onclick = () => { state.selIndex = +b.dataset.k; renderSelectUpdate(); }));
  $app.querySelectorAll(".stage .slot").forEach((s) => (s.onclick = () => {
    if (s.classList.contains("left")) move(-1);
    else if (s.classList.contains("right")) move(1);
  }));
  $app.querySelector(".sound-btn").onclick = (e) => { e.stopPropagation(); setMusic(!state.musicOn); };
  $app.querySelector("#pick").onclick = pickCharacter;

  // swipe
  const stage = document.getElementById("stage");
  let x0 = null;
  stage.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1);
    x0 = null;
  });
  // la musica parte al primo tocco (i browser bloccano l'autoplay)
  if (!renderSelect._armed) {
    renderSelect._armed = true;
    const start = () => {
      if (state.view === "select" && !state.musicOn && !LS.get("gp_mute")) setMusic(true);
    };
    document.addEventListener("pointerdown", start, { once: true });
  }
}

function renderSelectUpdate() {
  // aggiorna posizioni senza ricreare tutto (animazione fluida)
  const n = PLAYERS.length;
  const i = ((state.selIndex % n) + n) % n;
  state.selIndex = i;
  $app.querySelectorAll(".stage .slot").forEach((s) => {
    const k = +s.dataset.k;
    const d = (k - i + n) % n;
    const cls = d === 0 ? "center" : d === 1 ? "right" : d === n - 1 ? "left" : d === 2 ? "far-right" : d === n - 2 ? "far-left" : "hidden-slot";
    s.className = "slot " + cls;
    const t = s.querySelector(".toon");
    t.classList.toggle("toon-idle", cls === "center");
    t.classList.toggle("toon-still", cls !== "center");
  });
  $app.querySelector(".nameplate .name").textContent = PLAYERS[i].name;
  $app.querySelectorAll(".dots button").forEach((b) => b.classList.toggle("on", +b.dataset.k === i));
  if (navigator.vibrate) navigator.vibrate(8);
}

async function pickCharacter() {
  const p = PLAYERS[state.selIndex];
  const center = $app.querySelector(".slot.center .toon");
  center.className = center.className.replace("toon-idle", "toon-happy");
  const f = document.createElement("div"); f.className = "flash"; document.body.appendChild(f);
  setTimeout(() => f.remove(), 600);
  $app.querySelector(".nameplate .name").textContent = `${p.short.toUpperCase()}… PRONTO!`;
  if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
  state.me = p.id;
  LS.set("gp_me", p.id);
  if (!state.data) await refresh();
  setTimeout(() => { fadeOutMusic(); go("home"); confetti(18); }, 1200);
}

// ============================================================ HOME (griglia)
function renderHome() {
  const opp = others(state.me);
  const done = opp.filter((p) => myVote(p.id)).length;
  const pct = Math.round((done / opp.length) * 100);
  const cards = PLAYERS.map((p) => {
    const mine = p.id === state.me;
    const v = myVote(p.id);
    const nIn = state.data.votes.filter((x) => x.target === p.id).length;
    const img = state.data.chips[p.id]?.image;
    const status = mine ? `<span class="tag mine">Le tue patatine</span>`
      : v ? `<span class="tag done">✓ ${sumVote(v)}/80</span>` : `<span class="tag todo">VOTA!</span>`;
    return `<button class="pcard ${mine ? "is-me" : ""}" data-target="${p.id}" style="border-width:3px;width:100%">
      <span class="votes-in">${nIn}/${PLAYERS.length - 1} 🗳️</span>
      ${img ? `<img class="chipthumb" src="${img}" alt="">` : ""}
      <img class="face" src="${p.face}" alt="">
      <div class="pname">${esc(p.name)}</div>
      <div class="chipname">${esc(chipLabel(p.id))}</div>
      <div class="status">${status}</div>
    </button>`;
  }).join("");
  return `
    <h2 class="title">Ciao ${esc(P(state.me).short)}! 👋</h2>
    <p class="subtitle">Tocca un volto, assaggia le sue patatine e dai i voti.</p>
    ${installBanner()}
    <div class="progress-strip"><div class="progress"><div style="width:${pct}%"></div></div><b>${done}/${opp.length}</b></div>
    ${Store.mode === "local" ? `<p class="note" style="margin-bottom:14px">Modalità locale: i voti restano su questo telefono. Configura Supabase in <b>js/config.js</b> per giocare insieme.</p>` : ""}
    <div class="grid">${cards}</div>`;
}
function bindHome() {
  bindInstall();
  $app.querySelectorAll("[data-target]").forEach((b) => (b.onclick = () => {
    const t = b.dataset.target;
    if (t === state.me) { toast("Non puoi votare le tue patatine 😏"); return; }
    const v = myVote(t);
    state.draft = v ? Object.fromEntries(CATEGORIES.map((c) => [c.key, v[c.key]])) : {};
    go("vote", { voteTarget: t });
  }));
}

// ============================================================ VOTO
const REACTIONS = [[0, "🫥"], [16, "🤢"], [32, "😐"], [44, "🙂"], [54, "😋"], [64, "🤤"], [74, "🤯"]];
function reactionFor(tot, filled) {
  if (!filled) return "🤔";
  const avg = tot / filled * 8;
  let r = REACTIONS[0][1];
  REACTIONS.forEach(([t, e]) => { if (avg >= t) r = e; });
  return r;
}

function renderVote() {
  const p = P(state.voteTarget);
  const img = state.data.chips[p.id]?.image;
  const d = state.draft;
  const filled = CATEGORIES.filter((c) => d[c.key]).length;
  const tot = CATEGORIES.reduce((s, c) => s + (d[c.key] || 0), 0);
  return `
    <button class="back" data-go="home">◄ Indietro</button>
    <div class="vote-hero">
      ${toonHTML(p, { size: 110, label: p.short.toUpperCase() })}
      <div class="info">
        <h2 class="title" style="font-size:24px">${esc(chipLabel(p.id))}</h2>
        <div style="font-weight:800">portate da ${esc(p.name)}</div>
        ${img ? `<img class="chip-img" src="${img}" alt="">` : ""}
      </div>
    </div>
    ${CATEGORIES.map((c) => `
      <div class="cat" data-cat="${c.key}">
        <div class="cat-head"><span class="emo">${c.emoji}</span>
          <span class="lbl"><b>${c.label}</b><small>${c.hint}</small></span>
          <span class="val">${d[c.key] || "–"}</span></div>
        <div class="scale">${Array.from({ length: 10 }, (_, k) => k + 1).map((n) =>
          `<button data-n="${n}" class="${d[c.key] === n ? "sel" : d[c.key] > n ? "fill" : ""}">${n}</button>`).join("")}</div>
      </div>`).join("")}
    <div class="total-bar">
      <span class="react" id="react">${reactionFor(tot, filled)}</span>
      <span class="tot" id="tot">${tot}<small>/80</small></span>
      <button class="btn green" id="save" ${filled < CATEGORIES.length ? "disabled" : ""}>Salva voto</button>
    </div>`;
}
function bindVote() {
  $app.querySelectorAll(".cat").forEach((cat) => {
    const key = cat.dataset.cat;
    cat.querySelectorAll(".scale button").forEach((b) => (b.onclick = () => {
      const n = +b.dataset.n;
      state.draft[key] = n;
      cat.querySelectorAll(".scale button").forEach((x) => {
        const m = +x.dataset.n;
        x.className = m === n ? "sel" : m < n ? "fill" : "";
      });
      cat.querySelector(".val").textContent = n;
      const filled = CATEGORIES.filter((c) => state.draft[c.key]).length;
      const tot = CATEGORIES.reduce((s, c) => s + (state.draft[c.key] || 0), 0);
      document.getElementById("tot").innerHTML = `${tot}<small>/80</small>`;
      document.getElementById("react").textContent = reactionFor(tot, filled);
      document.getElementById("save").disabled = filled < CATEGORIES.length;
      if (navigator.vibrate) navigator.vibrate(6);
    }));
  });
  document.getElementById("save").onclick = async (e) => {
    e.target.disabled = true;
    try {
      await Store.saveVote({ voter: state.me, target: state.voteTarget, ...state.draft });
      await refresh();
      confetti();
      toast(`Voto salvato per ${P(state.voteTarget).short}! 🥔`);
      go("home");
    } catch (err) {
      toast("Errore: " + err.message, true);
      e.target.disabled = false;
    }
  };
}

// ============================================================ RIEPILOGO / CLASSIFICA
function heat(v, max) {
  // da crema a rosso salsa
  const t = Math.max(0, Math.min(1, v / max));
  const a = [255, 244, 214], b = [255, 201, 60], c = [230, 58, 30];
  const mix = (x, y, k) => x.map((xi, i) => Math.round(xi + (y[i] - xi) * k));
  const col = t < 0.5 ? mix(a, b, t * 2) : mix(b, c, (t - 0.5) * 2);
  return `rgb(${col.join(",")})`;
}

function renderSummary() {
  const rank = computeRanking();
  const d = state.data;
  const anyVotes = d.votes.length > 0;
  const top = rank.slice(0, 3);
  const podiumOrder = [top[1], top[0], top[2]];
  const podium = anyVotes ? `
    <div class="podium">${podiumOrder.map((r, k) => r ? `
      <div class="pl p${[2, 1, 3][k]}">
        ${k === 1 ? `<span class="crown">👑</span>` : ""}
        <img class="f" src="${r.player.face}" alt="">
        <div class="nm">${esc(chipLabel(r.player.id))}<br><small>${esc(r.player.short)}</small></div>
        <div class="step">${[2, 1, 3][k]}<span class="sc">${r.total} pt</span></div>
      </div>` : "<div></div>").join("")}
    </div>` : `<div class="empty-state"><div class="big">🥔</div>Ancora nessun voto. Iniziate ad assaggiare!</div>`;

  const list = rank.map((r, k) => `
    <div class="rank-row">
      <span class="pos">${k + 1}</span>
      <img src="${r.player.face}" alt="">
      <span class="who"><b>${esc(chipLabel(r.player.id))}</b><small>${esc(r.player.name)} · ${r.n} voti</small></span>
      <span class="pts">${r.total}${r.bonus ? `<small>+${r.bonus} bonus ⭐</small>` : ""}</span>
    </div>`).join("");

  // matrice chi → chi
  const matrix = `
    <div class="matrix-wrap"><table class="matrix">
      <tr><th class="corner">chi vota ↓<br>chi riceve →</th>${PLAYERS.map((p) => `<th><img src="${p.face}" alt="${esc(p.short)}"></th>`).join("")}</tr>
      ${PLAYERS.map((vtr) => `<tr><th><img src="${vtr.face}" alt="${esc(vtr.short)}"></th>${PLAYERS.map((tg) => {
        if (vtr.id === tg.id) return `<td class="self"></td>`;
        const v = d.votes.find((x) => x.voter === vtr.id && x.target === tg.id);
        return v ? `<td style="background:${heat(sumVote(v) - 8, 72)}">${sumVote(v)}</td>` : `<td class="empty">·</td>`;
      }).join("")}</tr>`).join("")}
    </table></div>
    <div class="legend">8 <span class="ramp" style="background:linear-gradient(90deg,${heat(0, 1)},${heat(.5, 1)},${heat(1, 1)})"></span> 80</div>`;

  // dettaglio per patatina
  const detail = rank.map((r) => `
    <details class="who-voted">
      <summary><img src="${r.player.face}" alt=""><span>${esc(chipLabel(r.player.id))}<br><small style="font-weight:600">${r.n} voti · ${r.base} punti</small></span><span class="chev">►</span></summary>
      ${r.n ? `<table class="vtable">
        <tr><th></th>${CATEGORIES.map((c) => `<th title="${c.label}">${c.emoji}</th>`).join("")}<th>Σ</th></tr>
        ${r.votes.map((v) => `<tr><td class="vn"><img src="${P(v.voter).face}" alt=""> ${esc(P(v.voter).short)}</td>
          ${CATEGORIES.map((c) => `<td style="background:${heat(v[c.key] - 1, 9)}">${v[c.key]}</td>`).join("")}<td class="t">${sumVote(v)}</td></tr>`).join("")}
        <tr><td class="vn"><b>Totale</b></td>${CATEGORIES.map((c) => `<td><b>${r.votes.reduce((s, v) => s + v[c.key], 0)}</b></td>`).join("")}<td class="t">${r.base}</td></tr>
      </table>` : `<p style="margin:6px 0 0">Nessun voto ancora.</p>`}
    </details>`).join("");

  return `
    <h2 class="title">Classifica</h2>
    <p class="subtitle">Punteggio = somma di tutti i voti ricevuti${d.reveal ? " + bonus ⭐" : ". I bonus si sommano quando l'admin li rivela."}</p>
    <div class="card">${podium}</div>
    <div class="card"><h3>🏆 Tutte le patatine</h3>${list}</div>
    <div class="card"><h3>🔥 Chi ha votato chi</h3>${matrix}</div>
    <div class="card"><h3>🧾 Voti nel dettaglio</h3><p style="margin:0 0 6px;font-size:13px;font-weight:700">${CATEGORIES.map((c) => `${c.emoji} ${c.label}`).join(" · ")}</p>${detail}</div>`;
}

// ============================================================ STATISTICHE
function radarSVG(values, avgValues) {
  const N = CATEGORIES.length, R = 100, cx = 150, cy = 130;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    return [cx + Math.cos(a) * R * (v / 10), cy + Math.sin(a) * R * (v / 10)];
  };
  const poly = (vals) => vals.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(",")).join(" ");
  const webs = [2, 4, 6, 8, 10].map((l) => `<polygon class="web" points="${poly(Array(N).fill(l))}"/>`).join("");
  const spokes = CATEGORIES.map((_, i) => { const [x, y] = pt(i, 10); return `<line class="web" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`; }).join("");
  const labels = CATEGORIES.map((c, i) => {
    const [x, y] = pt(i, 12.6);
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${c.emoji} ${fmt(values[i])}</text>`;
  }).join("");
  const dots = values.map((v, i) => { const [x, y] = pt(i, v); return `<circle class="dot" cx="${x}" cy="${y}" r="4"/>`; }).join("");
  return `<svg class="radar" viewBox="0 0 300 260">${webs}${spokes}
    <polygon class="avg" points="${poly(avgValues)}"/>
    <polygon class="me" points="${poly(values)}"/>${dots}${labels}</svg>`;
}

function renderStats() {
  const d = state.data;
  const votes = d.votes;
  if (!votes.length) return `<h2 class="title">Statistiche</h2><div class="card empty-state"><div class="big">📊</div>Le statistiche arrivano appena ci sono i primi voti!</div>`;

  const rank = computeRanking();
  const possible = PLAYERS.length * (PLAYERS.length - 1);
  const allScores = votes.flatMap((v) => CATEGORIES.map((c) => v[c.key]));
  const tens = allScores.filter((x) => x === 10).length;

  // re di categoria
  const voted = rank.filter((r) => r.n);
  const kings = CATEGORIES.map((c) => {
    const best = [...voted].sort((a, b) => b.catAvg[c.key] - a.catAvg[c.key])[0];
    return { c, best };
  });

  // giudici
  const judges = PLAYERS.map((p) => {
    const vs = votes.filter((v) => v.voter === p.id);
    return { p, n: vs.length, avg: vs.length ? mean(vs.map(sumVote)) : null };
  }).filter((j) => j.n);
  const generous = [...judges].sort((a, b) => b.avg - a.avg)[0];
  const harsh = [...judges].sort((a, b) => a.avg - b.avg)[0];
  const multi = voted.filter((r) => r.n > 1);
  const divisive = multi.length ? [...multi].sort((a, b) => b.sd - a.sd)[0] : null;
  const unanimous = multi.length ? [...multi].sort((a, b) => a.sd - b.sd)[0] : null;
  const sweet = [...voted].sort((a, b) => (b.catAvg.gusto + b.catAvg.una_tira) - (a.catAvg.gusto + a.catAvg.una_tira))[0];

  // anime gemelle: coppia di votanti con voti più simili sulle stesse patatine
  let twins = null;
  for (let a = 0; a < PLAYERS.length; a++) for (let b = a + 1; b < PLAYERS.length; b++) {
    const A = PLAYERS[a].id, B = PLAYERS[b].id;
    const diffs = [];
    votes.filter((v) => v.voter === A).forEach((va) => {
      const vb = votes.find((v) => v.voter === B && v.target === va.target);
      if (vb) diffs.push(mean(CATEGORIES.map((c) => Math.abs(va[c.key] - vb[c.key]))));
    });
    if (diffs.length >= 2) {
      const m = mean(diffs);
      if (!twins || m < twins.m) twins = { A, B, m, n: diffs.length };
    }
  }

  // media globale per categoria
  const catGlobal = CATEGORIES.map((c) => mean(votes.map((v) => v[c.key])));

  // radar
  if (!state.statsPick || !voted.find((r) => r.player.id === state.statsPick)) state.statsPick = voted[0].player.id;
  const pick = rank.find((r) => r.player.id === state.statsPick);

  const award = (medal, title, p, val) => p ? `
    <div class="award"><span class="medal">${medal}</span><img src="${p.face}" alt="">
      <div class="aw-t">${title}</div><div class="aw-n">${esc(p.short)}</div><div class="aw-v">${val}</div></div>` : "";

  return `
    <h2 class="title">Statistiche</h2>
    <p class="subtitle">I numeri della serata 🌶️</p>
    <div class="kpis">
      <div class="kpi"><b>${votes.length}/${possible}</b><span>schede votate</span></div>
      <div class="kpi"><b>${fmt(mean(allScores))}</b><span>voto medio</span></div>
      <div class="kpi"><b>${tens}</b><span>voti da 10 🔥</span></div>
    </div>

    <div class="card"><h3>📡 Il profilo delle patatine</h3>
      <div class="face-pick">${voted.map((r) => `<button data-pick="${r.player.id}" class="${r.player.id === state.statsPick ? "on" : ""}"><img src="${r.player.face}" alt="${esc(r.player.short)}"></button>`).join("")}</div>
      <div style="text-align:center;font-weight:800">${esc(chipLabel(pick.player.id))} <small>(${esc(pick.player.short)})</small></div>
      ${radarSVG(CATEGORIES.map((c) => pick.catAvg[c.key]), catGlobal)}
      <div class="radar-legend"><span><i style="background:var(--red)"></i>queste patatine</span><span><i style="background:rgba(58,20,8,.3)"></i>media di tutte</span></div>
    </div>

    <div class="card"><h3>👑 Re delle categorie</h3>
      <div class="awards">${kings.map(({ c, best }) => award(c.emoji, c.label, best.player, `${esc(chipLabel(best.player.id))} · ${fmt(best.catAvg[c.key])}`)).join("")}</div>
    </div>

    <div class="card"><h3>🧑‍⚖️ I giudici</h3>
      <div class="awards">
        ${award("😇", "Il più generoso", generous.p, `media ${fmt(generous.avg)}/80`)}
        ${award("😈", "Il più severo", harsh.p, `media ${fmt(harsh.avg)}/80`)}
        ${divisive ? award("⚡", "La più divisiva", divisive.player, `${esc(chipLabel(divisive.player.id))} · ±${fmt(divisive.sd)}`) : ""}
        ${unanimous ? award("🤝", "Mette d'accordo tutti", unanimous.player, `${esc(chipLabel(unanimous.player.id))} · ±${fmt(unanimous.sd)}`) : ""}
        ${award("🤤", "La più golosa", sweet.player, "gusto + una tira l'altra")}
      </div>
    </div>

    ${twins ? `<div class="card"><h3>💞 Anime gemelle del palato</h3>
      <div class="duo"><img src="${P(twins.A).face}" alt=""><span class="heart">❤️</span><img src="${P(twins.B).face}" alt=""></div>
      <p style="text-align:center;margin:6px 0 0;font-weight:700">${esc(P(twins.A).short)} e ${esc(P(twins.B).short)} votano quasi uguale: differenza media di ${fmt(twins.m)} punti su ${twins.n} patatine.</p>
    </div>` : ""}

    <div class="card"><h3>📊 Media per categoria</h3>
      <div class="bars">${CATEGORIES.map((c, i) => `<div class="bar-row"><span>${c.emoji}</span><div class="bar"><div style="width:${catGlobal[i] * 10}%"></div></div><span>${fmt(catGlobal[i])}</span></div>`).join("")}</div>
    </div>

    <div class="card"><h3>🧑‍🍳 Quanto ha votato ognuno</h3>
      <div class="bars">${PLAYERS.map((p) => {
        const vs = votes.filter((v) => v.voter === p.id);
        const avg = vs.length ? mean(vs.map(sumVote)) : 0;
        return `<div class="bar-row" style="grid-template-columns:34px 1fr 64px"><img src="${p.face}" style="width:30px;height:38px;object-fit:contain" alt=""><div class="bar"><div style="width:${avg / 80 * 100}%"></div></div><span>${vs.length ? fmt(avg) : "–"} <small>(${vs.length})</small></span></div>`;
      }).join("")}</div>
      <p style="font-size:12px;font-weight:700;margin:6px 0 0">Media del totale dato (/80) e numero di schede votate.</p>
    </div>`;
}
function bindStats() {
  $app.querySelectorAll("[data-pick]").forEach((b) => (b.onclick = () => { state.statsPick = b.dataset.pick; const y = window.scrollY; render(); window.scrollTo(0, y); }));
}

// ============================================================ BONUS
function renderBonus() {
  const d = state.data;
  const assigned = d.bonusVoters.includes(state.me);
  const myLocal = LS.get("gp_bonus_" + state.me);
  const status = `
    <div class="card"><h3>Chi ha già scelto</h3>
      <div class="whos">${PLAYERS.map((p) => {
        const ok = d.bonusVoters.includes(p.id);
        return `<div class="w ${ok ? "" : "no"}"><img src="${p.face}" alt="">${ok ? `<span class="ck">✓</span>` : ""}<div>${esc(p.short)}</div></div>`;
      }).join("")}</div>
      <p style="text-align:center;font-weight:800;margin:8px 0 0">${d.bonusVoters.length}/${PLAYERS.length} bonus assegnati</p>
    </div>`;

  if (d.reveal) {
    const count = {};
    d.bonusResults.forEach((b) => (count[b.target] = (count[b.target] || 0) + 1));
    const order = Object.entries(count).sort((a, b) => b[1] - a[1]);
    return `
      <div class="bonus-hero"><span class="star">⭐</span><h2 class="title">Bonus rivelati!</h2></div>
      <div class="card"><h3>🏅 Chi ha preso più bonus</h3>
        ${order.length ? order.map(([id, n], k) => `<div class="rank-row"><span class="pos">${k + 1}</span><img src="${P(id).face}" alt="">
          <span class="who"><b>${esc(chipLabel(id))}</b><small>${esc(P(id).name)}</small></span><span class="pts">+${n * BONUS_POINTS}<small>${"⭐".repeat(n)}</small></span></div>`).join("") : "<p>Nessun bonus assegnato.</p>"}
      </div>
      <div class="card"><h3>🕵️ Chi ha dato il bonus a chi</h3>
        ${d.bonusResults.map((b) => `<div class="reveal-row"><img src="${P(b.voter).face}" alt=""><span class="nm">${esc(P(b.voter).short)}</span><span class="arrow-r">➡️⭐</span><img src="${P(b.target).face}" alt=""><span class="nm">${esc(chipLabel(b.target))}</span></div>`).join("")}
      </div>`;
  }

  const sel = state.bonusPick || myLocal;
  return `
    <div class="bonus-hero"><span class="star">⭐</span>
      <h2 class="title">Patatina preferita</h2>
      <p class="subtitle">Assegna in segreto <b>+${BONUS_POINTS} punti</b> alle tue patatine preferite.<br>Nessuno lo saprà finché l'admin non lo rivela!</p>
    </div>
    ${assigned ? `<div class="secret" style="margin-bottom:16px">🤫 Hai già assegnato il tuo bonus${myLocal ? `:<br><img src="${P(myLocal).face}" alt=""><br>${esc(chipLabel(myLocal))}` : "."}<br><small style="color:var(--cream)">Puoi cambiarlo finché non viene rivelato.</small></div>` : ""}
    <div class="card"><h3>${assigned ? "Cambia scelta" : "Scegli"}</h3>
      <div class="pick-grid">${others(state.me).map((p) => `<button data-bonus="${p.id}" class="${sel === p.id ? "sel" : ""}"><img src="${p.face}" alt="">${esc(chipLabel(p.id))}</button>`).join("")}</div>
      <button class="btn block" id="bonus-go" style="margin-top:14px" ${state.bonusPick ? "" : "disabled"}>Assegna +${BONUS_POINTS} ⭐</button>
    </div>
    ${status}`;
}
function bindBonus() {
  $app.querySelectorAll("[data-bonus]").forEach((b) => (b.onclick = () => {
    state.bonusPick = b.dataset.bonus;
    $app.querySelectorAll("[data-bonus]").forEach((x) => x.classList.toggle("sel", x === b));
    document.getElementById("bonus-go").disabled = false;
  }));
  const go2 = document.getElementById("bonus-go");
  if (go2) go2.onclick = async () => {
    const t = state.bonusPick;
    if (!t) return;
    if (!(await confirmModal("Confermi?", `Dai <b>+${BONUS_POINTS}</b> a <b>${esc(chipLabel(t))}</b> di ${esc(P(t).short)}.<br>Resterà segreto. 🤫`, "Sì, segreto!"))) return;
    try {
      await Store.castBonus(state.me, t);
      LS.set("gp_bonus_" + state.me, t);
      state.bonusPick = null;
      await refresh();
      confetti(24, ["⭐", "🤫", "🥔"]);
      toast("Bonus assegnato in segreto! ⭐");
      render();
    } catch (e) { toast("Errore: " + e.message, true); }
  };
}

// ============================================================ ADMIN
function renderAdmin() {
  if (!state.adminPwd) {
    return `
      <h2 class="title">Area Admin 🔐</h2>
      <div class="card">
        <label class="field"><span>Password</span><input class="input" type="password" id="pwd" autocomplete="current-password"></label>
        <button class="btn block" id="login">Entra</button>
      </div>`;
  }
  const d = state.data;
  return `
    <h2 class="title">Area Admin 🔐</h2>
    <p class="subtitle">Modalità: <b>${Store.mode === "local" ? "LOCALE (solo questo telefono)" : "Supabase LIVE"}</b></p>

    <div class="card"><h3>🥔 Patatine dei giocatori</h3>
      ${PLAYERS.map((p) => {
        const c = d.chips[p.id] || {};
        return `<div class="admin-player" data-player="${p.id}">
          <img class="f" src="${p.face}" alt="">
          <div>
            <b>${esc(p.name)}</b>
            <input class="input" data-name placeholder="Nome delle patatine" value="${esc(c.name || "")}" maxlength="40">
            <div class="row">
              <img class="prev" data-prev src="${c.image || ""}" alt="" style="${c.image ? "" : "visibility:hidden"}">
              <label class="btn ghost small filebtn">📷 Foto<input type="file" accept="image/*" data-file></label>
              ${c.image ? `<button class="btn ghost small" data-rmimg>✕</button>` : ""}
              <button class="btn small green" data-save>Salva</button>
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>

    <div class="card"><h3>⭐ Bonus segreti</h3>
      <p style="margin:0 0 10px;font-weight:700">${d.bonusVoters.length}/${PLAYERS.length} giocatori hanno assegnato il bonus.</p>
      <label class="switch"><input type="checkbox" id="reveal" ${d.reveal ? "checked" : ""}> Rivela i bonus a tutti</label>
    </div>

    <div class="card"><h3>🧨 Reset</h3>
      <div class="danger-row">
        <button class="btn ghost small" data-reset="votes">Cancella voti</button>
        <button class="btn ghost small" data-reset="bonus">Cancella bonus</button>
        <button class="btn small" data-reset="all">Reset totale</button>
      </div>
    </div>
    <button class="btn ghost block" id="logout">Esci dall'admin</button>`;
}

function resizeImage(file, max = 360, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

function bindAdmin() {
  const login = document.getElementById("login");
  if (login) {
    const pwdEl = document.getElementById("pwd");
    const doLogin = async () => {
      try {
        if (await Store.adminCheck(pwdEl.value)) {
          state.adminPwd = pwdEl.value;
          try { sessionStorage.setItem("gp_admin", pwdEl.value); } catch {}
          toast("Benvenuto admin 😎");
          render();
        } else { toast("Password sbagliata 🌶️", true); pwdEl.value = ""; }
      } catch (e) { toast("Errore: " + e.message, true); }
    };
    login.onclick = doLogin;
    pwdEl.onkeydown = (e) => { if (e.key === "Enter") doLogin(); };
    return;
  }
  const pwd = state.adminPwd;
  const pending = {}; // immagini scelte ma non ancora salvate

  $app.querySelectorAll(".admin-player").forEach((row) => {
    const id = row.dataset.player;
    const prev = row.querySelector("[data-prev]");
    row.querySelector("[data-file]").onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        pending[id] = await resizeImage(f);
        prev.src = pending[id]; prev.style.visibility = "visible";
      } catch { toast("Immagine non leggibile", true); }
    };
    const rm = row.querySelector("[data-rmimg]");
    if (rm) rm.onclick = () => { pending[id] = ""; prev.style.visibility = "hidden"; };
    row.querySelector("[data-save]").onclick = async (e) => {
      const name = row.querySelector("[data-name]").value.trim();
      const image = id in pending ? pending[id] : (state.data.chips[id]?.image || null);
      e.target.disabled = true;
      try {
        await Store.adminSetChip(pwd, id, name, image || null);
        await refresh();
        toast(`Salvato: ${name || "senza nome"} ✓`);
        delete pending[id];
      } catch (err) { toast("Errore: " + err.message, true); }
      e.target.disabled = false;
    };
  });

  document.getElementById("reveal").onchange = async (e) => {
    const on = e.target.checked;
    try {
      await Store.adminSetReveal(pwd, on);
      await refresh();
      toast(on ? "Bonus rivelati! ⭐" : "Bonus di nuovo segreti 🤫");
      if (on) confetti(30, ["⭐", "🎉", "🥔"]);
    } catch (err) { e.target.checked = !on; toast("Errore: " + err.message, true); }
  };

  $app.querySelectorAll("[data-reset]").forEach((b) => (b.onclick = async () => {
    const what = b.dataset.reset;
    const label = { votes: "tutti i voti", bonus: "tutti i bonus", all: "TUTTO (voti, bonus e patatine)" }[what];
    if (!(await confirmModal("Sicuro?", `Stai per cancellare ${label}. Non si torna indietro.`, "Cancella"))) return;
    try {
      await Store.adminReset(pwd, what);
      if (what !== "votes") PLAYERS.forEach((p) => LS.del("gp_bonus_" + p.id));
      await refresh();
      toast("Fatto 🧹");
      render();
    } catch (err) { toast("Errore: " + err.message, true); }
  }));

  document.getElementById("logout").onclick = () => {
    state.adminPwd = "";
    try { sessionStorage.removeItem("gp_admin"); } catch {}
    render();
  };
}

// ---------------------------------------------------------- AVVIO
(async function init() {
  if (state.me) state.selIndex = PLAYER_IDS.indexOf(state.me);
  // link diretti: ?v=summary | stats | bonus | admin
  const qv = new URLSearchParams(location.search).get("v");
  if (state.me && ["home", "summary", "stats", "bonus", "admin"].includes(qv)) state.view = qv;
  if (state.me && qv === "bonusrev") state.view = "bonus";
  if (state.me && qv === "vote") { state.view = "vote"; state.voteTarget = PLAYERS.find((p) => p.id !== state.me).id; }
  render();
  await refresh();
  if (state.view !== "select") render();
})();
