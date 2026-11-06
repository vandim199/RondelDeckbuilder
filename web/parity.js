/* Plays the browser engine's bots at scale, to compare with sim/results/lab_v2.json.
   Run: node parity.js [games]. */
const fs = require("fs");
const path = require("path");
const E = require("./engine.js");
const VERSIONS = require("./versions.js");

const GAMES = Number(process.argv[2] || 3000);
const py = JSON.parse(fs.readFileSync(path.join(__dirname, "../sim/results/lab_v2.json"), "utf8"));

function matchup(cfg, kinds, games, seedBase) {
  const wins = [0, 0, 0, 0];
  for (let s = 0; s < games; s++) {
    const order = kinds.map((_, i) => kinds[(i + s) % 4]);
    const g = E.newGame(cfg, order.map((kind, i) => ({ name: "P" + i, kind })), seedBase + s);
    E.playBots(g);
    const winners = g.winners.length;
    g.winners.forEach((seat) => { wins[(seat + s) % 4] += 1 / winners; }); // back to the position in `kinds`
  }
  return wins.map((w) => w / games);
}

for (const v of VERSIONS) {
  const holds = {}, won = {};
  const seats = [0, 0, 0, 0];
  let rounds = 0, turns = 0, crossings = 0, pay = 0, dead = 0, goal = 0, moved = 0, options = 0;
  for (let s = 0; s < GAMES; s++) {
    const g = E.newGame(v.cfg, [0, 1, 2, 3].map((i) => ({ name: "B" + i, kind: "std" })), 100000 + s);
    E.playBots(g, true);
    rounds += g.round;
    const share = g.winners.length ? 1 / g.winners.length : 0;
    g.players.forEach((p) => {
      const w = g.winners.includes(p.seat) ? share : 0;
      seats[p.seat] += w;
      turns += p.stats.turns; crossings += p.stats.crossings; pay += p.stats.pay; dead += p.stats.dead; goal += p.stats.goal; moved += p.stats.moved; options += p.stats.options;
      p.plan.forEach((perk) => { holds[perk] = (holds[perk] || 0) + 1; won[perk] = (won[perk] || 0) + w; });
    });
  }
  const s = py[v.sim];
  const row = (label, a, b) => console.log(`  ${label.padEnd(18)} browser ${a.toFixed(2).padStart(7)}   simulator ${b.toFixed(2).padStart(7)}`);
  console.log(`\n${v.name} (${GAMES} games)`);
  row("rounds", rounds / GAMES, s.rounds);
  row("turns per lap", turns / crossings, s.per_cross);
  row("VP per crossing", pay / crossings, s.pay);
  row("move per turn", moved / turns, s.move_turn);
  row("dead turn %", (100 * dead) / turns, 100 * s.dead);
  row("goal reachable %", (100 * goal) / turns, 100 * s.goal);
  row("options per turn", options / turns, s.options);
  console.log("  seat wins %        browser", seats.map((x) => ((100 * x) / GAMES).toFixed(0)).join(" "), "  simulator", s.seats.map((x) => (100 * x).toFixed(0)).join(" "));
  const names = Object.keys(holds).sort((a, b) => won[b] / holds[b] - won[a] / holds[a]);
  let sumDiff = 0;
  const lines = names.map((k) => {
    const a = (100 * won[k]) / holds[k], b = 100 * s.perks[k];
    sumDiff += Math.abs(a - b);
    return `${k} ${a.toFixed(0)}/${b.toFixed(0)}`;
  });
  console.log("  perk wins % (browser/simulator):", lines.join(", "));
  console.log(`  mean perk gap ${(sumDiff / names.length).toFixed(1)} points`);
  const levels = matchup(v.cfg, ["expert", "std", "std", "casual"], Math.min(240, GAMES), 300000);
  console.log("  one Expert, two Standard, one Casual, win %:", levels.map((x) => (x * 100).toFixed(0)).join(" "));
}
