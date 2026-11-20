// =============================================================
//  PUPAZZETTI: volto vero + corpo in costume disegnato in SVG
//  Ogni giocatore ha il suo costume (vedi COSTUMES in fondo).
//  Coordinate SVG: viewBox 0 0 200 265, spalle a y≈50, piedi a y≈240.
// =============================================================
const INK = "#3A1408";
const SKIN = "#F1C6A0";
const WHITE = "#FFFFFF";

// ---------- mattoncini di disegno ----------
// segmento "a tubo" con contorno (braccia, gambe, cavi)
const seg = (d, color, w) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 7}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const shape = (d, fill, cls = "") => `<path ${cls ? `class="${cls}"` : ""} d="${d}" fill="${fill}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
const circ = (cx, cy, r, fill, cls = "", sw = 4) => `<circle ${cls ? `class="${cls}"` : ""} cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const ell = (cx, cy, rx, ry, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${INK}" stroke-width="4"/>`;
const rect = (x, y, w, h, fill, rx = 3, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${INK}" stroke-width="3.5" ${extra}/>`;
const line = (d, color, w = 3) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const txt = (x, y, s, size, fill, extra = "") => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="middle" font-family="Luckiest Guy, Baloo 2, sans-serif" ${extra}>${s}</text>`;

const ARM_L = "M54 50 Q30 92 28 134";
const ARM_R = "M146 50 Q170 92 172 134";
const SLEEVE_L = "M54 50 Q44 66 40 80";      // manica corta
const SLEEVE_R = "M146 50 Q156 66 160 80";
const LEG_L = "M82 172 L78 232";
const LEG_R = "M118 172 L122 232";
const TORSO = "M52 42 Q100 26 148 42 L144 180 Q100 188 56 180 Z";
const HAND_L = [28, 138], HAND_R = [172, 138];

const hand = ([x, y], fill = SKIN) => circ(x, y, 11, fill);
const shoes = (fill) => ell(72, 240, 17, 8, fill) + ell(128, 240, 17, 8, fill);
// camice bianco aperto (due falde lunghe)
const labCoat = () =>
  shape("M52 42 Q70 33 87 37 L92 210 L44 208 Z", WHITE) +
  shape("M148 42 Q130 33 113 37 L108 210 L156 208 Z", WHITE) +
  line("M87 38 L78 84 L91 96", INK, 3) + line("M113 38 L122 84 L109 96", INK, 3) +
  rect(56, 128, 22, 22, WHITE, 2) + line("M61 128 L61 118", "#1E88C9", 3) + line("M67 128 L67 116", "#E63A1E", 3);

// ---------- costumi ----------
const COSTUMES = {
  // Armatura rossa e oro con reattore sul petto e propulsori sotto gli stivali
  Peppe_Troise: () => {
    const R = "#B3141B", G = "#E8B923";
    return {
      cls: "armor",
      back: `<g class="flame">` +
        `<path d="M60 246 Q72 292 84 246 Z" fill="#FF8C1A"/><path d="M65 246 Q72 274 79 246 Z" fill="#FFF3A0"/>` +
        `<path d="M116 246 Q128 292 140 246 Z" fill="#FF8C1A"/><path d="M121 246 Q128 274 135 246 Z" fill="#FFF3A0"/></g>`,
      legs: `<g class="leg leg-l">${seg(LEG_L, R, 24)}${circ(80, 203, 7, G, "", 3)}${ell(72, 240, 18, 9, R)}</g>` +
            `<g class="leg leg-r">${seg(LEG_R, R, 24)}${circ(120, 203, 7, G, "", 3)}${ell(128, 240, 18, 9, R)}</g>`,
      torso: shape(TORSO, R) +
        shape("M70 122 L130 122 L126 172 Q100 178 74 172 Z", G) + line("M100 124 L100 174", INK, 3) + line("M74 148 L126 148", INK, 3) +
        shape("M78 54 Q100 46 122 54 L118 64 Q100 58 82 64 Z", G) +
        `<circle class="reactor-glow" cx="100" cy="92" r="22" fill="#BFF6FF" opacity=".55"/>` +
        circ(100, 92, 14, "#D8FBFF", "reactor") + `<circle cx="100" cy="92" r="6" fill="#fff"/>`,
      armL: seg(ARM_L, R, 22) + seg("M33 106 L28 130", G, 22) + ell(54, 50, 17, 13, G) + hand(HAND_L, R),
      armR: seg(ARM_R, R, 22) + seg("M167 106 L172 130", G, 22) + ell(146, 50, 17, 13, G) + hand(HAND_R, R) +
            `<circle class="repulsor" cx="172" cy="142" r="7" fill="#DFFFFF"/>`,
    };
  },

  // Infermiera: divisa bianca, crocetta, cuffietta e siringa gigante
  Martina_Murat: () => {
    const B = "#5BA4E6", RED = "#E63A1E";
    return {
      cls: "nurse",
      legs: `<g class="leg leg-l">${seg(LEG_L, SKIN, 15)}${ell(72, 240, 15, 8, WHITE)}</g>` +
            `<g class="leg leg-r">${seg(LEG_R, SKIN, 15)}${ell(128, 240, 15, 8, WHITE)}</g>`,
      torso: shape("M52 42 Q100 26 148 42 L150 120 L164 205 Q100 214 36 205 L50 120 Z", WHITE) +
        line("M50 120 L150 120", B, 7) + line("M88 40 L100 58 L112 40", B, 4) +
        circ(100, 80, 3, B, "", 0) + circ(100, 100, 3, B, "", 0) + circ(100, 140, 3, B, "", 0) +
        rect(112, 74, 24, 22, WHITE, 3) + `<path d="M121 78 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 Z" fill="${RED}"/>` +
        line("M40 198 Q100 206 160 198", B, 4),
      armL: seg(ARM_L, SKIN, 17) + seg(SLEEVE_L, WHITE, 24) + hand(HAND_L),
      armR: seg(ARM_R, SKIN, 17) + seg(SLEEVE_R, WHITE, 24) +
        `<g class="syringe">${rect(166, 96, 13, 40, "#CDEBFF", 3)}${line("M172.5 96 L172.5 84", INK, 4)}${rect(164, 78, 17, 6, B, 2)}` +
        `${line("M172.5 136 L172.5 156", "#8A8A8A", 2.5)}${line("M168 106 h5 M168 114 h5 M168 122 h5", INK, 1.5)}</g>` + hand(HAND_R),
      hat: `<svg viewBox="0 0 100 52"><path d="M8 46 Q12 10 50 6 Q88 10 92 46 Q50 36 8 46 Z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
           `<path d="M44 14 h12 v9 h9 v12 h-9 v-1 h-12 v1 h-9 v-12 h9 Z" fill="${RED}"/></svg>`,
      hatCls: "hat-nurse",
    };
  },

  // Gastroenterologo: camice, divisa verde, endoscopio con lucina
  Emanuele_Ferrante: () => {
    const GR = "#3FA37A";
    return {
      cls: "gastro",
      legs: `<g class="leg leg-l">${seg(LEG_L, GR, 22)}${ell(72, 240, 17, 8, "#E8E8E8")}</g>` +
            `<g class="leg leg-r">${seg(LEG_R, GR, 22)}${ell(128, 240, 17, 8, "#E8E8E8")}</g>`,
      torso: shape(TORSO, GR) + line("M86 40 L100 62 L114 40", INK, 3) + labCoat() +
        rect(118, 92, 30, 20, WHITE, 3) +
        `<path d="M128 97 q-4 6 2 10 q6 3 9 -2 q3 -5 -2 -7 q-3 -1 -4 2 q-1 2 -4 -3 z" fill="#F48FB1" stroke="${INK}" stroke-width="1.5"/>`,
      armL: seg(ARM_L, WHITE, 22) +
        `<g class="scope">${line("M24 150 C6 196 64 214 44 246 C30 266 2 248 14 226", "#222", 5)}` +
        `<circle class="scope-light" cx="14" cy="226" r="5" fill="#AFFFFF"/>` +
        `${rect(14, 112, 20, 36, "#5A5A5A", 5)}${circ(20, 124, 4, "#BDBDBD", "", 2)}${circ(28, 132, 4, "#BDBDBD", "", 2)}</g>` + hand(HAND_L),
      armR: seg(ARM_R, WHITE, 22) + hand(HAND_R),
    };
  },

  // Cardiologo: camice, divisa blu, stetoscopio e cuore che batte
  Guido_Coppola: () => {
    const BL = "#2F6DB5", RED = "#E63A1E";
    return {
      cls: "cardio",
      legs: `<g class="leg leg-l">${seg(LEG_L, BL, 22)}${ell(72, 240, 17, 8, "#E8E8E8")}</g>` +
            `<g class="leg leg-r">${seg(LEG_R, BL, 22)}${ell(128, 240, 17, 8, "#E8E8E8")}</g>`,
      torso: shape(TORSO, BL) + line("M86 40 L100 62 L114 40", INK, 3) + labCoat() +
        line("M84 40 Q76 104 96 114 Q100 116 104 114 Q124 104 116 40", "#555", 5) +
        line("M100 115 L100 128", "#555", 4) + circ(100, 135, 8, "#CFD8DC", "", 3) +
        rect(118, 92, 30, 20, WHITE, 3) + line("M121 103 h6 l3 -7 l4 13 l3 -6 h9", RED, 2),
      armL: seg(ARM_L, WHITE, 22) + hand(HAND_L),
      armR: seg(ARM_R, WHITE, 22) + hand(HAND_R) +
        `<g class="beat"><path d="M172 156 C148 138 152 116 165 118 C170 119 172 123 172 126 C172 123 174 119 179 118 C192 116 196 138 172 156 Z" fill="${RED}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>` +
        `<path d="M162 126 q3 -4 7 -2" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></g>`,
    };
  },

  // Maestra: cardigan, gonna, libro e bacchetta
  Marianna_meta: () => {
    const CA = "#8E2C48", NV = "#2B3A67";
    return {
      cls: "teacher",
      legs: `<g class="leg leg-l">${seg("M82 205 L78 232", SKIN, 15)}${ell(72, 240, 15, 7, INK)}</g>` +
            `<g class="leg leg-r">${seg("M118 205 L122 232", SKIN, 15)}${ell(128, 240, 15, 7, INK)}</g>`,
      torso: shape(TORSO, WHITE) +
        shape("M146 170 L54 170 L42 214 Q100 222 158 214 Z", NV) +
        shape("M52 42 Q70 33 88 40 L94 176 L56 180 Z", CA) + shape("M148 42 Q130 33 112 40 L106 176 L144 180 Z", CA) +
        shape("M88 40 L100 56 L82 60 Z", WHITE) + shape("M112 40 L100 56 L118 60 Z", WHITE) +
        circ(100, 90, 3, CA, "", 0) + circ(100, 112, 3, CA, "", 0) + circ(100, 134, 3, CA, "", 0) +
        circ(130, 84, 7, "#E63A1E", "", 3) + `<path d="M130 77 q4 -6 8 -4" fill="none" stroke="#3B8E2F" stroke-width="3" stroke-linecap="round"/>`,
      armL: seg(ARM_L, CA, 22) + hand(HAND_L) +
        `<g transform="rotate(-12 26 142)">${rect(6, 118, 38, 46, "#2E8B57", 4)}${line("M12 122 v38", "#fff", 3)}` +
        `${txt(28, 147, "ABC", 12, "#FFF3A0")}</g>`,
      armR: seg(ARM_R, CA, 22) + line("M174 140 L198 58", "#8B5A2B", 6) + circ(198, 56, 5, "#E63A1E", "", 2.5) + hand(HAND_R),
    };
  },

  // Palestra: top fucsia, leggings, asciugamano e manubri
  Claudia_Ottaviano: () => {
    const PK = "#FF4F8B", BK = "#232323";
    const dumbbell = (x, y) => line(`M${x - 18} ${y} L${x + 18} ${y}`, "#9E9E9E", 5) +
      rect(x - 24, y - 11, 9, 22, BK, 2) + rect(x + 15, y - 11, 9, 22, BK, 2);
    return {
      cls: "gym",
      legs: `<g class="leg leg-l">${seg("M82 160 L78 232", BK, 25)}${line("M71 170 L68 226", PK, 3)}${ell(72, 240, 17, 8, WHITE)}${line("M62 238 h18", PK, 3)}</g>` +
            `<g class="leg leg-r">${seg("M118 160 L122 232", BK, 25)}${line("M129 170 L132 226", PK, 3)}${ell(128, 240, 17, 8, WHITE)}${line("M120 238 h18", PK, 3)}</g>`,
      torso: shape(TORSO, SKIN) +
        shape("M56 150 Q100 160 144 150 L144 180 Q100 188 56 180 Z", BK) +
        shape("M52 42 Q100 28 148 42 L146 102 Q100 112 54 102 Z", PK) +
        line("M84 40 Q100 66 116 40", INK, 3) + `<path d="M98 128 q2 4 4 0" fill="none" stroke="${INK}" stroke-width="2"/>` +
        shape("M46 40 Q58 30 72 38 L66 96 L50 96 Z", WHITE) + line("M51 84 L67 84 M52 90 L66 90", PK, 3),
      armL: seg(ARM_L, SKIN, 16) + seg("M30 122 L29 128", PK, 18) + dumbbell(HAND_L[0], HAND_L[1]) + hand(HAND_L),
      armR: seg(ARM_R, SKIN, 16) + seg("M170 122 L171 128", PK, 18) + dumbbell(HAND_R[0], HAND_R[1]) + hand(HAND_R),
    };
  },

  // Dipendente comunale: camicia azzurrina, cravatta allentata, caffè, cartello e Zzz
  Checco_LaBarbera: () => {
    const SH = "#BFD9F2", GY = "#6B6F76";
    return {
      cls: "clerk",
      legs: `<g class="leg leg-l">${seg(LEG_L, GY, 24)}${ell(72, 240, 17, 8, "#4A2C1A")}</g>` +
            `<g class="leg leg-r">${seg(LEG_R, GY, 24)}${ell(128, 240, 17, 8, "#4A2C1A")}</g>`,
      torso: shape("M52 42 Q100 26 148 42 L156 140 Q154 186 100 188 Q46 186 44 140 Z", SH) +
        rect(48, 168, 104, 14, GY, 4) + rect(94, 168, 12, 14, "#C9A227", 2) +
        line("M100 46 L100 166", "#8FB3D6", 2) + circ(100, 90, 2.5, WHITE, "", 1.5) + circ(100, 120, 2.5, WHITE, "", 1.5) + circ(100, 150, 2.5, WHITE, "", 1.5) +
        shape("M84 38 L100 54 L88 62 Z", SH) + shape("M116 38 L100 54 L112 62 Z", SH) +
        `<g transform="rotate(14 104 56)">${shape("M98 54 L110 54 L112 64 L106 68 L114 124 L104 136 L96 124 L102 68 L96 64 Z", "#C62828")}</g>` +
        rect(118, 76, 26, 20, WHITE, 3) + txt(131, 89, "COMUNE", 6, "#1E3A8A") +
        `<path d="M64 108 q8 6 14 0" fill="none" stroke="#9CC2E6" stroke-width="3" stroke-linecap="round"/>`,
      armL: seg(ARM_L, SH, 21) + hand(HAND_L) +
        `<g transform="rotate(-6 28 150)">${rect(-2, 140, 60, 34, "#D9A86C", 3)}${txt(28, 155, "TORNO", 11, INK)}${txt(28, 168, "SUBITO", 11, INK)}</g>`,
      armR: seg(ARM_R, SH, 21) +
        `<g class="steam">${line("M168 104 q-5 -7 0 -14 q5 -7 0 -14", "#fff", 3)}${line("M178 104 q-5 -7 0 -14 q5 -7 0 -14", "#fff", 3)}</g>` +
        rect(162, 108, 22, 26, WHITE, 4) + `<path d="M184 114 q10 0 10 8 q0 8 -10 8" fill="none" stroke="${INK}" stroke-width="3.5"/>` +
        line("M162 118 h22", "#C62828", 3) + hand(HAND_R),
      extra: `<div class="zzz"><span>z</span><span>z</span><span>Z</span></div>`,
    };
  },

  // Maglia a strisce biancocelesti n.10, pantaloncini neri e pallone
  Yoel_Federico_Soimer: (uid) => {
    const SKY = "#75AADB", BK = "#1B1B1B";
    const clip = `clipY${uid}`;
    return {
      cls: "football",
      back: `<g class="ball">${circ(166, 240, 13, WHITE, "", 3)}<path d="M166 234 l5 4 -2 6 h-6 l-2 -6 z" fill="${BK}"/>` +
            `${line("M155 236 l6 2 M177 236 l-6 2 M162 251 l2 -5 M170 251 l-2 -5", BK, 2)}</g>`,
      legs: `<g class="leg leg-l">${seg("M82 200 L78 232", SKIN, 15)}${seg("M79 218 L78 232", WHITE, 17)}${ell(72, 240, 17, 8, BK)}</g>` +
            `<g class="leg leg-r">${seg("M118 200 L122 232", SKIN, 15)}${seg("M121 218 L122 232", WHITE, 17)}${ell(128, 240, 17, 8, BK)}</g>`,
      torso: `<defs><clipPath id="${clip}"><path d="${TORSO}"/></clipPath></defs>` +
        shape("M54 172 L146 172 L152 208 L106 208 L100 194 L94 208 L48 208 Z", BK) +
        `<path d="${TORSO}" fill="${WHITE}"/>` +
        `<g clip-path="url(#${clip})"><rect x="58" y="20" width="16" height="180" fill="${SKY}"/><rect x="92" y="20" width="16" height="180" fill="${SKY}"/><rect x="126" y="20" width="16" height="180" fill="${SKY}"/></g>` +
        `<path d="${TORSO}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
        line("M86 38 Q100 52 114 38", BK, 4) +
        txt(100, 128, "10", 34, BK, `stroke="${WHITE}" stroke-width="1.5" paint-order="stroke"`),
      armL: seg(ARM_L, SKIN, 17) + seg(SLEEVE_L, SKY, 24) + hand(HAND_L),
      armR: seg(ARM_R, SKIN, 17) + seg(SLEEVE_R, SKY, 24) + hand(HAND_R),
    };
  },
};

// costume di riserva per eventuali nuovi giocatori
const DEFAULT_COSTUME = () => ({
  cls: "plain",
  legs: `<g class="leg leg-l">${seg(LEG_L, "#3A4A6B", 22)}${ell(72, 240, 17, 8, INK)}</g>` +
        `<g class="leg leg-r">${seg(LEG_R, "#3A4A6B", 22)}${ell(128, 240, 17, 8, INK)}</g>`,
  torso: shape(TORSO, "#FF8C1A") + txt(100, 124, "CHIPS", 22, "#FFF4D6"),
  armL: seg(ARM_L, "#FF8C1A", 21) + hand(HAND_L),
  armR: seg(ARM_R, "#FF8C1A", 21) + hand(HAND_R),
});

let toonUid = 0;
/**
 * Restituisce l'HTML di un pupazzetto.
 * opts: { size: px, mood: 'idle'|'happy'|'still' }
 */
function toonHTML(player, opts = {}) {
  const size = opts.size || 120;
  const mood = opts.mood || "idle";
  const c = (COSTUMES[player.id] || DEFAULT_COSTUME)(++toonUid);
  return `
  <div class="toon toon-${mood} costume-${c.cls}" style="--w:${size}px" data-id="${player.id}">
    <svg class="toon-body" viewBox="0 0 200 265" aria-hidden="true">
      ${c.back || ""}
      ${c.legs}
      ${c.torso}
      <g class="arm arm-l">${c.armL}</g>
      <g class="arm arm-r">${c.armR}</g>
    </svg>
    <img class="toon-face" src="${player.face}" alt="${esc(player.name)}" draggable="false">
    ${c.hat ? `<div class="toon-hat ${c.hatCls || ""}">${c.hat}</div>` : ""}
    ${c.extra || ""}
  </div>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
