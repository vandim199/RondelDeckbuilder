/* Kinetic Engine rules and bots. No DOM here, so the same file runs in the browser and in Node tests.
   A port of sim/lab.py: the bots use the same search, evaluation and tuned weights. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.KineticEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const BASE_LAP = 2, PERK_COST = 6, COIN_CAP = 4, FOUNDRY_KEEP = 2, HAND = 5, TARGET_ROUNDS = 17, IRON_VALUE = 2;

  // ------------------------------------------------------------ cards
  const CARDS = [
    { name: "Scout", mv: 1, coin: 0, act: 0, draw: 0, cost: 0, copies: 0, cat: "mv1", val: 1, text: "Move 1" },
    { name: "Pony", mv: 2, coin: 0, act: 0, draw: 0, cost: 0, copies: 0, cat: "mv2", val: 2, text: "Move 2" },
    { name: "Coin", mv: 0, coin: 1, act: 0, draw: 0, cost: 0, copies: 0, cat: "coin", val: 1, text: "+1 coin" },
    { name: "Contract", mv: 0, coin: 0, act: 1, draw: 0, cost: 3, copies: 4, cat: "act", val: 2.5, text: "Use this space, then move 1" },
    { name: "Courier", mv: 2, coin: 0, act: 0, draw: 0, cost: 3, copies: 6, cat: "mv2", val: 3, text: "Move 2" },
    { name: "Express", mv: 3, coin: 0, act: 0, draw: 0, cost: 5, copies: 4, cat: "mv3", val: 4, text: "Move 3" },
    { name: "Slipstream", mv: 2, coin: 0, act: 0, draw: 1, cost: 6, copies: 3, cat: "draw", val: 3.5, text: "Draw 1 when drawn. Move 2" },
    { name: "Merchant", mv: 0, coin: 2, act: 0, draw: 0, cost: 3, copies: 3, cat: "coin", val: 2.5, text: "+2 coins" },
    { name: "Foreman", mv: 0, coin: 0, act: 2, draw: 0, cost: 6, copies: 3, cat: "act", val: 2, text: "Use a space, move 1, use a space, move 1" },
    { name: "Ledger", mv: 0, coin: 0, act: 0, draw: 2, cost: 4, copies: 3, cat: "draw", val: 2.5, text: "Draw 2 when drawn" },
    { name: "Layover", mv: 0, coin: 0, act: 1, draw: 0, cost: 0, copies: 0, cat: "act", val: 2.5, stay: true, text: "Use this space" },
    // unique cards
    { name: "Relay", mv: 1, coin: 0, act: 0, draw: 1, cost: 3, copies: 2, uniq: true, cat: "draw", val: 3, text: "Draw 1 when drawn. Move 1" },
    { name: "Mentor", mv: 0, coin: 0, act: 1, draw: 1, cost: 5, copies: 2, uniq: true, cat: "act", val: 3.5, text: "Draw 1 when drawn. Use this space, then move 1" },
    { name: "Momentum", mv: 0, coin: 0, act: 0, draw: 0, cost: 4, copies: 2, uniq: true, spec: "momentum", cat: "mv2", val: 3, text: "Move 1, plus 1 per movement card already played this turn" },
    { name: "Shortcut", mv: 0, coin: 0, act: 0, draw: 0, cost: 4, copies: 2, uniq: true, spec: "shortcut", cat: "mv2", val: 2.5, text: "Move to the next Bazaar" },
    { name: "Beeline", mv: 0, coin: 0, act: 0, draw: 0, cost: 5, copies: 2, uniq: true, spec: "beeline", cat: "mv3", val: 3.5, text: "Move to Start, if it is within 4 spaces" },
    { name: "Smuggler", mv: 0, coin: 0, act: 0, draw: 0, cost: 3, copies: 2, uniq: true, spec: "smuggler", cat: "cargo", val: 2, text: "+1 coin. Customs leaves your money alone this turn" },
    { name: "Salvage", mv: 0, coin: 0, act: 0, draw: 0, cost: 3, copies: 2, uniq: true, spec: "salvage", cat: "trash", val: 2.5, text: "Trash a card from your hand for its cost + 1 in coins" },
    { name: "Remodel", mv: 0, coin: 0, act: 0, draw: 0, cost: 4, copies: 2, uniq: true, spec: "remodel", cat: "trash", val: 3, text: "Trash a card from your hand and take a market card costing up to 3 more" },
    { name: "Prospector", mv: 0, coin: 0, act: 0, draw: 0, cost: 4, copies: 2, uniq: true, spec: "prospector", cat: "act", val: 3, text: "Gain 2 iron" },
    { name: "Tithe", mv: 0, coin: 0, act: 0, draw: 0, cost: 3, copies: 2, uniq: true, spec: "tithe", cat: "coin", val: 2, text: "+1 coin, plus 1 per player ahead of you" },
    { name: "Victory Lap", mv: 0, coin: 0, act: 0, draw: 0, cost: 4, copies: 2, uniq: true, spec: "lap", cat: "vp", val: 3, text: "+9 VP if you crossed this turn" },
    { name: "Agent", mv: 0, coin: 0, act: 0, draw: 0, cost: 4, copies: 2, uniq: true, spec: "agent", cat: "act", val: 3, text: "Use the next space ahead, without moving" },
    { name: "Gold Bar", mv: 0, coin: 0, act: 0, draw: 0, cost: 3, copies: 2, uniq: true, spec: "gold", cat: "coin", val: 2.5, text: "+3 coins, then trash this card" },
    { name: "Ambush", mv: 0, coin: 0, act: 0, draw: 0, cost: 4, copies: 2, uniq: true, spec: "ambush", cat: "coin", val: 2.5, text: "+1 coin. Each opponent draws 1 fewer card next turn" },
    { name: "Joker", mv: 0, coin: 0, act: 0, draw: 0, cost: 2, copies: 2, uniq: true, spec: "joker", cat: "mv1", val: 2, text: "+1 coin or move 1" },
    { name: "Bookmark", mv: 0, coin: 0, act: 0, draw: 0, cost: 3, copies: 2, uniq: true, spec: "bookmark", cat: "draw", val: 2.5, text: "When drawn, set this aside and draw 1 extra card next turn" },
  ];
  const ID = {};
  CARDS.forEach((c, i) => { ID[c.name] = i; });

  // ------------------------------------------------------------ perks
  const PERKS = {
    moves: { name: "Caravan", text: (v) => `${fmt(v)} VP per movement card played this turn` },
    last: { name: "Hammer", text: (v) => `${fmt(v)} VP x the value of your last movement card` },
    iron: { name: "Foundry", text: (v) => `${fmt(v)} VP per iron you hold. You keep up to ${FOUNDRY_KEEP} iron at Customs` },
    exact: { name: "Bullseye", text: (v) => `${fmt(v)} VP if you land exactly on Start` },
    thin: { name: "Lean Deck", text: (v) => `${fmt(v)} VP per card below 12 in your deck` },
    acts: { name: "Workshop", text: (v) => `${fmt(v)} VP per space action used this turn` },
    purge: { name: "Purist", text: (v) => `${fmt(v)} VP per card you have trashed this game` },
    bulk: { name: "Warehouse", text: (v) => `${fmt(v)} VP per 2 cards in your deck` },
    dist: { name: "Distance", text: (v) => `${fmt(v)} VP per space moved this turn` },
    kinds: { name: "Variety", text: (v) => `${fmt(v)} VP per different card played this turn` },
    allin: { name: "All In", text: (v) => `${fmt(v)} VP if your hand is empty` },
    reserve: { name: "Reserve", text: (v) => `${fmt(v)} VP per card still in your hand` },
    underdog: { name: "Underdog", text: (v) => `${fmt(v)} VP per player ahead of you` },
    passer: { name: "Overtaker", text: (v) => `${fmt(v)} VP per pawn you passed this turn` },
    longhaul: { name: "Long Haul", text: (v) => `${fmt(v)} VP per turn since your last crossing` },
    streak: { name: "Streak", text: (v) => `${fmt(v)} VP if you also crossed on your previous turn` },
    coinplay: { name: "Tycoon", text: (v) => `${fmt(v)} VP per coin from cards played this turn` },
    patron1: { name: "Patron", text: (v) => `${fmt(v)} VP if you bought a card since your last crossing` },
  };
  function fmt(v) { return Number.isInteger(v) ? String(v) : String(v).replace(".5", "½").replace(/^0½/, "½"); }

  const STYLE_DEFAULT = { w_move: 0.5, w_fund: 0.3, target: 8, thin_to: 8, max_deck: 13, max_wait: 2, min_moves: 3, min_coins: 2,
    w_line: 1, w_bazaar: 2, w_mine: 0.5, miner: false, w_ref: 0.8, t_scout: 0.5, t_pony: 0, t_coin: 0.3, perk_value: 15, diverse: false, cats: {} };
  const STYLES = {
    moves: { cats: { mv1: 1.4, mv3: 0.6, draw: 2, act: 0.7 }, t_scout: 0, t_coin: 1, max_deck: 14 },
    last: { cats: { mv3: 2.2, mv2: 1.2, draw: 1.2, act: 0.6, coin: 0.8 }, t_scout: 2, t_coin: 0.5, thin_to: 7 },
    iron: { cats: { act: 2.2, coin: 1.5, mv3: 0.4, mv2: 0.7 }, miner: true, w_mine: 2, w_fund: 0.4, thin_to: 10, max_deck: 14, t_coin: 0, t_scout: 0 },
    exact: { cats: { mv1: 1.3, mv2: 1.2, draw: 1.6 }, w_line: 0.5, t_coin: 1, t_scout: 0 },
    thin: { cats: { draw: 0.5, mv3: 1.6, coin: 0.8, act: 0.7 }, thin_to: 4, max_deck: 8, t_scout: 2, t_coin: 1.5, min_moves: 2, min_coins: 0, w_ref: 2.5 },
    acts: { cats: { act: 3, mv2: 0.8, draw: 1.2 }, w_mine: 1, t_coin: 0.5 },
    purge: { cats: { trash: 3, coin: 0.9, mv3: 1.2 }, thin_to: 4, max_deck: 12, t_scout: 3, t_coin: 3, t_pony: 1, w_ref: 3, min_moves: 2, min_coins: 0 },
    bulk: { cats: { coin: 1.3, mv2: 1.2, mv3: 1.2, act: 1.2, draw: 1.2, mv1: 1.3 }, max_deck: 30, thin_to: 99, t_scout: 0, t_coin: 0, w_bazaar: 3, w_fund: 0.5 },
    dist: { cats: { mv3: 2.2, mv2: 1.6, draw: 1.3, act: 0.5, coin: 0.7 }, w_move: 1.5, t_scout: 1 },
    kinds: { diverse: true, max_deck: 14, t_scout: 0, t_coin: 0 },
    allin: { cats: { draw: 0.4 }, t_scout: 0 },
    reserve: { cats: { draw: 2.5, mv3: 1.3, act: 0.7 }, thin_to: 9, t_scout: 0, t_coin: 0 },
    underdog: {},
    passer: { cats: { mv3: 1.5, mv2: 1.2 }, w_move: 1 },
    longhaul: { cats: { act: 1.5, coin: 1.4 }, w_line: 0.3, w_mine: 1.2, w_fund: 0.5, max_wait: 4 },
    streak: { cats: { mv3: 1.6, mv2: 1.3, draw: 1.4 }, w_move: 1, t_scout: 1 },
    coinplay: { cats: { coin: 2.5, draw: 1.3, act: 0.7, mv3: 0.8 }, t_coin: 0 },
    patron1: { cats: { coin: 1.8, act: 1.2, mv3: 0.8 }, w_bazaar: 3, w_fund: 0.5, max_deck: 20, t_scout: 0, t_coin: 0, thin_to: 99 },
  };
  // the baseline-only tuning pass from sim/results/lab_tuned.json
  const TUNE = { w_fund: 0.5, w_mine: 1.8, w_ref: 0.4, trash: 1.8, val_move: 1.5, val_act: 1.5 };

  function makeStyle(plan) {
    const s = Object.assign({}, STYLE_DEFAULT);
    const cats = {};
    plan.forEach((perk, i) => {
      const t = STYLES[perk];
      if (i === 0) Object.assign(s, t);
      Object.entries(t.cats || {}).forEach(([k, v]) => { cats[k] = (cats[k] || 1) * v; });
    });
    s.w_fund *= TUNE.w_fund; s.w_mine *= TUNE.w_mine; s.w_ref *= TUNE.w_ref;
    s.t_scout *= TUNE.trash; s.t_pony *= TUNE.trash; s.t_coin *= TUNE.trash;
    ["mv1", "mv2", "mv3"].forEach((k) => { cats[k] = (cats[k] || 1) * TUNE.val_move; });
    cats.act = (cats.act || 1) * TUNE.val_act;
    s.cats = cats;
    return s;
  }

  // ------------------------------------------------------------ versions and board
  const SPACES = {
    S: { name: "Customs", text: `Start line. Crossing scores VP, then Customs sells your iron for ${IRON_VALUE} coins each and discards coins down to ${COIN_CAP}`, options: [] },
    V: { name: "Tailwind", text: "Move 2", options: [{ kind: "move", n: 2 }] },
    M: { name: "Mine", text: "Gain 2 iron", options: [{ kind: "iron", n: 2 }] },
    R: { name: "Refinery", text: "Trash up to 2 cards from hand", options: [{ kind: "trash", n: 2 }] },
    B: { name: "Bazaar", text: "Buy a card or a perk", options: [{ kind: "buy" }] },
    C: { name: "Exchange", text: "Gain 2 coins", options: [{ kind: "coin", n: 2 }] },
  };
  const CASUAL_SIGMA = 1, CASUAL_LINES = 40;
  const F_FREE = 1, F_DONE = 2, F_SMUGGLE = 4, F_AMBUSH = 8;
  const LAP_VP = 9, MIN_HAND = 3, BEELINE_RANGE = 4, REMODEL_UP = 3, PROSPECT_IRON = 2, GOLD_COINS = 3;

  // state fields (a plain array, so copying and de-duplicating during search stays cheap)
  const POS = 0, H = 1, PEND = 2, COINS = 3, IRON = 4, MOVED = 5, CROSSED = 6, PAY = 7, BOUGHT = 8, TRASHED = 9, PLAYED = 10,
    LAST = 11, ACTS = 12, LOST = 13, NEW = 14, KINDS = 15, FLAGS = 16, PASSED = 17, MINES = 18, HCOIN = 19, BOUGHT_AT_CROSS = 20, BONUS = 21, GAINED = 22;

  // ------------------------------------------------------------ random numbers
  function nextRand(o, key) {
    o[key] = (o[key] + 0x6d2b79f5) | 0;
    let t = o[key];
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(a, o, key) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand(o, key) * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function gauss(o, key) {
    const u = Math.max(nextRand(o, key), 1e-9), v = nextRand(o, key);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ------------------------------------------------------------ setup
  function buildBoard(cfg) {
    const tiles = cfg.tiles, n = tiles.length;
    const dist = [];
    for (let s = 0; s < n; s++) {
      const d = {};
      for (let step = 0; step < n; step++) {
        const t = tiles[(s + step) % n];
        if (d[t] === undefined) d[t] = step;
      }
      d.L = n - s;
      dist.push(d);
    }
    return { tiles, n, dist };
  }

  /* seats: [{name, kind: human|casual|std|expert}]. Each seat is offered 3 perks and keeps cfg.slots. */
  function newGame(cfg, seats, seed, options) {
    options = options || {};
    const g = { cfg, seed: seed | 0, round: 1, current: 0, rngS: (seed | 0) * 7 + 1, firstTaken: false, buysThisRound: [], over: false,
      players: [], market: { face: [], pile: [] }, log: [], turn: null, winners: null, phase: "perks" };
    const pile = [];
    CARDS.forEach((c, i) => { if (!c.uniq || cfg.uniq) for (let k = 0; k < c.copies; k++) pile.push(i); });
    shuffle(pile, g, "rngS");
    g.market.face = pile.splice(0, 3);
    g.market.pile = pile;
    const pool = shuffle(cfg.pool.slice(), g, "rngS");
    seats.forEach((seat, i) => {
      const deck = [ID.Scout, ID.Scout, ID.Scout, ID.Scout, ID.Pony, ID.Coin, ID.Coin, ID.Coin, ID.Coin, ID.Contract, ID.Layover];
      const p = { seat: i, name: seat.name, kind: seat.kind, rngS: (seed | 0) * 1000 + i, noiseS: (seed | 0) * 5000 + i + (options.noiseOffset || 0) * 977,
        offers: pool.slice(i * 3, (i + 1) * 3), plan: [], style: null, perks: [], pos: 0, deck, discard: [], vp: 0, coins: 0, iron: 0, owned: deck.length,
        movesOwned: 5, coinsOwned: 4, malus: 0, extraDraw: 0, trashedTotal: 0, buysSince: 0, turnsSince: 0, idle: 0, have: {}, jitter: [],
        stats: { turns: 0, crossings: 0, pay: 0, dead: 0, stay: 0, moved: 0, options: 0, goal: 0, bought: 0, trashed: 0 } };
      deck.forEach((c) => { p.have[c] = (p.have[c] || 0) + 1; });
      shuffle(p.deck, p, "rngS");
      const sigma = { std: 0.15, casual: 0.3, expert: 0, human: 0 }[seat.kind];
      for (let c = 0; c < CARDS.length; c++) {
        p.jitter.push(sigma ? Math.exp(sigma * gauss(p, "noiseS")) : 1);
      }
      g.players.push(p);
    });
    if (options.plans) options.plans.forEach((plan, i) => setPlan(g, i, plan));
    else g.players.forEach((p) => { if (p.kind !== "human") setPlan(g, p.seat, botPickPerks(g, p)); });
    if (g.players.every((p) => p.plan.length)) g.phase = "play";
    return g;
  }

  function setPlan(g, seat, plan) {
    const p = g.players[seat];
    p.plan = plan.slice();
    p.style = makeStyle(p.plan);
    if (g.players.every((x) => x.plan.length)) g.phase = "play";
  }

  function botPickPerks(g, p) {
    const k = g.cfg.slots;
    if (p.kind === "expert" && g.cfg.perkPower) {
      return p.offers.slice().sort((a, b) => (g.cfg.perkPower[b] || 0) - (g.cfg.perkPower[a] || 0)).slice(0, k);
    }
    return shuffle(p.offers.slice(), p, "noiseS").slice(0, k);
  }

  function boardOf(g) {
    if (!g._board) Object.defineProperty(g, "_board", { value: buildBoard(g.cfg), enumerable: false, writable: true });
    return g._board;
  }

  // ------------------------------------------------------------ movement and scoring
  function occupancy(g, p) {
    const occ = {};
    g.players.forEach((o) => { if (o !== p && o.pos !== 0) occ[o.pos] = (occ[o.pos] || 0) + 1; });
    return occ;
  }

  /* Sells iron for coins, except any Foundry keeps, then discards coins down to the cap. Returns [coins, iron, coins lost]. */
  function customs(coins, iron, keepIron) {
    const kept = Math.min(iron, keepIron);
    const total = coins + (iron - kept) * IRON_VALUE;
    return [Math.min(total, COIN_CAP), kept, Math.max(0, total - COIN_CAP)];
  }
  function ironKept(p, st) { return p.perks.includes("iron") || st[NEW].includes("iron") ? FOUNDRY_KEEP : 0; }

  function popcount(x) { let n = 0; while (x) { x &= x - 1; n++; } return n; }

  function perkPay(g, p, perk, end, st) {
    const v = g.cfg.values[perk];
    const h = st[H];
    switch (perk) {
      case "moves": return v * st[PLAYED];
      case "last": return v * st[LAST];
      case "iron": return v * st[IRON];
      case "exact": return end === 0 ? v : 0;
      case "thin": return v * Math.max(0, 12 - (p.owned - st[TRASHED].length + st[BOUGHT].length));
      case "acts": return v * st[ACTS];
      case "purge": return v * (p.trashedTotal + st[TRASHED].length);
      case "bulk": return v * Math.floor((p.owned - st[TRASHED].length + st[BOUGHT].length) / 2);
      case "dist": return v * st[MOVED];
      case "kinds": return v * popcount(st[KINDS]);
      case "allin": return h.length === 0 ? v : 0;
      case "reserve": return v * h.length;
      case "underdog": return v * g.players.filter((o) => o.vp > p.vp).length;
      case "passer": return v * st[PASSED];
      case "longhaul": return v * (p.turnsSince + 1);
      case "streak": return p.turnsSince === 0 && g.round > 1 ? v : 0;
      case "coinplay": {
        let left = 0;
        h.forEach((c) => { left += CARDS[c].coin; });
        st[TRASHED].forEach((c) => { left += CARDS[c].coin; });
        return v * (st[HCOIN] - left + st[GAINED]);
      }
      case "patron1": return p.buysSince + st[BOUGHT].length > 0 ? v : 0;
      default: return 0;
    }
  }

  /* What crossing pays with these perks: base lap plus each perk, or only the best perk under best-perk-pays. */
  function payout(g, p, perks, end, st) {
    let total = g.cfg.baseLap === undefined ? BASE_LAP : g.cfg.baseLap, best = 0;
    const parts = [];
    perks.forEach((perk) => {
      const gain = Math.floor(perkPay(g, p, perk, end, st));
      parts.push([perk, gain]);
      if (g.cfg.payBest) best = Math.max(best, gain);
      else total += gain;
    });
    return { total: total + best, parts };
  }

  function advance(g, p, st, k, isCard, value, occ) {
    const n = g.cfg.tiles.length;
    let node = st[POS], cross = 0, passed = 0;
    for (let left = k; left > 0; left--) {
      node = (node + 1) % n;
      if (node === 0) cross++;
      else if (left > 1 && occ[node]) passed += occ[node];
    }
    const l = st.slice();
    l[MOVED] += k;
    if (isCard) { l[PLAYED] += 1; l[LAST] = value; }
    l[PASSED] += passed;
    if (cross) {
      if (!l[CROSSED]) {
        l[CROSSED] = true;
        l[PAY] = payout(g, p, p.perks.concat(l[NEW]), node, l).total;
        l[BOUGHT_AT_CROSS] = l[BOUGHT].length;
      }
      if (!(l[FLAGS] & F_SMUGGLE)) {
        const c = customs(l[COINS], l[IRON], ironKept(p, l));
        l[COINS] = c[0]; l[IRON] = c[1]; l[LOST] += c[2];
      }
    }
    l[POS] = node;
    return l;
  }

  // ------------------------------------------------------------ paying
  function payCoin(cost, h, coins, iron) {
    let need = cost;
    const h2 = h.slice();
    if (cost > 0) {
      for (const v of [2, 1]) {
        for (let i = h2.length - 1; i >= 0 && need > 0; i--) {
          if (CARDS[h2[i]].coin === v) { h2.splice(i, 1); need -= v; }
        }
      }
    }
    if (need > 0) { const u = Math.min(coins, need); coins -= u; need -= u; }
    while (need > 0 && iron > 0) { iron -= 1; need -= IRON_VALUE; }
    if (need > 0) return null;
    return [h2, coins, iron];
  }

  // ------------------------------------------------------------ bot values
  function cardValue(g, p, c) {
    const q = p.style;
    if (p.owned >= q.max_deck) return -1;
    if (p.perks.length < g.cfg.slots && g.round <= 6) return -1;
    const card = CARDS[c];
    const v = card.val * (q.cats[card.cat] !== undefined ? q.cats[card.cat] : 1) * p.jitter[c];
    if (v <= 0) return -1;
    const progress = Math.min(1, g.round / TARGET_ROUNDS);
    return v * (1 - 0.7 * progress) * Math.pow(q.diverse ? 0.4 : 0.8, p.have[c] || 0);
  }

  function trashValues(p) {
    const q = p.style;
    if (p.owned <= q.thin_to) return {};
    const out = {};
    out[ID.Scout] = q.t_scout; out[ID.Pony] = q.t_pony; out[ID.Coin] = q.t_coin;
    return out;
  }

  function makeCtx(g, p) {
    const slot = [], cost = [], shop = [];
    g.market.face.forEach((c, i) => {
      const v = cardValue(g, p, c);
      slot[i] = v; cost[i] = CARDS[c].cost;
      if (v > 0) shop.push(i);
    });
    return { slot, cost, shop, wanted: p.plan.filter((x) => !p.perks.includes(x)), trash: trashValues(p),
      trackPlayed: p.plan.includes("moves") || !!g.cfg.uniq, trackLast: p.plan.includes("last"), trackKinds: p.plan.includes("kinds"),
      occ: g._occ || occupancy(g, p) };
  }

  function trashPicks(g, p, h, trashed, ctx, n) {
    const q = p.style, tv = ctx.trash;
    let moves = p.movesOwned, coins = p.coinsOwned;
    trashed.forEach((c) => { if (CARDS[c].mv) moves--; if (CARDS[c].coin) coins--; });
    const picks = [];
    const sorted = h.slice().sort((a, b) => (tv[b] || 0) - (tv[a] || 0));
    for (const c of sorted) {
      if (picks.length === n) break;
      if ((tv[c] || 0) <= 0) continue;
      if (CARDS[c].mv && moves <= q.min_moves) continue;
      if (CARDS[c].coin && coins <= q.min_coins) continue;
      picks.push(c);
      if (CARDS[c].mv) moves--;
      if (CARDS[c].coin) coins--;
    }
    return picks;
  }

  // ------------------------------------------------------------ the shared moves
  function removeOne(h, c) { const i = h.indexOf(c); return h.slice(0, i).concat(h.slice(i + 1)); }

  function trackedCard(st, ctx, c, out) {
    if (ctx.trackKinds) out[KINDS] = st[KINDS] | (1 << c);
    return out;
  }

  function playMove(g, p, st, c, ctx) {
    const l = st.slice();
    l[H] = removeOne(st[H], c);
    trackedCard(st, ctx, c, l);
    const mv = CARDS[c].mv;
    const moved = advance(g, p, l, mv, true, mv, ctx.occ);
    if (!ctx.trackPlayed) moved[PLAYED] = st[PLAYED];
    if (!ctx.trackLast) moved[LAST] = st[LAST];
    return moved;
  }

  function playCoins(st, cards, ctx) {
    const l = st.slice();
    let h = st[H];
    cards.forEach((c) => { h = removeOne(h, c); l[COINS] += CARDS[c].coin; if (ctx.trackKinds) l[KINDS] |= 1 << c; });
    l[H] = h;
    return l;
  }

  function buyPerkState(g, p, st, perk) {
    if (p.perks.length + st[NEW].length >= g.cfg.slots || st[NEW].includes(perk)) return null;
    const paid = payCoin(PERK_COST, st[H], st[COINS], st[IRON]);
    if (!paid) return null;
    const l = st.slice();
    l[H] = paid[0]; l[COINS] = paid[1]; l[IRON] = paid[2];
    l[NEW] = st[NEW].concat([perk]);
    return l;
  }

  function buyCardState(g, st, slot) {
    if (st[BOUGHT].includes(slot) || g.market.face[slot] === undefined) return null;
    const paid = payCoin(CARDS[g.market.face[slot]].cost, st[H], st[COINS], st[IRON]);
    if (!paid) return null;
    const l = st.slice();
    l[H] = paid[0]; l[COINS] = paid[1]; l[IRON] = paid[2];
    l[BOUGHT] = st[BOUGHT].concat([slot]);
    return l;
  }

  function trashState(st, cards) {
    let h = st[H];
    cards.forEach((c) => { h = removeOne(h, c); });
    const l = st.slice();
    l[H] = h;
    l[TRASHED] = st[TRASHED].concat(cards);
    return l;
  }

  function buyOpts(g, p, st, ctx) {
    const out = [];
    const perk = ctx.wanted.find((x) => !st[NEW].includes(x));
    if (perk !== undefined) {
      const s = buyPerkState(g, p, st, perk);
      if (s) out.push(s);
    }
    g.market.face.forEach((c, i) => {
      if (st[BOUGHT].includes(i) || !(ctx.slot[i] > 0)) return;
      const s = buyCardState(g, st, i);
      if (s) out.push(s);
    });
    return out;
  }

  function localOpts(g, p, st, ctx, step, at) {
    const tile = g.cfg.tiles[at === undefined ? st[POS] : at];
    let out = [];
    for (const opt of SPACES[tile].options) {
      if (opt.kind === "iron") { const l = st.slice(); l[IRON] += opt.n; l[MINES] += 1; out.push(l); }
      else if (opt.kind === "coin") { const l = st.slice(); l[COINS] += opt.n; out.push(l); }
      else if (opt.kind === "move") out.push(advance(g, p, st, opt.n, false, 0, ctx.occ));
      else if (opt.kind === "trash") {
        const picks = trashPicks(g, p, st[H], st[TRASHED], ctx, opt.n);
        if (picks.length) out.push(trashState(st, picks));
      } else if (opt.kind === "buy") out = out.concat(buyOpts(g, p, st, ctx));
    }
    if (step) return out.map((s) => advance(g, p, s, 1, false, 0, ctx.occ));
    return out;
  }

  /* Salvage: the chosen card goes, and pays its cost + 1. */
  function salvageState(base, x) {
    const l = base.slice();
    l[H] = removeOne(base[H], x);
    l[TRASHED] = base[TRASHED].concat([x]);
    const gain = CARDS[x].cost + 1;
    l[COINS] += gain; l[GAINED] += gain;
    return l;
  }

  /* Remodel: the chosen card goes, and a market card costing up to 3 more arrives for free. */
  function remodelState(g, base, x, slot) {
    const y = g.market.face[slot];
    if (y === undefined || base[BOUGHT].includes(slot) || CARDS[y].cost > CARDS[x].cost + REMODEL_UP) return null;
    const l = base.slice();
    l[H] = removeOne(base[H], x);
    l[TRASHED] = base[TRASHED].concat([x]);
    l[BOUGHT] = base[BOUGHT].concat([slot]);
    return l;
  }

  function moved(g, p, st, base, k, ctx) {
    const l = advance(g, p, base, k, true, k, ctx.occ);
    if (!ctx.trackPlayed) l[PLAYED] = st[PLAYED];
    if (!ctx.trackLast) l[LAST] = st[LAST];
    return l;
  }

  /* Every way a unique card with its own effect can be played. Salvage and Remodel list only what a bot would pick. */
  function specialStates(g, p, st, c, ctx) {
    const base = st.slice();
    base[H] = removeOne(st[H], c);
    trackedCard(st, ctx, c, base);
    const d = boardOf(g).dist[st[POS]];
    switch (CARDS[c].spec) {
      case "momentum": return [moved(g, p, st, base, 1 + st[PLAYED], ctx)];
      case "shortcut": return d.B > 0 ? [moved(g, p, st, base, d.B, ctx)] : [];
      case "beeline": return d.L <= BEELINE_RANGE ? [moved(g, p, st, base, d.L, ctx)] : [];
      case "smuggler": base[COINS] += 1; base[GAINED] += 1; base[FLAGS] |= F_SMUGGLE; return [base];
      case "prospector": base[IRON] += PROSPECT_IRON; base[MINES] += 1; return [base];
      case "tithe": {
        const gain = 1 + g.players.filter((o) => o.vp > p.vp).length;
        base[COINS] += gain; base[GAINED] += gain;
        return [base];
      }
      case "lap": if (!st[CROSSED]) return []; base[BONUS] += LAP_VP; return [base];
      case "agent": base[ACTS] += 1; return localOpts(g, p, base, ctx, false, (st[POS] + 1) % g.cfg.tiles.length);
      case "gold": base[COINS] += GOLD_COINS; base[GAINED] += GOLD_COINS; base[TRASHED] = st[TRASHED].concat([c]); return [base];
      case "ambush": base[COINS] += 1; base[GAINED] += 1; base[FLAGS] |= F_AMBUSH; return [base];
      case "joker": {
        const coin = base.slice();
        coin[COINS] += 1; coin[GAINED] += 1;
        return [coin, moved(g, p, st, base, 1, ctx)];
      }
      case "salvage": {
        const out = [];
        new Set(base[H]).forEach((x) => { if (CARDS[x].cost > 0 || (ctx.trash[x] || 0) > 0) out.push(salvageState(base, x)); });
        return out;
      }
      case "remodel": {
        const out = [];
        new Set(base[H]).forEach((x) => {
          g.market.face.forEach((y, slot) => {
            if (!(ctx.slot[slot] > 0)) return;
            const s = remodelState(g, base, x, slot);
            if (s) out.push(s);
          });
        });
        return out;
      }
      default: return [];
    }
  }

  function expand(g, p, st, ctx) {
    if (st[FLAGS] & F_DONE) return [];
    let out = [];
    const h = st[H], tile = g.cfg.tiles[st[POS]];
    const seen = {};
    const actCards = [];
    for (const c of h) {
      if (seen[c]) continue;
      seen[c] = true;
      if (CARDS[c].mv > 0) out.push(playMove(g, p, st, c, ctx));
      if (CARDS[c].act > 0) actCards.push(c);
      if (CARDS[c].spec) out = out.concat(specialStates(g, p, st, c, ctx));
    }
    const bulk = h.filter((c) => CARDS[c].coin > 0);
    if (bulk.length) out.push(playCoins(st, bulk, ctx));
    if (SPACES[tile].options.length) {
      if (st[PEND] > 0) {
        const l = st.slice(); l[PEND] -= 1; l[ACTS] += 1;
        out = out.concat(localOpts(g, p, l, ctx, true));
      } else {
        for (const c of actCards) {
          const l = st.slice();
          l[H] = removeOne(h, c);
          l[PEND] = CARDS[c].act - 1;
          l[ACTS] += 1;
          trackedCard(st, ctx, c, l);
          out = out.concat(localOpts(g, p, l, ctx, !CARDS[c].stay));
        }
      }
    }
    if (!(st[FLAGS] & F_FREE)) {
      if (g.cfg.buyAny) {
        const l = st.slice(); l[FLAGS] |= F_FREE;
        out = out.concat(buyOpts(g, p, l, ctx));
      } else if (g.cfg.buyFree && tile === "B") {
        const l = st.slice(); l[FLAGS] |= F_FREE;
        out = out.concat(buyOpts(g, p, l, ctx));
      }
      if (g.cfg.freeAction && SPACES[tile].options.length) {
        const l = st.slice(); l[FLAGS] |= F_FREE | F_DONE;
        out = out.concat(localOpts(g, p, l, ctx, false));
      }
    }
    return out;
  }

  function startState(p, hand) {
    let hc = 0;
    hand.forEach((c) => { hc += CARDS[c].coin; });
    return [p.pos, hand.slice().sort((a, b) => a - b), 0, p.coins, p.iron, 0, false, 0, [], [], 0, 0, 0, 0, [], 0, 0, 0, 0, hc, 0, 0, 0];
  }

  function evaluate(g, p, st, ctx) {
    const q = p.style, cfg = g.cfg;
    const b = boardOf(g), d = b.dist[st[POS]];
    let score = st[PAY] + st[BONUS] + q.w_move * st[MOVED];
    if (cfg.threshold && p.vp + st[PAY] + st[BONUS] >= cfg.threshold) score += 1000;
    for (const i of st[BOUGHT]) score += ctx.slot[i];
    for (const c of st[TRASHED]) score += ctx.trash[c] || 0;
    score += q.perk_value * st[NEW].length;
    let fc = st[COINS];
    for (const c of st[H]) fc += CARDS[c].coin;
    const iron = st[IRON];
    const funds = fc + iron * IRON_VALUE;
    const dl = d.L;
    const dB = d.B === undefined ? 99 : d.B;
    let safe = funds;
    if (!cfg.buyAny && dl < dB && !(st[FLAGS] & F_SMUGGLE)) {
      const keep = Math.min(iron, ironKept(p, st));
      const kept = Math.min(fc + (iron - keep) * IRON_VALUE, COIN_CAP) + keep * IRON_VALUE;
      safe = kept + 0.1 * (funds - kept);
    }
    const restless = p.idle >= q.max_wait;
    const wFund = restless ? 0.05 : q.w_fund;
    score += wFund * Math.min(safe, q.target * 2) + 0.03 * Math.max(0, safe - q.target * 2);
    const holdsIron = p.perks.includes("iron") || st[NEW].includes("iron");
    if (holdsIron) score += cfg.values.iron * iron * 0.7;
    if (restless && st[MOVED] > 0) score += 3;
    const G = 0.85;
    let want = q.w_line * Math.pow(G, dl);
    const owned = p.perks.length + st[NEW].length;
    const needPerk = owned < cfg.slots && ctx.wanted.some((x) => !st[NEW].includes(x));
    let shop = needPerk && funds >= PERK_COST;
    if (!shop) {
      for (const i of ctx.shop) {
        if (!st[BOUGHT].includes(i) && ctx.cost[i] <= funds) { shop = true; break; }
      }
    }
    if (shop) want = Math.max(want, q.w_bazaar * Math.pow(G, dB));
    if (q.miner || (q.w_mine > 0 && funds < q.target)) {
      want = Math.max(want, q.w_mine * Math.pow(G, d.M === undefined ? 99 : d.M));
    }
    if (p.owned - st[TRASHED].length > q.thin_to) {
      want = Math.max(want, q.w_ref * Math.pow(G, d.R === undefined ? 99 : d.R));
    }
    return score + want;
  }

  function stateKey(st) {
    let s = "";
    for (let i = 0; i < 19; i++) {
      const v = st[i];
      s += (Array.isArray(v) ? v.join(",") : v) + "|";
    }
    return s + st[BONUS] + "|" + st[GAINED];
  }

  function search(g, p, hand, ctx, cap, keep, collect) {
    const start = startState(p, hand);
    const seen = new Set([stateKey(start)]);
    const stack = [start];
    let best = start, bestS = evaluate(g, p, start, ctx);
    const scored = keep > 1 ? [[bestS, start]] : null;
    const all = collect ? [start] : null;
    let capped = false;
    while (stack.length && !capped) {
      const st = stack.pop();
      for (const n of expand(g, p, st, ctx)) {
        const k = stateKey(n);
        if (seen.has(k)) continue;
        if (seen.size >= cap) { capped = true; break; }
        seen.add(k);
        stack.push(n);
        if (all) all.push(n);
        const s = evaluate(g, p, n, ctx);
        if (scored) scored.push([s, n]);
        if (s > bestS) { best = n; bestS = s; }
      }
    }
    let top = null;
    if (scored) {
      scored.sort((a, b) => b[0] - a[0]);
      top = [];
      const sigs = new Set();
      for (const [, n] of scored) {
        const sig = [n[POS], n[BOUGHT].join(","), n[TRASHED].join(","), n[NEW].join(","), n[CROSSED]].join("|");
        if (!sigs.has(sig)) { sigs.add(sig); top.push(n); if (top.length === keep) break; }
      }
    }
    return { best, top, all };
  }

  function casualPlan(g, p, hand, ctx) {
    const start = startState(p, hand);
    const seen = new Set([stateKey(start)]);
    const frontier = [start];
    let best = start, bestS = evaluate(g, p, start, ctx) + CASUAL_SIGMA * gauss(p, "noiseS");
    let at = 0;
    while (at < frontier.length && seen.size < CASUAL_LINES) {
      const st = frontier[at++];
      for (const n of expand(g, p, st, ctx)) {
        const k = stateKey(n);
        if (seen.has(k)) continue;
        seen.add(k);
        frontier.push(n);
        const s = evaluate(g, p, n, ctx) + CASUAL_SIGMA * gauss(p, "noiseS");
        if (s > bestS) { best = n; bestS = s; }
      }
    }
    return best;
  }

  function hypothetical(g, p, st) {
    const q = Object.assign({}, p);
    q.pos = st[POS]; q.coins = st[COINS]; q.iron = st[IRON];
    q.vp = p.vp + st[PAY] + st[BONUS];
    q.perks = p.perks.concat(st[NEW]);
    q.owned = p.owned - st[TRASHED].length + st[BOUGHT].length;
    q.trashedTotal = p.trashedTotal + st[TRASHED].length;
    q.buysSince = st[CROSSED] ? 0 : p.buysSince + st[BOUGHT].length;
    q.turnsSince = st[CROSSED] ? 0 : p.turnsSince + 1;
    q.idle = 0;
    return q;
  }

  function sampleHand(g, p, st, hand) {
    const pool = shuffle(p.deck.slice(), p, "noiseS");
    const out = pool.slice(0, HAND);
    if (out.length < HAND) {
      let rest = p.discard.slice();
      let used = hand.slice();
      st[TRASHED].forEach((c) => { const i = used.indexOf(c); if (i >= 0) used.splice(i, 1); });
      rest = rest.concat(used);
      st[BOUGHT].forEach((i) => rest.push(g.market.face[i]));
      shuffle(rest, p, "noiseS");
      return out.concat(rest.slice(0, HAND - out.length));
    }
    return out;
  }

  function expertPlan(g, p, hand, ctx) {
    const r = search(g, p, hand, ctx, 350, 3, false);
    if (!r.top || r.top.length <= 1) return r.best;
    let bestV = -1e18, pick = r.best;
    for (const st of r.top) {
      let imm = st[PAY] + st[BONUS];
      if (g.cfg.threshold && p.vp + imm >= g.cfg.threshold) imm += 1000;
      for (const i of st[BOUGHT]) imm += ctx.slot[i];
      for (const c of st[TRASHED]) imm += ctx.trash[c] || 0;
      imm += p.style.perk_value * st[NEW].length;
      const hypo = hypothetical(g, p, st);
      const ctx2 = makeCtx(g, hypo);
      let total = 0;
      for (let i = 0; i < 3; i++) {
        const nh = sampleHand(g, p, st, hand);
        const b = search(g, hypo, nh, ctx2, 120, 1, false).best;
        total += evaluate(g, hypo, b, ctx2);
      }
      const v = imm + 0.9 * total / 3;
      if (v > bestV) { bestV = v; pick = st; }
    }
    return pick;
  }

  // ------------------------------------------------------------ turns
  function drawCards(p, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (!p.deck.length) {
        if (!p.discard.length) break;
        p.deck = p.discard;
        p.discard = [];
        shuffle(p.deck, p, "rngS");
      }
      out.push(p.deck.pop());
    }
    return out;
  }

  /* Draws the hand. Cards that draw fire at once; Ledger then leaves the hand. */
  function beginTurn(g) {
    const p = g.players[g.current];
    let hand = drawCards(p, Math.max(MIN_HAND, HAND - p.malus + p.extraDraw));
    p.malus = 0;
    p.extraDraw = 0;
    const inPlay = [];
    const drewFrom = [];
    const firesWhenDrawn = (c) => CARDS[c].draw || CARDS[c].spec === "bookmark";
    const pending = hand.filter(firesWhenDrawn);
    while (pending.length) {
      const c = pending.pop();
      if (CARDS[c].spec === "bookmark") {
        p.extraDraw++;
        hand = removeOne(hand, c);
        inPlay.push(c);
        continue;
      }
      const extra = drawCards(p, CARDS[c].draw);
      drewFrom.push(c);
      hand = hand.concat(extra);
      extra.forEach((x) => { if (firesWhenDrawn(x)) pending.push(x); });
      if (!CARDS[c].mv && !CARDS[c].act && !CARDS[c].coin) {
        hand = removeOne(hand, c);
        inPlay.push(c);
      }
    }
    g.turn = { hand, inPlay, drewFrom, state: startState(p, hand), history: [], startPos: p.pos, startVp: p.vp };
    Object.defineProperty(g, "_occ", { value: occupancy(g, p), enumerable: false, writable: true, configurable: true });
    return g.turn;
  }

  function botPlan(g, wantStats) {
    const p = g.players[g.current];
    const ctx = makeCtx(g, p);
    const hand = g.turn.hand;
    if (p.kind === "casual") return casualPlan(g, p, hand, ctx);
    if (p.kind === "expert") return expertPlan(g, p, hand, ctx);
    const r = search(g, p, hand, ctx, 350, 1, !!wantStats);
    if (wantStats) {
      const sigs = new Set();
      let goal = false;
      r.all.forEach((x) => {
        sigs.add([x[POS], x[BOUGHT].join(","), x[TRASHED].join(","), x[NEW].join(","), x[IRON]].join("|"));
        if (x[CROSSED] || x[NEW].length || x[BOUGHT].length) goal = true;
      });
      p.stats.options += sigs.size;
      p.stats.goal += goal ? 1 : 0;
    }
    return r.best;
  }

  /* Applies a finished turn state to the game and passes to the next player. Returns a summary for the log. */
  function commitTurn(g, st) {
    const p = g.players[g.current];
    const t = g.turn;
    const s = p.stats;
    s.turns++;
    s.moved += st[MOVED];
    const useful = st[CROSSED] || st[BOUGHT].length || st[NEW].length || st[TRASHED].length || st[MINES] || st[BONUS];
    if (!useful) s.dead++;
    if (st[MOVED] === 0) s.stay++;
    p.idle = st[MOVED] || st[BOUGHT].length || st[TRASHED].length || st[MINES] || st[NEW].length ? 0 : p.idle + 1;
    const left = st[H];
    let remaining = t.hand.slice();
    left.forEach((c) => { remaining = removeOne(remaining, c); });
    st[TRASHED].forEach((c) => { const i = remaining.indexOf(c); if (i >= 0) remaining.splice(i, 1); });
    const summary = { seat: p.seat, name: p.name, round: g.round, from: t.startPos, to: st[POS], moved: st[MOVED], crossed: st[CROSSED], pay: st[PAY], perks: st[NEW].slice(),
      bought: st[BOUGHT].map((i) => g.market.face[i]), trashed: st[TRASHED].slice(), mined: st[MINES] * 2, lost: st[LOST], bonus: st[BONUS], ambush: !!(st[FLAGS] & F_AMBUSH), played: t.hand.filter((c) => !left.includes(c) && CARDS[c].spec).filter((c, i, a) => a.indexOf(c) === i) };
    p.pos = st[POS];
    p.coins = st[COINS];
    p.iron = st[IRON];
    left.forEach((c) => { p.coins += CARDS[c].coin; });
    p.vp += st[BONUS];
    if (st[CROSSED]) {
      s.crossings++;
      s.pay += st[PAY];
      p.vp += st[PAY];
      g.firstTaken = true;
      p.turnsSince = 0;
      p.buysSince = 0;
    } else {
      p.turnsSince++;
    }
    st[TRASHED].forEach((c) => {
      p.owned--; p.trashedTotal++; s.trashed++;
      if (CARDS[c].mv) p.movesOwned--;
      if (CARDS[c].coin) p.coinsOwned--;
      p.have[c]--;
    });
    p.discard = p.discard.concat(left, t.inPlay, remaining);
    if (st[NEW].length) p.perks = p.perks.concat(st[NEW]);
    const slots = st[BOUGHT].slice().sort((a, b) => b - a);
    slots.forEach((i) => {
      const c = g.market.face.splice(i, 1)[0];
      s.bought++;
      p.discard.push(c);
      p.owned++;
      if (CARDS[c].mv) p.movesOwned++;
      if (CARDS[c].coin) p.coinsOwned++;
      p.have[c] = (p.have[c] || 0) + 1;
      if (!g.buysThisRound.includes(0)) g.buysThisRound.push(0);
      if (g.market.pile.length) g.market.face.push(g.market.pile.pop());
    });
    // cards bought after crossing count toward the next crossing, as the Patron card says
    p.buysSince += st[CROSSED] ? st[BOUGHT].length - st[BOUGHT_AT_CROSS] : st[BOUGHT].length;
    if (st[FLAGS] & F_AMBUSH) g.players.forEach((o) => { if (o !== p) o.malus += 1; });
    g.log.push(summary);
    g.turn = null;
    g.current++;
    if (g.current >= g.players.length) endRound(g);
    return summary;
  }

  function endRound(g) {
    g.current = 0;
    const m = g.market;
    if (!g.buysThisRound.length && m.face.length && m.pile.length) {
      m.pile.unshift(m.face.shift());
      m.face.push(m.pile.pop());
    }
    g.buysThisRound = [];
    g.firstTaken = false;
    const cfg = g.cfg;
    const reached = g.players.some((p) => p.vp >= cfg.threshold);
    if (reached || g.round >= 40) {
      g.over = true;
      g.winners = standings(g).filter((r) => r.place === 1).map((r) => r.seat);
      return;
    }
    g.round++;
  }

  function standings(g) {
    const rows = g.players.map((p) => ({ seat: p.seat, name: p.name, vp: p.vp, funds: p.coins + p.iron * IRON_VALUE }));
    rows.sort((a, b) => b.vp - a.vp || b.funds - a.funds);
    rows.forEach((r, i) => {
      const prev = rows[i - 1];
      r.place = prev && prev.vp === r.vp && prev.funds === r.funds ? prev.place : i + 1;
    });
    return rows;
  }

  // ------------------------------------------------------------ human turn: each call checks legality and returns true if it changed the turn
  function pushHuman(g, next) {
    if (!next) return false;
    g.turn.history.push(g.turn.state);
    g.turn.state = next;
    return true;
  }
  function humanCtx(g) {
    const p = g.players[g.current];
    const plan = p.plan;
    return { slot: [], cost: [], shop: [], wanted: plan.filter((x) => !p.perks.includes(x)), trash: {},
      trackPlayed: true, trackLast: true, trackKinds: true, occ: g._occ || occupancy(g, p) };
  }
  function done(g) { return !!(g.turn.state[FLAGS] & F_DONE); }

  const human = {
    move(g, c) {
      if (done(g) || !g.turn.state[H].includes(c) || !CARDS[c].mv) return false;
      return pushHuman(g, playMove(g, g.players[g.current], g.turn.state, c, humanCtx(g)));
    },
    coin(g, c) {
      if (done(g) || !g.turn.state[H].includes(c) || !CARDS[c].coin) return false;
      return pushHuman(g, playCoins(g.turn.state, [c], humanCtx(g)));
    },
    /* ways to pay for this space's action right now: "pend", a card id, or "free" */
    tokens(g) {
      const st = g.turn.state;
      if (done(g)) return [];
      const tile = g.cfg.tiles[st[POS]];
      const out = [];
      if (!SPACES[tile].options.length) return out;
      if (st[PEND] > 0) out.push({ via: "pend" });
      else {
        const seen = {};
        st[H].forEach((c) => { if (CARDS[c].act && !seen[c]) { seen[c] = true; out.push({ via: "card", card: c }); } });
      }
      if (g.cfg.freeAction && !(st[FLAGS] & F_FREE)) out.push({ via: "free" });
      return out;
    },
    /* What a unique card with its own effect can do right now: { ok, note, choose }. */
    specialInfo(g, c) {
      const st = g.turn.state;
      const k = CARDS[c];
      const n = g.cfg.tiles.length;
      const d = boardOf(g).dist[st[POS]];
      const p = g.players[g.current];
      const toLine = (steps) => steps >= d.L;
      const go = (steps) => {
        const crossing = toLine(steps) && !st[CROSSED];
        return crossing ? `Crosses: +${human.previewSpecial(g, c, 0)[PAY]} VP` : `To ${SPACES[g.cfg.tiles[(st[POS] + steps) % n]].name}`;
      };
      const others = st[H].filter((x, i) => i !== st[H].indexOf(c)).length;
      switch (k.spec) {
        case "momentum": return { ok: true, note: go(1 + st[PLAYED]) };
        case "shortcut": return d.B > 0 ? { ok: true, note: go(d.B) } : { ok: false, note: d.B === 0 ? "You are on a Bazaar" : "No Bazaar here" };
        case "beeline": return d.L <= BEELINE_RANGE ? { ok: true, note: go(d.L) } : { ok: false, note: `Start is ${d.L} away` };
        case "smuggler": return { ok: true, note: "+1 coin, skip Customs" };
        case "prospector": return { ok: true, note: `Gain ${PROSPECT_IRON} iron` };
        case "tithe": return { ok: true, note: `Bank ${1 + g.players.filter((o) => o.vp > p.vp).length} now` };
        case "lap": return st[CROSSED] ? { ok: true, note: `+${LAP_VP} VP` } : { ok: false, note: "Cross first" };
        case "agent": {
          const tile = g.cfg.tiles[(st[POS] + 1) % n];
          return SPACES[tile].options.length ? { ok: true, note: `Use ${SPACES[tile].name}` } : { ok: false, note: "Customs is next" };
        }
        case "gold": return { ok: true, note: `Bank ${GOLD_COINS}, then trash` };
        case "ambush": return { ok: true, note: "+1 coin, shrink hands" };
        case "joker": return { ok: true, note: "Coin or move", choose: true };
        case "salvage": return others ? { ok: true, note: "Pick a card to sell", choose: true } : { ok: false, note: "No other cards" };
        case "remodel": return others ? { ok: true, note: "Pick a card to trade", choose: true } : { ok: false, note: "No other cards" };
        default: return { ok: false, note: "" };
      }
    },
    previewSpecial(g, c, which) {
      return specialStates(g, g.players[g.current], g.turn.state, c, humanCtx(g))[which];
    },
    /* Plays a unique card. `which` picks between Joker's outcomes: 0 is the coin, 1 is the move. */
    special(g, c, which) {
      if (done(g) || !g.turn.state[H].includes(c) || !CARDS[c].spec || !human.specialInfo(g, c).ok) return false;
      return pushHuman(g, specialStates(g, g.players[g.current], g.turn.state, c, humanCtx(g))[which || 0]);
    },
    _spent(g, c) {
      const st = g.turn.state;
      if (done(g) || !st[H].includes(c)) return null;
      const base = st.slice();
      base[H] = removeOne(st[H], c);
      base[KINDS] |= 1 << c;
      return base;
    },
    salvage(g, c, x) {
      const base = this._spent(g, c);
      if (!base || CARDS[c].spec !== "salvage" || !base[H].includes(x)) return false;
      return pushHuman(g, salvageState(base, x));
    },
    remodel(g, c, x, slot) {
      const base = this._spent(g, c);
      if (!base || CARDS[c].spec !== "remodel" || !base[H].includes(x)) return false;
      return pushHuman(g, remodelState(g, base, x, slot));
    },
    remodelCap(c) { return CARDS[c].cost + REMODEL_UP; },
    freeBuyOpen(g) {
      const st = g.turn.state;
      if (done(g) || st[FLAGS] & F_FREE) return false;
      if (g.cfg.buyAny) return true;
      return !!(g.cfg.buyFree && g.cfg.tiles[st[POS]] === "B");
    },
    _paid(g, token) {
      const p = g.players[g.current];
      const st = g.turn.state;
      const l = st.slice();
      if (token.via === "pend") { l[PEND] -= 1; l[ACTS] += 1; }
      else if (token.via === "card") {
        l[H] = removeOne(st[H], token.card);
        l[PEND] = CARDS[token.card].act - 1;
        l[ACTS] += 1;
        l[KINDS] |= 1 << token.card;
      } else if (token.via === "agent") {
        l[H] = removeOne(st[H], token.card);
        l[ACTS] += 1;
        l[KINDS] |= 1 << token.card;
      } else if (token.via === "free") l[FLAGS] |= F_FREE | F_DONE;
      else if (token.via === "freebuy") l[FLAGS] |= F_FREE;
      return { p, l };
    },
    _finish(g, token, s) {
      if (!s) return false;
      const p = g.players[g.current];
      const ctx = humanCtx(g);
      const stays = token.via === "free" || token.via === "freebuy" || token.via === "agent" || (token.via === "card" && CARDS[token.card].stay);
      const next = stays ? s : advance(g, p, s, 1, false, 0, ctx.occ);
      return pushHuman(g, next);
    },
    simple(g, token) { // Mine, Tailwind or Exchange
      const { p, l } = this._paid(g, token);
      const at = token.via === "agent" ? (l[POS] + 1) % g.cfg.tiles.length : l[POS];
      const opt = SPACES[g.cfg.tiles[at]].options[0];
      const ctx = humanCtx(g);
      let s = null;
      if (opt.kind === "iron") { s = l; s[IRON] += opt.n; s[MINES] += 1; }
      else if (opt.kind === "coin") { s = l; s[COINS] += opt.n; }
      else if (opt.kind === "move") s = advance(g, p, l, opt.n, false, 0, ctx.occ);
      return this._finish(g, token, s);
    },
    trash(g, token, cards) {
      if (!cards.length || cards.length > 2) return false;
      const { l } = this._paid(g, token);
      let h = l[H].slice();
      for (const c of cards) {
        const i = h.indexOf(c);
        if (i < 0) return false;
        h.splice(i, 1);
      }
      return this._finish(g, token, trashState(l, cards));
    },
    buyCard(g, token, slot) {
      const { l } = this._paid(g, token);
      return this._finish(g, token, buyCardState(g, l, slot));
    },
    buyPerk(g, token, perk) {
      const { p, l } = this._paid(g, token);
      if (!p.plan.includes(perk) || p.perks.includes(perk)) return false;
      return this._finish(g, token, buyPerkState(g, p, l, perk));
    },
    previewMove(g, c) {
      return playMove(g, g.players[g.current], g.turn.state, c, humanCtx(g));
    },
    /* what each perk would pay if the current turn state crossed now */
    payNow(g) {
      const p = g.players[g.current];
      const st = g.turn.state;
      return payout(g, p, p.perks.concat(st[NEW]), st[POS], st);
    },
    undo(g) {
      if (!g.turn.history.length) return false;
      g.turn.state = g.turn.history.pop();
      return true;
    },
    end(g) { return commitTurn(g, g.turn.state); },
  };

  /* Restores non-saved helpers after loading a game from storage. */
  function revive(g) {
    if (g.turn) Object.defineProperty(g, "_occ", { value: occupancy(g, g.players[g.current]), enumerable: false, writable: true, configurable: true });
    return g;
  }

  /* Plays a whole game of bots. Used by the tests. */
  function playBots(g, wantStats) {
    while (!g.over) {
      beginTurn(g);
      commitTurn(g, botPlan(g, wantStats));
    }
    return g;
  }

  return { CARDS, ID, PERKS, SPACES, STYLES, BASE_LAP, PERK_COST, COIN_CAP, FOUNDRY_KEEP, HAND, LAP_VP, IRON_VALUE, TARGET_ROUNDS, F: { FREE: F_FREE, DONE: F_DONE, SMUGGLE: F_SMUGGLE, AMBUSH: F_AMBUSH },
    S: { POS, H, PEND, COINS, IRON, MOVED, CROSSED, PAY, BOUGHT, TRASHED, PLAYED, LAST, ACTS, LOST, NEW, KINDS, FLAGS, PASSED, MINES, HCOIN, BONUS, GAINED },
    fmt, newGame, setPlan, botPickPerks, beginTurn, botPlan, commitTurn, playBots, human, standings, payout, revive, startState, expand, makeCtx, boardOf, customs, payCoin, advance };
});
