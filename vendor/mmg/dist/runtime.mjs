// Generic runtime marshaller for the MMG C API. Given a loaded Emscripten
// `Module` and the generated descriptor table, builds the typed JS API
// (api.mmg3d / api.mmg2d / api.mmgs). This is the single place where
// pointer/heap marshalling lives; the generator emits only data, never
// marshalling code.
//
// Handle model: a JS handle is the address of a persistent 4-byte heap slot
// holding the MMG5_pMesh / MMG5_pSol struct pointer ("box"). Functions taking
// the struct by value (kind "handle") get the dereferenced slot; functions
// taking MMG5_pMesh* / MMG5_pSol* (kind "handleref", e.g. the init/free
// shims) get the slot address itself, so MMG's own pointer NULL-ing on free
// behaves exactly as in C.
//
// Error model (no ierr out-param in MMG):
//   ret "status"  -> 1 = ok, anything else throws
//   ret "libcode" -> MMG5_SUCCESS(0) / MMG5_LOWFAILURE(1) returned,
//                    MMG5_STRONGFAILURE(2) throws
//   ret "int"/"double" -> raw value returned; "void" -> undefined
//
// wasm32 layout: pointers are 4 bytes; double is 8 bytes.

const PTR = 4;
const MMG5_STRONGFAILURE = 2;

