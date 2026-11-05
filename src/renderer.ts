// WebGPU 渲染器（TypeScript 编译为 js/renderer.js）
// WGSL 管线：线段（屏幕空间加宽的 billboard）、三角网格（Lambert）、海面/网格
// 相机：内置轨道控制（拖拽旋转、滚轮缩放），不依赖 three.js

export interface RenderLine { nodeIds: number[]; getPoint: (i: number) => [number, number, number]; color: [number, number, number]; width: number; getSegColor?: (seg: number) => [number, number, number]; }
export interface RenderMesh { verts: number[][]; faces: number[][]; color: [number, number, number]; getModel: () => { pos: number[]; rot: number[] }; }

const WGSL_COMMON = /* wgsl */`
struct Uniforms {
  viewProj : mat4x4<f32>,
  camPos : vec4<f32>,
  resolution : vec4<f32>,
  lightDir : vec4<f32>,
};
@group(0) @binding(0) var<uniform> U : Uniforms;
`;

const WGSL_LINE = WGSL_COMMON + /* wgsl */`
struct Out {
  @builtin(position) pos : vec4<f32>,
  @location(0) color : vec4<f32>,
};
@vertex fn vs(@builtin(vertex_index) vi : u32,
              @location(0) p0 : vec4<f32>,
              @location(1) p1 : vec4<f32>,
              @location(2) width : f32,
              @location(3) color : vec4<f32>) -> Out {
  // 每段 6 顶点：corner = [(0,-1),(1,-1),(0,1),(0,1),(1,-1),(1,1)]
  let corners = array<vec2<f32>,6>(vec2(0.,-1.), vec2(1.,-1.), vec2(0.,1.), vec2(0.,1.), vec2(1.,-1.), vec2(1.,1.));
  let c = corners[vi % 6u];
  let c0 = U.viewProj * p0;
  let c1 = U.viewProj * p1;
  var base = mix(c0, c1, c.x);
  let d0 = c0.xy / c0.w;
  let d1 = c1.xy / c1.w;
  var dir = d1 - d0;
  let l = length(dir);
  if (l > 1e-6) { dir = dir / l; } else { dir = vec2(1., 0.); }
  let perp = vec2(-dir.y, dir.x);
  let ndcOff = perp * c.y * width * 2.0 / U.resolution.xy;
  base = vec4(base.xy + ndcOff * base.w, base.zw);
  var o : Out;
  o.pos = base;
  o.color = color;
  return o;
}
@fragment fn fs(o : Out) -> @location(0) vec4<f32> { return o.color; }
`;

const WGSL_MESH = WGSL_COMMON + /* wgsl */`
struct Out {
  @builtin(position) pos : vec4<f32>,
  @location(0) nrm : vec3<f32>,
  @location(1) color : vec4<f32>,
};
@group(1) @binding(0) var<uniform> M : mat4x4<f32>; // model
@vertex fn vs(@location(0) p : vec3<f32>, @location(1) n : vec3<f32>,
              @location(2) color : vec4<f32>) -> Out {
  var o : Out;
  let wp = M * vec4(p, 1.0);
  o.pos = U.viewProj * wp;
  o.nrm = normalize((M * vec4(n, 0.0)).xyz);
  o.color = color;
  return o;
}
@fragment fn fs(o : Out) -> @location(0) vec4<f32> {
  let ndl = max(dot(normalize(o.nrm), normalize(U.lightDir.xyz)), 0.0);
  let amb = 0.35;
  return vec4(o.color.rgb * (amb + 0.65 * ndl), o.color.a);
}
`;

function perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fovY / 2), m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f;
  m[10] = far / (near - far); m[11] = -1;
  m[14] = far * near / (near - far);
  return m;
}
function lookAt(eye: number[], target: number[], up: number[]): Float32Array {
  const z = norm3(sub3(eye, target)), x = norm3(cross3(up, z)), y = cross3(z, x);
  const m = new Float32Array(16);
  m[0] = x[0]; m[1] = y[0]; m[2] = z[0]; m[3] = 0;
  m[4] = x[1]; m[5] = y[1]; m[6] = z[1]; m[7] = 0;
  m[8] = x[2]; m[9] = y[2]; m[10] = z[2]; m[11] = 0;
  m[12] = -dot3(x, eye); m[13] = -dot3(y, eye); m[14] = -dot3(z, eye); m[15] = 1;
  return m;
}
function mul4(a: Float32Array, b: Float32Array): Float32Array {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++)
    for (let k = 0; k < 4; k++) o[i * 4 + j] += a[k * 4 + j] * b[i * 4 + k];
  return o;
}
const sub3 = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a: number[]) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export class WebGPURenderer {
  canvas: HTMLCanvasElement;
  device!: GPUDevice;
  context!: GPUCanvasContext;
  format!: GPUTextureFormat;
  linePipe!: GPURenderPipeline;
  meshPipe!: GPURenderPipeline;
  uniformBuf!: GPUBuffer;
  lineBuf!: GPUBuffer;
  lineCapacity = 0;
  seaBuf!: GPUBuffer;
  meshObjs: { buf: GPUBuffer; count: number; color: GPUBuffer; modelBuf: GPUBuffer; mesh: RenderMesh }[] = [];
  lines: RenderLine[] = [];
  // 轨道相机
  target = [0, 0, 0]; dist = 500; theta = 0.9; phi = 1.05;
  private dragging = false; private px = 0; private py = 0;

  constructor(canvas: HTMLCanvasElement) { this.canvas = canvas; }

  async init(): Promise<boolean> {
    if (!(navigator as any).gpu) return false;
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) return false;
    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
    this.format = (navigator as any).gpu.getPreferredCanvasFormat();
    this.context.configure({ device: this.device, format: this.format, alphaMode: 'opaque' });

    const uniformMod = this.device.createShaderModule({ code: WGSL_LINE });
    const meshMod = this.device.createShaderModule({ code: WGSL_MESH });
    const bgl0 = this.device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {} }] });
    const bgl1 = this.device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {} }] });
    this.linePipe = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl0] }),
      vertex: { module: uniformMod, entryPoint: 'vs', buffers: [{ arrayStride: 40, attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x4' },
        { shaderLocation: 1, offset: 16, format: 'float32x4' },
        { shaderLocation: 2, offset: 32, format: 'float32' },
        { shaderLocation: 3, offset: 36, format: 'float32x4' }] }] },
      fragment: { module: uniformMod, entryPoint: 'fs', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list' }, depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    });
    this.meshPipe = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bgl0, bgl1] }),
      vertex: { module: meshMod, entryPoint: 'vs', buffers: [{ arrayStride: 40, attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },
        { shaderLocation: 1, offset: 12, format: 'float32x3' },
        { shaderLocation: 2, offset: 24, format: 'float32x4' }] }] },
      fragment: { module: meshMod, entryPoint: 'fs', targets: [{ format: this.format }] },
      primitive: { topology: 'triangle-list' }, depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    });
    this.uniformBuf = this.device.createBuffer({ size: 144, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.lineBuf = this.device.createBuffer({ size: 4096, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.seaBuf = this.makeSea();
    this.bindControls();
    return true;
  }

  private bindControls() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => { this.dragging = true; this.px = e.clientX; this.py = e.clientY; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointerup', () => { this.dragging = false; });
    c.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.theta -= (e.clientX - this.px) * 0.005;
      this.phi = clamp(this.phi - (e.clientY - this.py) * 0.005, 0.05, Math.PI - 0.05);
      this.px = e.clientX; this.py = e.clientY;
    });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.dist = clamp(this.dist * (1 + e.deltaY * 0.001), 5, 5000); }, { passive: false });
  }

  private makeSea(): GPUBuffer {
    const S = 1500, y = 0;
    const verts: number[] = [];
    const quad = (a: number[], b: number[], c: number[], d: number[]) => {
      const n = norm3(cross3(sub3(b, a), sub3(c, a)));
      const col = [0.04, 0.18, 0.30, 1];
      for (const p of [a, b, c, a, c, d]) verts.push(...p, ...n, ...col);
    };
    quad([-S, y, -S], [S, y, -S], [S, y, S], [-S, y, S]);
    const buf = this.device.createBuffer({ size: verts.length * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    this.device.queue.writeBuffer(buf, 0, new Float32Array(verts));
    return buf;
  }

  setLines(lines: RenderLine[]) { this.lines = lines; }
  setMeshes(meshes: RenderMesh[]) {
    for (const o of this.meshObjs) { o.buf.destroy(); o.color.destroy(); o.modelBuf.destroy(); }
    this.meshObjs = meshes.map((mesh) => {
      const verts: number[] = [];
      const pos = new Map<number[], number[]>();
      for (const f of mesh.faces) {
        const [a, b, c] = [mesh.verts[f[0]], mesh.verts[f[1]], mesh.verts[f[2]]];
        const n = norm3(cross3(sub3(b, a), sub3(c, a)));
        for (const p of [a, b, c]) verts.push(...p, ...n, ...mesh.color); // color 为 vec4 含 alpha
      }
      const buf = this.device.createBuffer({ size: verts.length * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      this.device.queue.writeBuffer(buf, 0, new Float32Array(verts));
      const color = this.device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM });
      const modelBuf = this.device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      return { buf, count: mesh.faces.length * 3, color, modelBuf, mesh };
    });
  }

  frame() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(this.canvas.clientWidth * dpr), h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    const aspect = w / h;
    const eye = [
      this.target[0] + this.dist * Math.sin(this.phi) * Math.sin(this.theta),
      this.target[1] + this.dist * Math.cos(this.phi),
      this.target[2] + this.dist * Math.sin(this.phi) * Math.cos(this.theta)];
    const view = lookAt(eye, this.target, [0, 1, 0]);
    const proj = perspective(50 * Math.PI / 180, aspect, 0.1, 8000);
    const vp = mul4(proj, view);
    const u = new Float32Array(36);
    u.set(vp, 0); u.set([eye[0], eye[1], eye[2], 1], 16);
    u.set([w, h, 0, 0], 20); u.set([0.5, 0.8, 0.4, 0], 24);
    this.device.queue.writeBuffer(this.uniformBuf, 0, u);

    // 线段顶点（每段 6 顶点）
    let segCount = 0;
    for (const l of this.lines) segCount += Math.max(0, l.nodeIds.length - 1);
    const need = segCount * 6 * 40;
    if (need > this.lineCapacity) {
      if (this.lineCapacity) this.lineBuf.destroy();
      this.lineBuf = this.device.createBuffer({ size: Math.max(need, 65536), usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      this.lineCapacity = Math.max(need, 65536);
    }
    const data = new Float32Array(segCount * 6 * 10);
    let o = 0;
    for (const l of this.lines) {
      for (let i = 0; i < l.nodeIds.length - 1; i++) {
        const p0 = l.getPoint(l.nodeIds[i]), p1 = l.getPoint(l.nodeIds[i + 1]);
        const col = l.getSegColor ? l.getSegColor(i) : l.color;
        for (let v = 0; v < 6; v++) {
          data.set([p0[0], p0[1], p0[2], 1, p1[0], p1[1], p1[2], 1, l.width, col[0], col[1], col[2], 1], o);
          o += 10;
        }
      }
    }
    if (segCount) this.device.queue.writeBuffer(this.lineBuf, 0, data as any);

    const encoder = this.device.createCommandEncoder();
    const tex = this.context.getCurrentTexture();
    const colorView = tex.createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view: colorView, clearValue: { r: 0.027, g: 0.055, b: 0.094, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
      depthStencilAttachment: { view: this.getDepth(tex), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' },
    });
    const ub = this.device.createBindGroup({ layout: this.linePipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: this.uniformBuf } }] });
    pass.setPipeline(this.meshPipe);
    pass.setBindGroup(0, ub);
    pass.setVertexBuffer(0, this.seaBuf);
    const seaModel = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
    pass.setBindGroup(1, this.device.createBindGroup({ layout: this.meshPipe.getBindGroupLayout(1), entries: [{ binding: 0, resource: { buffer: this.seaBufModel() } }] }));
    pass.draw(6);
    for (const m of this.meshObjs) {
      const md = m.mesh.getModel();
      const mm = new Float32Array(16);
      mm.set(md.rot, 0); mm[12] = md.pos[0]; mm[13] = md.pos[1]; mm[14] = md.pos[2]; mm[15] = 1;
      this.device.queue.writeBuffer(m.modelBuf, 0, mm);
      pass.setVertexBuffer(0, m.buf);
      pass.setBindGroup(1, this.device.createBindGroup({ layout: this.meshPipe.getBindGroupLayout(1), entries: [{ binding: 0, resource: { buffer: m.modelBuf } }] }));
      pass.draw(m.count);
    }
    if (segCount) {
      pass.setPipeline(this.linePipe);
      pass.setBindGroup(0, ub);
      pass.setVertexBuffer(0, this.lineBuf);
      pass.draw(segCount * 6);
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
  private depthView: GPUTextureView | null = null;
  private depthTex: GPUTexture | null = null;
  private getDepth(t: GPUTexture): GPUTextureView {
    if (!this.depthTex || this.depthTex.width !== t.width || this.depthTex.height !== t.height) {
      this.depthTex?.destroy();
      this.depthTex = this.device.createTexture({ size: [t.width, t.height], format: 'depth24plus', usage: GPUTextureUsage.RENDER_ATTACHMENT });
    }
    return this.depthTex.createView();
  }
  private seaModelBuf: GPUBuffer | null = null;
  private seaBufModel(): GPUBuffer {
    if (!this.seaModelBuf) {
      this.seaModelBuf = this.device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      this.device.queue.writeBuffer(this.seaModelBuf, 0, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]));
    }
    return this.seaModelBuf;
  }
}

export async function createWebGPURenderer(canvas: HTMLCanvasElement): Promise<WebGPURenderer | null> {
  const r = new WebGPURenderer(canvas);
  return (await r.init()) ? r : null;
}
