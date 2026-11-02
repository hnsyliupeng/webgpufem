# WebGPUFEM — OrcaFlex / DAVE 风格海洋工程分析（纯浏览器清洁室实现）

> **边界声明**：本仓库为**清洁室（clean-room）实现**——仅依据 OrcaFlex / DAVE 的公开文档、经典海洋工程理论（悬链线、Morison、水静力、波浪谱、Newton 静力、时域积分、雨流疲劳）以及公开的 DAVE 仓库架构思路编写，**未对 DAVEcore 或任何商业二进制做反编译、反汇编或逆向工程**。

一个完全**本地离线运行**的 HTML App + 数值库：场景图（DAVE 式 Scene DAG）、缆索 lumped-mass 有限元（OrcaFlex 式 Line）、船舶/浮体 6DOF、波浪谱（Airy/JONSWAP）、海流/风/海床、Newton 静力、时域动力学、雨流+Miner 疲劳与 Gumbel 极值，并带 **10 个程序化验证算例（全部 PASS）** 与渲染截图。

## 快速开始

```bash
git clone <本仓库> && cd webgpufem
npm install            # 仅 three + pngjs（已 vendored 在 vendor/，可省略）
npm run serve          # 本地静态服务器 → 浏览器打开 http://localhost:8000
npm run verify         # 运行全部 10 个算例：程序化 PASS/FAIL + 1280×800 截图 + 报告
node tools/smoke.mjs   # 快速冒烟测试（秒级）
npm run docs           # 生成 Word 实现文档 docs/OrcaFlex_DAVE_实现文档.docx
```

App（`index.html`）打开即用，**无任何网络请求**：3D 视图（three.js 本地 vendor）、算例实时仿真、验证结果表、内置文档、流程图（SVG）、全部文件下载面板。

## 目录结构

| 路径 | 内容 |
|---|---|
| `index.html`, `app/` | 独立运行的 Web App（3D 视图 / 算例 / 验证 / 文档 / 流程图 / 下载） |
| `core/` | 数值库：`math` `waves` `env` `catenary` `line` `vessel` `scene` `solvers` `post` `render_scene` `flowcharts` |
| `examples/` | 10 个验证算例（ex01–ex10） |
| `tools/` | `run_examples.mjs`（验证+截图+报告） `raster.mjs`（软件渲染 PNG） `smoke.mjs` `export_docs.mjs` `build_docs.py`（docx） `wheels/` |
| `docs/` | `doc_data.js/json`（内置文档） `verification_report.{md,html}` `OrcaFlex_DAVE_实现文档.docx` `figs/`（流程图 PNG） `flowcharts.json` |
| `screenshots/` | 每个算例的渲染截图（ex01–ex10.png） |
| `vendor/` | three.module.js + OrbitControls + Line2 系列（本地，App 离线可用） |

## 10 个验证算例（`npm run verify`，全部 PASS）

| 算例 | 验证目标 | 代表方法 |
|---|---|---|
| ex01 | 空中弹性悬链线端部张力/垂深 vs 解析解 | 弹性悬链线 + FEM |
| ex02 | 海床系泊缆 touchdown 与锚张力 vs 解析+摩擦 | touchdown 悬链线 + 海床摩擦 |
| ex03 | 垂挂链摆动：静力张力=mgL，动态均值/峰值/摆幅 | 时域动力 + 摆动 |
| ex04 | 系泊浮筒规则波响应：均值=静力，波动有界 | 浮体 FK + 系泊耦合 |
| ex05 | 箱型驳船吃水/GM/GZ(5°,20°) | 水静力 + GZ 数值积分 |
| ex06 | heave/roll 衰减周期 vs 2π√(M/K)，衰减比 | 6DOF 衰减试验 |
| ex07 | 规则波+海流系泊船：漂移/张力统计/极值有界 | 系泊时域 + Morison |
| ex08 | 绞车吊重物：张力=重量，动力均值=静力 | 吊装 + 端部运动 |
| ex09 | Lazy-wave 立管静力 touchdown/顶张力 vs 解析 | S-型立管 |
| ex10 | JONSWAP：m0=Hs²/16、η≈Hs/4、雨流+Miner | 波浪谱离散 + 疲劳 |

每个算例：`node tools/run_examples.mjs <exId>` 单独运行，输出 PASS/FAIL 表、`screenshots/exXX.png`、并汇总进 `app/verification_data.js` 与 `docs/verification_report.{md,html}`（App 内“✔ 验证”页卡可直接查看）。

## Word 实现文档

```bash
npm run docs    # 等价于 python3 tools/build_docs.py
# 输出 docs/OrcaFlex_DAVE_实现文档.docx：
#   · 分级标题（一级章节 / 二级小节，deepwiki 式层次）
#   · 理论 + 数值方法（悬链线、线单元本构、Morison、水静力/GZ、波浪谱、Newton、时域积分、雨流/Miner/极值、DAVE 场景图）
#   · 附录A：7 张流程图（PNG，与 App 同源数据 core/flowcharts.js）
#   · 附录B：10 算例验证结果总表
# 首次运行会自动建 .venv 并安装 python-docx + pillow（tools/wheels/ 内备有 python-docx whl）
```

在装有中文字体（如 Windows 的 msyh/simhei）的机器上运行时，流程图 PNG 标签为中文；无中文字体的环境自动回退为英文标签。

## 核心 API 速览

```js
import { getExample } from './examples/index.js';
import * as sv from './core/solvers.js';

const m = getExample('ex07').build();          // Model: scene DAG + bodies + lines + env
sv.computeStatics(m, { tol: 1e-7 });           // Newton 静力（数值 Jacobian + 信赖域）
const run = sv.runDynamics(m, { tEnd: 90 });   // 时域动力（semi-implicit Euler）
// run.series: 通道曲线; run.snapshots: 场景快照; m.saveJSON(): DAVE 式序列化
// m.exportOrcaFlexYAML() / m.exportDavePy(): 互操作导出
```

## 文件下载

App 右侧“⬇ 下载”页卡列出仓库内全部文件（代码、文档、docx、截图、vendor），点击即下载；所有文件亦在本 Git 仓库中。

## 许可

MIT（见仓库约定）；第三方依赖 three.js 为 MIT。