export function buildApi(Module, descriptor) {
  const { _malloc, _free } = Module;
  // Fresh views on every access: ALLOW_MEMORY_GROWTH invalidates typed arrays.
  const u32 = () => Module.HEAPU32;
  const i32 = () => Module.HEAP32;
  const f64 = () => Module.HEAPF64;

  function writeCString(s) {
    const len = Module.lengthBytesUTF8(s) + 1;
    const p = _malloc(len);
    Module.stringToUTF8(s, p, len);
    return p;
  }
  function writeIntArray(values) {
    const n = values.length;
    const p = _malloc(Math.max(n, 1) * 4);
    for (let i = 0; i < n; i++) i32()[(p >> 2) + i] = values[i] | 0;
    return p;
  }
  function writeDoubleArray(values) {
    const n = values.length;
    const p = _malloc(Math.max(n, 1) * 8);
    for (let i = 0; i < n; i++) f64()[(p >> 3) + i] = +values[i];
    return p;
  }

  // Allocate a zeroed 4-byte pointer slot (handle box / int out-param).
  function allocSlot() {
    const p = _malloc(PTR);
    u32()[p >> 2] = 0;
    return p;
  }

  function makeCall(fn) {
    const fptr = Module["_" + fn.c];
    const countNames = fn.counts || [];
    return function (...jsArgs) {
      if (!fptr) throw new Error(`mmg: ${fn.c} is not exported in this build`);
      const cargs = [];
      const frees = [];   // heap blocks to _free after the call
      const outputs = []; // {name, kind, ptr, n}
      let ai = 0;         // index into jsArgs (input params only)

      // trailing count params (sizes of caller-sized output arrays)
      const nInputs = fn.args.filter((a) => !a.output).length;
      const countVals = {};
      countNames.forEach((cn, i) => {
        const v = jsArgs[nInputs + i];
        if (!Number.isInteger(v) || v < 0) {
          throw new Error(`mmg: ${fn.js} needs a non-negative integer '${cn}' count argument`);
        }
        countVals[cn] = v;
      });

      for (const a of fn.args) {
        if (a.output) {
          const isD = a.kind === "odouble" || a.kind === "oarraydouble";
          let n = 1;
          if (a.kind.startsWith("oarray")) {
            n = a.countParam != null ? (a.per || 1) * countVals[a.countParam]
              : a.count;
          }
          const ptr = _malloc(Math.max(n, 1) * (isD ? 8 : 4));
          // zero the buffer so untouched entries read back as 0
          if (isD) f64().fill(0, ptr >> 3, (ptr >> 3) + n);
          else i32().fill(0, ptr >> 2, (ptr >> 2) + n);
          outputs.push({ name: a.name, kind: a.kind, ptr, n });
          cargs.push(ptr);
          continue;
        }
        const v = jsArgs[ai++];
        switch (a.kind) {
          case "iint": cargs.push(v | 0); break;
          case "idouble": cargs.push(+v); break;
          case "istring": {
            if (v == null) { cargs.push(0); break; }
            const p = writeCString(String(v));
            frees.push(p); cargs.push(p); break;
          }
          case "handle": // pass the boxed struct pointer
            cargs.push(v == null ? 0 : u32()[v >> 2]); break;
          case "handleref": // pass the box itself
            cargs.push(v == null ? 0 : v); break;
          case "iarrayint": {
            if (v == null) { cargs.push(0); break; }
            const p = writeIntArray(v); frees.push(p); cargs.push(p); break;
          }
          case "iarraydouble": {
            if (v == null) { cargs.push(0); break; }
            const p = writeDoubleArray(v); frees.push(p); cargs.push(p); break;
          }
          default:
            throw new Error(`mmg: unsupported arg kind ${a.kind} in ${fn.c}`);
        }
      }

      let ret;
      try {
        ret = fptr(...cargs);
        if (fn.ret === "status" && ret !== 1) {
          throw new Error(`${fn.c} failed (returned ${ret})`);
        }
        if (fn.ret === "libcode" && ret === MMG5_STRONGFAILURE) {
          throw new Error(`${fn.c} failed (MMG5_STRONGFAILURE)`);
        }
        const result = {};
        for (const o of outputs) result[o.name] = readOutput(o);
        if (outputs.length === 0) {
          if (fn.ret === "libcode" || fn.ret === "int" || fn.ret === "double") return ret;
          return undefined;
        }
        if (fn.ret === "libcode" || fn.ret === "int" || fn.ret === "double") {
          result.value = ret;
        }
        return result;
      } finally {
        for (const p of frees) _free(p);
        for (const o of outputs) _free(o.ptr);
      }
    };

    function readOutput(o) {
      switch (o.kind) {
        case "oint": return i32()[o.ptr >> 2];
        case "odouble": return f64()[o.ptr >> 3];
        case "oarrayint": {
          const r = new Int32Array(o.n);
          r.set(i32().subarray(o.ptr >> 2, (o.ptr >> 2) + o.n));
          return r;
        }
        case "oarraydouble": {
          const r = new Float64Array(o.n);
          r.set(f64().subarray(o.ptr >> 3, (o.ptr >> 3) + o.n));
          return r;
        }
        default: throw new Error(`mmg: unsupported output kind ${o.kind}`);
      }
    }
  }

  // --- build the module tree -------------------------------------------------
  const root = {};
  const aliases = descriptor.aliases || {};
  for (const fn of descriptor.functions) {
    if (fn.unsupported) continue;
    let node = root;
    for (const p of fn.path) node = (node[p] ||= {});
    const call = makeCall(fn);
    node[fn.js] = call;
    if (aliases[fn.c]) node[aliases[fn.c]] = call;
  }

  // --- constants ---------------------------------------------------------------
  const consts = descriptor.constants || {};
  Object.assign(root, consts.root || {});
  for (const mod of ["mmg3d", "mmg2d", "mmgs"]) {
    if (root[mod] && consts[mod]) Object.assign(root[mod], consts[mod]);
  }

  // --- per-module lifecycle sugar ---------------------------------------------
  // init(): allocate zeroed handle boxes and run the Init_mesh shim.
  // free(): run the Free_all shim, then release the boxes.
  for (const mod of ["mmg3d", "mmg2d", "mmgs"]) {
    const node = root[mod];
    if (!node || !node.initMesh) continue;
    const hasDisp = mod !== "mmgs";
    node.init = function (options = {}) {
      const { levelset = false, displacement = false } = options;
      if (displacement && !hasDisp) {
        throw new Error(`mmg: ${mod} has no Lagrangian displacement support`);
      }
      const handles = { mesh: allocSlot(), met: allocSlot() };
      if (levelset) handles.ls = allocSlot();
      if (displacement) handles.disp = allocSlot();
      const args = [handles.mesh, handles.met, handles.ls ?? null];
      if (hasDisp) args.push(handles.disp ?? null);
      try {
        node.initMesh(...args);
      } catch (e) {
        for (const k of Object.keys(handles)) _free(handles[k]);
        throw e;
      }
      return handles;
    };
    node.free = function (handles) {
      const args = [handles.mesh, handles.met, handles.ls ?? null];
      if (hasDisp) args.push(handles.disp ?? null);
      node.freeAll(...args);
      for (const k of ["mesh", "met", "ls", "disp"]) {
        if (handles[k] != null) _free(handles[k]);
      }
    };
  }

  return root;
}
