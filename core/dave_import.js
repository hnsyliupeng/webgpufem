// core/dave_import.js — clean-room importer for DAVE ".dave" scene-builder files.
//
// A .dave file is a small Python script that calls s.new_frame / s.new_rigidbody /
// s.new_point / s.new_cable / ... to assemble a Scene DAG. We do NOT link or decompile
// any DAVE binary: we execute the file's own text with a tiny interpreter (assignments,
// for-loops over range(), method calls, f-strings, .format, tuples, True/False/None,
// multi-line calls) whose `s` recorder builds an equivalent WebGPUFEM Model:
//   new_frame / new_rigidbody  -> RigidBody6DOF (+ Scene DAG node so the app tree shows it)
//     parent-chained rigidbodies (translations locked relative to parent) -> world-placed
//     body + Hinge (DAVE GeometricContact joint) at the parent attachment point
//   new_point                  -> Scene point / attachment registry
//   new_cable                  -> Line (EA kN -> N, length m)
//   new_geometric_contact      -> Hinge (rigid pin, penalty k=1e9)
//   new_connector2d            -> Connector2d (k_linear kN/m -> N/m)
//   new_linear_connector_6d    -> LinCon6 (stiffness kN(/m) -> N(/m))
//   new_buoyancy + trimesh.load_obj -> BuoyancyBox from the OBJ bounding box * scale
//     (documented approximation; a full trimesh clipper is out of scope)
//   new_ballastsystem + new_tank -> BallastSystem + Tank (capacity kN -> V m^3)
//   new_visual / new_waveinteraction -> recorded in model.meta.visuals, not simulated
// DAVE units: mass in t, forces kN, stiffness kN/m, angles in degrees.
import { Model } from './scene.js';
import { RigidBody6DOF } from './vessel.js';
import { Line } from './line.js';
import { Hinge, Connector2d, LinCon6, Tank, BallastSystem, BuoyancyBox, BuoyancyMesh, Spring } from './elements.js';
import { parseObj, parseStlBase64, transformMesh, meshBBox, meshMassProps } from './mesh.js';
import { rotVecToMat3, mat3Vec } from './math.js';
import { G } from './waves.js';

const DG = Math.PI / 180;

