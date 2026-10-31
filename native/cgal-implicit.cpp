// Experimental direct App-geometry multi-region mesher, GPL-3.0-or-later.
// CGAL Mesh_3 requires GPL terms; no upstream TPMeSh code is copied here.
#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>
#include <CGAL/Mesh_triangulation_3.h>
#include <CGAL/Mesh_complex_3_in_triangulation_3.h>
#include <CGAL/Mesh_criteria_3.h>
#include <CGAL/Labeled_mesh_domain_3.h>
#include <CGAL/make_mesh_3.h>
#include "app-field.hpp"
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <iterator>
#include <map>
#include <stdexcept>
#include <string>
#include <vector>
using K=CGAL::Exact_predicates_inexact_constructions_kernel;
using Domain=CGAL::Labeled_mesh_domain_3<K>;
using Tr=CGAL::Mesh_triangulation_3<Domain,CGAL::Default,CGAL::Sequential_tag>::type;
using C3t3=CGAL::Mesh_complex_3_in_triangulation_3<Tr>;
using Criteria=CGAL::Mesh_criteria_3<Tr>;
namespace params=CGAL::parameters;

struct AppField {
 AppGeometry geometry;double L[3],scale;long long calls=0;
 AppField(AppParameters p):geometry(p),L{p.lx,p.ly,p.lz},scale(std::max({p.lx,p.ly,p.lz})){}
 int operator()(const K::Point_3& p){double x=2*p.x()*scale/L[0],y=2*p.y()*scale/L[1],z=2*p.z()*scale/L[2];if(std::abs(x)>1.||std::abs(y)>1.||std::abs(z)>1.)return 0;++calls;return geometry.classify(x,y,z);}
};
struct QualitySummary { double jac=1,aspect=0,volumes[4]={0,0,0,0};bool valid=true; };
QualitySummary quality(const C3t3& mesh){QualitySummary q;for(auto it=mesh.cells_in_complex_begin();it!=mesh.cells_in_complex_end();++it){Tr::Cell_handle cell=it;int material=mesh.subdomain_index(cell);if(material<1||material>3){q.valid=false;return q;}std::array<std::array<double,3>,4> v;for(int i=0;i<4;i++){auto p=cell->vertex(i)->point().point();v[i]={p.x(),p.y(),p.z()};}auto sub=[](const auto&a,const auto&b){return std::array<double,3>{a[0]-b[0],a[1]-b[1],a[2]-b[2]};};auto cross=[](const auto&a,const auto&b){return std::array<double,3>{a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]};};auto dot=[](const auto&a,const auto&b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];};auto len=[&](const auto&a){return std::sqrt(dot(a,a));};auto e1=sub(v[1],v[0]),e2=sub(v[2],v[0]),e3=sub(v[3],v[0]);double det=dot(e1,cross(e2,e3));if(!std::isfinite(det)||det<=1e-18){q.valid=false;return q;}q.volumes[material]+=det/6;double longest=0;for(int i=0;i<4;i++)for(int j=i+1;j<4;j++)longest=std::max(longest,len(sub(v[i],v[j])));for(int i=0;i<4;i++){int ids[3],k=0;for(int j=0;j<4;j++)if(i!=j)ids[k++]=j;auto a=sub(v[ids[0]],v[i]),b=sub(v[ids[1]],v[i]),c=sub(v[ids[2]],v[i]);q.jac=std::min(q.jac,det/(len(a)*len(b)*len(c)));auto f1=sub(v[ids[1]],v[ids[0]]),f2=sub(v[ids[2]],v[ids[0]]);q.aspect=std::max(q.aspect,longest*len(cross(f1,f2))/det);}}return q;}
std::string quote(const std::string& s){std::string out;for(unsigned char c:s){if(c=='\\'||c=='"')out+='\\';if(c>=32)out+=char(c);}return out;}
int main(int argc,char**argv){try{
 if(argc!=7)throw std::runtime_error("参数数目错误");double L[3]={std::stod(argv[1]),std::stod(argv[2]),std::stod(argv[3])},size=std::stod(argv[4]),eps=std::stod(argv[5]);int optTime=std::stoi(argv[6]);for(double v:L)if(!std::isfinite(v)||v<=0||v>10000)throw std::runtime_error("尺寸无效");double scale=std::max({L[0],L[1],L[2]});if(!std::isfinite(size)||!std::isfinite(eps)||size<=0||size>scale||eps<=0||eps>size||optTime<0||optTime>30)throw std::runtime_error("网格尺寸或容差无效");
 AppParameters p=AppParameters::read(std::cin);if(p.lx!=L[0]||p.ly!=L[1]||p.lz!=L[2])throw std::runtime_error("几何尺寸不一致");AppField field(p);auto label=[&field](const K::Point_3&p){return field(p);};double radius2=.26*(L[0]*L[0]+L[1]*L[1]+L[2]*L[2])/(scale*scale);Domain domain(label,K::Sphere_3(CGAL::ORIGIN,radius2),params::relative_error_bound(std::min(0.0001,eps/(2*scale))));Criteria criteria(params::facet_angle(25).facet_size(size/scale).facet_distance(eps/scale).cell_radius_edge_ratio(2).cell_size(size/scale));
 std::cout<<"@event@{\"progress\":\"CGAL Mesh_3 正在直接评估 App 材料隐式域并构建共享网格…\"}"<<std::endl;
 CGAL::Mesh_error_code error=CGAL::CGAL_MESH_3_NO_ERROR;
 C3t3 mesh=CGAL::make_mesh_3<C3t3>(domain,criteria,params::no_exude(),params::no_perturb(),params::mesh_3_options(params::maximal_number_of_vertices(std::size_t(100000)).pointer_to_error_code(&error)));
 if(error!=CGAL::CGAL_MESH_3_NO_ERROR)throw std::runtime_error("CGAL 达到 100000 顶点安全上限，未完成细化，已丢弃部分网格。");
 if(mesh.number_of_cells_in_complex()>500000)throw std::runtime_error("CGAL 实体单元 "+std::to_string(mesh.number_of_cells_in_complex())+" 超过 500000 安全上限，未进入优化。");
 bool optimized=false;QualitySummary before=quality(mesh),after=before;if(!before.valid)throw std::runtime_error("CGAL 初始网格有退化或倒置单元。");
 if(optTime>0){std::cout<<"@event@{\"progress\":\"CGAL 正在执行扰动和消除薄片单元，并比较前后质量与材料体积…\"}"<<std::endl;C3t3 snapshot(mesh);CGAL::perturb_mesh_3(mesh,domain,params::time_limit(double(optTime)));CGAL::exude_mesh_3(mesh,params::time_limit(double(optTime)));after=quality(mesh);bool good=after.valid&&after.jac+1e-12>=before.jac&&after.aspect<=before.aspect*(1+1e-8)&&mesh.number_of_cells_in_complex()<=500000;for(int i=1;i<=3;i++)if(std::abs(after.volumes[i]-before.volumes[i])>std::max(1e-12,before.volumes[i]*.02))good=false;if(!good)mesh=std::move(snapshot);else optimized=true;}
 auto nc=mesh.number_of_cells_in_complex();if(nc==0)throw std::runtime_error("未发现实体域；可能漏采薄壁或需要特征种子。");if(nc>500000)throw std::runtime_error("CGAL 优化后实体单元超过 500000 安全上限。");
 std::map<Tr::Vertex_handle,size_t> indices;std::vector<Tr::Vertex_handle> vertices;std::vector<Tr::Cell_handle> cells;cells.reserve(nc);for(auto it=mesh.cells_in_complex_begin();it!=mesh.cells_in_complex_end();++it){Tr::Cell_handle c=it;cells.push_back(c);for(int i=0;i<4;i++){auto v=c->vertex(i);auto pr=indices.emplace(v,vertices.size());if(pr.second)vertices.push_back(v);}}
 std::cout<<"@event@{\"progress\":\"CGAL 完成，正在返回 App 材料单元并检查质量…\"}"<<std::endl;std::cout<<std::setprecision(17)<<"@event@{\"result\":{\"points\":[";
 for(size_t i=0;i<vertices.size();i++){if(i)std::cout<<',';auto p=vertices[i]->point().point();std::cout<<'['<<p.x()*scale<<','<<p.y()*scale<<','<<p.z()*scale<<']';}
 std::cout<<"],\"tets\":[";for(size_t j=0;j<cells.size();j++){if(j)std::cout<<',';auto c=cells[j];std::cout<<'['<<indices[c->vertex(0)]<<','<<indices[c->vertex(1)]<<','<<indices[c->vertex(2)]<<','<<indices[c->vertex(3)]<<']';}std::cout<<"],\"materials\":[";for(size_t j=0;j<cells.size();j++){if(j)std::cout<<',';std::cout<<mesh.subdomain_index(cells[j]);}std::cout<<"],\"evaluations\":"<<field.calls<<",\"optimization\":{\"attempted\":"<<(optTime>0?"true":"false")<<",\"accepted\":"<<(optimized?"true":"false")<<",\"beforeJac\":"<<before.jac<<",\"afterJac\":"<<after.jac<<",\"beforeAspect\":"<<before.aspect<<",\"afterAspect\":"<<after.aspect<<"}}}"<<std::endl;
 }catch(const std::exception&e){std::cerr<<e.what()<<'\n';std::cout<<"@event@{\"error\":\""<<quote(e.what())<<"\"}"<<std::endl;return 1;}return 0;}
