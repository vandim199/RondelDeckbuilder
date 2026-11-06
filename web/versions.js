/* The versions in the app. Values and targets come from sim/results/lab_v2.json. */
(function (root) {
  const POOL = ["moves", "last", "iron", "coinplay", "exact", "thin", "acts", "streak", "purge", "bulk", "dist", "kinds", "patron1", "allin", "reserve", "underdog", "passer", "longhaul"];
  const VERSIONS = [
    {
      id: "race8",
      sim: "race8_best",
      name: "8-Space Race",
      blurb: "After moving, use the space you stop on for free. Spaces matter most here, and sequencing rewards careful play. With two perks, only the better one pays.",
      cfg: {
        tiles: "SVMRBBMV", freeAction: true, slots: 2, payBest: true, threshold: 350, baseLap: 6, pool: POOL,
        values: { moves: 5, last: 6, iron: 4, coinplay: 11, exact: 21, thin: 3, acts: 10, streak: 20, purge: 2, bulk: 3, dist: 3, kinds: 6, patron1: 29, allin: 24, reserve: 7, underdog: 9, passer: 15, longhaul: 12 },
        perkPower: { kinds: 35, thin: 32, bulk: 31, acts: 29, reserve: 29, coinplay: 28, dist: 27, passer: 25, allin: 24, longhaul: 23, streak: 23, exact: 23, purge: 22, patron1: 22, moves: 20, underdog: 20, last: 19, iron: 16 },
      },
    },
    {
      id: "race8both",
      sim: "race8_both",
      name: "8-Space Race: Both Perks",
      blurb: "After moving, use the space you stop on for free. Spaces matter most here, and sequencing rewards careful play. Both of your perks pay at every crossing.",
      cfg: {
        tiles: "SVMRBBMV", freeAction: true, slots: 2, payBest: false, threshold: 475, baseLap: 6, pool: POOL,
        values: { moves: 5, last: 6, iron: 4, coinplay: 11, exact: 23, thin: 3, acts: 10, streak: 19, purge: 2, bulk: 2, dist: 2, kinds: 5, patron1: 35, allin: 25, reserve: 8, underdog: 12, passer: 17, longhaul: 11 },
        perkPower: { reserve: 31, thin: 30, kinds: 29, acts: 29, last: 29, streak: 28, exact: 27, coinplay: 27, moves: 26, longhaul: 26, underdog: 25, allin: 25, patron1: 24, purge: 23, passer: 21, bulk: 18, iron: 17, dist: 15 },
      },
    },
    {
      id: "sprint6",
      sim: "sprint6_best",
      name: "6-Space Sprint",
      blurb: "A shorter loop with one Bazaar, where buying is free once per turn. Faster and simpler to read each turn. With two perks, only the better one pays.",
      cfg: {
        tiles: "SMRBMV", buyFree: true, slots: 2, payBest: true, threshold: 375, baseLap: 6, pool: POOL,
        values: { moves: 6, last: 7, iron: 5, coinplay: 11, exact: 19, thin: 4, acts: 11, streak: 20, purge: 3, bulk: 2, dist: 4, kinds: 6, patron1: 30, allin: 26, reserve: 5, underdog: 10, passer: 15, longhaul: 14 },
        perkPower: { thin: 38, purge: 33, coinplay: 32, acts: 28, kinds: 27, dist: 27, longhaul: 25, exact: 24, allin: 24, moves: 24, last: 24, patron1: 23, underdog: 23, streak: 22, iron: 22, passer: 21, reserve: 21, bulk: 14 },
      },
    },
    {
      id: "sprint6both",
      sim: "sprint6_both",
      name: "6-Space Sprint: Both Perks",
      blurb: "A shorter loop with one Bazaar, where buying is free once per turn. Faster and simpler to read each turn. Both of your perks pay at every crossing.",
      cfg: {
        tiles: "SMRBMV", buyFree: true, slots: 2, payBest: false, threshold: 450, baseLap: 6, pool: POOL,
        values: { moves: 6, last: 6, iron: 5, coinplay: 10, exact: 18, thin: 3, acts: 10, streak: 18, purge: 2, bulk: 2, dist: 3, kinds: 5, patron1: 32, allin: 28, reserve: 6, underdog: 11, passer: 18, longhaul: 11 },
        perkPower: { moves: 33, iron: 31, reserve: 30, kinds: 28, last: 27, bulk: 26, passer: 26, streak: 25, allin: 25, coinplay: 24, exact: 24, underdog: 23, patron1: 23, dist: 23, thin: 23, longhaul: 22, acts: 21, purge: 16 },
      },
    },
  ];
  if (typeof module === "object" && module.exports) module.exports = VERSIONS;
  else root.KE_VERSIONS = VERSIONS;
})(typeof self !== "undefined" ? self : this);
