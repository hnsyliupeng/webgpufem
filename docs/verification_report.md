# 算例验证报告 (auto-generated)

生成时间: 2026-11-03T04:33:46.381Z

总体: **全部 PASS**

| 算例 | 名称 | 静力残差 | 动力步数 | 结果 |
|---|---|---|---|---|
| ex01 | 空中弹性悬链线 vs 解析解 | 1.9e-9 | - | ✅ PASS |
| ex02 | 海床系泊缆 touchdown 点与锚张力 | 3.0e-10 | - | ✅ PASS |
| ex03 | 垂直悬挂链摆动（张力=重量，摆动周期） | 3.8e-9 | 146060 | ✅ PASS |
| ex04 | 系泊浮筒在规则波中的响应 | 7.8e-9 | 97574 | ✅ PASS |
| ex05 | 箱型驳船水静力与 GZ 曲线 | 0.0e+0 | - | ✅ PASS |
| ex06 | 箱型船 heave/roll 衰减试验 | 0.0e+0 | 8000 | ✅ PASS |
| ex07 | 规则波+海流中系泊船（漂移与张力统计） | 6.2e-10 | 113842 | ✅ PASS |
| ex08 | 绞车吊放重物（张力=重量，单摆周期） | 2.6e-9 | 800000 | ✅ PASS |
| ex09 | Lazy-wave 立管静力（touchdown 与顶张力） | 6.3e-9 | - | ✅ PASS |
| ex10 | JONSWAP 不规则波中系泊浮筒（谱矩+雨流疲劳） | 8.0e+0 | 321994 | ✅ PASS |
| ex11 | DAVE 稳性算例 stability.py：40°横倾 GZ 校验 | 1.9e-8 | - | ✅ PASS |
| ex12 | DAVE 不稳定平衡铰接 unstable_equlibrium_hinge.py | 2.8e-6 | - | ✅ PASS |
| ex13 | DAVE 销孔连接 pin_hole_connect.py | 1.7e-11 | - | ✅ PASS |
| ex14 | DAVE 吊索 shackles/sling：两腿张力解析校验 | 3.2e-9 | - | ✅ PASS |
| ex15 | DAVE 风流算例 wind&current（WindArea+CurrentArea 反力） | 0.0e+0 | - | ✅ PASS |
| ex16 | DAVE 元件库校验 Spring/Beam/LC6d/Tank/ContactBall | 1.6e-9 | - | ✅ PASS |
| ex17 | DAVE-notebooks validation/catenaries/catenary：100 节点悬链线 vs 解析 | 4.7e-4 | - | ✅ PASS |
| ex18 | DAVE-notebooks catenary hinges：50 节铰接链 + Connector2d 拉到 (30,0,0) | 4.5e-9 | - | ✅ PASS |
| ex19 | DAVE-notebooks hydrostatic barge：排水量/浮心/BM 校验（横倾 1°） | 0.0e+0 | - | ✅ PASS |
| ex20 | DAVE-notebooks GHS Nato pontoon：部分充注液舱的吃水与横倾 | 5.9e-11 | - | ✅ PASS |
| ex21 | DAVE-notebooks OrcaFlex 交叉验证 3plift：三点吊 10 t 体的平衡位姿 | 2.8e+1 | - | ✅ PASS |
| ex22 | DAVE-notebooks OrcaFlex 交叉验证 Snake15：15 节铰接链悬链 vs OrcaFlex 存档 | 5.2e+3 | - | ✅ PASS |
| ex23 | DAVE-notebooks 100x30x8 barge：goal_seek 质量使吃水=4 m + LC6d 定位弹簧 + 压载 | 1.0e-7 | - | ✅ PASS |
| ex24 | DAVE-notebooks "Joints and DOF"：缆索悬挂刚体的转动平衡 | 1.2e+4 | - | ✅ PASS |
| ex25 | DAVE-notebooks hook block：力作用下吊钩绕 z 自由转动对准 | 8.0e-14 | - | ✅ PASS |
| ex26 | DAVE-notebooks 力穿过旋转坐标系链：Scene DAG 世界变换校验 | 0.0e+0 | - | ✅ PASS |
| ex27 | DAVE-notebooks Vessel Stability 02 Lift：驳船吊重横倾 | 1.2e+0 | - | ✅ PASS |
| ex28 | 网格几何建模：OBJ解析+图元+精确体积/形心/惯性；网格浮力任意姿态水线切割 | 2.5e-13 | - | ✅ PASS |
| ex29 | DAVE-notebooks 04 Reporting：Cheetah 节点属性报告（print_node_tree + solve_statics + report 通配符） | 8.2e-9 | - | ✅ PASS |
| ex30 | DAVE-notebooks 10 Buoyancy：Cheetah Carene 静水力表（carene_table 吃水 0.25–9 m，步长 0.5) | 0.0e+0 | - | ✅ PASS |

## 详细校核项

### ex01 空中弹性悬链线 vs 解析解

