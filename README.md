# webgpufem — MarineFEM: OrcaFlex × DAVE 融合海洋结构分析 GUI

纯前端单页应用：**WebGPU（WGSL，TypeScript 源码 `src/renderer.ts` 编译为 `js/renderer.js`）优先渲染，无 WebGPU 时自动回退 WebGL（Three.js 本地化）**，融合 OrcaFlex（集中质量有限元 + 非线性时域）与 DAVE（网格体积分水静力 + 静力平衡/频域）两条技术路线的可验证交集，含有限元分析模块与 5 个可视化验证算例。

## 运行

直接用浏览器打开 `index.html`（或 `python3 -m http.server` 后访问），无需构建、无需联网（Three.js 已本地化于 `vendor/`）。

## 功能

- **求解器**：静力（Newton / 动态松弛）、3D 梁 12×12 FEM 静力、非线性时域（半隐式 Euler，Morison 波浪载荷 + 海床罚接触）、线性频域（数值水静力刚度 → 固有周期）
- **对象**：Line 集中质量缆（轴向/弯曲弹簧、松弛）、Beam、刚体 + 网格浮力（水面切割体积分）、Airy 波浪/海流环境
- **验证算例**（数值 vs 解析，GUI 内显示相对误差）：悬链线静力、悬臂梁端部挠度、浮箱水静力与固有周期、弹簧振子时域、波浪中悬链线顶端张力时程
- **3D 可视化**（Three.js + OrbitControls）与时程曲线

## 目录

```
index.html            应用入口
css/style.css         样式
js/math.js            向量/矩阵/线性求解
js/model.js           模型层（Node/Line/Beam/Body/World）
js/hydro.js           Airy 波、Morison、网格水静力体积分
js/solvers.js         静力 / 梁 FEM / 时域 / 频域求解器
js/cases.js           5 个验证算例
js/app.js             UI + 渲染调度（WebGPU 优先 / WebGL 回退）
js/renderer.js        WebGPU 渲染器（由 src/renderer.ts 经 tsc 编译，WGSL 管线）
src/renderer.ts       WebGPU 渲染器 TypeScript 源码
tsconfig.json         TS 编译配置（npx tsc -p tsconfig.json）
docs/OrcaFlex_vs_DAVE_深度对比调研.md   横纵向对比调研文档
vendor/               three.module.js + OrbitControls（本地化）
```
