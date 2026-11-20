// =============================================================
//  STORE: Supabase (condiviso) oppure localStorage (solo prova)
// =============================================================
const Store = (() => {
  const cfg = window.GP_CONFIG || {};
  const useSupabase = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const listeners = [];
  const emit = () => listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });

  // ---------------------------------------------------------- SUPABASE
  if (useSupabase) {
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

    let debounce;
    const ping = () => { clearTimeout(debounce); debounce = setTimeout(emit, 250); };
    sb.channel("gara-patatine")
      .on("postgres_changes", { event: "*", schema: "public", table: "gp_votes" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "gp_chips" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "gp_settings" }, ping)
      .subscribe();
    setInterval(emit, 20000); // rete di sicurezza

    return {
      mode: "supabase",
      onChange: (fn) => listeners.push(fn),
      async load() {
        const [chips, votes, settings, bstatus, bres] = await Promise.all([
          sb.from("gp_chips").select("*").then(ok),
          sb.from("gp_votes").select("*").then(ok),
          sb.from("gp_settings").select("*").eq("id", 1).maybeSingle().then(ok),
          sb.rpc("gp_bonus_status").then(ok),
          sb.rpc("gp_bonus_results").then(ok),
        ]);
        return {
          chips: Object.fromEntries((chips || []).map((c) => [c.player_id, c])),
          votes: votes || [],
          reveal: !!(settings && settings.reveal_bonus),
          bonusVoters: (bstatus || []).map((r) => r.voter),
          bonusResults: bres || [],
        };
      },
      async saveVote(v) {
        ok(await sb.from("gp_votes").upsert({ ...v, updated_at: new Date().toISOString() }, { onConflict: "voter,target" }));
        emit();
      },
      async castBonus(voter, target) { ok(await sb.rpc("gp_cast_bonus", { p_voter: voter, p_target: target })); emit(); },
      async adminCheck(pwd) { return !!ok(await sb.rpc("gp_admin_check", { pwd })); },
      async adminSetChip(pwd, player, name, image) {
        ok(await sb.rpc("gp_admin_set_chip", { pwd, p_player: player, p_name: name, p_image: image })); emit();
      },
      async adminSetReveal(pwd, reveal) { ok(await sb.rpc("gp_admin_set_reveal", { pwd, p_reveal: reveal })); emit(); },
      async adminReset(pwd, what) { ok(await sb.rpc("gp_admin_reset", { pwd, what })); emit(); },
    };
  }

  // ---------------------------------------------------------- LOCALE
  const KEY = "gp_local_db_v1";
  const PWD = "Patatine4ever"; // solo modalità locale di prova
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
  };
  const db = () => read() || { chips: {}, votes: [], bonus: {}, reveal: false };
  const write = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { alert("Spazio locale pieno: immagine troppo grande?"); } emit(); };
  const check = (pwd) => { if (pwd !== PWD) throw new Error("Password admin errata"); };
  window.addEventListener("storage", (e) => { if (e.key === KEY) emit(); });

  return {
    mode: "local",
    onChange: (fn) => listeners.push(fn),
    async load() {
      const d = db();
      return {
        chips: d.chips,
        votes: d.votes,
        reveal: d.reveal,
        bonusVoters: Object.keys(d.bonus),
        bonusResults: d.reveal ? Object.entries(d.bonus).map(([voter, target]) => ({ voter, target })) : [],
      };
    },
    async saveVote(v) {
      const d = db();
      d.votes = d.votes.filter((x) => !(x.voter === v.voter && x.target === v.target));
      d.votes.push({ ...v, updated_at: new Date().toISOString() });
      write(d);
    },
    async castBonus(voter, target) {
      const d = db();
      if (d.reveal) throw new Error("I bonus sono già stati rivelati");
      d.bonus[voter] = target; write(d);
    },
    async adminCheck(pwd) { return pwd === PWD; },
    async adminSetChip(pwd, player, name, image) {
      check(pwd); const d = db();
      d.chips[player] = { player_id: player, name, image }; write(d);
    },
    async adminSetReveal(pwd, reveal) { check(pwd); const d = db(); d.reveal = reveal; write(d); },
    async adminReset(pwd, what) {
      check(pwd); const d = db();
      if (what === "votes" || what === "all") d.votes = [];
      if (what === "bonus" || what === "all") { d.bonus = {}; d.reveal = false; }
      if (what === "all") d.chips = {};
      write(d);
    },
  };
})();