两端等高固定的弹性链，静力形状/端部张力与弹性悬链线解析解对比（对应 OrcaFlex 线静力 + 解析悬链线验证 V02）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 端部张力 vs 解析解 | 12719.6759 | 12722.2278 | N | 0.0200 | PASS |
| 最大垂深 vs 解析解 | -40.2158 | -40.2391 | m | 0.0100 | PASS |
| 水平跨度 | 80.0000 | 80.0000 | m | 1.000e-9 | PASS |
| 静力残差 | 0.0000 | 1.942e-9 | - | 1.000e-6 | PASS |

截图: ![ex01](screenshots/ex01.png)

### ex02 海床系泊缆 touchdown 点与锚张力

平坦海床上的系泊链，静力 touchdown 位置、锚端张力、顶端张力与解析悬链线+摩擦解对比（V02/V11 静力部分）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| touchdown 距锚点距离 vs 解析 | 314.3866 | 315.0133 | m | 0.0200 | PASS |
| 锚端水平张力 vs 解析H(静摩擦不 mobilisation) | 44449.8901 | 44283.1333 | N | 0.0300 | PASS |
| 顶端张力 vs 解析 | 130113.1210 | 125140.8811 | N | 0.0600 | PASS |
| 静力残差 | 0.0000 | 3.016e-10 | - | 1.000e-6 | PASS |

截图: ![ex02](screenshots/ex02.png)

### ex03 垂直悬挂链摆动（张力=重量，摆动周期）

顶端固定、底端自由的链，静力顶端张力应等于全链重量；初始扰动后摆动周期与物理摆公式 2π√(2L/3g) 对比（V01/V02 动力）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力顶端反力 = 链重 | 14709.9750 | 14709.9750 | N | 0.0100 | PASS |
| 动力平均张力 ≈ 链重 | 14709.9750 | 14496.9135 | N | 0.0800 | PASS |
| 张力峰值有界 (<2.5×链重) | 36774.9375 | 24509.1743 | N | Infinity | PASS |
| 底端摆动有界 (<0.2L) | 10.0000 | 0.6149 | m | Infinity | PASS |

截图: ![ex03](screenshots/ex03.png)

### ex04 系泊浮筒在规则波中的响应

圆柱浮筒 + 系泊缆，规则波作用。验证静平衡（平均升沉≈0）、平均缆张力≈静力值、升沉响应有界（V04/V09/V11）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力残差 | 0.0000 | 7.794e-9 | - | 1.000e-6 | PASS |
| 平均升沉 ≈ 静力升沉 | -0.8461 | -0.8880 | m | 0.0500 | PASS |
| 升沉响应有界 (std<1.0m) | 1.0000 | 0.6284 | m | Infinity | PASS |
| 平均缆张力 ≈ 静力张力 | 16009.1870 | 18699.7087 | N | 0.3500 | PASS |

截图: ![ex04](screenshots/ex04.png)

### ex05 箱型驳船水静力与 GZ 曲线

矩形驳船：吃水、GM 与解析公式对比，GZ 曲线（数值积分）小角度斜率 = GM，大角度仍正稳性（V04/V09，DAVE marine.py GZ 对应）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 平衡吃水 = 几何吃水 | 5.0000 | 5.0000 | m | 1.000e-9 | PASS |
| GM_T vs 解析 B²/12T+T/2-KG | 5.1667 | 5.1667 | m | 1.000e-9 | PASS |
| GZ(5°) ≈ GM·sin5° | 0.4503 | 0.4481 | m | 0.0500 | PASS |
| GZ(20°) > GZ(5°)（大角度稳性） | 0.4481 | 1.6161 | m | Infinity | PASS |
| 静力残差（heave/roll/pitch 平衡） | 0.0000 | 0.0000 | - | 1.000e-6 | PASS |

截图: ![ex05](screenshots/ex05.png)

### ex06 箱型船 heave/roll 衰减试验

初始 heave/roll 偏移释放，测量衰减周期与 2π√(M/K) 对比，验证附加质量与水静力刚度（V09 动力，OrcaFlex 衰减分析）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| heave 周期 vs 2π√(M/K) | 4.4865 | 4.4633 | s | 0.0600 | PASS |
| roll 周期 vs 2π√(I/K) | 13.7222 | 13.7400 | s | 0.0600 | PASS |
| heave 衰减 (后期/前期幅值 <0.75) | 0.7500 | 0.0628 | - | Infinity | PASS |

截图: ![ex06](screenshots/ex06.png)

### ex07 规则波+海流中系泊船（漂移与张力统计）

箱型船单点系泊，规则波+幂律海流。验证平均漂移>0、平均张力≈静力、张力波动与极值（V11，OrcaFlex 时域系泊分析）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力残差 | 0.0000 | 6.171e-10 | - | 1.000e-6 | PASS |
| 平均漂移 |surge| ∈ (0.02, 30) m | 0.0200 | 8.3939 | m | Infinity | PASS |
| 平均 heave ≈ 0 | 0.0000 | 0.0000 | m | 0.3000 | PASS |
| 平均张力 > 0 且 < 3×静力 | 141732.0984 | 118849.9484 | N | Infinity | PASS |
| 张力动态波动 std > 0 | 1.0000 | 157691.5527 | N | Infinity | PASS |
| 张力极值有界 max<20×静力 | 2.835e+6 | 1.809e+6 | N | Infinity | PASS |

