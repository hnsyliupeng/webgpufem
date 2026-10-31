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
struct SlicePolygon{int material;std::vector<std::array<double,2>> points;};
struct Stats{double jac=1,aspect=0,volume[4]={},count[4]={};size_t crossing=0;std::vector<SlicePolygon> slice;};
Stats summarize(const Mesh& mesh,double cell){
 Stats out;double &minJac=out.jac,&maxAspect=out.aspect;double *volume=out.volume,*count=out.count;size_t &crossing=out.crossing;auto sub=[](const auto&a,const auto&b){return std::array<double,3>{a[0]-b[0],a[1]-b[1],a[2]-b[2]};};auto cross=[](const auto&a,const auto&b){return std::array<double,3>{a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]};};auto dot=[](const auto&a,const auto&b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];};auto len=[&](const auto&a){return std::sqrt(dot(a,a));};
 for(auto it=mesh.cells_in_complex_begin();it!=mesh.cells_in_complex_end();++it){Tr::Cell_handle c=it;int mat=mesh.subdomain_index(c);if(mat<1||mat>3)throw std::runtime_error("材料标签无效");auto tet=mesh.triangulation().tetrahedron(c);std::array<std::array<double,3>,4> v;bool outside=false;for(int i=0;i<4;i++){auto t=tet.vertex(i);v[i]={t.x(),t.y(),t.z()};}for(int k=0;k<3;k++){double lo=std::min({v[0][k],v[1][k],v[2][k],v[3][k]}),hi=std::max({v[0][k],v[1][k],v[2][k],v[3][k]});if(hi-std::floor(lo)>1+1e-12)outside=true;}if(outside)crossing++;
  // Intersect periodic tetrahedra with z=1/2 and draw seam copies; these are
  // actual tet slices for inspection only, not a finite-box tetrahedral mesh.
  if(out.slice.size()<30000){auto w=v;for(int k=0;k<3;k++){double lo=std::min({v[0][k],v[1][k],v[2][k],v[3][k]});double off=std::floor(lo);for(int i=0;i<4;i++)w[i][k]-=off;}for(int sz=-1;sz<=0;sz++){std::vector<std::array<double,2>> polygon;for(int i=0;i<4;i++)for(int j=i+1;j<4;j++){double a=w[i][2]+sz,b=w[j][2]+sz;if((a<=.5&&b>.5)||(b<=.5&&a>.5)){double t=(.5-a)/(b-a);std::array<double,2> point{w[i][0]+t*(w[j][0]-w[i][0]),w[i][1]+t*(w[j][1]-w[i][1])};bool duplicate=false;for(auto q:polygon)if(std::hypot(q[0]-point[0],q[1]-point[1])<1e-12)duplicate=true;if(!duplicate)polygon.push_back(point);}}if(polygon.size()<3)continue;double cx=0,cy=0;for(auto q:polygon){cx+=q[0];cy+=q[1];}cx/=polygon.size();cy/=polygon.size();std::sort(polygon.begin(),polygon.end(),[&](auto a,auto b){return std::atan2(a[1]-cy,a[0]-cx)<std::atan2(b[1]-cy,b[0]-cx);});for(int sx=-1;sx<=0;sx++)for(int sy=-1;sy<=0;sy++){auto copy=polygon;double xmin=2,xmax=-2,ymin=2,ymax=-2;for(auto& q:copy){q[0]+=sx;q[1]+=sy;xmin=std::min(xmin,q[0]);xmax=std::max(xmax,q[0]);ymin=std::min(ymin,q[1]);ymax=std::max(ymax,q[1]);}if(xmax>=0&&xmin<=1&&ymax>=0&&ymin<=1&&out.slice.size()<30000)out.slice.push_back({mat,std::move(copy)});}}}
  auto e1=sub(v[1],v[0]),e2=sub(v[2],v[0]),e3=sub(v[3],v[0]);double det=dot(e1,cross(e2,e3));if(!std::isfinite(det)||det<=1e-18)throw std::runtime_error("周期网格存在退化单元");count[mat]++;volume[mat]+=det*cell*cell*cell/6;double longest=0;for(int i=0;i<4;i++)for(int j=i+1;j<4;j++)longest=std::max(longest,len(sub(v[i],v[j])));for(int i=0;i<4;i++){int ids[3],k=0;for(int j=0;j<4;j++)if(i!=j)ids[k++]=j;auto a=sub(v[ids[0]],v[i]),b=sub(v[ids[1]],v[i]),c2=sub(v[ids[2]],v[i]);minJac=std::min(minJac,det/(len(a)*len(b)*len(c2)));maxAspect=std::max(maxAspect,longest*len(cross(sub(v[ids[1]],v[ids[0]]),sub(v[ids[2]],v[ids[0]])))/det);}}
 return out;
}
int main(int argc,char**argv){try{
 if(argc!=7)throw std::runtime_error("参数数目错误");double L[]={std::stod(argv[1]),std::stod(argv[2]),std::stod(argv[3])},size=std::stod(argv[4]),eps=std::stod(argv[5]);AppParameters p=AppParameters::read(std::cin);if(p.lx!=L[0]||p.ly!=L[1]||p.lz!=L[2]||p.host!=0||p.grad!=0||p.twist!=0||p.chiral!=0)throw std::runtime_error("模型不满足周期要求");auto whole=[](double v){return std::isfinite(v)&&v>=1&&std::abs(v-std::round(v))<1e-9;};if(!whole(p.nx)||!whole(p.ny)||!whole(p.nz)||!whole(p.r2)||((p.form==2||p.form==3||p.form==5)&&!whole(p.r3)))throw std::runtime_error("周期数不是正整数");double cell=L[0]/p.nx;if(!(cell>0)||std::abs(L[1]/p.ny-cell)>1e-9*cell||std::abs(L[2]/p.nz-cell)>1e-9*cell)throw std::runtime_error("此试验仅支持立方宏观单胞");if(!(size>0&&size<=cell&&eps>0&&eps<=size))throw std::runtime_error("目标尺寸或容差无效");AppGeometry g(p);long long calls=0;auto field=[&](const K::Point_3&point){double x=point.x()-std::floor(point.x()),y=point.y()-std::floor(point.y()),z=point.z()-std::floor(point.z());if(++calls%5000000==0)std::cout<<"@event@{\"progress\":\"周期单胞已评估 "<<calls<<" 次 App 材料场…\"}"<<std::endl;return g.classify(-1+2*x/p.nx,-1+2*y/p.ny,-1+2*z/p.nz);};K::Iso_cuboid_3 box(0,0,0,1,1,1);Domain domain(field,box,prm::relative_error_bound(std::min(.0001,eps/(2*cell))));Criteria criteria(prm::facet_angle(25).facet_size(size/cell).facet_distance(eps/cell).cell_radius_edge_ratio(2).cell_size(size/cell));
 std::cout<<"@event@{\"progress\":\"CGAL 正在直接划分 App 周期单胞（仅诊断，不生成有限盒网格）…\"}"<<std::endl;auto start=std::chrono::steady_clock::now();CGAL::Mesh_error_code err=CGAL::CGAL_MESH_3_NO_ERROR;Mesh mesh=CGAL::make_periodic_3_mesh_3<Mesh>(domain,criteria,prm::no_exude(),prm::no_perturb(),prm::mesh_3_options(prm::maximal_number_of_vertices(std::size_t(270000)).pointer_to_error_code(&err)));if(err!=CGAL::CGAL_MESH_3_NO_ERROR)throw std::runtime_error("周期网格达到 270000 顶点（含虚拟周期副本）上限，未完成细化。");if(!mesh.triangulation().is_1_cover())throw std::runtime_error("周期网格未完成单覆盖转换。");auto n=mesh.number_of_cells_in_complex();if(n==0||n>500000)throw std::runtime_error("周期单胞实体数为零或超过 500000 上限。");
 int optTime=std::stoi(argv[6]);if(optTime<0||optTime>30)throw std::runtime_error("优化时限无效");Stats before=summarize(mesh,cell),after=before,current=before;bool accepted=false;
 if(optTime>0){std::cout<<"@event@{\"progress\":\"周期单胞执行扰动与薄片消除，并核对材料体积及质量…\"}"<<std::endl;Mesh snapshot(mesh);CGAL::perturb_periodic_3_mesh_3(mesh,domain,prm::time_limit(double(optTime)));CGAL::exude_periodic_3_mesh_3(mesh,prm::time_limit(double(optTime)));if(mesh.number_of_cells_in_complex()<=500000){try{after=summarize(mesh,cell);bool good=after.jac+1e-12>=before.jac&&after.aspect<=before.aspect*(1+1e-8);for(int i=1;i<=3;i++)if(std::abs(after.volume[i]-before.volume[i])>std::max(1e-12,before.volume[i]*.02))good=false;if(good){accepted=true;current=after;}}catch(const std::runtime_error&){}}if(!accepted)mesh=std::move(snapshot);}
 n=mesh.number_of_cells_in_complex();
 double seconds=std::chrono::duration<double>(std::chrono::steady_clock::now()-start).count();std::cout<<std::setprecision(12)<<"@event@{\"result\":{\"cells\":"<<n<<",\"vertices\":"<<mesh.triangulation().number_of_vertices()<<",\"crossing\":"<<current.crossing<<",\"calls\":"<<calls<<",\"seconds\":"<<seconds<<",\"jac\":"<<current.jac<<",\"aspect\":"<<current.aspect<<",\"counts\":["<<current.count[1]<<','<<current.count[2]<<','<<current.count[3]<<"],\"volumes\":["<<current.volume[1]<<','<<current.volume[2]<<','<<current.volume[3]<<"],\"optimization\":{\"attempted\":"<<(optTime>0?"true":"false")<<",\"accepted\":"<<(accepted?"true":"false")<<",\"beforeJac\":"<<before.jac<<",\"afterJac\":"<<after.jac<<",\"beforeAspect\":"<<before.aspect<<",\"afterAspect\":"<<after.aspect<<"},\"slice\":[";for(size_t i=0;i<current.slice.size();i++){if(i)std::cout<<',';auto& poly=current.slice[i];std::cout<<"{\"material\":"<<poly.material<<",\"xy\":[";for(size_t j=0;j<poly.points.size();j++){if(j)std::cout<<',';std::cout<<'['<<poly.points[j][0]<<','<<poly.points[j][1]<<']';}std::cout<<"]}";}std::cout<<"]}}"<<std::endl;
 }catch(const std::exception&e){std::cerr<<e.what()<<'\n';std::cout<<"@event@{\"error\":\""<<quote(e.what())<<"\"}"<<std::endl;return 1;}return 0;}
