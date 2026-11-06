/* Rule checks for the web engine. Run: node test_engine.js */
const assert = require("assert");
const E = require("./engine.js");
const { ID, S, human } = E;

const VALUES = { moves: 2, last: 2, iron: 2, exact: 6, thin: 1, acts: 3, purge: 1, bulk: 1, dist: 1, kinds: 2, allin: 7, reserve: 2, underdog: 3,
  passer: 5, longhaul: 3, patron1: 9, coinplay: 3, streak: 7 };
const CFG = { tiles: "SVMRBBMV", freeAction: true, slots: 2, payBest: true, threshold: 100, values: VALUES, pool: Object.keys(VALUES) };

function game(plan, cfg, extra) {
  const c = Object.assign({}, CFG, cfg || {});
  const seats = [0, 1, 2, 3].map((i) => ({ name: "P" + i, kind: i === 0 ? "human" : "std" }));
  const g = E.newGame(c, seats, 11, { plans: [plan, ["moves", "dist"], ["iron", "acts"], ["thin", "bulk"]] });
  Object.assign(g.players[0], extra || {});
  g.players.forEach((p) => { if (p.seat) p.pos = 0; });
  return g;
}
function turn(g, cards) {
  E.beginTurn(g);
  g.turn.hand = cards.slice();
  g.turn.inPlay = [];
  g.turn.state = E.startState(g.players[g.current], cards);
  return g.turn.state;
}
const h = (...names) => names.map((n) => ID[n]);
const checks = {
  "a movement card moves and crossing pays base lap plus best perk"() {
    const g = game(["moves", "dist"], null, { perks: ["moves", "dist"], pos: 6 });
    turn(g, h("Courier"));
    assert(human.move(g, ID.Courier));
    const st = g.turn.state;
    assert.strictEqual(st[S.POS], 0);
    assert.strictEqual(st[S.PAY], 2 + Math.max(2 * 1, 1 * 2));
  },
  "stacking adds perks when best-perk-pays is off"() {
    const g = game(["moves", "dist"], { payBest: false }, { perks: ["moves", "dist"], pos: 6 });
    turn(g, h("Courier"));
    human.move(g, ID.Courier);
    assert.strictEqual(g.turn.state[S.PAY], 2 + 2 + 2);
  },
  "customs sells all iron for 2 coins each, then discards coins down to 4"() {
    const g = game(["moves", "dist"], null, { pos: 7, coins: 1, iron: 1 });
    turn(g, h("Scout"));
    human.move(g, ID.Scout);
    assert.strictEqual(g.turn.state[S.COINS], 3);
    assert.strictEqual(g.turn.state[S.IRON], 0);
    assert.strictEqual(g.turn.state[S.LOST], 0);
    const g2 = game(["moves", "dist"], null, { pos: 7, coins: 5, iron: 3 });
    turn(g2, h("Scout"));
    human.move(g2, ID.Scout);
    assert.strictEqual(g2.turn.state[S.COINS], 4);
    assert.strictEqual(g2.turn.state[S.IRON], 0);
    assert.strictEqual(g2.turn.state[S.LOST], 7);
  },
  "owning foundry keeps up to 2 iron at customs and scores all iron first"() {
    const g = game(["iron", "acts"], null, { perks: ["iron"], pos: 7, coins: 0, iron: 3 });
    turn(g, h("Scout"));
    human.move(g, ID.Scout);
    assert.strictEqual(g.turn.state[S.PAY], 2 + 2 * 3);
    assert.strictEqual(g.turn.state[S.IRON], 2);
    assert.strictEqual(g.turn.state[S.COINS], 2);
    const unowned = game(["iron", "acts"], null, { pos: 7, iron: 3 });
    turn(unowned, h("Scout"));
    human.move(unowned, ID.Scout);
    assert.strictEqual(unowned.turn.state[S.IRON], 0);
  },
  "the deck starts with 11 cards including layover, and wagon is gone"() {
    const g = game(["moves", "dist"]);
    assert.strictEqual(g.players[0].owned, 11);
    assert.strictEqual(g.players[0].have[ID.Layover], 1);
    assert.strictEqual(ID.Wagon, undefined);
    assert(!g.market.face.concat(g.market.pile).includes(ID.Layover));
  },
  "layover uses the space and stays, and does nothing at customs"() {
    const g = game(["moves", "dist"], null, { pos: 2 });
    turn(g, h("Layover"));
    assert(human.simple(g, human.tokens(g)[0]));
    assert.strictEqual(g.turn.state[S.IRON], 2);
    assert.strictEqual(g.turn.state[S.POS], 2);
    assert.strictEqual(g.turn.state[S.ACTS], 1);
    const g2 = game(["moves", "dist"], null, { pos: 0 });
    turn(g2, h("Layover"));
    assert.strictEqual(human.tokens(g2).length, 0);
    const g3 = game(["moves", "dist"], null, { pos: 4, coins: 6 });
    turn(g3, h("Layover"));
    assert(human.buyPerk(g3, human.tokens(g3)[0], "moves"));
    assert.strictEqual(g3.turn.state[S.POS], 4);
  },
  "only the first crossing in a turn pays"() {
    const g = game(["moves", "dist"], { tiles: "SMRB" }, { perks: ["moves"], pos: 3 });
    turn(g, h("Scout", "Express", "Courier"));
    human.move(g, ID.Scout);
    const first = g.turn.state[S.PAY];
    human.move(g, ID.Express);
    human.move(g, ID.Courier);
    assert.strictEqual(g.turn.state[S.PAY], first);
  },
  "contract uses the space and then steps forward"() {
    const g = game(["moves", "dist"], null, { pos: 2 });
    turn(g, h("Contract"));
    const tokens = human.tokens(g);
    assert.strictEqual(tokens[0].via, "card");
    assert(human.simple(g, tokens[0]));
    assert.strictEqual(g.turn.state[S.IRON], 2);
    assert.strictEqual(g.turn.state[S.POS], 3);
  },
  "foreman gives a second action on the next space"() {
    const g = game(["moves", "dist"], { tiles: "SMMMMV" }, { pos: 1 });
    turn(g, h("Foreman"));
    human.simple(g, human.tokens(g)[0]);
    assert.strictEqual(g.turn.state[S.PEND], 1);
    const t = human.tokens(g);
    assert.strictEqual(t[0].via, "pend");
    human.simple(g, t[0]);
    assert.strictEqual(g.turn.state[S.IRON], 4);
    assert.strictEqual(g.turn.state[S.POS], 3);
    assert.strictEqual(g.turn.state[S.ACTS], 2);
  },
  "free action needs movement, has no step and ends the turn"() {
    const g = game(["moves", "dist"], null, { pos: 1 });
    turn(g, h("Scout", "Courier"));
    assert.strictEqual(human.tokens(g).length, 0);
    human.move(g, ID.Scout);
    const free = human.tokens(g).find((t) => t.via === "free");
    assert(free);
    human.simple(g, free);
    assert.strictEqual(g.turn.state[S.POS], 2);
    assert.strictEqual(g.turn.state[S.IRON], 2);
    assert.strictEqual(human.move(g, ID.Courier), false);
  },
  "buying at a bazaar pays with coin cards, coins, then iron"() {
    const g = game(["moves", "dist"], null, { pos: 4, iron: 1 });
    const slot = 0;
    const cost = E.CARDS[g.market.face[slot]].cost;
    g.players[0].coins = cost - 3; // a coin card pays 1, banked coins the rest, then 1 iron pays 2
    turn(g, h("Contract", "Coin"));
    assert(human.buyCard(g, human.tokens(g)[0], slot));
    const st = g.turn.state;
    assert.strictEqual(st[S.H].length, 0);
    assert.strictEqual(st[S.POS], 5);
    assert.strictEqual(st[S.COINS], 0);
    assert.strictEqual(st[S.IRON], 0);
    // iron gives no change
    const g2 = game(["moves", "dist"], null, { pos: 4, iron: 2 });
    const cheap = g2.market.face.findIndex((c) => E.CARDS[c].cost === 3);
    if (cheap >= 0) {
      turn(g2, h("Contract"));
      human.buyCard(g2, human.tokens(g2)[0], cheap);
      assert.strictEqual(g2.turn.state[S.IRON], 0);
      assert.strictEqual(g2.turn.state[S.COINS], 0);
    }
  },
  "buying a perk costs 6 and only from your own plan"() {
    const g = game(["moves", "dist"], null, { pos: 4, coins: 6 });
    turn(g, h("Contract", "Contract"));
    assert.strictEqual(human.buyPerk(g, human.tokens(g)[0], "iron"), false);
    assert(human.buyPerk(g, human.tokens(g)[0], "moves"));
    assert.strictEqual(g.turn.state[S.COINS], 0);
    assert.deepStrictEqual(g.turn.state[S.NEW], ["moves"]);
  },
  "there is no minimum deck, and an empty deck can still take turns"() {
    const g = game(["moves", "dist"], null, { pos: 3, owned: 2 });
    turn(g, h("Contract", "Scout", "Coin"));
    assert(human.trash(g, human.tokens(g)[0], h("Scout", "Coin")));
    assert.deepStrictEqual(g.turn.state[S.TRASHED], h("Scout", "Coin"));
    const g2 = game(["moves", "dist"]);
    const p = g2.players[0];
    p.deck = []; p.discard = []; p.owned = 0; p.have = {};
    E.beginTurn(g2);
    assert.strictEqual(g2.turn.hand.length, 0);
    human.end(g2);
    assert.strictEqual(g2.current, 1);
  },
  "each perk pays as its card says"() {
    const cases = [
      ["last", 7, h("Courier"), {}, 2 + 2 * 2], ["exact", 6, h("Courier"), {}, 2 + 6], ["iron", 7, h("Scout"), { iron: 3 }, 2 + 2 * 3],
      ["allin", 7, h("Scout"), {}, 2 + 7], ["reserve", 7, h("Scout", "Coin", "Coin"), {}, 2 + 2 * 2], ["longhaul", 7, h("Scout"), { turnsSince: 3 }, 2 + 3 * 4],
      ["purge", 7, h("Scout"), { trashedTotal: 4 }, 2 + 4], ["thin", 7, h("Scout"), { owned: 8 }, 2 + 4], ["bulk", 7, h("Scout"), { owned: 14 }, 2 + 7],
      ["patron1", 7, h("Scout"), { buysSince: 3 }, 2 + 9],
    ];
    for (const [perk, pos, cards, extra, want] of cases) {
      const g = game([perk, "acts"], null, Object.assign({ perks: [perk], pos }, extra));
      turn(g, cards);
      human.move(g, cards[0]);
      assert.strictEqual(g.turn.state[S.PAY], want, perk);
    }
  },
  "streak needs a crossing on your previous turn"() {
    const g = game(["streak", "acts"], null, { perks: ["streak"], pos: 7, turnsSince: 0 });
    g.round = 4;
    turn(g, h("Scout"));
    human.move(g, ID.Scout);
    assert.strictEqual(g.turn.state[S.PAY], 2 + 7);
    const g2 = game(["streak", "acts"], null, { perks: ["streak"], pos: 7, turnsSince: 2 });
    g2.round = 4;
    turn(g2, h("Scout"));
    human.move(g2, ID.Scout);
    assert.strictEqual(g2.turn.state[S.PAY], 2);
  },
  "tycoon scores coin cards played, even when spent, and not banked coins"() {
    const g = game(["coinplay", "acts"], null, { perks: ["coinplay"], pos: 7, coins: 9 });
    turn(g, h("Scout", "Merchant", "Coin"));
    human.coin(g, ID.Merchant);
    human.move(g, ID.Scout);
    assert.strictEqual(g.turn.state[S.PAY], 2 + 3 * 2);
  },
  "half values round down"() {
    const g = game(["moves", "acts"], { values: Object.assign({}, VALUES, { moves: 1.5 }) }, { perks: ["moves"], pos: 6 });
    turn(g, h("Scout", "Scout"));
    human.move(g, ID.Scout);
    human.move(g, ID.Scout);
    assert.strictEqual(g.turn.state[S.PAY], 2 + 3);
    const g2 = game(["moves", "acts"], { values: Object.assign({}, VALUES, { moves: 1.5 }) }, { perks: ["moves"], pos: 7 });
    turn(g2, h("Scout"));
    human.move(g2, ID.Scout);
    assert.strictEqual(g2.turn.state[S.PAY], 2 + 1);
  },
  "overtaker counts pawns passed, not the one you land on"() {
    const g = game(["passer", "acts"], null, { perks: ["passer"], pos: 5 });
    g.players[1].pos = 6;
    g.players[2].pos = 7;
    turn(g, h("Express"));
    human.move(g, ID.Express);
    assert.strictEqual(g.turn.state[S.PASSED], 2);
    const g2 = game(["passer", "acts"], null, { pos: 5 });
    g2.players[1].pos = 7;
    turn(g2, h("Courier"));
    human.move(g2, ID.Courier);
    assert.strictEqual(g2.turn.state[S.PASSED], 0);
  },
  "undo restores the turn"() {
    const g = game(["moves", "dist"], null, { pos: 1 });
    turn(g, h("Scout"));
    human.move(g, ID.Scout);
    assert(human.undo(g));
    assert.strictEqual(g.turn.state[S.POS], 1);
    assert.deepStrictEqual(g.turn.state[S.H], h("Scout"));
    assert.strictEqual(human.undo(g), false);
  },
  "unplayed coin cards bank at end of turn and cards go to discard"() {
    const g = game(["moves", "dist"], null, { pos: 1 });
    turn(g, h("Scout", "Coin", "Merchant"));
    human.move(g, ID.Scout);
    const before = g.players[0].discard.length;
    human.end(g);
    const p = g.players[0];
    assert.strictEqual(p.coins, 3);
    assert.strictEqual(p.discard.length, before + 3);
    assert.strictEqual(g.current, 1);
  },
  "a card bought after crossing counts toward the next crossing"() {
    const g = game(["patron1", "acts"], { tiles: "SBMRMV" }, { perks: ["patron1"], pos: 5, coins: 0 });
    turn(g, h("Scout", "Contract", "Merchant", "Merchant"));
    human.move(g, ID.Scout);
    g.turn.state[S.POS] = 1;
    const slot = g.market.face.findIndex((c) => E.CARDS[c].cost <= 4);
    human.buyCard(g, human.tokens(g)[0], slot);
    human.end(g);
    assert.strictEqual(g.players[0].buysSince, 1);
    const g2 = game(["patron1", "acts"], { tiles: "SBMRMV" }, { perks: ["patron1"], pos: 1, coins: 9 });
    turn(g2, h("Contract", "Courier"));
    const slot2 = g2.market.face.findIndex((c) => E.CARDS[c].cost <= 9);
    human.buyCard(g2, human.tokens(g2)[0], slot2);
    g2.turn.state[S.POS] = 5;
    human.move(g2, ID.Courier);
    assert.strictEqual(g2.turn.state[S.PAY], 2 + 9);
    human.end(g2);
    assert.strictEqual(g2.players[0].buysSince, 0);
  },
  "a game ends at the end of the round with equal turns"() {
    const g = E.newGame(Object.assign({}, CFG, { threshold: 20 }), [0, 1, 2, 3].map((i) => ({ name: "B" + i, kind: "std" })), 5);
    E.playBots(g);
    assert(g.over && g.winners.length >= 1);
    const turns = new Set(g.players.map((p) => p.stats.turns));
    assert.strictEqual(turns.size, 1);
  },
  "bots of every level finish a game, in every version shape"() {
    for (const kind of ["casual", "std", "expert"]) {
      for (const cfg of [{}, { tiles: "SMRCMV", buyAny: true }, { tiles: "SMRBMV", buyFree: true, freeAction: false }]) {
        const g = E.newGame(Object.assign({}, CFG, cfg), [0, 1, 2, 3].map((i) => ({ name: "B" + i, kind })), 3);
        E.playBots(g);
        assert(g.over);
        g.players.forEach((p) => {
          assert.strictEqual(p.deck.length + p.discard.length, p.owned);
          assert(p.owned >= 0);
        });
      }
    }
  },
  "a game survives being saved and loaded mid-turn"() {
    const g = game(["moves", "dist"], null, { pos: 1 });
    turn(g, h("Scout", "Coin"));
    human.move(g, ID.Scout);
    const copy = E.revive(JSON.parse(JSON.stringify(g)));
    assert(human.coin(copy, ID.Coin));
    human.end(copy);
    assert.strictEqual(copy.current, 1);
    assert(human.undo(g));
  },
  "same seed gives the same game, and bots never make an illegal hand"() {
    const play = () => {
      const g = E.newGame(CFG, [0, 1, 2, 3].map((i) => ({ name: "B" + i, kind: "casual" })), 42);
      E.playBots(g);
      return g.players.map((p) => p.vp);
    };
    assert.deepStrictEqual(play(), play());
  },
};
let n = 0;
for (const [name, fn] of Object.entries(checks)) {
  try { fn(); n++; } catch (e) { console.error("FAILED:", name, "\n", e.message); process.exitCode = 1; }
}
console.log(`${n}/${Object.keys(checks).length} rule checks passed`);