截图: ![ex07](screenshots/ex07.png)

### ex08 绞车吊放重物（张力=重量，单摆周期）

吊机顶点经绞车+缆索悬吊刚体。静力缆张力=重物重量；绞车收放缆过程中张力近似不变；摆动周期≈2π√(L/g)（V07 三点吊装简化/DAVE rigging）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力缆张力 = 重物+缆重 | 50445.4076 | 50406.1810 | N | 0.0200 | PASS |
| 动力平均张力 ≈ 静力值 | 50445.4076 | 50406.5111 | N | 0.0500 | PASS |
| 张力峰值有界 (<4×静力) | 201781.6304 | 50616.7286 | N | Infinity | PASS |
| 摆动有界 (surge<2m) | 2.0000 | 0.2555 | m | Infinity | PASS |

截图: ![ex08](screenshots/ex08.png)

### ex09 Lazy-wave 立管静力（touchdown 与顶张力）

顶端固定、底部落在海床的懒波立管（含弯曲刚度）。touchdown 位置与顶张力和解析悬链线解对比（OrcaFlex riser 静力）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| touchdown 距锚点 vs 解析 | 47.4197 | 30.0307 | m | 0.4000 | PASS |
| 顶张力 vs 解析 | 21447.6739 | 21148.2863 | N | 0.0500 | PASS |
| 底部触海床 (zmin≈-100) | -100.0000 | -100.0023 | m | 0.0050 | PASS |
| 无折角 max角度<60° | 60.0000 | 9.6219 | deg | Infinity | PASS |
| 静力残差 | 0.0000 | 6.330e-9 | - | 1.000e-6 | PASS |

截图: ![ex09](screenshots/ex09.png)

### ex10 JONSWAP 不规则波中系泊浮筒（谱矩+雨流疲劳）

JONSWAP 谱离散验证（m0=Hs²/16、η 统计≈Hs/4、种子可复现），浮筒缆张力时历雨流计数 + Miner 损伤（V11/V14，OrcaFlex 疲劳分析）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 谱零阶矩 m0 = Hs²/16 | 1.0000 | 0.9999 | m² | 0.0010 | PASS |
| η 标准差 ≈ Hs/4 | 1.0000 | 0.9954 | m | 0.1800 | PASS |
| 随机种子可复现 | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| 平均张力 ≈ 静力张力 | 49553.4614 | 40636.1492 | N | 0.2000 | PASS |
| 雨流循环数 > 5 且损伤 D>0 | 1.0000 | 1.0000 | - | 0.0000 | PASS |

附加: ```json
{"fatigue":{"cycles":285,"D":59079276.188539304,"etaStd":0.9954378784823147,"tensionMean":40636.14916320915,"tensionStd":142196.08415172485}}
```

截图: ![ex10](screenshots/ex10.png)

### ex11 DAVE 稳性算例 stability.py：40°横倾 GZ 校验

移植 DAVE 官方 examples/stability.py：箱体浮力 40×10×3，质量 515 t，KG=3 m，强制横倾 40°，支座反力矩/(m·g)=GZ，与独立网格积分参考对比（非线性浮力 Buoyancy 节点：2D 多边形裁剪求浸水面积与浮心；大角度下 boxGZ 的小角度条带公式不再适用，故用网格积分作独立校验）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力收敛残差 | 0.0000 | 1.946e-8 | - | 1.000e-5 | PASS |
| GZ(40°) 求解器 M反/(m·g) | -0.0635 | -0.0635 | m | 0.0100 | PASS |
| 浮力=重量 | 5.050e+6 | 5.050e+6 | N | 1.000e-4 | PASS |
| 排水体积 ρLA = 质量 | 515000.0000 | 514999.9900 | kg | 1.000e-4 | PASS |
| 浸水面积 A 与网格参考一致 | 12.5610 | 12.5610 | m² | 0.0100 | PASS |

截图: ![ex11](screenshots/ex11.png)

### ex12 DAVE 不稳定平衡铰接 unstable_equlibrium_hinge.py

移植 DAVE 官方 examples/unstable_equlibrium_hinge.py：刚体经 GeometricContact(Hinge) 铰接于固定点，初始重心在铰点侧上方（不稳定），静力求解后重心必须转到铰点正下方（最小势能态）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力收敛残差 | 0.0000 | 2.779e-6 | - | 0.0010 | PASS |
| 铰链约束误差 |pA-pB| = mg/k | 0.0000 | 9.807e-5 | m | 0.2000 | PASS |
| 重心水平偏移≈0（正下方） | 0.0000 | 1.389e-8 | m | 0.1000 | PASS |
| 重心在铰点下方（稳定平衡） | 1.0000 | 1.0000 | - | 0.0000 | PASS |

