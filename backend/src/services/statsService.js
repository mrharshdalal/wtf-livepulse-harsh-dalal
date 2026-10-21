/**
 * TODO: implement the real DB-backed stats queries that power the
 * dashboard and analytics pages (see benchmarks/queries.sql for the
 * target queries and performance budgets).
 */

/** @param {string} gymId */
function getLiveOccupancy(gymId) {
  throw new Error('Not implemented');
}

/** @param {string} gymId */
function getTodayRevenue(gymId) {
  throw new Error('Not implemented');
}

/** @param {string} gymId */
function getChurnRisk(gymId) {
  throw new Error('Not implemented');
}

/** @param {string} gymId */
function getHeatmap(gymId) {
  throw new Error('Not implemented');
}

function getCrossGymRevenue() {
  throw new Error('Not implemented');
}

module.exports = {
  getLiveOccupancy,
  getTodayRevenue,
  getChurnRisk,
  getHeatmap,
  getCrossGymRevenue,
};