// ---------- tiny Python-subset expression transformer ----------
function pyToJs(src) {
  // '...{}...'.format(args) -> __fmt('...{}...', args)  (up to one nesting level of parens)
  src = src.replace(/'((?:[^'\\]|\\.)*)'\.format\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g,
    (m, s, args) => `__fmt('${s}', ${args})`);
  // extract strings (with optional f/r prefixes) into placeholders
  const strings = [];
  src = src.replace(/([frb]{0,2})("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, (m, pfx, lit) => {
    let inner = lit.slice(1, -1);
    if (pfx.includes('f')) inner = inner.replace(/\{([^}]*)\}/g, (mm, e) => '${' + pyToJs(e) + '}');
    strings.push(pfx.includes('f') ? '`' + inner + '`' : lit);
    return `\x00S${strings.length - 1}\x00`;
  });
  // protect calls: name( or a.b.c( -> __C{i}(
  const calls = [];
  src = src.replace(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\(/g, (m, name) => {
    calls.push(name);
    return `\x00C${calls.length - 1}\x00(`;
  });
  // list comprehensions: [expr for v in iter] -> __compr(iter, 'v', (expr))  (call-protected so convertTuples leaves it alone)
  src = src.replace(/\[([^\[\]]+?)\s+for\s+([A-Za-z_$][\w$]*)\s+in\s+([^\[\]]+?)\]/g,
    (m, expr, v, iter) => { calls.push('__compr'); const q = String(expr).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); return `\x00C${calls.length - 1}\x00(${iter}, '${v}', '${q}')`; });
  // tuples -> arrays via recursive balanced-paren scan (call parens are protected)
  src = convertTuples(src);
  // starred elements in array/tuple literals: [*a, *b, c] -> [...a, ...b, c]
  src = src.replace(/([\[,]\s*)\*\s*/g, '$1...');
  // restore calls / strings
  src = src.replace(/\x00C(\d+)\x00\(/g, (m, i) => calls[+i] + '(');
  src = src.replace(/\x00S(\d+)\x00/g, (m, i) => strings[+i]);
  // python literals
  src = src.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null');
  return src;
}


// convert non-call parens (tuples) to arrays, recursively; call placeholders \x00C<i>\x00( are kept
function convertTuples(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const m = src.slice(i).match(/^\x00C\d+\x00\(/);
    if (m) {
      out += m[0]; i += m[0].length;
      let depth = 1, j = i;
      while (j < src.length && depth > 0) { if (src[j] === '(') depth++; else if (src[j] === ')') depth--; j++; }
      out += convertTuples(src.slice(i, j - 1)) + ')'; i = j; continue;
    }
    if (src[i] === '(') {
      let depth = 1, j = i + 1;
      while (j < src.length && depth > 0) { if (src[j] === '(') depth++; else if (src[j] === ')') depth--; j++; }
      out += '[' + convertTuples(src.slice(i + 1, j - 1)) + ']'; i = j; continue;
    }
    out += src[i]; i++;
  }
  return out;
}

// convert kwargs call args: f(a=1, b=(2,3), 'pos') -> f(['pos'], {a:1, b:[2,3]})
function kwargsToObj(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '(') {
      let depth = 0, j = i, inStr = null;
      while (j < src.length) {
        const c = src[j];
        if (inStr) { if (c === inStr && src[j - 1] !== '\\') inStr = null; }
        else if (c === '"' || c === "'" || c === '`') inStr = c;
        else if (c === '(') depth++;
        else if (c === ')') { depth--; if (depth === 0) break; }
        j++;
      }
      const args = src.slice(i + 1, j);
      const parts = []; let d = 0, cur = '', str = null;
      for (const c of args) {
        if (str) { cur += c; if (c === str) str = null; continue; }
        if (c === '"' || c === "'" || c === '`') { str = c; cur += c; continue; }
        if (c === '(' || c === '[') d++;
        if (c === ')' || c === ']') d--;
        if (c === ',' && d === 0) { parts.push(cur); cur = ''; continue; }
        cur += c;
      }
      if (cur.trim()) parts.push(cur);
      const isKw = p => /^\s*[A-Za-z_$][\w$]*\s*=(?!=)/.test(p);
      if (parts.some(isKw)) {
        const pos = parts.filter(p => !isKw(p)).map(p => `(${p})`);
        const kw = parts.filter(isKw).map(p => {
          const m = p.match(/^\s*([A-Za-z_$][\w$]*)\s*=(?!=)([\s\S]*)$/);
          return `${m[1]}: (${m[2]})`;
        }).join(', ');
        out += pos.length ? `([${pos.join(', ')}], {${kw}})` : `({${kw}})`;
      } else {
        out += '(' + args + ')';
      }
      i = j + 1;
    } else { out += ch; i++; }
  }
  return out;
}

function stripComments(line) {
  let inStr = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) { if (c === inStr && line[i - 1] !== '\\') inStr = null; }
    else if (c === '"' || c === "'") inStr = c;
    else if (c === '#') return line.slice(0, i);
  }
  return line;
}

// join physical lines into logical statements (paren/bracket/quote aware)
function logicalLines(src) {
  const out = [];
  let cur = '', depth = 0, inStr = null;
  for (const raw of src.split('\n')) {
    const line = stripComments(raw);
    cur = cur ? cur + ' ' + line.trim() : line;
    for (const c of line) {
      if (inStr) { if (c === inStr && cur[cur.length - 2] !== '\\') inStr = null; continue; }
      if (c === '"' || c === "'") inStr = c;
      else if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
    }
    if (depth <= 0 && !inStr) { out.push(cur); cur = ''; depth = 0; inStr = null; }
  }
  if (cur.trim()) out.push(cur);
  return out;
}