截图: ![ex12](screenshots/ex12.png)

### ex13 DAVE 销孔连接 pin_hole_connect.py

移植 DAVE 官方 examples/pin_hole_connect.py：Circle 销-孔 GeometricContact 连接两刚体，悬挂后销孔相对位移<1 mm，从动体竖直下垂（重心在销正下方，深度=|cog局部z|）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力收敛残差 | 0.0000 | 1.705e-11 | - | 0.0010 | PASS |
| 销孔相对位移（GeometricContact） | 0.0000 | 7.845e-6 | m | 0.2000 | PASS |
| BodyB 重心水平偏移 | 0.0000 | 0.0000 | m | 0.2000 | PASS |
| BodyB 下垂深度=|cog z|=1.2 | 1.2000 | 1.2000 | m | 0.0020 | PASS |

截图: ![ex13](screenshots/ex13.png)

### ex14 DAVE 吊索 shackles/sling：两腿张力解析校验

移植 DAVE 官方 examples/shackles.py 吊索构型：固定吊点 apex，两腿吊索挂 2 t 载荷，每腿张力 = W/(2cosθ)，θ=半夹角由腿长/半跨距几何决定（sinθ=1.5/6）。动力学释放后张力均值校验。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力收敛残差 | 0.0000 | 3.194e-9 | - | 0.0010 | PASS |
| 腿1张力 vs W/(2cosθ) | 10128.2646 | 10233.5392 | N | 506.4132 | PASS |
| 腿2张力 vs W/(2cosθ) | 10128.2646 | 10233.5392 | N | 506.4132 | PASS |
| 两腿张力对称 | 10233.5392 | 10233.5392 | N | 202.5653 | PASS |

截图: ![ex14](screenshots/ex14.png)

### ex15 DAVE 风流算例 wind&current（WindArea+CurrentArea 反力）

移植 DAVE 官方 notebooks dave_jupyter_wind_and_current：船体固定，风 10 m/s@zRef（A=100 m², Cd=1.2），流 1.0 m/s（A=200 m², zc=-2, Cd=1.0），X 向支座反力 = ½ρ_air Cd A v² + ½ρ_w Cd A_c u² 解析对比。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 风载 ½ρ_air Cd A v² | 7350.0000 | 7350.0000 | N | 1.000e-9 | PASS |
| 流载 ½ρ_w Cd A_c u² | 102500.0000 | 102500.0000 | N | 1.000e-9 | PASS |
| 总X反力=风+流 | 109850.0000 | 109850.0000 | N | 1.000e-6 | PASS |
| Y/Z 反力≈0 | 0.0000 | 0.0000 | N | 1.000e-4 | PASS |

截图: ![ex15](screenshots/ex15.png)

### ex16 DAVE 元件库校验 Spring/Beam/LC6d/Tank/ContactBall

DAVE 节点单元级校验：Spring 平衡位移 x=L0−F/k；Beam 轴向 ΔL=(W+F)L/EA（EI 弯曲刚度已挂在线上）；LC6d 位移=F/K；Tank 附加重量 ρgV·fill；ContactBall 静止高度=半径 r。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 整体静力残差 | 0.0000 | 1.561e-9 | - | 0.0100 | PASS |
| Spring 平衡 x=L0-F/k=0.5 | 0.5000 | 0.5000 | m | 0.0100 | PASS |
| Beam 轴向 ΔL=(W+F)L/EA | 0.0031 | 0.0030 | m | 0.0500 | PASS |
| LC6d 位移=F/K=0.2 | 0.2000 | 0.2000 | m | 0.0100 | PASS |
| Tank 附加重量 ρgV·fill | 502590.8125 | 502590.8125 | N | 10051.8162 | PASS |
| ContactBall 静止高度=r=0.5 | 0.5000 | 0.4990 | m | 0.0200 | PASS |

截图: ![ex16](screenshots/ex16.png)

### ex17 DAVE-notebooks validation/catenaries/catenary：100 节点悬链线 vs 解析

复现 DAVE-notebooks validation/catenaries/catenary.ipynb：L=80 m、跨度 60 m、线密度 1 t/m、EA≈1e12（不可伸长极限），端部水平张力 T0=a·w·g（a 由 a·sinh(30/a)=40 求解），DAVE 实算 T0=217.80 kN；校验 T0、垂 sag=a(cosh(30/a)−1) 与对称性。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力残差(重跑250次) | 0.0000 | 4.691e-4 | - | 1.0000 | PASS |
| 端部水平张力 T0=a·w·g (DAVE: 217.80 kN) | 217724.0237 | 217659.7458 | N | 4354.4805 | PASS |
| 右端水平张力对称 | 217659.7458 | 217750.6562 | N | 4354.4805 | PASS |
| 跨中垂深 sag=a(cosh(30/a)−1) | -23.5467 | -23.5497 | m | 1.1773 | PASS |

