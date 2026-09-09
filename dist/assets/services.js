/* Replaceable service seam. MIT. This release contains NO backend or fake login. */
(function (root) {
  'use strict';
  function unavailable() {
    var error = new Error('Community service is not connected. Use portable local data.');
    error.code = 'SERVICE_UNAVAILABLE'; return Promise.reject(error);
  }
  var service = {
    version: 'qeva-community-service/1',
    capabilities: function () { return Promise.resolve({accounts:false, teams:false, sync:false, publication:false, review:false}); },
    getSession: function () { return Promise.resolve(null); },
    signIn: unavailable, signOut: unavailable, syncProgress: unavailable,
    publishSandbox: unavailable, listTeams: unavailable, createTeam: unavailable,
    submitCandidate: unavailable, requestReview: unavailable
  };
  if (typeof module === 'object' && module.exports) module.exports = service;
  else { root.QEVA = root.QEVA || {}; root.QEVA.Service = Object.freeze(service); }
}(typeof globalThis !== 'undefined' ? globalThis : this));
