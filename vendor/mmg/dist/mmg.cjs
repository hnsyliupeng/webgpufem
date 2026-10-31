// AUTO-GENERATED entry (CJS). See scripts/assemble.mjs.
const createCore = require('./mmg-core.cjs');
const { buildApi } = require('./runtime.cjs');
const descriptor = require('./mmg-descriptor.cjs');

async function initialize(moduleOverrides = {}) {
  const Module = await createCore(moduleOverrides);
  const api = buildApi(Module, descriptor);
  api.FS = Module.FS;
  api.module = Module;
  return api;
}

module.exports = initialize;
module.exports.initialize = initialize;
module.exports.default = initialize;