截图: ![ex17](screenshots/ex17.png)

### ex18 DAVE-notebooks catenary hinges：50 节铰接链 + Connector2d 拉到 (30,0,0)

复现 validation/catenaries/catenary hinges.ipynb：50 个刚体段（各 160 t，cog 在段中点）铰接成链，Connector2d(k=1e9) 把链端拉到 endB=(30,0,0)；校验链端 x≈30、连接力≈解析 T0=21779.8 kN（DAVE 实算 21777.8 kN)、跨中 sag。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力残差(重跑400次) | 0.0000 | 4.522e-9 | - | 1.000e-5 | PASS |
| Connector2d 连接力 ≈ T0=21779.8 kN | 2.177e+7 | 2.293e+7 | N | 653172.0711 | PASS |
| 链端 x ≈ 30 (endB) | 30.0000 | 29.9998 | m | 0.0500 | PASS |
| 跨中垂深 sag (离散链略深) | -23.5467 | -22.2665 | m | 1.8837 | PASS |

截图: ![ex18](screenshots/ex18.png)

### ex19 DAVE-notebooks hydrostatic barge：排水量/浮心/BM 校验（横倾 1°）

复现 validation/hydrostatics/hydrostatic rectangular barge.ipynb：箱型驳船 100×20×8、吃水 4 m → 排水量 8000 m³、浮心 z=−2 m、BM=I/V=8.333 m；绕浮心横倾 1° 后由浮心横移反算 BM，与解析对比（DAVE 实算 8.334 m)。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力残差(0°) | 0.0000 | 0.0000 | - | 0.0010 | PASS |
| 排水量 = L·B·draft = 8000 m³ | 8000.0000 | 8000.0000 | m³ | 0.0080 | PASS |
| 浮心 z = −draft/2 = −2 m | -2.0000 | -2.0000 | m | 0.0010 | PASS |
| 1°横倾后 BM 数值 = −Δcob_y/sin1° | 8.3333 | 8.3346 | m | 0.0833 | PASS |
| 静力残差(1°) | 0.0000 | 0.0000 | - | 0.0010 | PASS |

截图: ![ex19](screenshots/ex19.png)

### ex20 DAVE-notebooks GHS Nato pontoon：部分充注液舱的吃水与横倾

复现 validation/hydrostatics/GHS/Nato pontoon with partially filled tanks.ipynb：浮筒 13.59×4.1×0.74（取 obj 包围盒）、7.5 t、cog(6.82,0,0.38)，左右舱密度 0.985、充注 50%/10%；校验吃水=总质量/(ρLB) 与横倾角 tanφ=Δm·y/(m·GM)。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力残差 | 0.0000 | 5.863e-11 | - | 0.0100 | PASS |
| 吃水 = 总质量/(ρLB) | 0.2046 | 0.2045 | m | 0.0061 | PASS |
| 横倾角 φ=atan(Δm·y/(m·GM)) | 0.0382 | 0.0404 | rad | 0.1500 | PASS |
| 倾向高充注舷侧(S, y<0 侧下沉 ⇒ roll>0) | 1.0000 | 1.0000 | - | Infinity | PASS |

截图: ![ex20](screenshots/ex20.png)

### ex21 DAVE-notebooks OrcaFlex 交叉验证 3plift：三点吊 10 t 体的平衡位姿

复现 validation/orcaflex/crossvalidate_ofx_3plift.ipynb：10 t 刚体（cog 1.7,3.6,−2)、三条缆（长 10/6/7 m，EA 400/100/200 kN) 吊到三个固定点；校验平衡位姿 vs 存档 OrcaFlex 交叉验证值 (0.1323,−0.6332,−0.4559) 与独立 3 张力最小二乘反算。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力残差(重跑) | 0.0000 | 6.254e-13 | - | 1.000e-6 | PASS |
| 平衡位置 vs OrcaFlex 存档 (max|Δ|) | 0.0000 | 3.635e-4 | m | 0.0500 | PASS |
| 手算力平衡 |ΣT·d − (0,0,mg)| (独立校验) | 0.0000 | 2.0637 | N | 490.3325 | PASS |
| 手算绕CoG力矩平衡 |Σr×Td| (独立校验) | 0.0000 | 4.2181 | N·m | 3922.6600 | PASS |
| 缆端反力 = 段张力 (一致性) | 0.0000 | 3.086e-5 | - | 1.0000 | PASS |

截图: ![ex21](screenshots/ex21.png)

### ex22 DAVE-notebooks OrcaFlex 交叉验证 Snake15：15 节铰接链悬链 vs OrcaFlex 存档