// ---------- interpreter ----------
function execDave(src, scope) {
  scope.__compr = (iter, v, src) => {
    const arr = Array.isArray(iter) ? iter : [];
    const fn = new Function(v, `return (${src});`);
    return arr.map(x => fn(x));
  };
  const lines = logicalLines(src).map(l => ({ indent: l.match(/^[ \t]*/)[0].length, text: l.trim() }));
  function evalExpr(expr, sc) {
    const js = kwargsToObj(pyToJs(expr));
    const names = Object.keys(sc);
    const fn = new Function(...names, `return (${js});`);
    return fn(...names.map(n => sc[n]));
  }
  function execRange(start, end) {
    let i = start;
    while (i < end && lines[i].text.trim() === '') i++;
    if (i >= end) return end;
    const base = lines[i].indent;
    let k = i;
    while (k < end) {
      const t = lines[k].text.trim();
      if (t === '') { k++; continue; }
      if (/^def\s/.test(t)) { // skip function definitions and their bodies
        let j = k + 1;
        while (j < end && (lines[j].text.trim() === '' || lines[j].indent > lines[k].indent)) j++;
        k = j; continue;
      }
      if (lines[k].indent < base) break;
      if (lines[k].indent > base) { k++; continue; }
      const fm = t.match(/^for\s+([A-Za-z_$][\w$]*)\s+in\s+(.+):$/);
      if (fm) {
        let bEnd = k + 1;
        while (bEnd < end && (lines[bEnd].text.trim() === '' || lines[bEnd].indent > base)) bEnd++;
        const arr = evalExpr(fm[2], scope);
        for (const v of (Array.isArray(arr) ? arr : [])) { scope[fm[1]] = v; execRange(k + 1, bEnd); }
        k = bEnd; continue;
      }
      const am = t.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*=(?!=)([\s\S]*)$/);
      if (am) {
        if (am[1].includes('.')) { // dotted assignment: obj.prop = value
          const dot = am[1].indexOf('.');
          const root = am[1].slice(0, dot), prop = am[1].slice(dot + 1);
          const obj = evalExpr(root, scope);
          if (obj && typeof obj === 'object') obj[prop] = evalExpr(am[2], scope);
        } else scope[am[1]] = evalExpr(am[2], scope);
        k++; continue;
      }
      evalExpr(t, scope); k++;
    }
    return k;
  }
  execRange(0, lines.length);
}

// normalize recorder call args: f(kw), f('name', kw), f(p1, p2, p3) -> kw object
function kwOf(args) {
  const last = args[args.length - 1];
  const plain = last && typeof last === 'object' && !Array.isArray(last) && !(last instanceof RigidBody6DOF);
  if (args.length === 1) return plain ? last : { __pos: args };
  if (plain && args.length >= 2) {
    let pos = args.slice(0, -1);
    if (pos.length === 1 && Array.isArray(pos[0])) pos = pos[0]; // ([('name')], {kw}) -> ['name']
    const kw = { ...last, __pos: pos };
    if (kw.name === undefined && typeof pos[0] === 'string') kw.name = pos[0];
    return kw;
  }
  return { __pos: args };
}

function meshMassPropsSafe(mesh) { try { return meshMassProps(mesh, 1).V; } catch { return null; } }

// ---------- OBJ bounds ----------
export function objBounds(text) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const line of text.split('\n')) {
    if (line.startsWith('v ')) {
      const p = line.slice(2).trim().split(/\s+/).map(Number);
      for (let i = 0; i < 3; i++) { if (p[i] < mn[i]) mn[i] = p[i]; if (p[i] > mx[i]) mx[i] = p[i]; }
    }
  }
  if (!isFinite(mn[0])) return null;
  return { mn, mx, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], center: [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2] };
}

