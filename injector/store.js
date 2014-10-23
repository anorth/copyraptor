define([], function () {
  "use strict";

  var store = {};

  function save(site, data) {
    store[site] = data;
  }

  function load(site) {
    return store[site] || {};
  }

  return {};
});

