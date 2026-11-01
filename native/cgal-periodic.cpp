// GPL-3.0-or-later: experimental periodic App material-domain cell diagnostic.
// This is not a conforming finite-box mesh and is never exported for analysis.
#include <CGAL/Periodic_3_mesh_3/config.h>
#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>
#include <CGAL/make_periodic_3_mesh_3.h>
#include <CGAL/optimize_periodic_3_mesh_3.h>
#include <CGAL/Periodic_3_mesh_triangulation_3.h>
#include <CGAL/Labeled_mesh_domain_3.h>
#include <CGAL/Mesh_complex_3_in_triangulation_3.h>
#include <CGAL/Mesh_criteria_3.h>
#include "app-field.hpp"
#include "shared-periodic-face.hpp"
#include "quality-gate.hpp"
#include "periodic-direct-criterion.hpp"
#include "periodic-edge-audit.hpp"
#ifdef TPMS_QUALITY_REFINEMENT_PROBE
#include "experimental-refinement-criterion.hpp"
#endif
#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>
using K=CGAL::Exact_predicates_inexact_constructions_kernel;
using Domain=CGAL::Labeled_mesh_domain_3<K>;
using Tr=CGAL::Periodic_3_mesh_triangulation_3<Domain>::type;
using Mesh=CGAL::Mesh_complex_3_in_triangulation_3<Tr>;
using Criteria=CGAL::Mesh_criteria_3<Tr>;
namespace prm=CGAL::parameters;
std::string quote(const std::string&s){std::string out;for(unsigned char c:s){if(c=='\\'||c=='"')out+='\\';if(c>=32)out+=char(c);}return out;}
struct SlicePolygon{int material;std::vector<std::array<double,2>> points;double jac=0,aspect=0;};
struct Stats{double jac=1,aspect=0,volume[4]={},count[4]={};size_t crossing=0,qualityBad[3]={},qualityTotal[3]={},failureTypes[3]={};std::vector<SlicePolygon> slice;};
Stats summarize(const Mesh& mesh,double cell){
 Stats out;double &minJac=out.jac,&maxAspect=out.aspect;double *volume=out.volume,*count=out.count;size_t &crossing=out.crossing;auto sub=[](const auto&a,const auto&b){return std::array<double,3>{a[0]-b[0],a[1]-b[1],a[2]-b[2]};};auto cross=[](const auto&a,const auto&b){return std::array<double,3>{a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]};};auto dot=[](const auto&a,const auto&b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];};auto len=[&](const auto&a){return std::sqrt(dot(a,a));};
 for(auto it=mesh.cells_in_complex_begin();it!=mesh.cells_in_complex_end();++it){Tr::Cell_handle c=it;int mat=mesh.subdomain_index(c);if(mat<1||mat>3)throw std::runtime_error("材料标签无效");auto tet=mesh.triangulation().tetrahedron(c);std::array<std::array<double,3>,4> v;bool outside=false;for(int i=0;i<4;i++){auto t=tet.vertex(i);v[i]={t.x(),t.y(),t.z()};}for(int k=0;k<3;k++){double lo=std::min({v[0][k],v[1][k],v[2][k],v[3][k]}),hi=std::max({v[0][k],v[1][k],v[2][k],v[3][k]});if(hi-std::floor(lo)>1+1e-12)outside=true;}if(outside)crossing++;
  // Intersect periodic tetrahedra with z=1/2 and draw seam copies; these are
  // actual tet slices for inspection only, not a finite-box tetrahedral mesh.
  size_t sliceStart=out.slice.size();if(out.slice.size()<30000){auto w=v;for(int k=0;k<3;k++){double lo=std::min({v[0][k],v[1][k],v[2][k],v[3][k]});double off=std::floor(lo);for(int i=0;i<4;i++)w[i][k]-=off;}for(int sz=-1;sz<=0;sz++){std::vector<std::array<double,2>> polygon;for(int i=0;i<4;i++)for(int j=i+1;j<4;j++){double a=w[i][2]+sz,b=w[j][2]+sz;if((a<=.5&&b>.5)||(b<=.5&&a>.5)){double t=(.5-a)/(b-a);std::array<double,2> point{w[i][0]+t*(w[j][0]-w[i][0]),w[i][1]+t*(w[j][1]-w[i][1])};bool duplicate=false;for(auto q:polygon)if(std::hypot(q[0]-point[0],q[1]-point[1])<1e-12)duplicate=true;if(!duplicate)polygon.push_back(point);}}if(polygon.size()<3)continue;double cx=0,cy=0;for(auto q:polygon){cx+=q[0];cy+=q[1];}cx/=polygon.size();cy/=polygon.size();std::sort(polygon.begin(),polygon.end(),[&](auto a,auto b){return std::atan2(a[1]-cy,a[0]-cx)<std::atan2(b[1]-cy,b[0]-cx);});for(int sx=-1;sx<=0;sx++)for(int sy=-1;sy<=0;sy++){auto copy=polygon;double xmin=2,xmax=-2,ymin=2,ymax=-2;for(auto& q:copy){q[0]+=sx;q[1]+=sy;xmin=std::min(xmin,q[0]);xmax=std::max(xmax,q[0]);ymin=std::min(ymin,q[1]);ymax=std::max(ymax,q[1]);}if(xmax>=0&&xmin<=1&&ymax>=0&&ymin<=1&&out.slice.size()<30000)out.slice.push_back({mat,std::move(copy)});}}}
  auto e1=sub(v[1],v[0]),e2=sub(v[2],v[0]),e3=sub(v[3],v[0]);double det=dot(e1,cross(e2,e3));if(!std::isfinite(det)||det<=1e-18)throw std::runtime_error("周期网格存在退化单元");count[mat]++;volume[mat]+=det*cell*cell*cell/6;double longest=0;for(int i=0;i<4;i++)for(int j=i+1;j<4;j++)longest=std::max(longest,len(sub(v[i],v[j])));double cellJac=1,cellAspect=0;for(int i=0;i<4;i++){int ids[3],k=0;for(int j=0;j<4;j++)if(i!=j)ids[k++]=j;auto a=sub(v[ids[0]],v[i]),b=sub(v[ids[1]],v[i]),c2=sub(v[ids[2]],v[i]);cellJac=std::min(cellJac,det/(len(a)*len(b)*len(c2)));cellAspect=std::max(cellAspect,longest*len(cross(sub(v[ids[1]],v[ids[0]]),sub(v[ids[2]],v[ids[0]])))/det);}for(size_t p=sliceStart;p<out.slice.size();++p){out.slice[p].jac=cellJac;out.slice[p].aspect=cellAspect;}minJac=std::min(minJac,cellJac);maxAspect=std::max(maxAspect,cellAspect);bool materialInterface=false,freeBoundary=false;for(int i=0;i<4;i++){auto nb=c->neighbor(i);if(!mesh.is_in_complex(nb))freeBoundary=true;else if(mesh.subdomain_index(nb)!=mat)materialInterface=true;}int category=materialInterface?0:(freeBoundary?1:2);out.qualityTotal[category]++;bool failJac=cellJac<=.3,failAspect=cellAspect>=10;if(failJac||failAspect){out.qualityBad[category]++;out.failureTypes[failJac?(failAspect?2:0):1]++;}}
 return out;
}
struct StageLog{int kind;bool accepted,valid;double beforeJac,afterJac,beforeAspect,afterAspect;size_t beforeBad,afterBad,beforeTotal,afterTotal;bool boundaryChecked;std::array<size_t,3> beforeBoundary,afterBoundary;};
struct FaceProbe{std::array<double,3> center,normal;int a,b;};
struct InterfaceAudit{size_t faces=0,bad=0,pairs[4][4]={{0}},sampled=0,matched=0;};
// Check vertex identity and a constant periodic translation for all three
// vertices of each material interface. The two-sided label probes are only a
// geometry diagnostic, not a proof of boundary accuracy.
template<class Field> InterfaceAudit auditInterfaces(const Mesh& mesh,double cell,Field& field){
 InterfaceAudit out;const auto& tr=mesh.triangulation();std::vector<FaceProbe> probes;uint64_t seed=0x5826ad43u;size_t seen=0;
 for(auto it=mesh.cells_in_complex_begin();it!=mesh.cells_in_complex_end();++it){Tr::Cell_handle c=it;int mat=mesh.subdomain_index(c);for(int i=0;i<4;i++){auto other=c->neighbor(i);if(!mesh.is_in_complex(other))continue;int second=mesh.subdomain_index(other);if(second==mat||!std::less<Tr::Cell_handle>()(c,other))continue;++out.faces;if(mat<1||mat>3||second<1||second>3){++out.bad;continue;}out.pairs[std::min(mat,second)][std::max(mat,second)]++;int opposite=tr.mirror_index(c,i),ka=0,kb=0;std::array<Tr::Vertex_handle,3> av,bv;std::array<std::array<int,3>,3> ao,bo;
  for(int j=0;j<4;j++){if(j!=i){auto a=tr.int_to_off(c->offset(j));av[ka]=c->vertex(j);ao[ka++]={a.x(),a.y(),a.z()};}if(j!=opposite){auto b=tr.int_to_off(other->offset(j));bv[kb]=other->vertex(j);bo[kb++]={b.x(),b.y(),b.z()};}}if(!samePeriodicFace(av,ao,bv,bo))++out.bad;
  size_t slot=2048;if(seen<2048)slot=seen;else{seed=seed*6364136223846793005ULL+1442695040888963407ULL;size_t k=seed%(seen+1);if(k<2048)slot=k;}seen++;if(slot>=2048)continue;auto tet=tr.tetrahedron(c);std::array<std::array<double,3>,3> v;int ix=0;for(int j=0;j<4;j++)if(j!=i){auto t=tet.vertex(j);v[ix++]={t.x(),t.y(),t.z()};}std::array<double,3> a{v[1][0]-v[0][0],v[1][1]-v[0][1],v[1][2]-v[0][2]},b{v[2][0]-v[0][0],v[2][1]-v[0][1],v[2][2]-v[0][2]},normal{a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]};double length=std::hypot(normal[0],normal[1],normal[2]);if(length<1e-15)continue;for(double& x:normal)x/=length;FaceProbe probe{{(v[0][0]+v[1][0]+v[2][0])/3,(v[0][1]+v[1][1]+v[2][1])/3,(v[0][2]+v[1][2]+v[2][2])/3},normal,mat,second};if(slot==probes.size())probes.push_back(probe);else if(slot<probes.size())probes[slot]=probe;
 }}for(auto& probe:probes){double distance=.25/cell;K::Point_3 x(probe.center[0]-distance*probe.normal[0],probe.center[1]-distance*probe.normal[1],probe.center[2]-distance*probe.normal[2]),y(probe.center[0]+distance*probe.normal[0],probe.center[1]+distance*probe.normal[1],probe.center[2]+distance*probe.normal[2]);int u=field(x),v=field(y);++out.sampled;if((u==probe.a&&v==probe.b)||(u==probe.b&&v==probe.a))++out.matched;}return out;
}
struct BoundaryAudit{size_t edges=0;BoundaryEdgeDefects defects{};};
BoundaryAudit auditBoundaryEdges(const Mesh& mesh){
 PeriodicBoundaryEdges all;const auto& tr=mesh.triangulation();
 for(auto it=mesh.cells_in_complex_begin();it!=mesh.cells_in_complex_end();++it){
  Tr::Cell_handle c=it;int mat=mesh.subdomain_index(c);if(mat<1||mat>3)throw std::runtime_error("材料标签无效");
  for(int f=0;f<4;f++){
   auto nb=c->neighbor(f);if(mesh.is_in_complex(nb)&&mesh.subdomain_index(nb)==mat)continue;
   int ids[3],n=0;for(int i=0;i<4;i++)if(i!=f)ids[n++]=i;
   for(int j=0;j<3;j++){
    int a=ids[j],b=ids[(j+1)%3];auto av=tr.int_to_off(c->offset(a)),bv=tr.int_to_off(c->offset(b));
    auto ah=reinterpret_cast<std::uintptr_t>(std::addressof(*c->vertex(a)));auto bh=reinterpret_cast<std::uintptr_t>(std::addressof(*c->vertex(b)));
    all.add(periodicEdge(ah,{av.x(),av.y(),av.z()},bh,{bv.x(),bv.y(),bv.z()}),unsigned(mat));
   }
  }
 }
 return {all.size(),all.defects()};
}
int main(int argc,char**argv){try{
 if(argc!=11)throw std::runtime_error("参数数目错误");double L[]={std::stod(argv[1]),std::stod(argv[2]),std::stod(argv[3])},size=std::stod(argv[4]),eps=std::stod(argv[5]);AppParameters p=AppParameters::read(std::cin);if(p.lx!=L[0]||p.ly!=L[1]||p.lz!=L[2]||p.host!=0||p.grad!=0||p.twist!=0||p.chiral!=0)throw std::runtime_error("模型不满足周期要求");auto whole=[](double v){return std::isfinite(v)&&v>=1&&std::abs(v-std::round(v))<1e-9;};if(!whole(p.nx)||!whole(p.ny)||!whole(p.nz)||!whole(p.r2)||((p.form==2||p.form==3||p.form==5)&&!whole(p.r3)))throw std::runtime_error("周期数不是正整数");double cell=L[0]/p.nx;if(!(cell>0)||std::abs(L[1]/p.ny-cell)>1e-9*cell||std::abs(L[2]/p.nz-cell)>1e-9*cell)throw std::runtime_error("此试验仅支持立方宏观单胞");if(!(size>0&&size<=cell&&eps>0&&eps<=size))throw std::runtime_error("目标尺寸或容差无效");double ratio=std::stod(argv[8]);if(!std::isfinite(ratio)||ratio<1.4||ratio>2)throw std::runtime_error("周期网格半径边长比须为 1.4–2");AppGeometry g(p);long long calls=0;auto field=[&](const K::Point_3&point){double x=point.x()-std::floor(point.x()),y=point.y()-std::floor(point.y()),z=point.z()-std::floor(point.z());if(++calls%5000000==0)std::cout<<"@event@{\"progress\":\"周期单胞已评估 "<<calls<<" 次 App 材料场…\"}"<<std::endl;return g.classify(-1+2*x/p.nx,-1+2*y/p.ny,-1+2*z/p.nz);};K::Iso_cuboid_3 box(0,0,0,1,1,1);Domain domain(field,box,prm::relative_error_bound(std::min(.0001,eps/(2*cell))));double cellMinRadius=0;
#if defined(TPMS_QUALITY_REFINEMENT_MIN_SIZE) && !defined(TPMS_QUALITY_REFINEMENT_PROBE)
#error "The minimum-radius experiment requires the isolated quality refinement probe"
#endif
#ifdef TPMS_QUALITY_REFINEMENT_MIN_SIZE
 cellMinRadius=2.0; // millimetres; experimental bypass of refinement for small cells
#endif
 Criteria criteria(prm::facet_angle(25).facet_size(size/cell).facet_distance(eps/cell).cell_radius_edge_ratio(ratio).cell_size(size/cell).cell_min_size(cellMinRadius/cell));
#ifdef TPMS_QUALITY_REFINEMENT_PROBE
 criteria.add_cell_criterion(new RefineByQuality<Tr,Criteria::Cell_criteria::Visitor>());
#endif
 #ifdef TPMS_QUALITY_REFINEMENT_PROBE
 constexpr std::size_t vertexLimit=100000;
#else
 constexpr std::size_t vertexLimit=270000;
#endif
 std::cout<<"@event@{\"progress\":\"CGAL 正在直接划分 App 周期单胞（仅诊断，不生成有限盒网格）…\"}"<<std::endl;auto start=std::chrono::steady_clock::now();CGAL::Mesh_error_code err=CGAL::CGAL_MESH_3_NO_ERROR;Mesh mesh=CGAL::make_periodic_3_mesh_3<Mesh>(domain,criteria,prm::no_exude(),prm::no_perturb(),prm::mesh_3_options(prm::maximal_number_of_vertices(vertexLimit).pointer_to_error_code(&err)));if(err!=CGAL::CGAL_MESH_3_NO_ERROR)throw std::runtime_error("周期网格达到 "+std::to_string(vertexLimit)+" 顶点（含虚拟周期副本）上限，未完成细化。");if(!mesh.triangulation().is_1_cover())throw std::runtime_error("周期网格未完成单覆盖转换。");auto n=mesh.number_of_cells_in_complex();if(n==0||n>500000)throw std::runtime_error("周期单胞实体数为零或超过 500000 上限。");
 int optTime=std::stoi(argv[6]),cycles=std::stoi(argv[7]),exude=std::stoi(argv[9]),direct=std::stoi(argv[10]);if(direct!=0&&direct!=1)throw std::runtime_error("周期优化指标无效");if(exude!=0&&exude!=1)throw std::runtime_error("薄片消除参数无效");if(exude&&direct)throw std::runtime_error("直接质量指标与薄片消除的组合尚未验证，请关闭薄片消除。");if(cycles<1||cycles>2||optTime<0||optTime>30)throw std::runtime_error("优化时限无效");Stats before=summarize(mesh,cell),after=before,current=before;bool accepted=false;
 BoundaryAudit currentBoundary=auditBoundaryEdges(mesh);auto defectTotals=[](const BoundaryAudit& b){std::array<size_t,3> out{};for(int i=0;i<3;i++)out[i]=b.defects.open[i]+b.defects.nonmanifold[i];return out;};
 int perturbAttempts=0,perturbAccepted=0;bool exudeAccepted=false;std::vector<StageLog> history;
 auto stage=[&](int kind){Mesh snapshot(mesh);double oldJac=current.jac,oldAspect=current.aspect;after=current;bool valid=false;if(kind==1)CGAL::exude_periodic_3_mesh_3(mesh,prm::time_limit(double(optTime)));else if(direct)CGAL::perturb_periodic_3_mesh_3(mesh,domain,prm::time_limit(double(optTime)).sliver_criterion(DirectCriterion<Tr>(mesh.triangulation())));else CGAL::perturb_periodic_3_mesh_3(mesh,domain,prm::time_limit(double(optTime)));bool good=false;if(mesh.number_of_cells_in_complex()<=500000){try{after=summarize(mesh,cell);valid=true;good=after.jac+1e-12>=current.jac&&after.aspect<=current.aspect*(1+1e-8);for(int i=1;i<=3;i++)if(std::abs(after.volume[i]-before.volume[i])>std::max(1e-12,before.volume[i]*.02))good=false;}catch(const std::runtime_error&){good=false;}}BoundaryAudit candidateBoundary=currentBoundary;bool boundaryChecked=false,topologyProgress=false;if(valid){candidateBoundary=auditBoundaryEdges(mesh);boundaryChecked=true;if(!boundaryNonWorsening(currentBoundary.defects,candidateBoundary.defects))good=false;for(int i=0;i<3;i++){if(candidateBoundary.defects.open[i]<currentBoundary.defects.open[i]||candidateBoundary.defects.nonmanifold[i]<currentBoundary.defects.nonmanifold[i])topologyProgress=true;}}
 size_t oldBad=0,newBad=0,oldTotal=0,newTotal=0;for(int i=0;i<3;i++){oldBad+=current.qualityBad[i];newBad+=after.qualityBad[i];oldTotal+=current.qualityTotal[i];newTotal+=after.qualityTotal[i];}if(!qualityDistributionNonWorsening(oldBad,oldTotal,newBad,newTotal)||!(after.jac>current.jac+1e-10||after.aspect<current.aspect-1e-8||qualityDistributionImproved(oldBad,oldTotal,newBad,newTotal)||topologyProgress))good=false;history.push_back({kind,good,valid,oldJac,after.jac,oldAspect,after.aspect,oldBad,newBad,oldTotal,newTotal,boundaryChecked,defectTotals(currentBoundary),defectTotals(candidateBoundary)});if(good){current=after;currentBoundary=candidateBoundary;accepted=true;}else mesh=std::move(snapshot);return good;};
 if(optTime>0){for(int i=0;i<cycles;i++){std::cout<<"@event@{\"progress\":\"周期单胞扰动第 "<<(i+1)<<" 轮，逐轮核对单元质量与材料体积…\"}"<<std::endl;perturbAttempts++;if(stage(0))perturbAccepted++;else break;}if(exude){std::cout<<"@event@{\"progress\":\"执行周期薄片消除并检查质量…\"}"<<std::endl;exudeAccepted=stage(1);}}
 n=mesh.number_of_cells_in_complex();std::cout<<"@event@{\"progress\":\"核查多材料公共面、周期共节点和界面两侧标签…\"}"<<std::endl;auto interfaces=auditInterfaces(mesh,cell,field);std::cout<<"@event@{\"progress\":\"检查各材料周期边界的边邻接…\"}"<<std::endl;auto boundary=auditBoundaryEdges(mesh);
 double seconds=std::chrono::duration<double>(std::chrono::steady_clock::now()-start).count();std::cout<<std::setprecision(12)<<"@event@{\"result\":{\"cells\":"<<n<<",\"vertices\":"<<mesh.triangulation().number_of_vertices()<<",\"crossing\":"<<current.crossing<<",\"calls\":"<<calls<<",\"seconds\":"<<seconds<<",\"jac\":"<<current.jac<<",\"aspect\":"<<current.aspect<<",\"counts\":["<<current.count[1]<<','<<current.count[2]<<','<<current.count[3]<<"],\"volumes\":["<<current.volume[1]<<','<<current.volume[2]<<','<<current.volume[3]<<"],\"qualityBreakdown\":{\"total\":["<<current.qualityTotal[0]<<','<<current.qualityTotal[1]<<','<<current.qualityTotal[2]<<"],\"bad\":["<<current.qualityBad[0]<<','<<current.qualityBad[1]<<','<<current.qualityBad[2]<<"],\"failureTypes\":["<<current.failureTypes[0]<<','<<current.failureTypes[1]<<','<<current.failureTypes[2]<<"]},\"optimization\":{\"attempted\":"<<(optTime>0?"true":"false")<<",\"accepted\":"<<(accepted?"true":"false")<<",\"beforeFailureTypes\":["<<before.failureTypes[0]<<','<<before.failureTypes[1]<<','<<before.failureTypes[2]<<"],\"beforeJac\":"<<before.jac<<",\"afterJac\":"<<current.jac<<",\"beforeAspect\":"<<before.aspect<<",\"afterAspect\":"<<current.aspect<<",\"perturbAttempts\":"<<perturbAttempts<<",\"perturbAccepted\":"<<perturbAccepted<<",\"exudeAttempted\":"<<((exude&&optTime>0)?"true":"false")<<",\"exudeAccepted\":"<<(exudeAccepted?"true":"false")<<",\"history\":[";for(size_t i=0;i<history.size();i++){if(i)std::cout<<',';const auto& h=history[i];std::cout<<"{\"kind\":"<<h.kind<<",\"accepted\":"<<(h.accepted?"true":"false")<<",\"valid\":"<<(h.valid?"true":"false")<<",\"beforeJac\":"<<h.beforeJac<<",\"afterJac\":"<<h.afterJac<<",\"beforeAspect\":"<<h.beforeAspect<<",\"afterAspect\":"<<h.afterAspect<<",\"beforeBad\":"<<h.beforeBad<<",\"afterBad\":"<<h.afterBad<<",\"beforeTotal\":"<<h.beforeTotal<<",\"afterTotal\":"<<h.afterTotal<<",\"boundaryChecked\":"<<(h.boundaryChecked?"true":"false")<<",\"beforeBoundary\":["<<h.beforeBoundary[0]<<','<<h.beforeBoundary[1]<<','<<h.beforeBoundary[2]<<"],\"afterBoundary\":["<<h.afterBoundary[0]<<','<<h.afterBoundary[1]<<','<<h.afterBoundary[2]<<"]}";}std::cout<<"]},\"boundaryEdges\":{\"total\":"<<boundary.edges<<",\"badByMaterial\":["<<boundary.defects.open[0]+boundary.defects.nonmanifold[0]<<','<<boundary.defects.open[1]+boundary.defects.nonmanifold[1]<<','<<boundary.defects.open[2]+boundary.defects.nonmanifold[2]<<"],\"open\":["<<boundary.defects.open[0]<<','<<boundary.defects.open[1]<<','<<boundary.defects.open[2]<<"],\"nonmanifold\":["<<boundary.defects.nonmanifold[0]<<','<<boundary.defects.nonmanifold[1]<<','<<boundary.defects.nonmanifold[2]<<"]},\"interfaces\":{\"faces\":"<<interfaces.faces<<",\"bad\":"<<interfaces.bad<<",\"pairs\":["<<interfaces.pairs[1][2]<<','<<interfaces.pairs[1][3]<<','<<interfaces.pairs[2][3]<<"],\"sampled\":"<<interfaces.sampled<<",\"matched\":"<<interfaces.matched<<"},\"slice\":[";for(size_t i=0;i<current.slice.size();i++){if(i)std::cout<<',';auto& poly=current.slice[i];std::cout<<"{\"material\":"<<poly.material<<",\"jac\":"<<poly.jac<<",\"aspect\":"<<poly.aspect<<",\"xy\":[";for(size_t j=0;j<poly.points.size();j++){if(j)std::cout<<',';std::cout<<'['<<poly.points[j][0]<<','<<poly.points[j][1]<<']';}std::cout<<"]}";}std::cout<<"]}}"<<std::endl;
 }catch(const std::exception&e){std::cerr<<e.what()<<'\n';std::cout<<"@event@{\"error\":\""<<quote(e.what())<<"\"}"<<std::endl;return 1;}return 0;}
