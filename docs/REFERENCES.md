# 参考项目代码核查（尚未集成）

以下是读取上游源码后的记录；引用不表示本项目已移植或实现这些功能。

- [fenris 四面体单元](https://github.com/InteractiveComputerGraphics/fenris/blob/master/src/element/tetrahedron.rs)：Tet4/Tet10/Tet20 的单元连接和几何表示；[网格细分](https://github.com/InteractiveComputerGraphics/fenris/blob/master/src/mesh/refinement.rs)目前明确说明只提供特定单元的**均匀细分**。README 称该库自身不提供线性系统求解器，也没有 GPU 加速计划。MIT / Apache-2.0 双许可，使用代码需遵守对应许可证。
- [ngsolve_webgpu 四面体 WGSL](https://github.com/CERBSim/ngsolve_webgpu/blob/main/ngsolve_webgpu/shaders/eval/tet.wgsl)：基于重心坐标和 Bernstein 多项式评估弯曲四面体几何，主要用于 NGSolve 网格和场的 WebGPU 可视化，不是独立生成贴体网格或动力学求解器。
- [DynELA Explicit.C](https://github.com/pantale/DynELA-v.-4.0/blob/github/Sources/dnlFEM/Explicit.C)：C++ 显式求解器代码，含时间积分与时间步长处理。上游项目依赖原生编译和 Python；现有应用并未集成或移植。
- [WeldFormFEM Remesh.C](https://github.com/luchete80/WeldFormFEM/blob/master/Remesh.C)：引用 ParMmg/MMG 的四面体重网格代码；其 README 将接触与重网格标记为 WIP。原项目使用 C++/CUDA，不能直接作为浏览器 JS 运行。

## 浏览器端候选内核

[@loumalouomega/gmsh-wasm](https://github.com/loumalouomega/GMSH-JS) 将 Gmsh 和 OpenCASCADE 编译为 WASM，支持体网格及 STEP 的读写基础设施，但**目前没有接入本应用，也不自动提供 TPMS 的有效 B-Rep**。浏览器构建需 SharedArrayBuffer 和 COOP/COEP 响应头，与直接打开 file:// 的需求冲突；分发静态链接的二进制需遵守 GPL-2.0-or-later。需要先解决隐式 TPMS 到封闭曲面/体域、模型误差、流形性、多材料接口和许可，再实现并验证四面体网格及其质量。
