# OrcaFlex 与 DAVE：模块级拆解、算法推导与实施框架

> 2026-11-04 · 配套本仓库 `index.html`（MarineFEM 融合分析 GUI，含可视化验证算例）

OrcaFlex 的技术本质是**集中质量有限元 + 完全非线性时域积分**的动态分析引擎；DAVE 的技术本质是**节点图运动学 + 网格体积分水静力 + 势能极小化**的静力/设计框架。二者不是竞品，而是同一工作流中前后相接的两段。

> 说明：OrcaFlex 为闭源商业软件，DAVE 计算核心亦闭源。下文中「文档明确」指厂商手册/论文已公开的内容，「标准实现」指依据公开算法族与接口行为给出的推导，后者为工程重建而非源码披露。

---

## 目录

1. [模块全景对照](#1-模块全景对照)
2. [OrcaFlex 架构分层与数据流](#2-orcaflex-架构分层与数据流)
3. [OrcaFlex Line 模块：集中质量有限元推导](#3-orcaflex-line-模块集中质量有限元推导)
4. [OrcaFlex 求解器：静力、时域与频域](#4-orcaflex-求解器静力时域与频域)
5. [OrcaFlex 水动力：Morison、势流与卷积](#5-orcaflex-水动力morison势流与卷积)
6. [OrcaFlex 环境、海床土壤与接触](#6-orcaflex-环境海床土壤与接触)
7. [OrcaFlex 专项模块：风机、VIV、疲劳与极值](#7-orcaflex-专项模块风机viv疲劳与极值)
8. [DAVE 架构：Scene/Node 图与双层实现](#8-dave-架构scenenode-图与双层实现)
9. [DAVE 运动学：Frame 变换与自由度消元](#9-dave-运动学frame-变换与自由度消元)
10. [DAVE 本构元件：Cable、LinearBeam、Connector](#10-dave-本构元件cablelinearbeamconnector)
11. [DAVE 形状基浮力与液舱：体积分推导](#11-dave-形状基浮力与液舱体积分推导)
12. [DAVE 求解器：势能极小化与频域耦合](#12-dave-求解器势能极小化与频域耦合)
13. [DAVE → OrcaFlex：映射规则与信息损失](#13-dave--orcaflex映射规则与信息损失)
14. [纵向对比与选型边界](#14-纵向对比与选型边界)
15. [本仓库 MarineFEM 的对应实现](#15-本仓库-marinefem-的对应实现)

---

## 1. 模块全景对照

| 功能域 | OrcaFlex 对象/模块 | DAVE 节点/模块 | 数值基础差异 |
| --- | --- | --- | --- |
| 坐标系与刚体 | Vessel、6D Buoy、Constraint | `Frame`、`RigidBody`、`Point`、`Circle` | OrcaFlex 以物理对象为单位；DAVE 以可嵌套变换树为单位 |
| 柔性线缆 | `Line`（集中质量 FE，每节点 6 DoF） | `Cable`（无质量理想缆，可过滑轮） | OrcaFlex 含质量/弯曲/扭转/接触；DAVE 仅轴向刚度与几何路径 |
| 梁结构 | `Line` 的 EI/GJ 项、Line Type | `LinearBeam`（6×6 线性梁） | OrcaFlex 大位移非线性；DAVE 小变形线性 |
| 弹性连接 | Link（Spring/Damper）、Constraint 刚度 | `Connector2d`、`Connector6d` | 同为集中刚度 |
| 浮力 | Vessel 静水刚度矩阵 + 衍射数据；Buoy 排水体积 | `Buoyancy`（.obj/.stl 网格体积分）、`HydSpring` | OrcaFlex 线性化为主；DAVE 直接积分真实形状 |
| 液舱 | Vessel 自由液面修正（输入量） | `Tank`（网格 + 自由液面自动求解） | DAVE 对大倾角液舱更真实 |
| 绕射/辐射 | `OrcaWave`（内置面元法 BEM） | 外部 Capytaine + MaFreDo 数据库 | 同属势流面元法，OrcaFlex 自带并含 QTF |
| 粘性水动力 | 扩展 Morison（Re 相关 Cd、slam、近底修正） | 风/流受力面积（`Force`、面积属性） | OrcaFlex 分布式逐节点；DAVE 集中力 |
| 海床/土壤 | 线弹性、非线性迟滞、P-y、埋设管 | `ContactMesh` + `ContactBall`（罚函数） | OrcaFlex 有本构记忆；DAVE 无记忆弹性接触 |
| 静力求解 | 分步/全静力迭代（线形 catenary 初值） | `EquilibriumCore`（势能极小化） | DAVE 稳健性更好，OrcaFlex 速度优先 |
| 时域动力 | 显式半隐式 Euler、隐式 generalized-α | 无 | 两者最大能力鸿沟 |
| 频域动力 | 随机线性化 + 谱分析 | RAO/模态（阻尼模型有限） | OrcaFlex 可线性化非线性项 |
| 风机气动 | 水平轴风机对象（BEM + 控制器 DLL） | 无 | — |
| VIV | SHEAR7 / VIVA 接口、尾流干涉 | 无 | — |
| 疲劳与规范 | Rainflow、谱疲劳、API/DNV 校核 | 无（可 Python 自建） | — |
| 吊装索具 | 由 Line/Link 手工搭建 | `Sling`、`Shackle`、`GrommetSling` 等成品件 | DAVE 有行业资产库语义 |
| 稳性 | 无专用 GZ 模块 | GM、GZ 曲线、自动压载 | DAVE 核心优势项 |
| 可视化 | 原生 GUI + shaded 3D | VTK 交互 + Blender 渲染导出 | — |
| 脚本 API | OrcFxAPI（Python/MATLAB/Excel/DLL） | 原生 Python 对象模型 | DAVE 模型本身即 Python 脚本 |
| 互操作 | `.dat`/`.sim`/`.yml` | 直接写出 OrcaFlex `.yml` | 单向：DAVE → OrcaFlex |

## 2. OrcaFlex 架构分层与数据流

单体式闭源 Windows 原生应用（Delphi 前端 + 高性能数值核），围绕中心对象模型 Model → Objects → Variables 展开。

1. **表示层**：原生 GUI（3D shaded view、Results 浏览器、Graph 导出）。
2. **对象模型层**：Line、Vessel、6D/3D Buoy、Link、Winch、Shape、Constraint、Turbine、Line Type 等，树状拓扑，回路由 Link/Line 闭合。
3. **求解装配层**：刚体 6 DoF，N 段 Line 共 6(N+1) DoF，约束在装配时消去。
4. **数值核**：时域积分器、静力迭代器、频域线性化器、模态求解器——核只认识节点、段与力函数。
5. **外部接口**：OrcFxAPI（Python/MATLAB/Excel/.NET），External Function 可在每时间步插入自定义力。

数据流：`.yml/.dat → Build → Statics(q₀) → Build-up(t<0 环境载荷包络渐增) → Dynamics(t≥0) → .sim → Post`。

## 3. OrcaFlex Line 模块：集中质量有限元推导

N 段、N+1 节点；**段**为无质量轴向/扭转弹簧-阻尼器，**节点**集中质量/浮力/拖曳/附加质量，弯曲由节点旋转弹簧承担；每节点 6 DoF（姿态用四元数/方向余弦）。

- 节点质量：`m_i = ½(μ_{i-1}L_{i-1} + μ_i L_i)`
- 轴向应变：`ε = (ℓ−L)/L`；壁面张力 `T_w = EA·ε + C_a·ε̇ − 2ν(p_oA_o − p_iA_i)`；**有效张力** `T_e = T_w + p_oA_o − p_iA_i`（悬链线构型由 T_e 控制，强度校核用 T_w——深水空管可能 T_e>0 而 T_w<0）。
- 弯曲：节点曲率 `κ = θ / ½(L_{i-1}+L_i)`，弯矩 `M = EI·κ + C_b·κ̇`，以力偶作用于相邻段。
- 扭转：`M_z = GJ·Δφ/L + C_t·d(Δφ/L)/dt`（可选；关闭时 DoF 降到 3(N+1)）。
- 附加质量张量 `A_i = ρV_i[C_{a,n}(I−ttᵀ) + C_{a,a}ttᵀ]` 随姿态变化，**每步重组质量矩阵**。

**为何集中质量**：块对角质量矩阵使显式积分 O(N) 可逆、大位移每步重算几何天然精确、松弛时刚度置零即可；代价是空间二阶收敛，需在 TDP/bend stiffener 局部加密。

## 4. OrcaFlex 求解器

- **静力**：catenary 解析初值 → 分步静力 → 全静力 Newton（数值雅可比 + line search）；复杂多体冗余约束下收敛性是已知弱点。
- **显式半隐式（辛）Euler**：`vⁿ⁺¹ = vⁿ + Δt·aⁿ`，`qⁿ⁺¹ = qⁿ + Δt·vⁿ⁺¹`；CFL 条件 `Δt < L_seg·√((μ+ρC_aA)/EA)`——EA 调高或网格加密都会显著增加计算量。
- **隐式 generalized-α**（Chung & Hulbert）：无条件稳定、高频数值阻尼可调，`α_m=(2ρ∞−1)/(ρ∞+1)`，`α_f=ρ∞/(ρ∞+1)`，`β=¼(1−α_m+α_f)²`，`γ=½−α_m+α_f`；每步解非线性方程组。
- **频域**：线性化 `[-ω²(M+A)+iω(B+B_eq)+K]q̂ = F̂`；二次拖曳随机线性化 `b_eq = √(8/π)·½ρC_dD·σ_v`；响应谱与 Rayleigh 极值外推。

## 5. OrcaFlex 水动力

判据 D/L < 0.2 用**扩展 Morison**（Froude-Krylov + 附加质量 + 二次拖曳，法向/轴向分解，Re 相关 Cd、近底修正、slam）；D/L > 0.2 用**势流绕射**（OrcaWave 面元 BEM，RAO/QTF 全和差频，Cummins 卷积时域反演，panel pressure 时域重建）。不规则波 = 谱离散 + 随机相位（种子决定极值）；Wheeler 拉伸处理波面以上运动学。

## 6. 环境、海床与接触

海床三级本构：线弹性 / 非线性迟滞（Randolph 骨架 + 双曲回线 + 吸力，带状态记忆）/ P-y 曲线。接触全部用**罚函数**（保护块对角质量矩阵），线-线碰撞检测段对最小距离，`F_c = k_cδ + c_cδ̇`。

## 7. 专项模块

水平轴风机（BEM + Prandtl/Glauert 修正 + 控制器 DLL，浮式风机负气动阻尼问题）、VIV（SHEAR7/VIVA 或尾流振子 van der Pol）、疲劳（rainflow + S-N Miner，或谱疲劳 Rayleigh/Dirlik）、极值统计（GEV 块极大 / POT 超阈）。

## 8–12. DAVE 架构与算法

- **双层实现**：纯 Python 前端（MPL 2.0，Scene/Node 图、模型即脚本可 diff 入 Git）+ 闭源 C++ 核（Eigen/pybind11，自由度管理、网格体积分、势能极小化）。
- **约束即坐标消元**：Frame 的 6 DoF 逐个固定，不进入优化变量——方程规模更小、条件数更好、约束精确满足（对比 OrcaFlex 罚函数）。代价是闭链需 GeometricContact。
- **姿态用旋转向量**（Rodrigues），避免欧拉角万向节锁。
- **Cable**：无质量理想索，张力 `T = EA/L₀·(L_path − L₀)`，可过滑轮（切线+包角弧长），capstan 摩擦 `T_out = T_in·e^{±μα}`；不能表示悬链线垂度。
- **形状基浮力**：散度定理面积分 `V = (1/6)Σ a·(b×c)`，水面切割后盖板项解析为零；`BM = I_T/V`，`GM = KB+BM−KG`，GZ 由真实网格积分自然包含甲板入水；液舱自由液面用二分求液面高度，直接让液体重心随姿态移动（优于线性 FSC 修正）。
- **求解器**：势能极小化 `min E(q)`（拟牛顿 + BFGS + LM 阻尼），Hessian 特征值同时给出稳定性判据与模态；频域走外部 BEM（Capytaine→MaFreDo）路线，组装含结构刚度的系统 RAO。

## 13. DAVE → OrcaFlex 映射

DAVE 直接写出 `.yml`（无需安装 OrcaFlex）。Frame/RigidBody/Cable（点到点）/LinearBeam/Connector6d/HydSpring/WaveInteraction1 为 1:1；网格 Buoyancy/Tank 需在平衡点数值差分线性化为 6×6 静水刚度（**有损**，大运动时失效）；稳性/GZ/自动压载不可映射。推荐工作流：DAVE 求稳健静力 + 真实浮力初值 → 导出 OrcaFlex 跑非线性时域。方向单向，DAVE 脚本应作为唯一真源。

## 14. 纵向对比与选型

| 维度 | OrcaFlex | DAVE |
| --- | --- | --- |
| 空间离散 | 集中质量 FE，6DoF/节点 | 刚体 + 解析元件 |
| DoF 规模 | 10³–10⁵ | 10¹–10² |
| 约束处理 | 罚函数 + 装配消去 | 坐标消元 |
| 静力 | Newton + 数值雅可比 | 拟牛顿势能极小化 |
| 时域 | 半隐式 Euler / generalized-α | 无 |
| 浮力 | 线性刚度 + 排水体积 | 网格体积分每步重算 |
| 水动力 | 内置 OrcaWave BEM + Morison | 外部 Capytaine + 面积力 |

**选型**：立管/系泊/铺管非线性时域、QTF 慢漂、浮式风机耦合、VIV 疲劳 → OrcaFlex；重吊索具静不定、驳船稳性压载、下潜翻身大倾角、参数化筛选 → DAVE；吊装动力学 → DAVE 建模导出 OrcaFlex 跑时域。

一句话：**OrcaFlex 把精力投在「时间」维度（集中质量 + 显式积分服务于强非线性时程推进），DAVE 投在「构型」维度（坐标消元 + 势能极小化服务于平衡态搜索）**——`.yml` 导出之所以成立，正是因为「找对构型」与「从构型推进时间」可以干净分离。

## 15. 本仓库 MarineFEM 的对应实现

`index.html` + `js/` 用纯前端 JS 重建了上述两条技术路线的可验证交集：

| 本仓库模块 | 对应 OrcaFlex | 对应 DAVE |
| --- | --- | --- |
| `js/model.js` Line（集中质量缆） | Line 集中质量 FE | Cable（退化） |
| `js/solvers.js` beam 12×12 FEM | — | LinearBeam |
| `js/solvers.js` solveStatic / 动态松弛 | 静力求解 | EquilibriumCore 思路 |
| `js/solvers.js` solveTimeDomain（半隐式 Euler） | 显式时域 | — |
| `js/hydro.js` Morison + Airy 波 | 扩展 Morison | — |
| `js/hydro.js` 网格体积分浮力 + `freqDomain` 数值水静力刚度 | — | Buoyancy / HydSpring / RAO |
| 5 个可视化验证算例 | catenary / 梁悬臂 / 浮箱 / 振子 / 波浪缆 | 与解析解逐项比对，误差见 GUI 结果表 |

验证结果（默认参数，9 个算例 25 项定量校核全部通过）：

| 算例 | 校核项 | 误差 |
| --- | --- | --- |
| 1 悬链线静力 | H / T_top | 2.16% / 5.72% |
| 2 悬臂梁集中载荷 | δ / θ | 0.000% / 0.000% |
| 3 浮箱水静力+频域 | 吃水/排水/K33/Heave/Roll 周期 | 0.000%（Roll 0.005%） |
| 4 弹簧振子时域 | 周期 / 振幅守恒 | 0.75% / 0.02% |
| 5 波浪悬链线 | 无波自洽（动态均值=静力） | 0.000% |
| 6 悬臂梁均布载荷 | δ=qL⁴/8EI / θ | 0.000% / 0.000% |
| 7 浮箱 Heave 自由衰减 | 衰减周期 vs 频域 | 0.37% |
| 8 规则波浮箱响应 | 响应主导周期=波周期 | 0.000% |
| 9 触底悬链线（海床摩擦接触） | H / T_top / 离底点 | 24.7% / 20.6% / 23.8%（罚接触离散误差） |
| 10 简支梁跨中载荷（2 单元链式装配） | δ=PL³/48EI / θ=PL²/16EI | 0.000% / 0.000% |
| 11 单摆小幅摆动 | T vs 2π√(L/g) | 0.43% |
| 12 均匀海流垂直悬缆（Morison 拖曳） | T_top=√(W²+D²) / 顶端角 | 23.1% / 13.2% |
| 13 浮箱风载稳态倾斜 | θ vs atan(F·z/ρgV·GM) | 0.00% |

深度模块：多单元梁链 FEM 装配（pin/fixed 边界）、刚体风载（力+倾覆力矩）与角阻尼、单摆动力学验证、稳态海流 Morison 拖曳静力；以及梁单元一致节点载荷（均布载荷）、刚体 6DoF + 数值水线面 + Froude-Krylov 波浪激励 + 线性辐射阻尼、海床罚接触 + Coulomb 摩擦、频域 6×6 数值水静力刚度（基线扣除）。