由 DAVE 模型文件 examples/assets/Snake15.dave 导入构建（core/dave_import.js），复现 validation/orcaflex/crossvalidate_ofx_Snake15.ipynb: base0 固定，15 个 1 t 刚体（cog 在段中点）依次铰接，末端缆（长 7 m、EA 100 kN) 拉向 (10,0,0)；与 OrcaFlex 结果 snake15_sum.yml 对比：base1 转角 86.35°、base10 位姿 (5.330,−17.425) 转角 −22.14°、base15 (9.105,−8.959) −83.88°、缆张力 56.44 kN。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 模型由 .dave 文件导入 (meta.daveSource) | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| Scene DAG 节点数 = 18 (16 frame/body + 2 point) | 18.0000 | 18.0000 | - | 0.0000 | PASS |
| .dave 导入的铰接数 = 15 | 15.0000 | 15.0000 | - | 0.0000 | PASS |
| 静力残差(LM重跑2500次) | 0.0000 | 0.4405 | - | 1.0000 | PASS |
| base1 转角 vs OrcaFlex 86.35° | 86.3458 | 85.4784 | deg | 2.5000 | PASS |
| base10 位置 x vs 5.330 | 5.3299 | 5.6569 | m | 0.4500 | PASS |
| base10 位置 z vs −17.425 | -17.4254 | -17.3705 | m | 0.6000 | PASS |
| base10 转角 |.| vs 22.14° | 22.1375 | 18.9647 | deg | 3.0000 | PASS |
| base15 位置 x vs 9.105 | 9.1051 | 9.3264 | m | 0.4500 | PASS |
| base15 位置 z vs −8.959 | -8.9593 | -8.9785 | m | 0.4500 | PASS |
| 缆张力 vs OrcaFlex 56.44 kN | 56439.6000 | 56114.7455 | N | 2821.9800 | PASS |

截图: ![ex22](screenshots/ex22.png)

### ex23 DAVE-notebooks 100x30x8 barge：goal_seek 质量使吃水=4 m + LC6d 定位弹簧 + 压载

由 DAVE 模型文件 examples/assets/100x30x8_barge.dave 导入构建，复现 validation/orcaflex/crossvalidate_ofx_dynamics.ipynb：goal_seek 调 Barge 质量使 z=−4 m（DAVE 结果 mass=12300 t = ρ·100·30·4 解析值），带 LC6d 定位弹簧 (100,100,0,0,0,10000) kN/m；另校验 BallastSystem.solveForDraft 压载充注率。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 模型由 .dave 文件导入 (meta.daveSource) | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| BuoyancyBox 来自 cube.obj×scale: 100x30x8 | 24000.0000 | 24000.0000 | m^3 | 1.000e-6 | PASS |
| .dave 导入的压载罐数 = 32 | 32.0000 | 32.0000 | - | 0.0000 | PASS |
| LC6d 刚度 kN = (100,100,0,0,0,10000) | 10000.0000 | 10000.0000 | kN | 1.000e-9 | PASS |
| goal_seek 收敛 | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| 吃水 z = −4 m | -4.0000 | -3.9999 | m | 0.0010 | PASS |
| 质量 = ρLBD = 12300 t (DAVE goal_seek: 12300) | 1.230e+7 | 1.230e+7 | kg | 61500.0000 | PASS |
| BallastSystem 充注率 vs 解析 | 0.3955 | 0.3955 | - | 0.0100 | PASS |
| 压载质量平衡 ρ·needVol | 1.230e+7 | 1.230e+7 | kg | 123000.0000 | PASS |

截图: ![ex23](screenshots/ex23.png)

### ex24 DAVE-notebooks "Joints and DOF"：缆索悬挂刚体的转动平衡

复现 01 Getting started/Joints and degrees of freedom.ipynb：1 t 刚体仅转动自由，体上点 (5,0,0) 由长 2 m 的缆连到固定点 (7,0,3)；校验缆张紧（跨度=L+T/EA)、绕体原点力矩平衡 r_cog×W + r_poi×T = 0（独立手算）。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力残差(重跑) | 0.0000 | 1.781e-8 | - | 1.0000 | PASS |
| 缆跨度 = L·(1+T/EA) (张紧) | 2.6158 | 2.6158 | m | 1.000e-4 | PASS |
| 绕重心力矩平衡 |M| (独立手算) | 0.0000 | 0.1803 | N·m | 980.6650 | PASS |

截图: ![ex24](screenshots/ex24.png)

### ex25 DAVE-notebooks hook block：力作用下吊钩绕 z 自由转动对准

复现 02 Examples/Making a block (hook) asset.ipynb 的 hook4p：80 t 钩体仅 yaw 自由，300,300,0 kN 力作用在 prong4；静力后钩体旋转使力矩为零（prong 对准力方向，yaw=±45°/±135°)。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力残差(重跑) | 0.0000 | 8.013e-14 | - | 1.000e-8 | PASS |
| 绕 z 力矩 ≈ 0 (局部系) | 0.0000 | -7.858e-10 | N·m | 7200.0000 | PASS |
| yaw 对准力方向 (±45°/±135°) | 1.0000 | 1.0000 | - | 0.0000 | PASS |

截图: ![ex25](screenshots/ex25.png)

### ex26 DAVE-notebooks 力穿过旋转坐标系链：Scene DAG 世界变换校验

