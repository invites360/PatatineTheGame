// Giocatori: l'id è il nome del file in img/ (senza .png)
const PLAYER_IDS = [
  "Peppe_Troise",
  "Checco_LaBarbera",
  "Claudia_Ottaviano",
  "Emanuele_Ferrante",
  "Guido_Coppola",
  "Marianna_meta",
  "Martina_Murat",
  "Yoel_Federico_Soimer",
];

const PLAYERS = PLAYER_IDS.map((id) => ({
  id,
  name: id.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
  short: id.split("_")[0],
  face: `img/faces/${id}.png`,
}));

const PLAYER_BY_ID = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));

const CATEGORIES = [
  { key: "crunch",    label: "Crunch Factor",        emoji: "💥", hint: "Quanto scrocchiano?" },
  { key: "gusto",     label: "Gusto",                emoji: "😋", hint: "Il sapore puro" },
  { key: "una_tira",  label: "Una tira l'altra",     emoji: "🔁", hint: "Riesci a fermarti?" },
  { key: "wow",       label: "Effetto wow",          emoji: "🤯", hint: "Reazione al primo morso" },
  { key: "formato",   label: "Formato",              emoji: "📐", hint: "Forma, spessore, dimensione" },
  { key: "packaging", label: "Packaging",            emoji: "🎁", hint: "Il pacco è bello?" },
  { key: "prezzo",    label: "Prezzo",               emoji: "💰", hint: "Rapporto qualità/prezzo" },
  { key: "party",     label: "Party chips",          emoji: "🎉", hint: "Quanto è da festa?" },
];

const BONUS_POINTS = 10;
