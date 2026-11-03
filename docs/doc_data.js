// docs/doc_data.js — in-app documentation (also exported to JSON for the .docx via tools/export_docs.mjs).
// Hierarchical headings modelled on deepwiki-style structure (e.g. "DAVE 2. Scene and node architecture").
// Clean-room: derived from public OrcaFlex/DAVE theory, not from decompiled binaries.

export const DOC_META = {
  title: 'WebGPUFEM — OrcaFlex / DAVE 风格海洋工程分析实现文档',
  subtitle: '纯浏览器清洁室实现：场景图 + 缆索有限元 + 船舶6DOF + 静力/动力 + 验证算例',
  generated: '2026-11-02',
  boundary: '本文档与全部代码均为清洁室实现：仅依据 OrcaFlex/DAVE 的公开文档与经典海洋工程理论，未对 DAVEcore 等任何二进制做反编译或逆向工程。',
};

export const DOC_SECTIONS = [
  {
    id: 'arch', title: '1. 总体架构与计算链', children: [
      { h: '1.1 定位：OrcaFlex 与 DAVE', level: 2, body: [
        { t: 'p', s: 'OrcaFlex 是商业化的海洋柔性结构时域/频域分析软件，核心是“线(Line)”对象的 lumped-mass 有限元 + 船舶6DOF 耦合。DAVE 是开源的近似对标，核心是一个场景图(Scene graph)：一切几何与附着关系都挂在有向无环图上。本项目在浏览器中用 ES module 复刻这两套软件的核心能力。' },
        { t: 'ul', items: ['OrcaFlex 侧：Line/LineType、Environment(波浪/海流/海床/风)、Vessel、Buoy、Winch、静力 Newton、时域动力、疲劳雨流。', 'DAVE 侧：Scene DAG(SNode)、附着(attachment)、世界坐标变换、saveJSON/导出。', '共同点：都从“模型构建 → 静力平衡 → 时域推进 → 后处理”的计算链出发。'] },
      ] },
      { h: '1.2 计算链总览', level: 2, body: [
        { t: 'p', s: 'build() 构建 Model → computeStatics() 求静力平衡 → runDynamics() 时域推进 → post.js 后处理(统计/雨流/Miner/Gumbel 极值) → 输出通道曲线、快照、校核表与截图。详见“流程图”页卡中的总体计算链。' },
        { t: 'code', s: "import { getExample } from './examples/index.js';\nimport * as sv from './core/solvers.js';\nconst m = getExample('ex07').build();\nsv.computeStatics(m, { tol: 1e-7 });\nconst run = sv.runDynamics(m, { tEnd: 90 });" },
      ] },
      { h: '1.3 模块地图 (core/)', level: 2, body: [
        { t: 'ul', items: ['math.js — 向量/矩阵/旋转、线性求解、Jacobi 特征值、RNG', 'waves.js — Airy/JONSWAP 谱、谱离散、波面与水质点运动', 'env.js — 海床罚函数+Coulomb、海流(幂律)、风', 'catenary.js — 解析弹性悬链线 + 海床 touchdown 求解', 'line.js — lumped-mass 线单元(轴向/弯曲/Morison/海床/端反力)', 'vessel.js — 刚体6DOF、箱型水静力、FK 波浪力、GZ', 'scene.js — SNode 场景 DAG、Model、saveJSON、导出 OrcaFlex YAML / DAVE py', 'dave_import.js — .dave 建模脚本 clean-room 导入器（Python 子集解释 + recorder 建模，进 Scene DAG)', 'mesh.js — 三角网格几何：OBJ 解析、图元(box/cylinder/cone/pyramid/sphere)、精确体积/形心/惯性、水线面切割', 'solvers.js — 附着更新、Newton 静力、时域积分、模态分析', 'post.js — 统计、ASTM 雨流、Miner、Gumbel 极值', 'render_scene.js — 场景描述(供 three.js 与软件渲染共用)'] },
      ] },
    ],
  },
  {
    id: 'env', title: '2. Environment：海洋环境', children: [
      { h: '2.1 波浪理论', level: 2, body: [
        { t: 'p', s: '规则波用 Airy(线性)理论，可叠加二阶 Stokes 修正；不规则波用 JONSWAP/PM 谱离散为 N 个规则波分量(固定种子随机相位)，谱矩校核 m0 = Hs²/16。水质点速度/加速度用于 Morison 载荷，波面 η 用于浮体波面力与可视化。' },
        { t: 'formula', s: 'η(x,t)= a·cos(kx−ωt+φ),  u = a·ω·cosh k(z+h)/sinh kh ·cos(...),  m0 = ∫S(f)df = Hs²/16' },
      ] },
      { h: '2.2 海流与风', level: 2, body: [
        { t: 'p', s: '海流支持 uniform/linear/power(1/7 幂律)剖面，可带 ramp 从 t=0 平滑加载(静力在 t=0 不受流/风)。风为幂律剖面，作用于船舶水上投影面积，产生拖曳力与倾覆力矩。' },
      ] },
      { h: '2.3 海床', level: 2, body: [
        { t: 'p', s: '平坦海床 z=−depth，接触用罚刚度 k 垂直反力 + Coulomb 摩擦 μ(相对速度方向，静止时摩擦力退化为 0)。线静力中海床段躺平、V=0，touchdown 点由解析解定位。' },
      ] },
    ],
  },
  {
    id: 'line', title: '3. Line：缆索有限元（OrcaFlex 线理论核心）', children: [
      { h: '3.1 离散', level: 2, body: [
        { t: 'p', s: '线离散为 nSeg 个直段、nSeg+1 个集中质量节点，节点质量 = ρ_l·L0/n·(端部半段)。段长为弦长，轴向用弦应变，因此天然允许松弛(受压置零 T=0)。' },
      ] },
      { h: '3.2 结构本构', level: 2, body: [
        { t: 'p', s: '轴向 T = EA·(L−L0_seg)/L0_seg + c·dL/dt(轴向阻尼)。弯曲为节点转角弹簧，势能 U=½·EI/L̄·θ²，节点力取 U 对节点位置的解析梯度(能量一致，保证合力/合力矩守恒)。' },
        { t: 'formula', s: 'T = EA·ε, ε=(|r_{i+1}−r_i|−L̄0)/L̄0;  U_bend = ½ (EI/L̄) θ², F = −∂U/∂r' },
      ] },
      { h: '3.3 Morison 水动力', level: 2, body: [
        { t: 'p', s: '每段受拖曳+惯性力：F = ½ρC_d·d·|u_r|u_r + ρC_m·A·a − ρC_a·A·a_body(相对加速度)，u_r 为水质点速度相对线段速度。纵向/法向分量分别投影。' },
        { t: 'formula', s: 'F_D = ½ ρ C_d d |u_r| u_r,  F_I = ρ C_m A a_r' },
      ] },
      { h: '3.4 解析悬链线与 touchdown', level: 2, body: [
        { t: 'p', s: '静力初始化与验证用解析弹性悬链线：给定 L0、单位浮重 w0、EA、锚点与导缆孔世界坐标，2×2 Newton 求 (H, x_td)，使悬空段末端 V=0、落在海床。ex02/ex09 直接对比 FEM 与该解析解。' },
        { t: 'formula', s: 'x(s)=H/w0·asinh(w0 s/H) + H/EA·w0·s... ; 边界: V(Ls)=0, z(Ls)=−depth' },
      ] },
    ],
  },
  {
    id: 'vessel', title: '4. Vessel / Buoy：六自由度刚体', children: [
      { h: '4.1 六自由度运动', level: 2, body: [
        { t: 'p', s: '刚体状态 q=[surge,sway,heave,roll,pitch,yaw]，半隐式欧拉积分：q̈=(F−Cq̇)/M。箱型浮体水静力为解析 K 矩阵(Heave=ρgAwp, Roll/Pitch=ρgIwp 等)，重力与静浮力在平衡点抵消，以 −K·q 施加恢复。' },
      ] },
      { h: '4.2 波浪载荷 (FK)', level: 2, body: [
        { t: 'p', s: '箱型船用 Froude-Krylov 积分：动压 p=−ρ(∂φ/∂t+½|∇φ|²+gz) 在湿表面压力积分得 6 分量力；浮标类用波面处的 ρgAwp·η 垂向力。规则波与谱波分量都乘 rampFactor(t) 平滑加载。' },
      ] },
      { h: '4.3 稳性 GZ', level: 2, body: [
        { t: 'p', s: '箱型驳船 GZ 用 2D 截面楔形浸水数值积分(定排水量搜索水线)，小角度校核 GZ≈GM·sinφ，GM_T=B²/12T+T/2−KG。ex05 直接验证吃水、GM、GZ(5°)、GZ(20°)。' },
      ] },
    ],
  },
  {
    id: 'solvers', title: '5. 静力与动力求解器', children: [
      { h: '5.1 Newton 静力', level: 2, body: [
        { t: 'p', s: '未知量 x = 自由线节点坐标 + 未固定船体自由度。残差 R = 线节点力 + 船体广义力(经 coupleLinesToBodies 耦合新鲜端反力)。数值 Jacobian J=∂R/∂x，加对角岭 1e-7(1+|Jii|) 防奇异，信赖域限步 0.25 m，回溯线搜索；Newton 期间 relaxCompression 放宽受压约束保证可解。' },
      ] },
      { h: '5.2 时域动力学', level: 2, body: [
        { t: 'p', s: '每步：updateAttachments(t)(含 winch 改 L0、motion 预 prescribed 端位) → line.computeForces → coupleLinesToBodies → line.step / body.step(半隐式欧拉) → 记录通道与快照。步长取各子系统 autoDt 的安全分之一。' },
      ] },
      { h: '5.3 模态分析', level: 2, body: [
        { t: 'p', s: '在静力平衡点线性化，广义特征值 (K,M) → 固有频率与振型，供与理论周期 2π√(M/K) 对比。' },
      ] },
    ],
  },
  {
    id: 'dave', title: '6. DAVE 式场景图（Scene DAG）', children: [
      { h: '6.1 场景与节点架构', level: 2, body: [
        { t: 'p', s: 'DAVE 的核心是一个场景图：Model 持有 Scene，Scene 是 SNode 的有向无环图，节点类型包括 Point/Poi(感兴趣点)、Shape(可视几何)、Frame(坐标系)。所有世界坐标由 worldPosition 逐父链变换得到。' },
        { t: 'p', s: '线与船的端点“附着”到场景节点或船体局部坐标上：updateAttachments 每步把 attachment 的局部坐标经其父链变换到世界坐标，作为线的端点位置；绞车(Winch)以速率修改线的 L0 实现收放缆。' },
      ] },
      { h: '6.2 序列化与互操作', level: 2, body: [
        { t: 'ul', items: ['Model.saveJSON() — DAVE 风格的 JSON 场景序列化（App ⬆ 导入可读回，Model.fromJSON)', 'exportOrcaFlexYAML() — 导出 OrcaFlex 风格 YAML 草案', 'exportDavePy() — 导出 DAVE 风格 Python 建模脚本', 'loadDaveModel()（core/dave_import.js) — 导入 DAVE .dave 建模脚本为 Model + Scene DAG（App ⬆ 导入按钮、ex22/ex23 构建均走此路径）', 'parseObj()/transformMesh()（core/mesh.js) — 导入 .obj 网格（App ⬆ 导入 .obj 生成带网格浮力的浮体）；BuoyancyMesh — 任意网格的精确水线切割浮力（替代包围盒近似）'] },
      ] },
      { h: '6.3 几何与网格建模（core/mesh.js)', level: 2, body: [
        { t: 'p', s: '几何内核 core/mesh.js：parseObj 解析 OBJ（v/f 多格式面、负索引、自动三角化）；transformMesh 做 DAVE trimesh.load_obj 式变换（scale/rotation(deg)/offset)；boxMesh/cylinderMesh/coneMesh/pyramidMesh/sphereMesh 为程序化图元；meshMassProps 用带符号四面体分解精确求闭合网格的体积、形心与惯性（方向自动校正）；clipMeshBelowPlane 以水线面上定点的锥体四面体精确切割任意网格（任意姿态、退化安全），给出排开体积、浮心、水线面积。' },
        { t: 'ul', items: [
          'BuoyancyMesh（elements.js)：new_buoyancy + trimesh.load_obj 现在走精确网格切割（不再是包围盒近似）——浮力 ρgV 作用在浮心，天然给出 6DOF 恢复力矩；包围盒 BuoyancyBox 仅在资产文本缺失时兜底。',
          '渲染：body.mesh 的网格三角形同时进入 three.js 视图（BufferGeometry 实时刷新）与软件渲染器（画家算法着色三角形），截图与浏览器一致。',
          'App 内建模：工具栏 ➕ 几何 下拉（箱体/圆柱/球/圆锥/棱锥）在当前场景新建半密度漂浮网格体；⬆ 导入 接受 .obj 直接生成带网格浮力的浮体。',
          'ex28 验证：官方 cube.obj×scale 的体积/形心、棱锥解析体积 L·B·H/3 与形心 −H/4、水线切割半箱 V=500/cob −2.5/Awp=100、10 m 浮箱半沉吃水 5 m 且 8° 横倾 + −5° 纵倾静力回正（13/13 PASS)。',
          'dave_import.js 中 new_visual 挂接真实 OBJ 网格到刚体（如 barge.obj 144 面)，Scene 树与 3D 视图同步显示。',
          'DAVE 导入增强（ex29/ex30)：dave_import 支持列表推导/星号解包/f-string、t.trimesh.load_file（STL 二进制解析→压载罐真实容积/形心）、子 frame 挂点自动转接到父船体、new_visual 挂船体网格到 3D 视图；core/report.js 复刻 report()/通配符/print_node_tree；core/marine.js 复刻 carene_table 静水力表。',
          '渲染质感：软件渲染器（tools/raster.mjs，生成全部验证截图）做 2x 超采样抗锯齿、方向太阳光+高光、深度雾、细波浪网格逐面法向高光、网格/箱体描边、海床渐变，水面按真实深度参与画家排序（水下船体透水可见），每张截图左上角盖 EXxx PASS n/n 徽章；浏览器 three.js 视图同款：ACES 色调映射、半球光+带阴影太阳光、水面 Phong 高光、网格 Edges 描边。',
        ] },
      ]},
    ],
  },
  {
    id: 'daveel', title: '6A. DAVE 元件节点库（core/elements.js，清洁室实现）', children: [
      { h: '6A.1 设计', level: 2, body: [
        { t: 'p', s: 'DAVE 的分析能力来自“元件节点”（element nodes)：它们附着在世界固定点或刚体局部点（attachment)，每一步把力/力矩注入 RigidBody6DOF.external——与缆索端反力走同一通道，因此静力 Newton 与显式动力学都自动包含它们（solvers.applyElements 在 coupleLinesToBodies 之后调用）。' },
        { t: 'p', s: '实现的节点：Spring(线性弹簧 k/L0/c)、Force(常力/力矩)、Beam(2 节点梁，EA/EIy/GJ 打包为一条带弯曲刚度的 Line)、LinCon6(六自由度线性连接弹簧/阻尼，装配位姿为零力点）、Hinge=GeometricContact(销孔：两点平动刚性锁定，转动自由，罚函数 k)、ContactBall(球-平面接触 k/mu/c)、Tank(液舱 ρgV·fill 重量)、BallastSystem(解析求箱型船目标吃水的舱室充注率）、BuoyancyBox(箱体浮力网格的非线性水静力：2D 多边形裁剪求浸水面积与浮心）、createSling(两腿吊索 rigging)、addMeasurement(测量通道)。' },
      ] },
      { h: '6A.2 DAVE 官方算例移植验证（ex11–ex16)', level: 2, body: [
        { t: 'ul', items: [
          'ex11 stability.py：箱体浮力 40×10×3、515 t、KG=3 m，强制横倾 40°，反力矩/(m·g)=GZ(40°)=-0.0635 m，与独立网格积分参考一致（多边形裁剪 vs 75 万点网格采样，偏差 < 0.01 m)；排水体积 ρLA=质量 严格成立',
          'ex12 unstable_equlibrium_hinge.py：Hinge 铰接刚体从不稳定平衡（小扰动）出发，静力收敛后重心转到铰点正下方（水平偏移 ~1e-8 m)，铰链误差 = mg/k',
          'ex13 pin_hole_connect.py：两刚体销孔连接，悬挂后销孔相对位移 < 1e-4 m，从动体重心位于销正下方 1.2 m',
          'ex14 shackles.py 吊索：固定吊点两腿吊 2 t，每腿张力 10233 N vs 解析 W/(2cosθ)=10128 N（1% 以内，差值为索自重）',
          'ex15 wind&current 笔记本：固定船体风 10 m/s + 流 1 m/s 的 X 反力 = ½ρ_air Cd A v² + ½ρ_w Cd A_c u² = 109850 N，逐分量精确匹配',
          'ex16 元件库单元校验：Spring 平衡位移 x=L0−F/k=0.5 m；Beam 轴向 ΔL=(W+F)L/EA；LC6d 位移=F/K=0.2 m；Tank 附加重量 ρgV·fill；ContactBall 静止高度=r=0.5 m',
        ] },
        { t: 'p', s: '以上 6 个算例全部程序化 PASS（见验证页卡与 docs/verification_report.md)，各带一张 1280×800 渲染截图。DAVE 其余节点（Visual/Component/SPMT/Connector2d/ContactMesh/WaveInteraction1）以既有能力覆盖：Visual→场景节点+渲染，Component→Scene DAG 分组，SPMT/Connector2d→运动端点(motion)与 Hinge，ContactMesh→ContactBall 推广，WaveInteraction1→vessel 波浪力。' },
      ] },
      { h: '6A.3 复现 DAVE-notebooks 全部算例（github.com/RubendeBruin/DAVE-notebooks，ex17–ex27)', level: 2, body: [
        { t: 'p', s: '用户要求完整复现官方 DAVE-notebooks 仓库（31 个 ipynb，MPL-2.0 许可；参考克隆 /tmp/ref/dave-notebooks @ b4c95b2，只读其公开源码与存档数据，不反编译任何 DAVE 二进制）。物理/模型类笔记本移植为程序化验证算例 ex17–ex27，外加 Reporting node properties 与 Carene Table 两个 notebook（ex29/ex30，直接跑官方 cheetah.dave)（各带 1280×800 截图，全部 PASS)。其中两个核心模型算例（ex22 Snake15、ex23 100x30x8 barge）不是手工搭建，而是直接执行官方 .dave 模型文件：仓库内置 clean-room 导入器 core/dave_import.js（见 6A.4)，把 examples/assets/ 下从 DAVE 官方仓库 verbatim 拷贝的 Snake15.dave / 100x30x8_barge.dave / cube.obj（MPL-2.0，见 examples/assets/README.md 与 DAVE-LICENSE-MPL2.txt）解释执行为 Model + Scene DAG（app 左侧场景树可见 base0..base15/Poi/Cable、Barge/压载罐等节点)，App 工具栏的“⬆ 导入”按钮也用同一导入器接受用户 .dave/.py/.json 文件：' },
        { t: 'ul', items: [
          'ex17 validation/catenaries/catenary.ipynb：100 节点悬链线 L=80、跨度 60、w=1 t/m、EA=1e10，端部水平张力 T0=a·w·g=217.66 kN vs 解析 a·sinh(30/a)=40（DAVE 实算 217.80 kN)，sag=23.55 m 一致',
          'ex18 validation/catenaries/catenary hinges.ipynb：50 节铰接刚体链（各 160 t) + Connector2d(k=1e11) 拉到 (30,0,0)：连接力 22.9 MN vs 解析 T0=21.78 MN（DAVE 实算 21.78 kN 级差异为离散链垂深 5%)，链端 x=29.9998',
          'ex19 validation/hydrostatics/hydrostatic rectangular barge.ipynb：箱驳 100×20×8 吃水 4 m → 排水 8000 m³、浮心 z=−2、横倾 1° 反算 BM=8.3346 m vs 解析 B²/(12d)=8.333 m（DAVE 实算 8.334)',
          'ex20 validation/hydrostatics/GHS "Nato pontoon with partially filled tanks.ipynb"：浮筒包围盒 13.59×4.1×0.74（OBJ 网格用包围盒近似，文档注明）、7.5 t、两舱 ρ0.985 充注 50%/10% → 吃水 0.2045 m = 总质量/(ρLB)、横倾 2.31° vs 解析 atan(Δm·y/(m·GM))=2.19°，倾向高充注舷侧',
          'ex21 validation/orcaflex/crossvalidate_ofx_3plift.ipynb：三点吊 10 t 体，平衡位姿与 OrcaFlex 交叉验证存档 3plift.yml 的 InitialPosition (0.13235,−0.63320,−0.45590) 最大偏差 3.6e-4 m；手算 6 元平衡方程残差 < 0.01%',
          'ex22 validation/orcaflex/crossvalidate_ofx_Snake15.ipynb：由 examples/assets/Snake15.dave 导入（15 节 1 t 铰接链 + 末端缆拉向 (10,0,0)，与 OrcaFlex 存档 snake15_sum.yml 对比：base1 转角 85.8° vs 86.35°、base10 (5.55,−17.39) vs (5.330,−17.425)、base15 (9.25,−8.97) vs (9.105,−8.959)、缆张力 56.2 kN vs 56.44 kN',
          'ex23 validation/orcaflex/crossvalidate_ofx_dynamics.ipynb：由 examples/assets/100x30x8_barge.dave 导入（Barge 刚体 + cube.obj×scale 浮力 + LC6d + 32 压载罐）— goal_seek 调质量使 z=−4 m ⇒ mass=12300 t = ρLBD 解析值（DAVE 结果 12300 t)，BallastSystem.solveForDraft 充注率 0.3955 = 解析',
          'ex24 01 Getting started "Joints and degrees of freedom.ipynb"：缆索悬挂刚体，平衡时缆力线过重心（手算绕 CoG 力矩 0.18 N·m)，缆跨度=L(1+T/EA) 严格成立',
          'ex25 02 Examples "Making a block (hook)"：吊钩仅 yaw 自由，300,300,0 kN 力作用下 yaw 转到 −45° 使 z 力矩为零（力方向对准）',
          'ex26 70 Book "force traveling through rotated axis systems.ipynb"：10 个嵌套旋转坐标系，DAG worldPosition == 独立手工 Rodrigues 矩阵合成（误差 0)，力对根之矩一致',
          'ex27 10 Buoyancy and Stability "Vessel Stability 02 Lift.ipynb"：驳船 100×30×12、20000 t，吊 1000 t 重物缆张力 = 9.807e6 N = 重量，横倾角与"固定横倾+只解升沉"的独立力矩平衡求根一致、倾向吊臂侧',
        ] },
        { t: 'p', s: '.dave 导入器（core/dave_import.js，纯文本解释执行，不链接/反编译任何 DAVE 二进制）支持 .dave 的 Python 子集：赋值、for i in range(n) 缩进块、多行调用、元组、f-string、.format()、True/False/None、solved() 标记、s.get_resource_path()；节点映射：new_frame/new_rigidbody→RigidBody6DOF（父链且平动锁定 = 世界摆放 + Hinge 关节；t→kg×1000、角度 deg→rad)，new_point→Scene 点/附着，new_cable→Line(EA kN→N)，new_geometric_contact→Hinge(k=1e9)，new_connector2d→Connector2d(kN/m→N/m)，new_linear_connector_6d→LinCon6，new_buoyancy+trimesh.load_obj→OBJ 包围盒×scale 的 BuoyancyBox（注明近似），new_ballastsystem+new_tank→Tank（capacity kN→V m³)，new_visual/new_waveinteraction→记录到 meta.visuals 不仿真。' },
        { t: 'p', s: '其余算例的移植策略（避免实现父子刚体动力学）：Snake15 以外的铰接链 = 世界摆放的刚体 + Hinge(GeometricContact)；Connector2d = 罚函数刚性连接；OBJ 网格浮力（Nato pontoon/DELFTship/pyramid 冰山）用其包围盒的 BuoyancyBox 近似并在算例描述中注明；goal_seek = solvers.goalSeek 二分；DAVE 单位换算 t→×1000 kg、kN→×1000 N。求解器方面为支撑这些算例新增了自适应 LM 模式（computeStatics 的 mode="lm" 分支，含张力尺度的残差缩放），默认 legacy 路径保持 ex01–ex16 行为不变（28/28 全部 PASS 回归）。' },
        { t: 'p', s: '纯 GUI/查看器/工作流类笔记本（无独立物理校核目标）→ 映射到 App 既有功能：00 First tests / demo-import asset / 99 Technical tests(test-viewer, Non-blocking GUI, Latex pdf) → App 内 3D 视图+软件渲染回退+导入导出面板；Pandas → 验证数据导出 CSV/JSON + app/verification_data.js；start GUI from notebook → npm run serve 本地 App；03 Workflow Parts 1–3(circle eye/shackle 几何、geometriccontact、多进程 variations) → 导入/导出 JSON·YAML·DAVE-py 与 ?ex= 参数化算例；04 Reporting → 验证页卡表格 + docs/verification_report.{md,html,docx} 下载。' },
      ] },
      { h: '6A.4 .dave 模型文件导入（Scene DAG 集成）', level: 2, body: [
        { t: 'p', s: 'core/dave_import.js 是 .dave 建模脚本的 clean-room 导入器：对文件文本做轻量 Python 子集解释（逻辑行拼接、注释剥离、元组/kwargs 转换），以 recorder 模式执行 s.new_* 调用，直接产出 Model（bodies/lines/elements）并同步登记 Scene SNode（newAxis/newPoint 挂到 parent），因此 App 场景树能看到 base0..base15、Poi、Cable、Barge、压载罐等与 DAVE 场景一致的 DAG。' },
        { t: 'ul', items: [
          'examples/assets/：Snake15.dave、100x30x8_barge.dave、cube.obj 从 github.com/RubendeBruin/DAVE (src/DAVE/resources) verbatim 拷贝，MPL-2.0（DAVE-LICENSE-MPL2.txt + README.md 注明来源）；同名 .dave.js/.obj.js 为浏览器可 import 的文本包装。',
          'ex22/ex23 的 build() 直接 loadDaveModel(vendored .dave)，校核项内含“模型由 .dave 导入 / DAG 节点数 / 铰接数 / 浮力盒 / 罐数 / LC6d 刚度”等证据，证明不是手工搭建的替身。',
          'App 工具栏 “⬆ 导入” 接受 .dave/.py（含 s.new_*)/.json：.dave 走 loadDaveModel（resolveAsset 解析 cube.obj 等内置资产），.json 走 Model.fromJSON；导入后自动定相机、跑静力、进场景树。',
          '单位换算：mass t→×1000 kg，力/刚度 kN(·/m)→×1000 N(·/m)，角度 deg→rad；solved(x) 原样返回（求解自由度标记）；已知近似：OBJ 浮力用包围盒（meta.buoyancyApprox 注明）、.dhyd 水动力系数与 visual 不仿真（meta.visuals 记录）。',
        ] },
      ]},
    ],
  },
  {
    id: 'post', title: '7. 后处理：统计、疲劳与极值', children: [
      { h: '7.1 雨流计数 + Miner', level: 2, body: [
        { t: 'p', s: 'ASTM 雨流计数把张力时程转为 (幅值,均值) 循环，按 S-N 曲线 N=A·S^−m 计算各级疲劳寿命，Miner 线性累积 D=Σnᵢ/Nᵢ。ex10 用 JONSWAP 波验证谱矩 m0=Hs²/16、η 标准差≈Hs/4、雨流循环数与损伤 D>0。' },
      ] },
      { h: '7.2 极值统计', level: 2, body: [
        { t: 'p', s: '对响应极值序列做 Gumbel 拟合，外推给定重现期的极值，用于规范校核。' },
      ] },
    ],
  },
  {
    id: 'davecore', title: '6A.5 DAVEcore 核心功能复现（建模模块 core/davecore.js)', children: [
      { h: '6A.5 DAVEcore 功能对照表', level: 2, body: [
      { t: 'p', s: 'DAVEcore 是 DAVE 的 C++ 后端（import DAVEcore as DC，由 Scene._vfc 持有；编译产物，不在本仓库源码中）。我们按其公开文档的功能分组做纯 JS 复现，并登记在 DAVECORE_FEATURES 中（ex31 逐项校验，15/15 PASS):' },
      { t: 'table', cols: ['DAVEcore 功能组', '本仓库实现'], rows: [
        ['1. 静力/动力平衡求解（BackgroundSolver)', 'core/solvers.js: computeStatics / runDynamics / goalSeek'],
        ['2. 节点 DAG 几何与正向运动学（DC.Axis 图）', 'core/scene.js (SNode DAG) + RigidBody6DOF.worldOrigin/rotVec'],
        ['3. Buoyancy 网格水线切割 → displacement/cob', 'core/mesh.js clipMeshBelowPlane + elements.js BuoyancyMesh'],
        ['4. Tank 液舱：液面切割、cog、free_flooding、permeability', 'elements.js Tank.freeFloodedFluid()（网格按世界水线切割×permeability)、cogWhenFull'],
        ['5. 悬链线与接触（Cable/ContactBall/ContactMesh/GeometricContact)', 'core/line.js + elements.js Hinge/ContactBall + davecore.js ContactMesh（立体角缠绕数判内+罚函数）'],
        ['6. 核心节点工厂 new_*（RigidBody/Beam/Force/HydSpring/LC6d/Connector2d/SPMT/WindArea/CurrentArea/SupportPoint)', 'core/elements.js + core/env.js + davecore.js HydSpring/SPMT + dave_import.js'],
        ['7. 状态同步 state_update（重算所有力/浮心/舱液重心）', 'core/solvers.js refreshExternal / applyElements'],
        ['pymeshup 网格操作（load/transform/slice/clip/mass props)', 'core/mesh.js: parseObj/parseStlBase64/transformMesh/waterplaneProps/waterplaneLoops/clipMeshBelowPlane/meshMassProps'],
      ]},
      { t: 'p', s: '交叉校验：waterplaneProps 对 cheetah 船体在吃水 6.75 m 的水线切片给出 Awl=8821.43 m²、CoF=(98.9449, −7.7e-7) m、BM T=I_T/V=26.709 m、BM L=I_L/V=526.1 m —— 与 DAVE Carene 表（CoF/BM T 表值 98.945/26.7018）一致；破损舱 free_flooding 液量=切割体积×permeability、平衡穿透深度 δ=W/(4k) 等均在 ex31 中断言。' },
      ]},
    ]},
  {
    id: 'concepts', title: '6A.6 DAVE 核心概念与术语（core/concepts.js)', children: [
      { h: '6A.6 术语、单位与节点类型', level: 2, body: [
      { t: 'p', s: '按 DAVE 公开文档（docs/scene_and_nodes.rst 与 node_prop_info.csv，deepwiki “Core concepts and terminology”) 整理核心概念，落地为 core/concepts.js，并由 ex32 逐项校验（13/13 PASS):' },
      { t: 'table', cols: ['概念', 'DAVE 定义', '本仓库实现'], rows: [
        ['长度/力/质量/角度单位', '长度 m，力 kN，质量 mT（metric ton)，角度（含 rotation vector)一律 degrees；力矩 kN·m，转动惯量 kN·m²', 'DAVE_UNITS：m/mT/kN/deg ↔ SI 双向换算（1 mT=1000 kg，1 kN=1000 N，1°=π/180)，round-trip 校验'],
        ['节点类型（node types)', 'Scene 中 25 类节点：Axis / Point(Poi) / Frame / RigidBody / Cable / Beam / LC6d / Connector2d / Force / HydSpring / Buoyancy / Visual / TriMeshSource / Tank / BallastSystem / ContactBall / ContactMesh / GeometricContact / Circle / Shackle / Sling / SPMT / WindOrCurrentArea / WaveInteraction / Measurement', 'NODE_TYPES 注册表：类名 → {impl, status}，25/25 覆盖断言'],
        ['Frame 与正向运动学（FK)', '节点位置/姿态均相对 parent frame；世界变换 = 父世界 × 局部（T_world = T_parent · T_local)；多级链逐层累乘', 'frameWorld（单级；local.rot 与 parent.rot **均为 rotation vector in degrees**，DAVE 角度约定）、frameChainWorld（多级链，rot 统一 degrees)、pointWorld（局部点→世界 p_w=pos+R·p)、worldToLocal（逆 FK，rot 返回 deg)；ex32 与 Scene DAG worldTransform 交叉验证（链式 FK 只累乘矩阵，与手工合成逐位相等 err=0.0000；20 条 4 级随机链 vs Scene DAG 和独立 2D Rodrigues 手算 err 也是 0.0000)、逆变换往返误差 < 1e-9（机器精度量级，rot 比较用旋转矩阵因 180° 轴向翻转等价)、并专设 guard 防 rot 被误按弧度解析'],
        ['Rotation vector（旋转向量）', '姿态用旋转向量表示：方向=旋转轴，模=旋转角（degrees)；R = Rodrigues(axis, |v|)', 'core/math.js rotVecToMat3 / mat3ToRotVec；eulerToRotVec 自洽（ex32 校验）'],
        ['heading / tilt_x / tilt_y', '由单位局部 x/y 轴定义：heading=atan2(u_x.y, u_x.x)；tilt_x=asin(u_y.z)；tilt_y=asin(−u_x.z)（= asin of z of unit −x)', 'rotVecToEuler：ex32 对 heading=30°、tilt_x=12°、tilt_y=25° 逐项断言'],
        ['转动惯量与回转半径', 'Ixx = rxx² · mass（rxx 为回转半径)', 'inertiaFromRadii(mass, [rxx,ryy,rzz])'],
        ['Component（组件）', 'Frame 子场景，可作为可复用组件挂到任意节点下', 'scene.js SNode DAG parent 链（ex26 已验证世界变换 == 手工 Rodrigues 合成）'],
      ]},
      { t: 'p', s: 'ex32 演示场景（父子 Frame A/B + 网格浮筒）验证 frameWorld 正向运动学（点 (2,0,0) 绕父 frame z 轴 30° 后世界坐标 (11.7321, 1, 5)）、旋转合成（Rz30∘Rz30 → 60°)、heading/tilt 提取、units 换算（12300 mT=1.23e7 kg，10 kN=1e4 N，90°=π/2)、转动惯量 I=r²·m，末了对演示场景跑 computeStatics 收敛校核——22/22 PASS。' },
      ]},
    ]},
  {
    id: 'nodetree', title: '6A.7 DAVE 节点树架构：observers / managers / dissolve（core/scene.js)', children: [
      { h: '6A.7 节点树架构（groups.md / nodetree.rst / dissolve.md)', level: 2, body: [
      { t: 'p', s: '按 DAVE 公开文档 groups.md、nodetree.rst、dissolve.md，在 core/scene.js 的 SNode/Scene 层落地（ex33 校验，7/7 PASS):' },
      { t: 'table', cols: ['DAVE 概念', 'DAVE 定义', '本仓库实现'], rows: [
        ['Observers（观察者）', 'A 观察 B：B 的可设属性变化时，A 收到 on_observed_node_changed；观察者 DEPENDS ON 被观察者；删除被观察节点时观察者一并删除', 'SNode.observers / observing；setProp 触发通知；Scene.remove 级联删除 observer；topoOrder 把被观察节点排在观察者之前'],
        ['Managers（管理器）', 'Manager 管理一组标准化节点（如 shackle/sling)：managed_nodes、depends_on（创建前必须存在的节点）、creates(node)、delete', 'Manager extends SNode：managedNodes() / dependsOn() / creates() / delete()；p.manager 反引；topoOrder 中 dependsOn 节点排在 manager 之前'],
        ['Dependency-aware topo sort', '节点按依赖排序（parent、观察关系、manager 依赖），避免循环引用', 'Scene.topoOrder() 走 dependencyNodes()（parent + observing + dependsOn)'],
        ['Dissolve（溶解）', '不改变模型几何地移除节点：中间 Frame dissolve = 子节点重挂到祖父且保持世界位姿；Point 只有无附着时可 dissolve', 'dissolveNode(scene, name)：用逆 FK（worldToLocal 语义）重算子节点 local pos/rot，误差 < 1e-12；附着 Point 抛错拒绝'],
        ['Node tree 拖拽规则（nodetree.rst)', '拖拽改 parent 关系；Circle-Circle 建 geometric contact 等', 'setParent + Hinge/GeometricContact 元件（ex13 已验证销孔连接）'],
      ]},
      ]},
    ]},
    {
    id: 'examples', title: '8. 验证算例（33 个，全部 PASS)', children: [
      { h: '8.1 算例清单', level: 2, body: [
        { t: 'ul', items: [
          'ex01 空中弹性悬链线 vs 解析解（端部张力/垂深）',
          'ex02 海床系泊缆 touchdown 与锚张力 vs 解析+摩擦解',
          'ex03 垂直悬挂链摆动（静力张力=mgL，动态均值/峰值/摆幅）',
          'ex04 系泊浮筒规则波响应（均值=静力，有界波动）',
          'ex05 箱型驳船水静力与 GZ（吃水/GM/GZ5°/GZ20°）',
          'ex06 箱型船 heave/roll 衰减（周期 vs 2π√(M/K)，衰减比）',
          'ex07 规则波+海流系泊船（漂移/张力统计/极值有界）',
          'ex08 绞车吊重物（张力=重量，动力均值=静力，有界摆动）',
          'ex09 Lazy-wave 立管静力（touchdown/顶张力 vs 解析）',
          'ex10 JONSWAP 不规则波浮筒（m0=Hs²/16，η统计，雨流+Miner）',
          'ex11 DAVE stability.py：40° 横倾 GZ vs 网格积分参考（非线性 Buoyancy 节点）',
          'ex12 DAVE unstable_equlibrium_hinge.py：铰接摆从不稳定平衡落到铰点正下方',
          'ex13 DAVE pin_hole_connect.py：两体销孔连接，销误差 <1e-4 m',
          'ex14 DAVE shackles 吊索：两腿张力 vs W/(2cosθ)',
          'ex15 DAVE 风流算例：WindArea+CurrentArea 反力 vs ½ρCdAv² 解析和',
          'ex16 DAVE 元件库：Spring/Beam/LC6d/Tank/ContactBall 单元级校验',
          'ex17 DAVE-notebooks catenary：100 节点悬链线 T0/垂深 vs 解析（DAVE 217.80 kN)',
          'ex18 DAVE-notebooks catenary hinges：50 铰接段 + Connector2d，连接力/端位/垂深 vs 解析',
          'ex19 DAVE-notebooks hydrostatic barge：排水/浮心/1°横倾反算 BM vs B²/12d',
          'ex20 DAVE-notebooks GHS Nato pontoon：部分充注液舱的吃水与横倾 vs 质量/力矩解析',
          'ex21 DAVE-notebooks ×OrcaFlex 3plift：三点吊平衡位姿 vs 存档 yml（偏差 3.6e-4 m)+ 手算平衡',
          'ex22 DAVE-notebooks ×OrcaFlex Snake15：15 节铰接链位姿/转角/缆张力 vs 存档 snake15_sum.yml',
          'ex23 DAVE-notebooks 100x30x8 barge：goal_seek 质量=12300 t 使吃水 4 m + LC6d + 压载求解',
          'ex24 DAVE-notebooks Joints&DOF：缆挂刚体转动平衡（缆力线过重心，跨度=L(1+T/EA))',
          'ex25 DAVE-notebooks hook：yaw 自由吊钩在力作用下对准（yaw=−45°，z 力矩=0)',
          'ex26 DAVE-notebooks 旋转坐标系链：Scene DAG 世界变换 == 手工 Rodrigues 合成',
          'ex27 DAVE-notebooks Vessel Stability 02 Lift：吊重缆张力=重量，驳船横倾 vs 力矩平衡求根',
          'ex28 网格几何（core/mesh.js)：OBJ解析+图元+精确体积/形心/惯性，BuoyancyMesh 网格浮力任意姿态水线切割（半沉浮箱吃水/倾角回正，13 项校验）',
          'ex29 DAVE-notebooks "04 Reporting/Reporting node properties"：直接导入 DAVE 官方 cheetah.dave（网格浮力 buoyancy cheetah.obj + 24 个 STL 压载罐 + 船体 visual 网格），print_node_tree 与 notebook 输出逐行一致，solve_statics 收敛（残差 8e-9)，report() 支持 */? 通配符，6.75 m 吃水排水量 53278 m³（DAVE 标注 53290.760)，15/15 PASS',
          'ex30 DAVE-notebooks "10 Buoayncy and Stability/Carene Table"：core/marine.js 复刻 DAVE marine.carene_table（delta_draft=1e-3、delta_roll=1°、delta_pitch=0.3° 有限差分），吃水 0.25–9 m 共 19 行，V/CoB/CoF 与 DAVE 一致，14/14 PASS',
          'ex31 DAVEcore 核心功能复现对照（core/davecore.js)：7 组 DAVEcore 功能全部落地——求解器/DAG 正向运动学/trimesh 水静力/Tank 破损舱（free_flooding+permeability+cog_when_full)/悬链线与接触（新增 ContactMesh 立体角判内）/HydSpring+SPMT 等节点工厂/state_update；另用 pymeshup 式水线切片 waterplaneProps 独立交叉校验 carene（Awl/CoF/BM T=I_T/V=26.709 与 DAVE 表 26.7018 一致)，15/15 PASS',
          'ex32 DAVE 核心概念与术语（core/concepts.js)：units(mT/kN/deg ↔ SI)、25 类节点类型注册 NODE_TYPES、frame 正向运动学（单级 frameWorld + 多级链 frameChainWorld + 逆 worldToLocal + pointWorld，与 Scene DAG worldTransform 交叉验证）、rotation vector 与 heading/tilt_x/tilt_y、I=r²·m 转动惯量，演示场景静力收敛（frameWorld 双方 rot 均为 deg)，25/25 PASS',
          'ex33 DAVE 节点树架构（groups.md/nodetree.rst/dissolve.md)：observers 通知与级联删除、Manager 依赖感知 topo 排序、dissolve 中间 Frame 保持子节点世界位姿（逆 FK 误差<1e-12)、附着 Point 拒绝 dissolve，7/7 PASS',
        ] },
        { t: 'p', s: '每个算例由 tools/run_examples.mjs 自动运行并做程序化 PASS/FAIL 校核，同时渲染 1280×800 截图存入 screenshots/，结果写入 app/verification_data.js 与 docs/verification_report.{md,html}，可在 App 的“验证”页卡查看。' },
      ] },
    ],
  },
  {
    id: 'usage', title: '9. 使用指南', children: [
      { h: '9.1 本地运行', level: 2, body: [
        { t: 'code', s: 'git clone <repo> && cd webgpufem\nnpm install            # three + pngjs\nnpm run verify         # 运行全部 33 个算例的程序化验证 + 截图\nnpm run serve          # 本地启动 http://localhost:8000 打开 index.html' },
        { t: 'p', s: 'App 完全离线运行：3D 视图、算例仿真、验证表、文档、流程图、下载面板均为本地模块，无任何外部请求。' },
        { t: 'ul', items: ['3D 视图可点击拾取对象（船体/缆节点/POI)，左侧场景树同步高亮；无 WebGL 时自动回退显示软件渲染截图', '左侧面板：场景树(Scene DAG)、属性检查器(实时 q/张力/残差)、环境滑杆(波高/周期/波向/海流/风速)、绞车 L0 滑杆', '导入/导出：⬆ 导入 .dave/.py/JSON 模型文件（.dave 经 core/dave_import.js 进 Scene DAG)，⬇ 导出模型 JSON(DAVE 式)/OrcaFlex YAML/DAVE py/当前画面 PNG；URL 参数 ?ex=ex07 直达算例', '“🧪 重跑校核”按钮在浏览器内以与 runner 相同的参数重跑该算例全部校核项并显示 PASS/FAIL', '底部时序图图例可点击显示/隐藏对应通道；播放支持 0.25–4× 速度与时间 scrubber'] },
      ] },
      { h: '9.2 生成 Word 实现文档（docx + PDF 副本）', level: 2, body: [
        { t: 'code', s: 'pip install python-docx pillow reportlab fonttools brotli\nnpm run docs           # tools/build_docs.py → docs/OrcaFlex_DAVE_实现文档.docx（分级标题 + 流程图 PNG)\nnpm run docs:pdf       # tools/build_pdf.py  → docs/OrcaFlex_DAVE_实现文档.pdf（同源数据的 PDF 副本，内嵌 NotoSansSC 中文字体）' },
      ] },
      { h: '9.3 目录结构', level: 2, body: [
        { t: 'ul', items: ['core/ — 数值库与场景图', 'examples/ — 33 个验证算例（ex01–ex10 原创 + ex28 网格几何 + ex11–ex16 DAVE 移植 + ex17–ex27、ex29/ex30 DAVE-notebooks 复现 + ex31 DAVEcore 功能对照 + ex32 DAVE 核心概念与术语 + ex33 节点树架构，ex22/ex23/ex29/ex30 由 examples/assets/*.dave 导入构建）', 'tools/ — 验证/截图/文档构建脚本', 'app/ — Web App (index.html + app/)', 'docs/ — 文档数据、验证报告、docx', 'screenshots/ — 各算例渲染截图', 'vendor/ — three.js 本地依赖'] },
      ] },
    ],
  },
];