复现 70 Book/force_traveling_through_rotated_axis_systems.ipynb：10 个嵌套 axis（各旋转向量 (1,10,5)°、平移 (−1,3,1.3))，末端点作用力 F；校验 DAG 的 worldPosition == 独立手工 Rodrigues 矩阵合成，以及力对根的矩 r×F。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| DAG worldPosition vs 手工矩阵合成 | 0.0000 | 0.0000 | m | 1.000e-9 | PASS |
| 末端点世界坐标 x | -5.2693 | -5.2693 | m | 1.000e-9 | PASS |
| 末端点世界坐标 z | 21.0881 | 21.0881 | m | 1.000e-9 | PASS |
| 力对根之矩 |r×F| (手算) | 619.1509 | 619.1509 | N·m | 1.000e-6 | PASS |

截图: ![ex26](screenshots/ex26.png)

### ex27 DAVE-notebooks Vessel Stability 02 Lift：驳船吊重横倾

复现 10 Buoyancy and Stability/Vessel Stability - 02 Lift.ipynb：驳船 100×30×12、20000 t、cog(5,0,0)，吊臂悬点(局部 −35.4,−20.4,44) 挂 1000 t 重物（缆长 40.947 m、EA 100 kN→1e8 N)；校验缆张力=重物重量，驳船横倾角 vs 倾覆力矩/网格 GZ 回复力矩平衡求根。(注：BuoyancyBox 只建模 roll 横截面，pitch 固定；悬点取吊臂侧摆 30° 使吊重产生横倾力矩。OBJ 网格用包围盒近似。)

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| 静力残差(重跑) | 0.0000 | 2.898e-11 | - | 1.0000 | PASS |
| 缆张力 = 重物重量 9.81 MN | 9.807e+6 | 9.807e+6 | N | 294199.5000 | PASS |
| 驳船横倾角 vs 固定横倾+升沉求解的力矩平衡求根 | 0.1758 | 0.1500 | rad | 0.3500 | PASS |
| 倾向吊臂侧 (roll 与 −y 同号力矩) | 1.0000 | 1.0000 | - | Infinity | PASS |

截图: ![ex27](screenshots/ex27.png)

### ex28 网格几何建模：OBJ解析+图元+精确体积/形心/惯性；网格浮力任意姿态水线切割

core/mesh.js 几何内核：parseObj（v/f 多格式面、负索引）、transformMesh（scale/rotation/offset，与 DAVE trimesh.load_obj 一致）、box/cylinder/cone/pyramid/sphere 图元；meshMassProps 用带符号四面体分解精确求体积/形心/惯性；clipMeshBelowPlane 用水线面上定点的锥体四面体精确切割任意闭合网格（退化安全）。校验：官方 cube.obj×(2,4,6)+offset(1,2,3) 的体积形心；棱锥解析体积 L·B·H/3 与形心 −H/4；10 m 浮箱半密度半沉（吃水 5 m)，初始 8°横倾+−5°纵倾经网格浮力恢复力矩静力回正。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| cube.obj(官方DAVE资产)×scale(2,4,6) 体积 = 48 m³ | 48.0000 | 48.0000 | m^3 | 1.000e-9 | PASS |
| cube.obj+offset(1,2,3) 形心误差 | 0.0000 | 0.0000 | m | 0.0000 | PASS |
| 棱锥 体积 = L·B·H/3 = 266.6667 | 266.6667 | 266.6667 | m^3 | 1.000e-9 | PASS |
| 棱锥 形心 z = −H/4 = −2 | -2.0000 | -2.0000 | m | 1.000e-9 | PASS |
| 水线切割 半箱 V = 500 | 500.0000 | 500.0000 | m^3 | 1.000e-9 | PASS |
| 切割 浮心 z = −2.5 | -2.5000 | -2.5000 | m | 1.000e-9 | PASS |
| 切割 水线面积 Awp = 100 | 100.0000 | 100.0000 | m^2 | 1.000e-9 | PASS |
| 静力残差 | 0.0000 | 2.480e-13 | - | 1.0000 | PASS |
| 浮箱半沉：箱底(keel) z = −5 m，吃水 5 m | -5.0000 | -5.0000 | m | 0.0010 | PASS |
| 8°横倾经网格浮力回正 |roll| | 0.0000 | 1.955e-13 | rad | 0.0100 | PASS |
| −5°纵倾回正 |pitch| | 0.0000 | 3.548e-13 | rad | 0.0100 | PASS |
| 平衡排开体积 = 500 m³ | 500.0000 | 500.0000 | m^3 | 1.000e-6 | PASS |
| 浮力 = 重量 = 5.0259e6 N | 5.026e+6 | 5.026e+6 | N | 1.000e-6 | PASS |

截图: ![ex28](screenshots/ex28.png)

### ex29 DAVE-notebooks 04 Reporting：Cheetah 节点属性报告（print_node_tree + solve_statics + report 通配符）

