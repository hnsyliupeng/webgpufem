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
        { t: 'ul', items: ['math.js — 向量/矩阵/旋转、线性求解、Jacobi 特征值、RNG', 'waves.js — Airy/JONSWAP 谱、谱离散、波面与水质点运动', 'env.js — 海床罚函数+Coulomb、海流(幂律)、风', 'catenary.js — 解析弹性悬链线 + 海床 touchdown 求解', 'line.js — lumped-mass 线单元(轴向/弯曲/Morison/海床/端反力)', 'vessel.js — 刚体6DOF、箱型水静力、FK 波浪力、GZ', 'scene.js — SNode 场景 DAG、Model、saveJSON、导出 OrcaFlex YAML / DAVE py', 'solvers.js — 附着更新、Newton 静力、时域积分、模态分析', 'post.js — 统计、ASTM 雨流、Miner、Gumbel 极值', 'render_scene.js — 场景描述(供 three.js 与软件渲染共用)'] },
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
        { t: 'ul', items: ['Model.saveJSON() — DAVE 风格的 JSON 场景序列化', 'exportOrcaFlexYAML() — 导出 OrcaFlex 风格 YAML 草案', 'exportDavePy() — 导出 DAVE 风格 Python 建模脚本'] },
      ] },
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
    id: 'examples', title: '8. 验证算例（10 个，全部 PASS）', children: [
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
        ] },
        { t: 'p', s: '每个算例由 tools/run_examples.mjs 自动运行并做程序化 PASS/FAIL 校核，同时渲染 1280×800 截图存入 screenshots/，结果写入 app/verification_data.js 与 docs/verification_report.{md,html}，可在 App 的“验证”页卡查看。' },
      ] },
    ],
  },
  {
    id: 'usage', title: '9. 使用指南', children: [
      { h: '9.1 本地运行', level: 2, body: [
        { t: 'code', s: 'git clone <repo> && cd webgpufem\nnpm install            # three + pngjs\nnpm run verify         # 运行全部 10 个算例的程序化验证 + 截图\nnpm run serve          # 本地启动 http://localhost:8000 打开 index.html' },
        { t: 'p', s: 'App 完全离线运行：3D 视图、算例仿真、验证表、文档、流程图、下载面板均为本地模块，无任何外部请求。' },
        { t: 'ul', items: ['3D 视图可点击拾取对象（船体/缆节点/POI)，左侧场景树同步高亮；无 WebGL 时自动回退显示软件渲染截图', '左侧面板：场景树(Scene DAG)、属性检查器(实时 q/张力/残差)、环境滑杆(波高/周期/波向/海流/风速)、绞车 L0 滑杆', '导出按钮：模型 JSON(DAVE 式)/OrcaFlex YAML/DAVE py/当前画面 PNG；URL 参数 ?ex=ex07 直达算例', '“🧪 重跑校核”按钮在浏览器内以与 runner 相同的参数重跑该算例全部校核项并显示 PASS/FAIL', '底部时序图图例可点击显示/隐藏对应通道；播放支持 0.25–4× 速度与时间 scrubber'] },
      ] },
      { h: '9.2 生成 Word 实现文档', level: 2, body: [
        { t: 'code', s: 'pip install python-docx pillow\nnpm run docs           # tools/build_docs.py → docs/OrcaFlex_DAVE_实现文档.docx（分级标题 + 流程图 PNG）' },
      ] },
      { h: '9.3 目录结构', level: 2, body: [
        { t: 'ul', items: ['core/ — 数值库与场景图', 'examples/ — 10 个验证算例', 'tools/ — 验证/截图/文档构建脚本', 'app/ — Web App (index.html + app/)', 'docs/ — 文档数据、验证报告、docx', 'screenshots/ — 各算例渲染截图', 'vendor/ — three.js 本地依赖'] },
      ] },
    ],
  },
];
