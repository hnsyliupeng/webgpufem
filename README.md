# WebGPUFEM — OrcaFlex / DAVE 风格海洋工程分析（纯浏览器清洁室实现）

> **边界声明**：本仓库为**清洁室（clean-room）实现**——仅依据 OrcaFlex / DAVE 的公开文档、经典海洋工程理论（悬链线、Morison、水静力、波浪谱、Newton 静力、时域积分、雨流疲劳）以及公开的 DAVE 仓库架构思路编写，**未对 DAVEcore 或任何商业二进制做反编译、反汇编或逆向工程**。

一个完全**本地离线运行**的 HTML App + 数值库：场景图（DAVE 式 Scene DAG）、缆索 lumped-mass 有限元（OrcaFlex 式 Line）、船舶/浮体 6DOF、波浪谱（Airy/JONSWAP）、海流/风/海床、Newton 静力、时域动力学、雨流+Miner 疲劳与 Gumbel 极值，并带 **27 个程序化验证算例（全部 PASS）** 与渲染截图，其中 ex11–ex16 为 **DAVE 官方算例移植**（stability / unstable hinge / pin-hole / shackles 吊索 / wind&current / 元件库单元校验），ex17–ex27 为 **DAVE-notebooks 官方仓库（github.com/RubendeBruin/DAVE-notebooks）全部模型算例的复现**（catenary / catenary hinges+Connector2d / hydrostatic barge / GHS Nato pontoon 液舱 / ×OrcaFlex 3plift / ×OrcaFlex Snake15 / 100x30x8 barge goal_seek / Joints&DOF / hook / 旋转坐标系链 / Vessel Stability Lift)。

## 快速开始

```bash
git clone <本仓库> && cd webgpufem
npm install            # 仅 three + pngjs（已 vendored 在 vendor/，可省略）
npm run serve          # 静态服务器(恒带 no-store 防缓存) → 浏览器打开 http://localhost:8000
npm run verify         # 运行全部 27 个算例：程序化 PASS/FAIL + 1280×800 截图 + 报告
node tools/smoke.mjs   # 快速冒烟测试（秒级）
npm run docs           # 生成 Word 实现文档 docs/OrcaFlex_DAVE_实现文档.docx（另有 PDF 副本 docs/OrcaFlex_DAVE_实现文档.pdf）
```