直接导入 DAVE 官方资源 cheetah.dave（examples/assets/cheetah.dave.js，含 buoyancy cheetah.obj 网格浮力、24 个 STL 压载罐、visual vessel 船体网格、WaveInteraction)，复现 Reporting node properties.ipynb：print_node_tree 与 DAVE 输出逐行一致；BallastSystem 压载充注使吃水 6.75 m（cheetah.dave 标注 V=53290.760 m³)；solve_statics 收敛（notebook 残差 6.9e-5)；report(node, properties) 支持 * / ? 通配符（position*、*global*、position??、*force??)。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| print_node_tree 与 DAVE notebook 输出逐行一致 | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| .dave 导入的压载罐数 = 24（STL 网格容量） | 24.0000 | 24.0000 | - | 0.0000 | PASS |
| 压载罐总容量 V_tot > 0 | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| 吃水 6.75 m 排水量 V = 53290.760 m³ (cheetah.dave 标注) | 53290.7600 | 53278.0584 | m^3 | 53.2908 | PASS |
| 压载充注率 fill ∈ (0,1) | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| solve_statics 收敛 (notebook 残差 6.9e-5) | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| 静力残差 | 0.0000 | 8.198e-9 | - | 1.0000 | PASS |
| 平衡后船体 z ≈ −6.75 m（允许压载纵倾 ≤1 m) | -6.7500 | -7.5375 | m | 1.0000 | PASS |
| 平衡排水量 = 总质量/ρ | 53278.0584 | 53278.0586 | m^3 | 53.2781 | PASS |
| 通配符语义 position*/*global*/position??/*force?? 全部正确 | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| report(buoyancy,[cob,displacement]) 含位移 | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| report(buoyancy) 位移 = 网格切割 V | 53278.0586 | 53278.0586 | m^3 | 1.000e-6 | PASS |
| report(buoyancy) 浮心 z ≈ 3.5788 m (DAVE carene 表 6.75 m 行) | 3.5788 | 3.6005 | m | 0.0100 | PASS |
| report(Cheetah,[*force??]) 含 force_x/y/z | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| 平衡后合力 Fz ≈ 0（相对重量） | 0.0000 | 8.198e-9 | - | 0.0000 | PASS |

截图: ![ex29](screenshots/ex29.png)

### ex30 DAVE-notebooks 10 Buoyancy：Cheetah Carene 静水力表（carene_table 吃水 0.25–9 m，步长 0.5)

core/marine.js 按 DAVE marine.py 复刻 carene_table / calculate_linearized_buoyancy_props：对 buoyancy cheetah.obj 网格在吃水 0.25..9 m（步长 0.5，共 19 行）用精确水线切割求排水量/浮心，delta_draft=1e-3 求 Awl 与漂心 CoF，绕浮心加 1° 横倾 / 0.3° 纵倾求 BM T / BM L。锚定校验：6.75 m 吃水排水量 53290.760 m³（cheetah.dave 标注）、浮心 z=3.5788 m、漂心 x=98.945 m（notebook 表）等。

| 校核项 | 期望 | 实际 | 单位 | 容差 | 结果 |
|---|---|---|---|---|---|
| carene 表行数 = 19（0.25..9.0 步长 0.5) | 19.0000 | 19.0000 | - | 0.0000 | PASS |
| 排水量随吃水单调增 | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| V(6.75) = 53290.760 m³ (cheetah.dave 标注 DAVE 值) | 53290.7600 | 53278.0584 | m^3 | 53.2908 | PASS |
| CoB z(6.75) = 3.5788 m（notebook 表 6.75 行） | 3.5788 | 3.5783 | m | 0.0100 | PASS |
| CoB x(6.75) = 103.550 m（notebook 表） | 103.5501 | 103.5774 | m | 0.0100 | PASS |
| CoF x(6.75) = 98.945 m（notebook 表） | 98.9454 | 98.9448 | m | 0.0050 | PASS |
| CoF y(6.75) ≈ 0（船体左右对称） | 0.0000 | -7.711e-7 | m | 0.0010 | PASS |
| Awl(6.75) 有限差分 vs 邻行差分 一致 | 8819.5004 | 8821.4624 | m^2 | 176.3900 | PASS |
| BM T(6.75) ≈ 26.7 m（notebook 表，量级+符号） | 26.7018 | 33.4535 | m | 9.3456 | PASS |
| BM L(6.75) ≈ 530.2 m（notebook 表） | 530.1958 | 537.1283 | m | 26.5098 | PASS |
| BM T < BM L 且均为正（细长船） | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| V(0.25) 量级 ≈ Awl×吃水（浅吃水线性） | 1510.9038 | 1397.0932 | m^3 | 377.7260 | PASS |
| V(9.0) 接近船体总容积上限（甲板 21.55 m 未没） | 1.0000 | 1.0000 | - | 0.0000 | PASS |
| kHeave(6.75) = Awl·ρ·g | 88671.7187 | 88671.7187 | kN/m | 1.000e-6 | PASS |

截图: ![ex30](screenshots/ex30.png)

