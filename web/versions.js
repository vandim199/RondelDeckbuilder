/* The versions in the app. Values and targets come from sim/results/lab_v2_cards.json. */
(function (root) {
  const POOL = ["moves", "last", "iron", "coinplay", "exact", "thin", "acts", "streak", "purge", "bulk", "dist", "kinds", "patron1", "allin", "reserve", "underdog", "passer", "longhaul"];
  const VERSIONS = [
    {
      id: "race8",
      sim: "race8_best",
      name: "8-Space Race",
      blurb: "Use the space you are on for free to end your turn. Spaces matter most here, and sequencing rewards careful play. With two perks, only the better one pays.",
      cfg: {
        tiles: "SVMRBBMV", freeAction: true, uniq: true, slots: 2, payBest: true, threshold: 300, baseLap: 6, pool: POOL,
        values: { moves: 6, last: 5, iron: 4, coinplay: 10, exact: 22, thin: 2, acts: 11, streak: 21, purge: 2, bulk: 3, dist: 3, kinds: 6, patron1: 29, allin: 25, reserve: 7, underdog: 10, passer: 15, longhaul: 12 },
        perkPower: { kinds: 32, longhaul: 31, allin: 31, acts: 29, dist: 27, streak: 27, reserve: 26, exact: 26, bulk: 25, passer: 25, moves: 25, purge: 24, underdog: 23, patron1: 22, coinplay: 22, last: 19, iron: 17, thin: 17 },
      },
    },
    {
      id: "race8both",
      sim: "race8_both",
      name: "8-Space Race: Both Perks",
      blurb: "Use the space you are on for free to end your turn. Spaces matter most here, and sequencing rewards careful play. Both of your perks pay at every crossing.",
      cfg: {
        tiles: "SVMRBBMV", freeAction: true, uniq: true, slots: 2, payBest: false, threshold: 400, baseLap: 6, pool: POOL,
        values: { moves: 6, last: 5, iron: 4, coinplay: 11, exact: 22, thin: 2, acts: 11, streak: 22, purge: 2, bulk: 2, dist: 3, kinds: 5, patron1: 34, allin: 26, reserve: 8, underdog: 12, passer: 18, longhaul: 10 },
        perkPower: { dist: 34, moves: 30, acts: 29, reserve: 29, allin: 29, patron1: 28, kinds: 26, longhaul: 26, streak: 26, coinplay: 25, purge: 24, passer: 24, underdog: 24, last: 23, exact: 22, iron: 19, thin: 17, bulk: 15 },
      },
    },
    {
      id: "sprint6",
      sim: "sprint6_best",
      name: "6-Space Sprint",
      blurb: "A shorter loop with one Bazaar, where buying is free once per turn. Faster and simpler to read each turn. With two perks, only the better one pays.",
      cfg: {
        tiles: "SMRBMV", buyFree: true, uniq: true, slots: 2, payBest: true, threshold: 350, baseLap: 6, pool: POOL,
        values: { moves: 7, last: 7, iron: 5, coinplay: 10, exact: 19, thin: 4, acts: 12, streak: 20, purge: 3, bulk: 2, dist: 4, kinds: 6, patron1: 29, allin: 27, reserve: 6, underdog: 10, passer: 16, longhaul: 13 },
        perkPower: { purge: 33, thin: 31, dist: 31, moves: 31, last: 28, kinds: 27, acts: 27, coinplay: 25, longhaul: 25, allin: 24, underdog: 24, passer: 24, exact: 24, streak: 23, reserve: 23, patron1: 19, iron: 18, bulk: 15 },
      },
    },
    {
      id: "sprint6both",
      sim: "sprint6_both",
      name: "6-Space Sprint: Both Perks",
      blurb: "A shorter loop with one Bazaar, where buying is free once per turn. Faster and simpler to read each turn. Both of your perks pay at every crossing.",
      cfg: {
        tiles: "SMRBMV", buyFree: true, uniq: true, slots: 2, payBest: false, threshold: 400, baseLap: 6, pool: POOL,
        values: { moves: 6, last: 6, iron: 5, coinplay: 10, exact: 19, thin: 3, acts: 11, streak: 18, purge: 2, bulk: 2, dist: 3, kinds: 5, patron1: 31, allin: 27, reserve: 6, underdog: 11, passer: 20, longhaul: 10 },
        perkPower: { last: 30, moves: 29, patron1: 28, exact: 27, iron: 27, coinplay: 27, passer: 27, kinds: 26, underdog: 25, reserve: 25, dist: 24, bulk: 24, allin: 23, thin: 23, streak: 22, acts: 22, longhaul: 22, purge: 19 },
      },
    },
  ];
  if (typeof module === "object" && module.exports) module.exports = VERSIONS;
  else root.KE_VERSIONS = VERSIONS;
})(typeof self !== "undefined" ? self : this);
