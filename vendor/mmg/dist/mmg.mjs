// AUTO-GENERATED entry (ESM). See scripts/assemble.mjs.
import createCore from './mmg-core.mjs';
import { buildApi } from './runtime.mjs';
import descriptor from './mmg-descriptor.mjs';

export async function initialize(moduleOverrides = {}) {
  const Module = await createCore(moduleOverrides);
  const api = buildApi(Module, descriptor);
  api.FS = Module.FS;        // MEMFS access for file I/O
  api.module = Module;       // raw Emscripten module (escape hatch)
  return api;
}

export default initialize;