App（`index.html`）打开即用，**无任何网络请求**，功能包括：
- 3D 视图（three.js 本地 vendor；无 WebGL 时自动回退显示该算例验证截图）、**点击 3D 对象拾取**
- 算例实时仿真（时域动力手动步进，不卡 UI；播放/暂停/0.25–4× 速度/时间 scrubber)
- **场景树（Scene DAG）+ 属性检查器**（节点/船体/线/绞车/**DAVE 元件节点**实时属性）
- **DAVE 元件节点库**（`core/elements.js`): Spring / Force / Beam(EA,EIy) / LinCon6(LC6d) / Hinge(GeometricContact 销孔） / ContactBall / Tank / BallastSystem / BuoyancyBox(非线性浮力网格） / 吊索 rigging / Measurement —— 元件力与缆反力同通道注入 `body.external`，静力与动力自动耦合，3D 中以连线渲染
- **环境滑杆**（波高/周期/波向、海流、风速，实时生效）+ **绞车 L0 滑杆**
- 导入：App 工具栏 **⬆ 导入** 接受 **DAVE `.dave` 建模脚本**（经 `core/dave_import.js` clean-room 解释执行，直接进入 Scene DAG 场景树）、含 `s.new_*` 的 `.py`，或本系统导出的 `.json`（`Model.fromJSON`)
- 导出：当前模型 JSON（DAVE 式） / OrcaFlex 风格 YAML / DAVE py 脚本 / 当前 3D 画面 PNG
- “🧪 重跑校核”在浏览器内用与 runner 相同的参数完整重跑该算例全部校核项
- 右侧页卡：✔🖼 验证截图（内嵌 27 张渲染截图 + PASS 表）、📖 文档、🔀 流程图（SVG，含 DAVE 元件节点图）、⬇ 下载全部文件
- `?ex=ex07` URL 参数直达算例；启动时有内核自检徽章与脚本错误上屏提示

## 目录结构

| 路径 | 内容 |
|---|---|
| `index.html`, `app/` | 独立运行的 Web App（3D 视图 / 算例 / 验证 / 文档 / 流程图 / 下载） |
| `core/` | 数值库：`math` `waves` `env` `catenary` `line` `vessel` `scene` `solvers` `elements`(DAVE 节点） `post` `render_scene` `flowcharts` `dave_import`(.dave 导入器） |
| `examples/` | 27 个验证算例（ex01–ex10 原创 + ex11–ex16 DAVE 官方算例移植 + ex17–ex27 DAVE-notebooks 复现；**ex22/ex23 直接由 `examples/assets/*.dave` 导入构建**） |
| `examples/assets/` | 官方 DAVE 模型文件（Snake15.dave / 100x30x8_barge.dave / cube.obj，MPL-2.0，见其中 README 与 LICENSE) + 浏览器可 import 的文本包装 |
| `tools/` | `run_examples.mjs`（验证+截图+报告） `raster.mjs`（软件渲染 PNG） `smoke.mjs` `export_docs.mjs` `build_docs.py`（docx） `wheels/` |
| `docs/` | `doc_data.js/json`（内置文档） `verification_report.{md,html}` `OrcaFlex_DAVE_实现文档.docx` `figs/`（流程图 PNG） `flowcharts.json` |
| `screenshots/` | 每个算例的渲染截图（ex01–ex27.png） |
| `vendor/` | three.module.js + OrbitControls + Line2 系列（本地，App 离线可用） |

## 27 个验证算例（`npm run verify`，全部 PASS）

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
| ex11 | DAVE stability.py：40° 横倾 GZ vs 独立网格积分参考 | 非线性 Buoyancy 节点（多边形裁剪） |
| ex12 | DAVE unstable_equlibrium_hinge.py：铰接摆落到铰点正下方 | Hinge(GeometricContact) |
| ex13 | DAVE pin_hole_connect.py：两体销孔连接误差 <1e-4 m | 销孔约束 |
| ex14 | DAVE shackles 吊索：两腿张力 vs W/(2cosθ) | createSling rigging |
| ex15 | DAVE wind&current：风+流反力 vs ½ρCdAv² 解析和 | WindArea + CurrentArea |
| ex16 | DAVE 元件库单元校验：Spring/Beam/LC6d/Tank/ContactBall | elements.js 全节点 |
| ex17 | DAVE-notebooks catenary：100 节点悬链线 T0=217.7 kN、sag=23.55 m vs 解析 | 弹性悬链线 FEM vs 解析 |
| ex18 | DAVE-notebooks catenary hinges：50 铰接段 + Connector2d 连接力 22.9 MN vs 解析 21.78 MN、端位 x=30、垂深 | Hinge 链 + Connector2d 罚连接 |
| ex19 | DAVE-notebooks hydrostatic barge：排水 8000 m³、浮心 −2 m、1°横倾反算 BM=8.3346 vs 8.333 | BuoyancyBox 多边形裁剪 |
| ex20 | DAVE-notebooks GHS Nato pontoon：液舱 50%/10% 充注 → 吃水 0.2045 m、横倾 2.31° vs 力矩解析 2.19° | BuoyancyBox(包围盒近似 OBJ) + Tank |
| ex21 | DAVE-notebooks ×OrcaFlex 3plift：平衡位姿 vs 存档 3plift.yml 偏差 3.6e-4 m + 手算 6 元平衡 | 3 缆静力 + 存档交叉验证 |
| ex22 | DAVE-notebooks ×OrcaFlex Snake15：**由 `examples/assets/Snake15.dave` 导入**（15 节铰接链+Hinge+缆，进 Scene DAG)，位姿/转角/缆张力 56.1 kN vs snake15_sum.yml 56.44 kN | `core/dave_import.js` + Hinge 链 + LM 静力 |
| ex23 | DAVE-notebooks 100x30x8 barge：**由 `examples/assets/100x30x8_barge.dave` 导入**（Barge+cube.obj 浮力+LC6d+32 罐）— goal_seek 质量=12300 t 使 z=−4 m（=ρLBD) | `core/dave_import.js` + goalSeek 二分 + LinCon6 |
| ex24 | DAVE-notebooks Joints&DOF：缆挂刚体平衡时缆力线过 CoG、跨度=L(1+T/EA) | 转动平衡手算校验 |
| ex25 | DAVE-notebooks hook：yaw 自由吊钩在 300,300,0 kN 下对准到 yaw=−45°，z 力矩=0 | Force + yaw 自由度 |
| ex26 | DAVE-notebooks 旋转坐标系链：Scene DAG worldPosition == 手工 Rodrigues 合成（误差 0) | Scene DAG 变换 |
| ex27 | DAVE-notebooks Vessel Stability 02 Lift：吊重缆张力=9.807e6 N=重量，横倾 vs 力矩平衡求根 | 吊重横倾 + 独立力矩参考 |

每个算例：`node tools/run_examples.mjs <exId>` 单独运行（子集运行会与已有结果合并，不会覆盖），输出 PASS/FAIL 表、`screenshots/exXX.png`、并汇总进 `app/verification_data.js` 与 `docs/verification_report.{md,html}`。

## DAVE-notebooks 全量复现说明（ex17–ex27)

复现目标：`github.com/RubendeBruin/DAVE-notebooks`（官方示例笔记本仓库；本仓库只读其公开源码/存档 yml/obj，不触碰任何 DAVE 二进制——清洁室边界不变）。31 个 ipynb 中：

**核心模型算例走真实 `.dave` 文件导入，而非手工搭建的替身**：`core/dave_import.js` 是一个 clean-room `.dave` 导入器（对 .dave 文本做 Python 子集解释：赋值 / `for i in range(n):` 块 / 多行调用 / 元组 / f-string / `.format()` / `solved()` / `s.get_resource_path()`，以 recorder 方式执行 `s.new_*` 并产出 Model + Scene DAG)。`examples/assets/` 内置从 DAVE 官方仓库 verbatim 拷贝的 `Snake15.dave`、`100x30x8_barge.dave`、`cube.obj`（均为 MPL-2.0，附 LICENSE 与来源说明）。ex22/ex23 的 `build()` 直接 `loadDaveModel()` 这两个文件（单位 t→kg、kN→N、deg→rad；父链刚体+平动锁定 → 世界摆放 + Hinge；`trimesh.load_obj` → OBJ 包围盒×scale 的 BuoyancyBox；`new_ballastsystem/new_tank` → Tank 罐），校核项包含“模型由 .dave 导入 / Scene DAG 节点数 / 铰接数 / 浮力盒尺寸 / 罐数 32 / LC6d 刚度”等证据；App 工具栏 **⬆ 导入** 按钮用同一导入器加载用户自己的 .dave/.py/.json，导入后即出现在左侧场景树。

- **11 个模型/物理类笔记本** → ex17–ex27，每个都是程序化 PASS/FAIL + 一张截图，与仓库内 OrcaFlex 交叉验证存档（`validation/orcaflex/*.yml`) 或解析解对比（见上表）。
- **移植手法**：父子刚体链（Snake15、catenary hinges、hook）用“世界摆放刚体 + Hinge(GeometricContact)”等价替代，不实现父子刚体运动学；Connector2d 用罚函数刚性连接（`Connector2d` 节点）；OBJ 网格浮力（Nato pontoon、DELFTship、pyramid 冰山）用包围盒 `BuoyancyBox` 近似并在算例描述注明；`goal_seek` 用 `solvers.goalSeek` 二分；DAVE 单位 t/kN 换算为 kg/N。
- **求解器增强**：为支撑 taut 轻缆/铰接链新增自适应 LM 静力模式（`computeStatics(model,{mode:'lm'})`，残差按张力尺度缩放），默认 legacy 路径不变——全套 27/27 PASS 无回归。
- **纯 GUI/查看器/工作流笔记本**（00 First tests、demo-import、99 Technical tests、Pandas、start GUI、03 Workflow Parts 1–3、04 Reporting) 无独立物理校核目标，映射到 App 既有能力：3D 视图+软件渲染回退、导入/导出（JSON/YAML/DAVE-py)、?ex= 参数化、验证页卡与报告下载（详见 docs 6A.3)。

**可视化验证证据**：
- `screenshots/ex01–ex27.png` —— 每个算例的软件渲染场景截图（张力着色）
- `screenshots/verification_overview.png` —— 27 张截图 + PASS 徽章的总览拼图（`node tools/make_overview.mjs` 生成）
- App 内“✔🖼 验证截图”页卡直接嵌入全部截图与 PASS/FAIL 表；`docs/verification_report.html` 同样内嵌截图
- 若浏览器无 WebGL，App 自动回退为显示对应算例的验证截图，并会在页面头部显示“内核自检 PASS”徽章

## Word 实现文档

```bash
npm run docs    # 等价于 python3 tools/build_docs.py
# 输出 docs/OrcaFlex_DAVE_实现文档.docx：
#   · 分级标题（一级章节 / 二级小节，deepwiki 式层次）
#   · 理论 + 数值方法（悬链线、线单元本构、Morison、水静力/GZ、波浪谱、Newton、时域积分、雨流/Miner/极值、DAVE 场景图）
#   · 附录A：8 张流程图（PNG，与 App 同源数据 core/flowcharts.js，含 DAVE 元件节点覆盖图）
#   · 附录B：16 算例验证结果总表
#   · 另有 PDF 副本 docs/OrcaFlex_DAVE_实现文档.pdf（tools/build_docs.py 一并生成）
# 首次运行会自动建 .venv 并安装 python-docx + pillow（tools/wheels/ 内备有 python-docx whl）
```

在装有中文字体（如 Windows 的 msyh/simhei）的机器上运行时，流程图 PNG 标签为中文；无中文字体的环境自动回退为英文标签。

## 核心 API 速览

```js
import { getExample } from './examples/index.js';
import * as sv from './core/solvers.js';

const m = getExample('ex07').build();          // Model: scene DAG + bodies + lines + elements + env
sv.computeStatics(m, { tol: 1e-7 });           // Newton 静力（数值 Jacobian + 信赖域 + 线搜索）
const run = sv.runDynamics(m, { tEnd: 90 });   // 时域动力（semi-implicit Euler，含 applyElements)
// run.series: 通道曲线; run.snapshots: 场景快照; m.saveJSON(): DAVE 式序列化
// m.exportOrcaFlexYAML() / m.exportDavePy(): 互操作导出
// DAVE 元件: import { Spring, Hinge, Tank, BuoyancyBox, createSling } from './core/elements.js';
//   m.addElement(new Hinge({ attA:{type:'fixed',pos:[0,0,2]}, attB:{type:'vessel',body,localPoint:[0,0,0]}, k:1e8 }));
```

## 文件下载

App 右侧“⬇ 下载”页卡列出仓库内全部文件（代码、文档、docx、截图、vendor），点击即下载；所有文件亦在本 Git 仓库中。

## 许可

MIT（见仓库约定）；第三方依赖 three.js 为 MIT。

> 注：`examples/assets/` 中从 DAVE 官方仓库拷贝的模型文件属于 MPL-2.0（见 `examples/assets/DAVE-LICENSE-MPL2.txt`)，与本仓库 MIT 许可分开标注。
