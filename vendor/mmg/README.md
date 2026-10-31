# mmg-wasm

[![Build](https://github.com/loumalouomega/MMG-WASM/actions/workflows/build.yml/badge.svg)](https://github.com/loumalouomega/MMG-WASM/actions/workflows/build.yml)
[![Docs](https://github.com/loumalouomega/MMG-WASM/actions/workflows/docs.yml/badge.svg)](https://loumalouomega.github.io/MMG-WASM/)
[![npm](https://img.shields.io/npm/v/%40loumalouomega%2Fmmg-wasm)](https://www.npmjs.com/package/@loumalouomega/mmg-wasm)
[![npm downloads](https://img.shields.io/npm/dm/%40loumalouomega%2Fmmg-wasm)](https://www.npmjs.com/package/@loumalouomega/mmg-wasm)
![types](https://img.shields.io/badge/types-included-blue)
![node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen)
![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?logo=webassembly&logoColor=white)
[![license: LGPL-3.0-or-later](https://img.shields.io/badge/license-LGPL--3.0--or--later-blue)](LICENSE)

[MMG](https://www.mmgtools.org/) — the open-source surface and volume
remeshers — compiled to WebAssembly with a typed JavaScript/TypeScript API.
Mesh adaptation, isotropic/anisotropic remeshing, level-set discretization
and 2D mesh generation in Node.js and the browser, no native binaries.

- All three modules in one ~1.1 MB wasm: **mmg2d** (planar), **mmgs**
  (surfaces), **mmg3d** (tetrahedral volumes) — MMG v5.8.0.
- **~350 typed functions** generated from the upstream headers: the full
  in-memory `Set_*`/`Get_*` API (scalar and bulk typed-array variants),
  parameter control, and the `mmg*lib`/`mmg*ls`/`mmg*mov` entry points.
- File I/O through an in-memory filesystem: Medit `.mesh`/`.sol`, Gmsh
  `.msh`.
- Typed wrapper hides handles, return codes and pointer marshalling —
  failures throw JS `Error`s; dual ESM + CJS with TypeScript declarations.

**Full documentation: <https://loumalouomega.github.io/MMG-WASM/>**

## Install

```bash
npm install @loumalouomega/mmg-wasm
```

Prebuilt WASM ships in the package — no Emscripten, CMake or compiler
needed.

## Quick start

Adapt the canonical MMG cube (12 vertices / 12 tetrahedra / 20 boundary
triangles):

```js
import initialize from '@loumalouomega/mmg-wasm';

const mmg = await initialize();
const { mmg3d } = mmg;

const h = mmg3d.init(); // allocates MMG5_pMesh (h.mesh) + MMG5_pSol (h.met)

mmg3d.setMeshSize(h.mesh, 12, 12, 0, 20, 0, 0);
vertices.forEach(([x, y, z], i) => mmg3d.setVertex(h.mesh, x, y, z, 0, i + 1));
tets.forEach(([a, b, c, d, ref], i) =>
  mmg3d.setTetrahedron(h.mesh, a, b, c, d, ref, i + 1));
tris.forEach(([a, b, c, ref], i) =>
  mmg3d.setTriangle(h.mesh, a, b, c, ref, i + 1));

mmg3d.setDparameter(h.mesh, h.met, mmg3d.DPARAM_hausd, 0.1);
mmg3d.remesh(h.mesh, h.met); // MMG3D_mmg3dlib

const { np, ne } = mmg3d.getMeshSize(h.mesh);
const { vertices: coords } = mmg3d.getVertices(h.mesh, np); // Float64Array
const { tetra } = mmg3d.getTetrahedra(h.mesh, ne);          // Int32Array
mmg3d.free(h);
```

CommonJS works too: `const initialize = require('@loumalouomega/mmg-wasm')`.

## File-based workflow (MEMFS)

```js
const { mmg3d, FS } = await initialize();
FS.writeFile('/in.mesh', meshFileBytes);

const h = mmg3d.init();
mmg3d.loadMesh(h.mesh, '/in.mesh');
mmg3d.setDparameter(h.mesh, h.met, mmg3d.DPARAM_hausd, 0.01);
mmg3d.remesh(h.mesh, h.met);
mmg3d.saveMesh(h.mesh, '/out.mesh');
mmg3d.free(h);

const result = FS.readFile('/out.mesh'); // Uint8Array
```

## API mapping

C functions map mechanically to module methods:
`MMG3D_Set_vertex` → `mmg.mmg3d.setVertex(...)`, `MMG2D_Get_triangles` →
`mmg.mmg2d.getTriangles(...)`. Entry points get aliases:

| Module | remesh | levelset | move | generate |
|--------|--------|----------|------|----------|
| `mmg3d` | `mmg3dlib` | `mmg3dls` | `mmg3dmov`* | — |
| `mmg2d` | `mmg2dlib` | `mmg2dls` | `mmg2dmov`* | `mmg2dmesh` |
| `mmgs` | `mmgslib` | `mmgsls` | — | — |

\* Lagrangian motion requires MMG's optional elasticity library and is not
functional in the WASM build.

Errors: `Set_*`/`Get_*`/`load*`/`save*` throw on failure; the entry points
return `MMG5_SUCCESS`/`MMG5_LOWFAILURE` and throw only on
`MMG5_STRONGFAILURE`. Parameter enums are constants on each module
(`mmg3d.DPARAM_hausd`, `mmg2d.IPARAM_verbose`, ...).

## Project structure

```
mmg/                  upstream MMG (git submodule, unmodified)
src/mmgjs_glue.c      fixed-arity shims for the variadic init/free functions
src/runtime.mjs       the single generic JS marshaller
scripts/              build + codegen (gen_js.py parses the MMG headers)
generated/            committed codegen output (exports, descriptor, .d.ts)
test/                 node:test suites + Playwright browser test
examples/browser/     self-contained browser demo
docs/ + mkdocs.yml    documentation site
dist/                 build output (published to npm; gitignored)
```

## Building from source

```bash
git clone --recurse-submodules https://github.com/loumalouomega/MMG-WASM.git
cd MMG-WASM
npm run setup        # pinned Emscripten SDK -> .emsdk/
npm run build:wasm   # libmmg.a -> dist/mmg-core.{mjs,cjs,wasm} + entries
npm install && npm test
```

See [Building from source](https://loumalouomega.github.io/MMG-WASM/building/)
for details (flags, debug builds, bumping the MMG version).

## npm scripts

| Script | Purpose |
|--------|---------|
| `setup` | install the pinned Emscripten SDK |
| `build:wasm` / `build` | full WASM build + dist assembly |
| `gen` | regenerate bindings from the MMG headers |
| `test` | Node tests (raw exports + typed API) |
| `test:browser` | headless-Chromium test via Playwright |
| `docs:api` / `docs:build` / `docs:serve` | documentation |

## Versioning

The package tracks upstream MMG (currently **v5.8.0**, pinned as a
submodule); the wrapper has its own semver. Regenerated bindings mean new
upstream API functions usually appear here with zero wrapper code.

## Licensing — important

MMG is **LGPL-3.0-or-later**; mmg-wasm statically links it into the
`.wasm`, and the whole package is distributed under **LGPL-3.0-or-later**.
Using the npm package in a (proprietary) app is fine under the usual LGPL
terms; see [Licensing](https://loumalouomega.github.io/MMG-WASM/licensing/)
for the practical obligations and how relinking is satisfied.

This project is not affiliated with or endorsed by the Mmg consortium. If
you use it in academic work, please cite the MMG papers
([mmgtools.org](https://www.mmgtools.org/)).

## Attribution

- [MMG](https://github.com/MmgTools/mmg) — C. Dapogny, C. Dobrzynski,
  P. Frey, A. Froehly and contributors.
- Built with [Emscripten](https://emscripten.org/).
