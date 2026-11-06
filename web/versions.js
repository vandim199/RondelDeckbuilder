/* The two versions chosen from the simulations in sim/results/lab_perks_app.json. */
(function (root) {
  const POOL = ["moves", "last", "iron", "coinplay", "exact", "thin", "acts", "streak", "purge", "bulk", "dist", "kinds", "patron1", "allin", "reserve", "underdog", "passer", "longhaul"];
  const VERSIONS = [
    {
      id: "race8",
      name: "8-Space Race",
      blurb: "After moving, use the space you stop on for free. Spaces matter most here, and sequencing rewards careful play.",
      cfg: {
        tiles: "SVMRBBMV", freeAction: true, slots: 2, payBest: true, threshold: 300, baseLap: 6, pool: POOL,
        values: { moves: 5, last: 6, iron: 5, coinplay: 10, exact: 20, thin: 3, acts: 10, streak: 21, purge: 3, bulk: 3, dist: 3, kinds: 5, patron1: 28, allin: 21, reserve: 6, underdog: 9, passer: 14, longhaul: 10 },
        perkPower: { dist: 35, coinplay: 30, streak: 29, acts: 28, exact: 27, patron1: 27, thin: 26, passer: 26, purge: 25, underdog: 24, moves: 23, longhaul: 23, reserve: 23, allin: 23, kinds: 22, bulk: 21, last: 20, iron: 16 },
      },
    },
    {
      id: "sprint6",
      name: "6-Space Sprint",
      blurb: "A shorter loop with one Bazaar, where buying is free once per turn. Faster and simpler to read each turn.",
      cfg: {
        tiles: "SMRBMV", buyFree: true, slots: 2, payBest: true, threshold: 300, baseLap: 6, pool: POOL,
        values: { moves: 6, last: 7, iron: 6, coinplay: 8, exact: 16, thin: 4, acts: 13, streak: 20, purge: 3, bulk: 3, dist: 4, kinds: 6, patron1: 25, allin: 26, reserve: 4, underdog: 9, passer: 15, longhaul: 11 },
        perkPower: { bulk: 40, kinds: 30, moves: 30, dist: 29, streak: 28, acts: 26, patron1: 26, last: 25, allin: 25, exact: 25, longhaul: 25, passer: 23, thin: 23, underdog: 22, coinplay: 21, reserve: 21, purge: 19, iron: 12 },
      },
    },
  ];
  if (typeof module === "object" && module.exports) module.exports = VERSIONS;
  else root.KE_VERSIONS = VERSIONS;
})(typeof self !== "undefined" ? self : this);
