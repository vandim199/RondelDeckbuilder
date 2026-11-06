/* Kinetic Engine interface. All rules live in engine.js. */
(function () {
  "use strict";
  const E = window.KineticEngine;
  const VERSIONS = window.KE_VERSIONS;
  const { CARDS, PERKS, SPACES, S, human } = E;
  const SAVE_KEY = "kinetic-engine-save-v3";
  const SETUP_KEY = "kinetic-engine-setup-v1";
  const KIND_LABEL = { human: "Human", casual: "Casual bot", std: "Standard bot", expert: "Expert bot" };
  const SPEED = { slow: 1400, normal: 700, fast: 120 };
  const root = document.getElementById("app");

  const ui = {
    screen: "setup",
    g: null,
    token: null, // chosen way to pay for a space action
    trashPick: [],
    message: "",
    curtain: null, // { seat, then } shown before a private hand appears
    pickSeat: null,
    picks: [],
    pawn: [],
    busy: false,
    speed: "normal",
    aim: null,
    runId: 0,
    showLogOpen: true,
    setup: { version: VERSIONS[0].id, seats: [
      { name: "You", kind: "human" }, { name: "Ada", kind: "std" }, { name: "Bram", kind: "std" }, { name: "Cleo", kind: "casual" },
    ] },
  };

  // ------------------------------------------------------------ storage (a convenience only; the game works without it)
  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage may be blocked */ } }
  function fetchStored(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function clearStored(key) { try { localStorage.removeItem(key); } catch (e) { /* storage may be blocked */ } }
  function saveGame() { if (ui.g) store(SAVE_KEY, { g: ui.g, curtain: ui.curtain, pickSeat: ui.pickSeat, screen: ui.screen }); }

  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function perkText(g, perk) { return PERKS[perk].text(g.cfg.values[perk]); }
  function plural(n, word) { return `${n} ${word}${n === 1 ? "" : "s"}`; }
  function humans(g) { return g.players.filter((p) => p.kind === "human"); }
  function cardClass(c) {
    const k = CARDS[c];
    if (k.mv || k.cat.startsWith("mv")) return "mv";
    if (k.coin || k.cat === "coin" || k.cat === "cargo" || k.cat === "vp") return "coin";
    if (k.act || k.cat === "act" || k.cat === "trash") return "act";
    return "draw";
  }
  function versionOf(g) { return VERSIONS.find((v) => v.id === g.versionId) || VERSIONS[0]; }

  // ------------------------------------------------------------ the dial
  const COLORS = ["var(--p0)", "var(--p1)", "var(--p2)", "var(--p3)"];
  const TILE_FILL = { S: "var(--tile-s)", M: "var(--tile-m)", R: "var(--tile-r)", B: "var(--tile-b)", V: "var(--tile-v)", C: "var(--tile-c)" };
  const TILE_SUB = { S: "start line", V: "move 2", M: "2 iron", R: "trash 2", B: "buy", C: "2 coins" };
  const CX = 200, CY = 200, R_OUT = 192, R_IN = 104, R_LABEL = 150, R_PAWN = 92;

  function polar(r, a) { return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; }
  function angleOf(i, n) { return -Math.PI / 2 + (i * 2 * Math.PI) / n; }
  function wedge(i, n) {
    const gap = 0.012;
    const half = Math.PI / n - gap;
    const a = angleOf(i, n);
    const p1 = polar(R_OUT, a - half), p2 = polar(R_OUT, a + half), p3 = polar(R_IN, a + half), p4 = polar(R_IN, a - half);
    return `M${p1[0]} ${p1[1]}A${R_OUT} ${R_OUT} 0 0 1 ${p2[0]} ${p2[1]}L${p3[0]} ${p3[1]}A${R_IN} ${R_IN} 0 0 0 ${p4[0]} ${p4[1]}Z`;
  }
  function pawnShape(seat, x, y, id) {
    const c = COLORS[seat];
    const shapes = [
      `<circle class="pawn-face" r="11" fill="${c}"/>`,
      `<rect class="pawn-face" x="-10" y="-10" width="20" height="20" fill="${c}"/>`,
      `<path class="pawn-face" d="M0-13L12 9H-12Z" fill="${c}"/>`,
      `<path class="pawn-face" d="M0-13L12 0L0 13L-12 0Z" fill="${c}"/>`,
    ];
    return `<g class="pawn" id="${id}" style="transform:translate(${x}px,${y}px)">${shapes[seat]}</g>`;
  }
  function pawnXY(g, seat, pos) {
    const n = g.cfg.tiles.length;
    const a = angleOf(pos, n);
    const spread = (seat - (g.players.length - 1) / 2) * 0.17;
    return polar(R_PAWN - Math.abs(seat % 2) * 0, a + spread);
  }
  function dial(g, opts) {
    opts = opts || {};
    const tiles = g.cfg.tiles, n = tiles.length;
    let body = "";
    for (let i = 0; i < n; i++) {
      const t = tiles[i];
      const cls = opts.here === i ? "here" : opts.aim === i ? "aim" : "";
      const [x, y] = polar(R_LABEL, angleOf(i, n));
      body += `<path d="${wedge(i, n)}" fill="${TILE_FILL[t]}" class="${cls}"/>`;
      const textFill = t === "S" ? 'style="fill:var(--paper)"' : "";
      body += `<text x="${x}" y="${y - 3}" text-anchor="middle" class="tile-name" ${textFill}>${SPACES[t].name}</text>`;
      body += `<text x="${x}" y="${y + 13}" text-anchor="middle" class="tile-sub" ${textFill}>${TILE_SUB[t]}</text>`;
    }
    (g.players || []).forEach((p) => {
      const pos = ui.pawn[p.seat] !== undefined ? ui.pawn[p.seat] : p.pos;
      const [x, y] = pawnXY(g, p.seat, pos);
      body += pawnShape(p.seat, x, y, `pawn${p.seat}`);
    });
    const label = `Track with ${n} spaces`;
    return `<div class="dial"><svg viewBox="0 0 400 400" role="img" aria-label="${label}">${body}
      <text x="200" y="${opts.centerSub ? 186 : 208}" text-anchor="middle" class="center-b">${esc(opts.centerTop || "")}</text>
      <text x="200" y="${opts.centerSub ? 222 : 240}" text-anchor="middle" class="center-a">${esc(opts.centerMain || "")}</text>
      <text x="200" y="243" text-anchor="middle" class="center-b">${esc(opts.centerSub || "")}</text>
    </svg></div>`;
  }

  // ------------------------------------------------------------ setup screen
  function renderSetup() {
    const saved = fetchStored(SAVE_KEY);
    const sample = { cfg: VERSIONS.find((v) => v.id === ui.setup.version).cfg, players: [] };
    const seats = ui.setup.seats;
    const seatRows = seats.map((s, i) => `
      <div class="seat-row">
        <svg viewBox="-14 -14 28 28" width="20" height="20" aria-hidden="true">${pawnShape(i, 0, 0, "seat" + i)}</svg>
        <input id="name${i}" aria-label="Name for seat ${i + 1}" value="${esc(s.name)}" data-seat-name="${i}" maxlength="14">
        <select id="kind${i}" aria-label="Who plays seat ${i + 1}" data-seat-kind="${i}">
          ${Object.entries(KIND_LABEL).map(([k, v]) => `<option value="${k}" ${s.kind === k ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </div>`).join("");
    const versions = VERSIONS.map((v) => `
      <label class="version">
        <input type="radio" name="version" id="ver-${v.id}" value="${v.id}" ${ui.setup.version === v.id ? "checked" : ""}>
        <span><strong>${esc(v.name)}</strong><span class="small">${esc(v.blurb)}</span></span>
      </label>`).join("");
    const nHumans = seats.filter((s) => s.kind === "human").length;
    root.innerHTML = `<div class="setup">
      <section>
        <h1>Kinetic Engine</h1>
        <p class="lead">Race around the dial, build your deck, and buy perks that change what each crossing is worth. First to the VP target ends the game.</p>
        <div class="dial-small">${dial(sample, { centerTop: "first to", centerMain: `${sample.cfg.threshold}`, centerSub: "VP" })}</div>
      </section>
      <section class="panel">
        <h2>New game</h2>
        ${saved ? `<div class="row between"><span>You have a game in progress.</span><button id="resume" class="signal" data-act="resume">Resume game</button></div>` : ""}
        <div style="display:grid;gap:8px"><h3>Version</h3>${versions}</div>
        <div style="display:grid;gap:8px"><h3>Players</h3>${seatRows}
          <div class="row">
            ${seats.length < 4 ? `<button data-act="add-seat" id="add-seat">Add player</button>` : ""}
            ${seats.length > 2 ? `<button data-act="drop-seat" id="drop-seat">Remove player</button>` : ""}
          </div>
          <p class="small muted">Balance was tested with 4 players. With 2 humans or more, pass the device between turns.</p>
        </div>
        <button class="primary" id="start" data-act="start" ${nHumans === 0 ? "" : ""}>${nHumans === 0 ? "Watch the bots play" : nHumans > 1 ? `Start pass-and-play (${nHumans} players)` : "Start game"}</button>
      </section>
    </div>`;
  }

  function startGame() {
    const v = VERSIONS.find((x) => x.id === ui.setup.version);
    store(SETUP_KEY, ui.setup);
    const seats = ui.setup.seats.map((s, i) => ({ name: s.name.trim() || `Player ${i + 1}`, kind: s.kind }));
    const g = E.newGame(v.cfg, seats, Math.floor(Math.random() * 1e9));
    g.versionId = v.id;
    ui.g = g;
    ui.pawn = g.players.map(() => 0);
    ui.token = null;
    ui.trashPick = [];
    ui.message = "";
    ui.runId++;
    nextPerkPick();
  }

  // ------------------------------------------------------------ perk choice
  function nextPerkPick() {
    const g = ui.g;
    const p = g.players.find((x) => x.kind === "human" && !x.plan.length);
    if (p) {
      ui.pickSeat = p.seat;
      ui.picks = [];
      ui.screen = "perks";
      if (humans(g).length > 1) ui.curtain = { seat: p.seat, then: "perks" };
      saveGame();
      render();
      return;
    }
    ui.pickSeat = null;
    ui.screen = "play";
    advance();
  }

  function renderPerks() {
    const g = ui.g;
    const p = g.players[ui.pickSeat];
    const k = g.cfg.slots;
    const rows = p.offers.map((perk) => `
      <button class="perk ${ui.picks.includes(perk) ? "sel" : ""}" data-act="pick-perk" data-perk="${perk}" aria-pressed="${ui.picks.includes(perk)}" style="text-align:left;font-weight:400">
        <span><strong>${PERKS[perk].name}</strong><br>When you cross: ${esc(perkText(g, perk))}</span>
        <span class="price">${ui.picks.includes(perk) ? "✓" : ""}</span>
      </button>`).join("");
    root.innerHTML = `${topbar(g)}
      <div class="pick">
        <h2>${esc(p.name)}: choose ${k} of these ${p.offers.length} perks</h2>
        <p class="muted">Your choices are your route through the game. Buy each one for ${E.PERK_COST} coins at a Bazaar. ${g.cfg.payBest ? "With two perks, only the better one pays at each crossing." : "Every perk you own pays at each crossing."}</p>
        ${rows}
        <button class="primary" id="confirm-perks" data-act="confirm-perks" ${ui.picks.length === k ? "" : "disabled"}>Keep ${ui.picks.length === k ? "these" : `${k} perks`}</button>
      </div>`;
  }

  // ------------------------------------------------------------ turn flow
  async function advance() {
    const g = ui.g;
    const run = ++ui.runId;
    saveGame();
    while (ui.g === g && run === ui.runId) {
      if (g.over) { ui.screen = "over"; clearStored(SAVE_KEY); render(); return; }
      const p = g.players[g.current];
      if (p.kind === "human") {
        if (!g.turn) {
          if (humans(g).length > 1) {
            ui.curtain = { seat: p.seat, then: "play" };
            saveGame();
            render();
            return;
          }
          beginHuman();
        }
        ui.busy = false;
        render();
        return;
      }
      ui.busy = true;
      E.beginTurn(g);
      const plan = E.botPlan(g);
      const from = p.pos;
      const summary = E.commitTurn(g, plan);
      if (speedDelay() > 0) {
        ui.aim = null;
        render();
        await walkPawn(g, summary.seat, from, summary.moved, run);
        await wait(speedDelay());
      }
      ui.pawn[summary.seat] = g.players[summary.seat].pos;
      saveGame();
    }
  }

  function beginHuman() {
    ui.token = null;
    ui.trashPick = [];
    ui.message = "";
    E.beginTurn(ui.g);
    saveGame();
  }

  function speedDelay() {
    return humans(ui.g).length === 0 && ui.speed === "fast" ? 0 : SPEED[ui.speed];
  }
  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function walkPawn(g, seat, from, steps, run) {
    const n = g.cfg.tiles.length;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || ui.speed === "fast") { setPawn(g, seat, g.players[seat].pos); return; }
    let at = from;
    for (let i = 0; i < steps; i++) {
      if (run !== ui.runId) return;
      at = (at + 1) % n;
      setPawn(g, seat, at);
      await wait(130);
    }
  }
  function setPawn(g, seat, pos) {
    ui.pawn[seat] = pos;
    const el = document.getElementById("pawn" + seat);
    if (el) {
      const [x, y] = pawnXY(g, seat, pos);
      el.style.transform = `translate(${x}px,${y}px)`;
    }
  }

  // ------------------------------------------------------------ text for the log
  function describe(g, s) {
    const bits = [];
    const tile = SPACES[g.cfg.tiles[s.to]].name;
    if (s.moved) bits.push(`moved ${s.moved} to ${tile}`);
    else bits.push("stayed put");
    if (s.crossed) bits.push(`crossed for ${s.pay} VP`);
    if (s.mined) bits.push(`mined ${s.mined} iron`);
    if (s.bonus) bits.push(`scored ${s.bonus} VP with Victory Lap`);
    if (s.ambush) bits.push("played an Ambush, so everyone else draws 1 fewer next turn");
    (s.played || []).filter((c) => !["Ambush", "Victory Lap"].includes(CARDS[c].name)).forEach((c) => bits.push(`played ${CARDS[c].name}`));
    s.perks.forEach((x) => bits.push(`bought the ${PERKS[x].name} perk`));
    s.bought.forEach((c) => bits.push(`bought ${CARDS[c].name}`));
    if (s.trashed.length) bits.push(`trashed ${s.trashed.map((c) => CARDS[c].name).join(" and ")}`);
    if (s.lost) bits.push(`lost ${s.lost} at Customs`);
    return `${s.name} ${bits.join(", ")}.`;
  }

  // ------------------------------------------------------------ play screen pieces
  function topbar(g) {
    const speed = g.players.some((p) => p.kind !== "human")
      ? `<div class="row small">${["slow", "normal", "fast"].map((k) => `<button class="seg ${ui.speed === k ? "on" : ""}" data-act="speed" data-speed="${k}" aria-pressed="${ui.speed === k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div>` : "";
    return `<header class="topbar">
      <div class="name">Kinetic Engine</div>
      <div class="row small"><span class="num">Round ${g.round}</span><span class="muted">First to ${g.cfg.threshold} VP, then finish the round</span></div>
      <div class="row">${speed}<button class="seg" data-act="quit" id="quit">New game</button></div>
    </header>`;
  }

  function scoreboard(g) {
    const rows = g.players.map((p) => {
      const pct = Math.min(100, (p.vp / g.cfg.threshold) * 100);
      const chips = p.plan.map((x) => `<span class="chip ${p.perks.includes(x) ? "on" : ""}" title="${esc(perkText(g, x))}">${PERKS[x].name}${p.perks.includes(x) ? "" : " (not bought)"}</span>`).join("");
      return `<div class="player ${g.current === p.seat && !g.over ? "current" : ""}">
        <svg viewBox="-14 -14 28 28" width="18" height="18" aria-hidden="true">${pawnShape(p.seat, 0, 0, "s" + p.seat)}</svg>
        <span class="who">${esc(p.name)} <span class="muted small">${p.kind === "human" ? "" : KIND_LABEL[p.kind]}</span></span>
        <span class="vp num">${p.vp}</span>
        <span class="bar"><i style="width:${pct}%;background:${COLORS[p.seat]}"></i></span>
        <span class="meta num">${plural(p.coins, "coin")} · ${p.iron} iron · deck ${p.owned} · ${plural(p.stats.crossings, "crossing")}</span>
        <div class="chips">${chips}</div>
      </div>`;
    }).join("");
    return `<div class="players">${rows}</div>`;
  }

  function logPanel(g) {
    const lines = g.log.slice(-40).reverse().map((s) => `<p>${esc(describe(g, s))}</p>`).join("") || `<p class="muted">Turns will appear here.</p>`;
    return `<details class="fold sect-log" open><summary>Game log</summary><div class="log">${lines}</div></details>`;
  }

  function rulesPanel(g) {
    const c = g.cfg;
    return `<details class="fold sect-rules"><summary>Rules</summary><div class="rules">
      <p>Each turn you draw 5 cards and play them in any order. Cards that draw fire as soon as you draw them.</p>
      <ul>
        <li><b>Movement cards</b> move your pawn forward. Pawns can share a space.</li>
        <li><b>Coin cards</b> add coins. Any you do not play bank at the end of your turn, and they are safe from Customs while in your hand. Other cards that give coins only do so if you play them.</li>
        <li><b>Contract</b> uses the space you are on, then moves you 1. Foreman does that twice. <b>Layover</b> uses the space and you stay there.</li>
        ${c.freeAction ? `<li><b>Free action:</b> you can use the space you are on for free, whether or not you moved this turn. This ends your turn, so play your other cards first.</li>` : ""}
        ${c.buyAny ? `<li><b>Buy anywhere:</b> once per turn you can buy a card or perk from any space, for free. That uses your one free thing this turn.</li>` : ""}
        ${c.buyFree ? `<li><b>Bazaars:</b> once per turn you can buy at a Bazaar without a Contract, and you do not step forward.</li>` : ""}
        <li><b>Crossing the line</b> scores ${c.baseLap === undefined ? E.BASE_LAP : c.baseLap} VP plus ${c.payBest ? "your best perk" : "every perk you own"}, once per turn.</li>
        <li><b>Customs</b> then sells all your iron for ${E.IRON_VALUE} coins each and discards your coins down to ${E.COIN_CAP}. Owning Foundry lets you keep up to ${E.FOUNDRY_KEEP} iron.</li>
        <li><b>Iron</b> spends as ${E.IRON_VALUE} coins with no change given.</li>
        <li><b>A smaller hand:</b> however many Ambushes hit you, you always draw at least 3 cards.</li>
        <li><b>Trashing</b> removes cards from your deck for good. There is no minimum deck size, so trash with care.</li>
        <li>When anyone reaches ${c.threshold} VP, finish the round. Most VP wins, then most money.</li>
      </ul></div></details>`;
  }

  function fundsOf(st) {
    let hand = 0;
    st[S.H].forEach((c) => { hand += CARDS[c].coin; });
    return { banked: st[S.COINS], hand, iron: st[S.IRON], total: st[S.COINS] + hand + st[S.IRON] * E.IRON_VALUE };
  }

  function cardButton(g, c, i, st) {
    const k = CARDS[c];
    const tokens = human.tokens(g);
    let note = "", act = "", disabled = false;
    if (done(st)) disabled = true;
    else if (ui.token && ui.token.mode === "joker") {
      disabled = true;
    } else if (ui.token && (ui.token.mode === "salvage" || ui.token.mode === "remodel")) {
      if (ui.token.mode === "remodel" && ui.token.pick !== undefined) {
        disabled = true;
        note = c === ui.token.pick ? "Trading this in" : "";
      } else if (handCountAfterToken(st, c) > 0) {
        act = "special-pick";
        note = ui.token.mode === "salvage" ? `Sell for ${k.cost + 1}` : `Up to cost ${human.remodelCap(c)}`;
      } else {
        disabled = true;
        note = `Playing this ${k.name}`;
      }
    } else if (ui.token && ui.token.mode === "trash") {
      const pickedSame = ui.trashPick.filter((x) => st[S.H][x] === c && x !== i).length;
      const pickable = handCountAfterToken(st, c) > pickedSame;
      act = "trash-card";
      note = ui.trashPick.includes(i) ? "Selected" : "Tap to trash";
      if (!pickable) disabled = true;
    } else if (k.spec) {
      const info = human.specialInfo(g, c);
      note = info.note;
      if (info.ok) act = "play-special";
      else disabled = true;
    } else if (k.mv) {
      const next = human.previewMove(g, c);
      act = "play-move";
      note = next[S.CROSSED] && !st[S.CROSSED] ? `Crosses: +${next[S.PAY]} VP` : `To ${SPACES[g.cfg.tiles[next[S.POS]]].name}`;
    } else if (k.coin) {
      act = "play-coin";
      note = `Bank ${k.coin} now`;
    } else if (k.act) {
      const t = tokens.find((x) => x.via === "card" && x.card === c);
      if (t && !isCustoms(g, st)) {
        act = "use-card";
        note = `Use ${SPACES[g.cfg.tiles[st[S.POS]]].name}`;
      } else {
        disabled = true;
        note = isCustoms(g, st) ? "Nothing to use here" : "";
      }
    } else disabled = true;
    const picked = ui.token && ui.token.mode === "trash" && ui.trashPick.includes(i);
    return `<button class="card ${cardClass(c)} ${picked ? "picked" : ""}" id="hand${i}" data-act="${act}" data-card="${c}" data-index="${i}" ${disabled ? "disabled" : ""}>
      <span class="cname">${k.name}</span><span class="ctext">${esc(k.text)}</span><span class="cnote">${esc(note)}</span></button>`;
  }
  function handCountAfterToken(st, c) { return st[S.H].filter((x) => x === c).length - (ui.token.card === c ? 1 : 0); }
  function done(st) { return !!(st[S.FLAGS] & E.F.DONE); }
  function isCustoms(g, st) { return g.cfg.tiles[st[S.POS]] === "S"; }

  function spacePrompt(g, st) {
    const tile = g.cfg.tiles[st[S.POS]];
    const sp = SPACES[tile];
    const tokens = human.tokens(g);
    if (done(st)) return `<p><b>Your free action is used.</b> End your turn when you are ready.</p>`;
    let extra = "";
    const free = tokens.find((t) => t.via === "free");
    const pend = tokens.find((t) => t.via === "pend");
    if (tile !== "S") {
      const name = sp.name;
      const label = sp.options[0].kind === "buy" ? "Open Bazaar" : sp.options[0].kind === "trash" ? "Choose cards to trash" : sp.text;
      const buttons = [];
      if (pend) buttons.push(`<button class="signal" id="use-pend" data-act="use-token" data-via="pend">Foreman's second action: ${esc(label)}</button>`);
      if (free) buttons.push(`<button class="signal" id="use-free" data-act="use-token" data-via="free">Free action: ${esc(label)} (ends turn)</button>`);
      extra = buttons.length ? `<div class="row">${buttons.join("")}</div>` : "";
      if (human.freeBuyOpen(g)) extra += `<p class="small">Buy one card or perk below for free. You stay on this space.</p>`;
      return `<p><b>${name}:</b> ${esc(sp.text)}.</p>${extra}`;
    }
    return `<p><b>Customs:</b> no action here. Play a movement card to set off.</p>`;
  }

  function turnTitle(p) { return p.name.toLowerCase() === "you" ? "Your turn" : `${p.name}'s turn`; }

  function buyMode(g) { return ui.token && ui.token.mode === "buy"; }
  function remodelTarget() { return ui.token && ui.token.mode === "remodel" && ui.token.pick !== undefined ? human.remodelCap(ui.token.pick) : null; }

  function marketPanel(g, st) {
    const buying = buyMode(g);
    const freeBuy = !buying && human.freeBuyOpen(g);
    const funds = fundsOf(st).total;
    const cards = g.market.face.map((c, i) => {
      const k = CARDS[c];
      const bought = st[S.BOUGHT].includes(i);
      const cap = remodelTarget();
      if (cap !== null) {
        const fits = !bought && k.cost <= cap;
        return `<button class="card ${cardClass(c)}" id="market${i}" data-act="${fits ? "remodel-card" : ""}" data-slot="${i}" ${fits ? "" : "disabled"}>
        <span class="row between"><span class="cname">${k.name}</span><span class="price num">${k.cost}</span></span>
        <span class="ctext">${esc(k.text)}</span>
        <span class="cnote">${bought ? "Bought" : fits ? "Take for free" : `Costs more than ${cap}`}</span></button>`;
      }
      const can = (buying || freeBuy) && !bought && funds >= k.cost;
      return `<button class="card ${cardClass(c)}" id="market${i}" data-act="${can ? "buy-card" : ""}" data-slot="${i}" ${can ? "" : "disabled"}>
        <span class="row between"><span class="cname">${k.name}</span><span class="price num">${k.cost}</span></span>
        <span class="ctext">${esc(k.text)}</span>
        <span class="cnote">${bought ? "Bought" : (buying || freeBuy) ? (funds >= k.cost ? "Buy" : `Need ${k.cost - funds} more`) : ""}</span></button>`;
    }).join("");
    const left = g.market.pile.length;
    return `<div class="col sect-market" style="gap:8px">
      <div class="row between"><h3>Market</h3><span class="small muted num">${left} cards in the pile</span></div>
      <div class="market">${cards}</div></div>`;
  }

  function perkPanel(g, st, p) {
    const buying = buyMode(g);
    const freeBuy = !buying && human.freeBuyOpen(g);
    const funds = fundsOf(st).total;
    const now = g.turn ? human.payNow(g) : null;
    const rows = p.plan.map((perk) => {
      const owned = p.perks.includes(perk) || st[S.NEW].includes(perk);
      const can = (buying || freeBuy) && !owned && funds >= E.PERK_COST && p.perks.length + st[S.NEW].length < g.cfg.slots;
      const part = now && now.parts.find((x) => x[0] === perk);
      const right = owned
        ? `<span class="small num">${part ? `Now: ${part[1]} VP` : ""}</span>`
        : `<button class="${can ? "signal" : ""}" data-act="buy-perk" data-perk="${perk}" ${can ? "" : "disabled"}>Buy for ${E.PERK_COST}</button>`;
      return `<div class="perk ${owned ? "owned" : ""}"><span><strong>${PERKS[perk].name}</strong><br><span class="small">${esc(perkText(g, perk))}</span></span>${right}</div>`;
    }).join("");
    return `<div class="col sect-perks" style="gap:8px"><h3>Your perks</h3><div class="perks">${rows}</div></div>`;
  }

  function deckPanel(p, st) {
    const count = (list) => {
      const m = {};
      list.forEach((c) => { m[c] = (m[c] || 0) + 1; });
      return Object.entries(m).sort((a, b) => a[0] - b[0]).map(([c, n]) => `<div>${n} × ${CARDS[c].name}</div>`).join("") || `<div class="muted">Empty</div>`;
    };
    const owned = [];
    Object.entries(p.have).forEach(([c, n]) => { for (let i = 0; i < n; i++) owned.push(Number(c)); });
    return `<details class="fold sect-deck"><summary>Your deck: ${p.owned} cards, ${p.deck.length} left to draw</summary>
      <div class="row" style="align-items:flex-start;gap:24px">
        <div><b>All cards</b><div class="small">${count(owned)}</div></div>
        <div><b>Discard pile</b><div class="small">${count(p.discard)}</div></div>
      </div></details>`;
  }

  function renderPlay() {
    const g = ui.g;
    const p = g.players[g.current];
    const isHuman = p.kind === "human" && g.turn;
    const st = isHuman ? g.turn.state : null;
    const shown = isHuman ? st[S.POS] : undefined;
    if (isHuman) ui.pawn[p.seat] = st[S.POS];
    const dialHtml = dial(g, {
      here: shown,
      centerTop: `${esc(p.name)}`,
      centerMain: `${isHuman ? st[S.POS] === 0 ? g.cfg.tiles.length : g.cfg.tiles.length - st[S.POS] : p.vp}`,
      centerSub: isHuman ? "spaces to line" : "VP",
    });
    let desk;
    if (isHuman) {
      const f = fundsOf(st);
      const left = st[S.H];
      const trashMode = ui.token && ui.token.mode === "trash";
      const buying = buyMode(g);
      const cancel = `<button id="cancel" data-act="cancel-token">Cancel</button>`;
      let specialBanner = "";
      if (ui.token && ui.token.mode === "joker") {
        specialBanner = `<div class="row"><b>Joker:</b><button class="signal" id="joker-coin" data-act="joker" data-which="0">+1 coin</button><button class="signal" id="joker-move" data-act="joker" data-which="1">Move 1</button>${cancel}</div>`;
      } else if (ui.token && ui.token.mode === "salvage") {
        specialBanner = `<div class="row"><b>Choose a card to sell.</b>${cancel}</div>`;
      } else if (ui.token && ui.token.mode === "remodel") {
        specialBanner = ui.token.pick === undefined
          ? `<div class="row"><b>Choose a card to trade in.</b>${cancel}</div>`
          : `<div class="row"><b>Choose a market card costing up to ${human.remodelCap(ui.token.pick)}.</b>${cancel}</div>`;
      }
      const crossed = st[S.CROSSED] ? `<span class="stat"><b class="num">+${st[S.PAY]}</b>VP this turn</span>` : "";
      const banner = trashMode
        ? `<div class="row"><b>Choose up to 2 cards to trash.</b><button class="signal" id="confirm-trash" data-act="confirm-trash" ${ui.trashPick.length ? "" : "disabled"}>Trash ${ui.trashPick.length || ""}</button><button id="cancel" data-act="cancel-token">Cancel</button></div>`
        : specialBanner || (buying ? `<div class="row"><b>Choose a card or perk to buy.</b>${cancel}</div>` : spacePrompt(g, st));
      const hand = left.length
        ? left.map((c, i) => cardButton(g, c, i, st)).join("")
        : `<p class="muted">Your hand is empty.</p>`;
      desk = `<section class="prompt mine">
          <div class="row between"><h2>${esc(turnTitle(p))}</h2>
            <div class="row"><button id="undo" data-act="undo" ${g.turn.history.length ? "" : "disabled"}>Undo</button>
            <button class="primary" id="end-turn" data-act="end-turn" ${ui.token ? "disabled" : ""}>End turn</button></div></div>
          <div class="stats num">
            <span class="stat"><b>${f.total}</b>to spend</span>
            <span class="stat small muted">${f.banked} banked, ${f.hand} in hand, ${f.iron} iron</span>
            ${crossed}
          </div>
          ${banner}
          ${ui.message ? `<p class="toast">${esc(ui.message)}</p>` : ""}
        </section>
        <div class="hand">${hand}</div>
        ${marketPanel(g, st)}
        ${perkPanel(g, st, p)}
        ${deckPanel(p, st)}`;
    } else {
      desk = `<section class="prompt"><h2>${esc(p.name)} is playing</h2><p class="muted">${KIND_LABEL[p.kind] || ""} taking its turn.</p></section>
        ${marketPanelStatic(g)}`;
    }
    root.innerHTML = `${topbar(g)}
      <div class="game">
        <div class="col">${dialHtml}${scoreboard(g)}</div>
        <div class="col">${desk}${logPanel(g)}${rulesPanel(g)}</div>
      </div>`;
  }

  function marketPanelStatic(g) {
    const cards = g.market.face.map((c) => {
      const k = CARDS[c];
      return `<div class="card ${cardClass(c)}"><span class="row between"><span class="cname">${k.name}</span><span class="price num">${k.cost}</span></span><span class="ctext">${esc(k.text)}</span></div>`;
    }).join("");
    return `<div class="col sect-market" style="gap:8px"><h3>Market</h3><div class="market">${cards}</div></div>`;
  }

  function renderCurtain() {
    const g = ui.g;
    const p = g.players[ui.curtain.seat];
    root.innerHTML = `${topbar(g)}<div class="curtain">
      <p class="muted">Keep your hand private</p>
      <h1>Pass to ${esc(p.name)}</h1>
      <button class="signal" id="ready" data-act="curtain-ready">I'm ${esc(p.name)}, show my ${ui.curtain.then === "perks" ? "perks" : "hand"}</button>
      ${g.log.length ? `<div class="log" style="max-width:520px;text-align:left">${g.log.slice(-g.players.length).reverse().map((s) => `<p>${esc(describe(g, s))}</p>`).join("")}</div>` : ""}
    </div>`;
  }

  function renderOver() {
    const g = ui.g;
    const rows = E.standings(g);
    const winners = rows.filter((r) => r.place === 1).map((r) => r.name);
    const body = rows.map((r) => {
      const p = g.players[r.seat];
      const avg = p.stats.crossings ? (p.stats.pay / p.stats.crossings).toFixed(1) : "0";
      return `<tr><td>${r.place}</td><td>${esc(r.name)}</td><td>${r.vp}</td><td>${p.stats.crossings}</td><td>${avg}</td><td>${p.owned}</td><td>${p.plan.map((x) => PERKS[x].name + (p.perks.includes(x) ? "" : " (not bought)")).join(", ")}</td></tr>`;
    }).join("");
    root.innerHTML = `${topbar(g)}<div class="col">
      <div class="curtain" style="min-height:0;padding-block:16px"><p class="muted">Round ${g.round}</p><h1>${esc(winners.join(" and "))} ${winners.length > 1 || winners[0].toLowerCase() === "you" ? "win" : "wins"}</h1></div>
      <div class="table-wrap"><table class="result-table"><thead><tr><th>Place</th><th>Player</th><th>VP</th><th>Crossings</th><th>VP per crossing</th><th>Deck</th><th>Perks</th></tr></thead><tbody>${body}</tbody></table></div>
      <div class="row"><button class="primary" id="again" data-act="again">Play again</button></div>
      ${logPanel(g)}
    </div>`;
  }

  function render() {
    if (ui.screen === "setup") return renderSetup();
    if (ui.curtain) return renderCurtain();
    if (ui.screen === "perks") return renderPerks();
    if (ui.screen === "over") return renderOver();
    return renderPlay();
  }

  // ------------------------------------------------------------ actions
  function afterHumanMove() {
    ui.token = null;
    ui.trashPick = [];
    ui.message = "";
    saveGame();
    render();
  }

  function useToken(token) {
    const g = ui.g;
    const st = g.turn.state;
    const at = token.via === "agent" ? (st[S.POS] + 1) % g.cfg.tiles.length : st[S.POS];
    const opt = SPACES[g.cfg.tiles[at]].options[0];
    if (!opt) return;
    if (opt.kind === "buy") { ui.token = Object.assign({ mode: "buy" }, token); render(); return; }
    if (opt.kind === "trash") {
      ui.token = Object.assign({ mode: "trash" }, token);
      ui.trashPick = [];
      render();
      return;
    }
    if (human.simple(g, token)) afterHumanMove();
  }

  function activeToken() {
    return ui.token && ui.token.via ? ui.token : { via: "freebuy" };
  }

  const ACTIONS = {
    resume() {
      const saved = fetchStored(SAVE_KEY);
      if (!saved) { render(); return; }
      ui.g = E.revive(saved.g);
      ui.pawn = ui.g.players.map((p) => p.pos);
      ui.curtain = saved.curtain || null;
      ui.pickSeat = saved.pickSeat;
      ui.picks = [];
      ui.token = null;
      ui.trashPick = [];
      ui.screen = saved.screen || "play";
      if (ui.screen === "perks") { render(); return; }
      if (ui.curtain) { render(); return; }
      advance();
    },
    start() { startGame(); },
    again() { ui.screen = "setup"; ui.g = null; ui.pawn = []; render(); },
    quit() { ui.runId++; ui.g = null; ui.curtain = null; ui.pawn = []; ui.screen = "setup"; clearStored(SAVE_KEY); render(); },
    speed(el) { ui.speed = el.dataset.speed; render(); },
    "add-seat"() {
      const n = ui.setup.seats.length;
      if (n < 4) ui.setup.seats.push({ name: ["You", "Ada", "Bram", "Cleo"][n], kind: "std" });
      render();
    },
    "drop-seat"() { if (ui.setup.seats.length > 2) ui.setup.seats.pop(); render(); },
    "pick-perk"(el) {
      const perk = el.dataset.perk;
      const k = ui.g.cfg.slots;
      if (ui.picks.includes(perk)) ui.picks = ui.picks.filter((x) => x !== perk);
      else {
        ui.picks.push(perk);
        if (ui.picks.length > k) ui.picks.shift();
      }
      render();
    },
    "confirm-perks"() {
      E.setPlan(ui.g, ui.pickSeat, ui.picks);
      ui.picks = [];
      nextPerkPick();
    },
    "curtain-ready"() {
      const then = ui.curtain.then;
      ui.curtain = null;
      if (then === "perks") { render(); return; }
      beginHuman();
      render();
    },
    "play-move"(el) { if (human.move(ui.g, Number(el.dataset.card))) afterHumanMove(); },
    "play-coin"(el) { if (human.coin(ui.g, Number(el.dataset.card))) afterHumanMove(); },
    "use-card"(el) { useToken({ via: "card", card: Number(el.dataset.card) }); },
    "use-token"(el) { useToken({ via: el.dataset.via }); },
    "play-special"(el) {
      const c = Number(el.dataset.card);
      const spec = CARDS[c].spec;
      if (spec === "agent") { useToken({ via: "agent", card: c }); return; }
      if (spec === "joker" || spec === "salvage" || spec === "remodel") { ui.token = { mode: spec, card: c }; render(); return; }
      if (human.special(ui.g, c)) afterHumanMove();
    },
    joker(el) { if (human.special(ui.g, ui.token.card, Number(el.dataset.which))) afterHumanMove(); },
    "special-pick"(el) {
      const x = Number(el.dataset.card);
      if (ui.token.mode === "salvage") { if (human.salvage(ui.g, ui.token.card, x)) afterHumanMove(); return; }
      ui.token.pick = x;
      render();
    },
    "remodel-card"(el) { if (human.remodel(ui.g, ui.token.card, ui.token.pick, Number(el.dataset.slot))) afterHumanMove(); },
    "cancel-token"() { ui.token = null; ui.trashPick = []; ui.message = ""; render(); },
    "trash-card"(el) {
      const i = Number(el.dataset.index);
      if (ui.trashPick.includes(i)) ui.trashPick = ui.trashPick.filter((x) => x !== i);
      else if (ui.trashPick.length < 2) ui.trashPick.push(i);
      render();
    },
    "confirm-trash"() {
      const g = ui.g;
      const left = g.turn.state[S.H];
      const cards = ui.trashPick.map((i) => left[i]);
      if (human.trash(g, ui.token, cards)) afterHumanMove();
    },
    "buy-card"(el) { if (human.buyCard(ui.g, activeToken(), Number(el.dataset.slot))) afterHumanMove(); },
    "buy-perk"(el) { if (human.buyPerk(ui.g, activeToken(), el.dataset.perk)) afterHumanMove(); },
    undo() { if (human.undo(ui.g)) afterHumanMove(); },
    "end-turn"() {
      const g = ui.g;
      const p = g.players[g.current];
      human.end(g);
      ui.pawn[p.seat] = p.pos;
      ui.token = null;
      saveGame();
      advance();
    },
  };

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || el.disabled || !el.dataset.act) return;
    const fn = ACTIONS[el.dataset.act];
    if (fn) fn(el);
  });
  root.addEventListener("change", (e) => {
    const el = e.target;
    if (el.name === "version") { ui.setup.version = el.value; render(); }
    if (el.dataset.seatKind !== undefined) { ui.setup.seats[Number(el.dataset.seatKind)].kind = el.value; render(); }
  });
  root.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.seatName !== undefined) ui.setup.seats[Number(el.dataset.seatName)].name = el.value;
  });

  // ------------------------------------------------------------ start
  function start(hotData) {
    const remembered = fetchStored(SETUP_KEY);
    if (remembered && remembered.seats && VERSIONS.some((v) => v.id === remembered.version)) ui.setup = remembered;
    if (hotData && hotData.save) {
      store(SAVE_KEY, hotData.save);
      ACTIONS.resume();
      return;
    }
    render();
  }
  if (window.claude && window.claude.hot) {
    window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ save: ui.g && !ui.g.over ? { g: ui.g, curtain: ui.curtain, pickSeat: ui.pickSeat, screen: ui.screen } : null }));
    if (window.claude.hot.ready) window.claude.hot.ready(start);
    else start(window.claude.hot.data || {});
  } else {
    start({});
  }
  window.__ke = ui; // handy for debugging in the console
})();