// ---------- model builder ----------
// opts: { name, resolveAsset(name) -> text|null, rho }
export function loadDaveModel(daveText, opts = {}) {
  const model = new Model(opts.name || 'dave_import');
  model.meta.daveSource = true;
  model.meta.visuals = [];
  const rho = opts.rho ?? 1025;
  const byName = {};        // name -> { kind:'body'|'att', ref }
  const sceneNodes = {};
  const resolveAsset = (name) => (opts.resolveAsset ? opts.resolveAsset(name) : null);

  function bodyByRef(v) {
    if (!v) return null;
    if (v instanceof RigidBody6DOF) return v;
    const e = byName[v];
    return e && e.kind === 'body' ? e.ref : null;
  }
  function attByRef(v) {
    if (!v) return null;
    if (typeof v === 'string') {
      const e = byName[v];
      if (!e) return null;
      if (e.kind === 'att') return e.ref;
      // frame chained to a parent body: the attachment acts on the parent at the frame's local position
      const sn = sceneNodes[v];
      if (sn && sn.parent && byName[sn.parent.name] && byName[sn.parent.name].kind === 'body') {
        const lp = (sn.props && sn.props.position) || [0, 0, 0];
        return { type: 'vessel', body: byName[sn.parent.name].ref, localPoint: [...lp] };
      }
      return { type: 'vessel', body: e.ref, localPoint: [0, 0, 0] };
    }
    if (v.type === 'vessel' || v.type === 'fixed') return v;
    if (v instanceof RigidBody6DOF) return { type: 'vessel', body: v, localPoint: [0, 0, 0] };
    return null;
  }
  const attOf = (a) => ({ type: a.type, pos: a.pos, body: a.body, localPoint: a.localPoint });
  function addSceneNode(name, type, kw, parentName) {
    const parent = parentName && sceneNodes[parentName] ? sceneNodes[parentName] : null;
    const props = { position: kw.position || [0, 0, 0], rotation: (kw.rotation || [0, 0, 0]).map(v => v * DG) };
    const n = type === 'Point' ? model.scene.newPoint(name, props) : model.scene.newAxis(name, props);
    if (parent) { n.parent = parent; parent.children.push(n); }
    sceneNodes[name] = n;
    return n;
  }

  const s = {
    get_resource_path: (p) => p,
    new_frame(...args) {
      const kw = kwOf(args);
      const fparent = bodyByRef(kw.parent);
      const fpos = fparent && kw.position
        ? mat3Vec(rotVecToMat3(fparent.rot), kw.position).map((x, i) => x + fparent.pos[i])
        : [...(kw.position || [0, 0, 0])];
      const b = new RigidBody6DOF({
        name: kw.name, type: 'Frame', mass: 1e-6, cog: [0, 0, 0], inertia: [1e-6, 1e-6, 1e-6],
        pos: fpos, rot: (kw.rotation || [0, 0, 0]).map(v => v * DG),
        hydro: null, addedMass: [0, 0, 0, 0, 0, 0],
        fixed: kw.fixed === true ? [true, true, true, true, true, true] : (kw.fixed || [true, true, true, true, true, true]),
      });
      model.addBody(b);
      byName[kw.name] = { kind: 'body', ref: b };
      addSceneNode(kw.name, 'Axis', kw, kw.parent);
      return b;
    },
    new_rigidbody(...args) {
      const kw = kwOf(args);
      const mass = (kw.mass ?? 1) * 1000; // t -> kg
      const cog = kw.cog || [0, 0, 0];
      const ir = kw.inertia_radii;
      const inertia = ir ? ir.map(r => mass * r * r) : [mass / 12, mass / 12, mass / 12];
      const parent = bodyByRef(kw.parent);
      let fixed = kw.fixed === false ? [false, false, false, false, false, false]
        : kw.fixed === true ? [true, true, true, true, true, true]
        : (kw.fixed || [false, false, false, false, false, false]);
      const rot = (kw.rotation || [0, 0, 0]).map(v => v * DG);
      // initial world position follows the parent chain (parents precede children)
      let pos;
      if (parent && kw.position) pos = mat3Vec(rotVecToMat3(parent.rot), kw.position).map((v, i) => v + parent.pos[i]);
      else pos = [...(kw.position || [0, 0, 0])];
      const b = new RigidBody6DOF({
        name: kw.name, type: 'RigidBody', mass, cog: [...cog], inertia, pos, rot,
        hydro: null, addedMass: [0, 0, 0, 0, 0, 0], fixed: [...fixed],
      });
      model.addBody(b);
      byName[kw.name] = { kind: 'body', ref: b };
      addSceneNode(kw.name, 'Axis', { position: kw.position || [0, 0, 0], rotation: kw.rotation || [0, 0, 0] }, kw.parent);
      // parent-chained with translations locked relative to parent => Hinge joint at the
      // parent attachment point; release the body translations (the hinge provides them)
      if (parent && kw.position && fixed[0] && fixed[1] && fixed[2]) {
        model.addElement(new Hinge({
          name: `joint_${kw.name}`,
          attA: { type: 'vessel', body: parent, localPoint: [...kw.position] },
          attB: { type: 'vessel', body: b, localPoint: [0, 0, 0] },
          k: 1e9,
        }));
        b.fixed = [false, false, false, fixed[3], fixed[4], fixed[5]];
      }
      return b;
    },
    new_point(...args) {
      const kw = kwOf(args);
      const parent = bodyByRef(kw.parent);
      addSceneNode(kw.name, 'Point', kw, kw.parent);
      const att = parent
        ? { type: 'vessel', body: parent, localPoint: kw.position || [0, 0, 0], name: kw.name }
        : { type: 'fixed', pos: kw.position || [0, 0, 0], name: kw.name };
      byName[kw.name] = { kind: 'att', ref: att };
      return att;
    },
    new_cable(...args) {
      const kw = kwOf(args);
      const A = attByRef(kw.endA) || { type: 'fixed', pos: [0, 0, 0] };
      const B = attByRef(kw.endB) || { type: 'fixed', pos: [0, 0, 0] };
      const line = new Line({
        name: kw.name, nSeg: kw.segments ?? 8, length: kw.length ?? 10,
        d: kw.diameter ?? 0.1, massPerLen: 0.01, EA: (kw.EA ?? 1e5) * 1000, // kN -> N
        buoyant: kw.buoyant ?? false, initShape: 'straight',
        endA: attOf(A), endB: attOf(B),
      });
      model.addLine(line);
      return line;
    },
    new_geometric_contact(...args) {
      const kw = kwOf(args);
      const A = attByRef(kw.main), B = attByRef(kw.secondary);
      if (!A || !B) return null;
      const e = new Hinge({ name: kw.name || 'contact', k: 1e9, attA: attOf(A), attB: attOf(B) });
      model.addElement(e);
      return e;
    },
    new_connector2d(...args) {
      const kw = kwOf(args);
      const A = attByRef(kw.master), B = attByRef(kw.slave);
      if (!A || !B) return null;
      const e = new Connector2d({
        name: kw.name || 'connector2d', k_linear: (kw.k_linear ?? 1e9) * 1000, // kN/m -> N/m
        master: attOf(A), slave: attOf(B),
      });
      model.addElement(e);
      return e;
    },
    new_linear_connector_6d(...args) {
      const kw = kwOf(args);
      const A = attByRef(kw.main), B = attByRef(kw.secondary);
      if (!A || !B) return null;
      const K = (kw.stiffness || [0, 0, 0, 0, 0, 0]).map(v => v * 1000); // kN(/m) -> N(/m)
      const e = new LinCon6({ name: kw.name || 'LC6d', K, attA: attOf(A), attB: attOf(B) });
      model.addElement(e);
      return e;
    },
    new_spring(...args) {
      const kw = kwOf(args);
      const A = attByRef(kw.main ?? kw.attA), B = attByRef(kw.secondary ?? kw.attB);
      if (!A || !B) return null;
      const e = new Spring({
        name: kw.name || 'Spring', k: (kw.k ?? kw.stiffness ?? 1e2) * 1000,
        L0: kw.length ?? kw.rest_length ?? null,
        attA: attOf(A), attB: attOf(B),
      });
      model.addElement(e);
      return e;
    },
    new_buoyancy(...args) {
      const kw = kwOf(args);
      const parent = bodyByRef(kw.parent);
      return {
        trimesh: {
          load_obj(...largs) {
            const lkw = kwOf(largs);
            const path = lkw.path ?? (lkw.__pos && lkw.__pos[0]) ?? '';
            const scale = lkw.scale || [1, 1, 1];
            const off = lkw.offset || [0, 0, 0];
            const objText = resolveAsset(String(path).replace(/\\/g, '/').split('/').pop());
            if (objText) {
              // exact trimesh buoyancy: clip the transformed OBJ by the waterplane (core/mesh.js)
              const mesh = transformMesh(parseObj(objText), { scale, rotation: lkw.rotation || [0, 0, 0], offset: off });
              const e = new BuoyancyMesh({ name: kw.name || 'Buoyancy', body: parent, mesh, rho });
              model.addElement(e);
              model.meta.buoyancyMesh = { path: String(path), verts: mesh.pos.length, tris: mesh.tri.length, V: meshMassPropsSafe(mesh) };
              return e;
            }
            const bb = objText ? objBounds(objText) : null;
            let L, B, T, center;
            if (bb) {
              L = bb.size[0] * scale[0]; B = bb.size[1] * scale[1]; T = bb.size[2] * scale[2];
              center = [bb.center[0] * scale[0] + off[0], bb.center[1] * scale[1] + off[1], bb.center[2] * scale[2] + off[2]];
            } else {
              L = scale[0]; B = scale[1]; T = scale[2]; center = [...off];
            }
            const e = new BuoyancyBox({ name: kw.name || 'Buoyancy', body: parent, L, B, T, offset: center, rho });
            model.addElement(e);
            model.meta.buoyancyApprox = `OBJ ${path} bounding box x scale (asset text unavailable)`;
            return e;
          },
        },
      };
    },
    new_ballastsystem(...args) {
      const kw = kwOf(args);
      const parent = bodyByRef(kw.parent);
      const bs = new BallastSystem({ name: kw.name || 'Ballast', tanks: [] });
      bs.tanks.append = (x) => bs.tanks.push(x); // python-style list.append
      model.meta.ballastSystem = bs;
      model.meta.ballastParent = parent;
      return {
        tanks: bs.tanks,
        new_tank(...targs) {
          const tkw = kwOf(targs);
          const name = tkw.name ?? tkw.__pos?.[0];
          const position = tkw.position ?? tkw.__pos?.[1] ?? [0, 0, 0];
          const capacity = tkw.capacity ?? tkw.__pos?.[2] ?? 0;
          // capacity in kN = V * rho(t/m^3) * g  ->  V = capacity / (rho_t * g)
          const V = Math.abs(capacity) / ((kw.fluid_density ?? 1.025) * G);
          const t = new Tank({ name, body: parent, V, fill: 0, rho, cog: [...position] });
          model.addElement(t);
          bs.tanks.push(t);
          return t;
        },
      };
    },
    new_tank(...args) {
      const kw = kwOf(args);
      const parent = bodyByRef(kw.parent);
      const V = kw.volume ?? (kw.capacity ? Math.abs(kw.capacity) / (1.025 * G) : 100);
      const t = new Tank({ name: kw.name, body: parent, V, fill: kw.fill ?? 0, rho, cog: [...(kw.cog || kw.position || [0, 0, 0])] });
      // DAVE Tank has a trimesh: t.trimesh.load_file('....stl', scale=, rotation=, offset=) sets the real tank volume/cog
      t.trimesh = {
        load_file(...fargs) {
          const fkw = kwOf(fargs);
          const path = String(fkw.path ?? fkw.__pos?.[0] ?? '').replace(/\\/g, '/').split('/').pop();
          const raw = resolveAsset(path);
          if (!raw) return;
          const mesh = /^b64:/.test(raw)
            ? transformMesh(parseStlBase64(raw.slice(4)), { scale: fkw.scale || [1, 1, 1], rotation: fkw.rotation || [0, 0, 0], offset: fkw.offset || [0, 0, 0] })
            : transformMesh(parseObj(raw), { scale: fkw.scale || [1, 1, 1], rotation: fkw.rotation || [0, 0, 0], offset: fkw.offset || [0, 0, 0] });
          const mp = meshMassProps(mesh, 1);
          t.V = mp.V; t.localCog = mp.c; t.mesh = mesh; t.tris = mesh.tri.length;
          return t;
        },
      };
      model.addElement(t);
      return t;
    },
    new_visual(...args) {
      const kw = kwOf(args);
      const parent = bodyByRef(kw.parent);
      const objText = kw.path ? resolveAsset(String(kw.path).replace(/\\/g, '/').split('/').pop()) : null;
      let meshAttached = false;
      if (parent && objText) {
        parent.mesh = transformMesh(parseObj(objText), { scale: kw.scale || [1, 1, 1], rotation: kw.rotation || [0, 0, 0], offset: kw.offset || [0, 0, 0] });
        meshAttached = true;
      }
      model.meta.visuals.push({ name: kw.name, path: kw.path, mesh: meshAttached, parent: kw.parent, kind: 'visual' });
      return {};
    },
    new_waveinteraction(...args) {
      const kw = kwOf(args);
      model.meta.visuals.push({ name: kw.name, path: kw.path, parent: kw.parent, kind: 'wave', note: 'dhyd coefficients not simulated (linear box hydrostatics used)' });
      return {};
    },
  };

  const scope = {
    s,
    solved: (x) => x,
    __fmt: (str, ...a) => { let i = 0; return str.replace(/\{[^}]*\}/g, () => String(a[i++])); },
    range: (a, b, c) => {
      if (b === undefined) { b = a; a = 0; }
      const step = c ?? 1, out = [];
      for (let v = a; step > 0 ? v < b : v > b; v += step) out.push(v);
      return out;
    },
  };
  execDave(daveText, scope);
  return model;
}
