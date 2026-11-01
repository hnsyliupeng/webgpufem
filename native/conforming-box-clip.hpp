// Experimental finite-box clipping kernel. Not a mesh generator or export path.
// Input tetrahedra must already share global vertex IDs across every interface.
// Uses floating point, not exact predicates; rejects questionable degeneracy.
#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <limits>
#ifdef TPMS_BOX_CLIP_DEBUG
#include <iostream>
#include <iomanip>
#endif
#include <map>
#include <numeric>
#include <stdexcept>
#include <tuple>
#include <vector>

namespace boxclip {
using Point=std::array<double,3>;
using Face=std::vector<std::size_t>;
struct Tet{std::array<std::size_t,4> v;unsigned material;};
struct Mesh{std::vector<Point> points;std::vector<Tet> cells;};
inline Point sub(Point a,Point b){return {a[0]-b[0],a[1]-b[1],a[2]-b[2]};}
inline Point cross(Point a,Point b){return {a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]};}
inline double dot(Point a,Point b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
inline double det(Point a,Point b,Point c,Point d){return dot(sub(b,a),cross(sub(c,a),sub(d,a)));}

// Shared cache is essential: independently computed intersections can create
// coincident but disconnected material interfaces and hanging nodes.
class ClipBox {
 Mesh result_;Point lo_,hi_;double scale_;
 std::map<std::tuple<int,std::size_t,std::size_t>,std::size_t> intersections_;bool used_=false;std::size_t originalPointCount_;
 std::size_t intersection(std::size_t a,std::size_t b,int plane){
  int axis=plane/2;double coordinate=(plane%2)?hi_[axis]:lo_[axis];
  if(result_.points[a][axis]==coordinate)return a;
  if(result_.points[b][axis]==coordinate)return b;
  auto key=std::make_tuple(plane,std::min(a,b),std::max(a,b));auto it=intersections_.find(key);if(it!=intersections_.end())return it->second;
  const auto x=result_.points[a],y=result_.points[b];double t=(coordinate-x[axis])/(y[axis]-x[axis]);
  if(!std::isfinite(t)||t<0||t>1)throw std::runtime_error("invalid clip intersection");
  Point p;for(int i=0;i<3;i++)p[i]=x[i]+t*(y[i]-x[i]);p[axis]=coordinate;
  std::size_t id=result_.points.size();result_.points.push_back(p);intersections_.emplace(key,id);return id;
 }
 bool inside(std::size_t id,int plane)const{int axis=plane/2;double x=result_.points[id][axis];return plane%2?x<=hi_[axis]:x>=lo_[axis];}
 static void clean(Face& f){Face q;for(auto id:f)if(q.empty()||q.back()!=id)q.push_back(id);if(q.size()>1&&q.front()==q.back())q.pop_back();f=std::move(q);}
 std::vector<Face> clipPlane(const std::vector<Face>& faces,int plane){
  std::vector<Face> out;std::vector<std::size_t> cap;bool hadInside=false,hadOutside=false,hadInterior=false;int axis=plane/2;double coordinate=plane%2?hi_[axis]:lo_[axis];
  for(const auto& face:faces){Face next;for(std::size_t i=0;i<face.size();i++){
   auto a=face[i],b=face[(i+1)%face.size()];bool ia=inside(a,plane),ib=inside(b,plane);hadInside|=ia;hadOutside|=!ia;hadInterior|=plane%2?result_.points[a][axis]<coordinate:result_.points[a][axis]>coordinate;
   if(ia)next.push_back(a);if(ia!=ib){auto id=intersection(a,b,plane);next.push_back(id);cap.push_back(id);}
  }clean(next);for(auto id:next)if(result_.points[id][axis]==coordinate)cap.push_back(id);if(next.size()>=3)out.push_back(std::move(next));}
  if(!hadInside||!hadInterior)return {};if(!hadOutside)return out;
  std::sort(cap.begin(),cap.end());cap.erase(std::unique(cap.begin(),cap.end()),cap.end());
  if(cap.size()<3)throw std::runtime_error("degenerate box cut");
  int u=(axis+1)%3,v=(axis+2)%3;double cu=0,cv=0;for(auto id:cap){cu+=result_.points[id][u];cv+=result_.points[id][v];}cu/=cap.size();cv/=cap.size();
  std::sort(cap.begin(),cap.end(),[&](auto a,auto b){double aa=std::atan2(result_.points[a][v]-cv,result_.points[a][u]-cu),bb=std::atan2(result_.points[b][v]-cv,result_.points[b][u]-cu);return aa==bb?a<b:aa<bb;});
  if(!(plane%2))std::reverse(cap.begin(),cap.end());out.push_back(std::move(cap));return out;
 }
 // Deterministic ear clipping: the same polygon, reversed, chooses the same
 // undirected diagonals. Collinear boundary vertices stay represented.
 std::vector<std::array<std::size_t,3>> triangulate(Face face)const{
  std::vector<std::array<std::size_t,3>> tris;Point normal{};
  for(std::size_t i=0;i<face.size();i++){const auto&a=result_.points[face[i]],&b=result_.points[face[(i+1)%face.size()]];auto n=cross(a,b);for(int k=0;k<3;k++)normal[k]+=n[k];}
  double length=std::sqrt(dot(normal,normal));if(!std::isfinite(length)||length<=1e-15*scale_*scale_)throw std::runtime_error("degenerate polygon");for(double &v:normal)v/=length;
  double eps=1e-15*scale_*scale_;
  while(face.size()>3){std::size_t choice=face.size();std::size_t best=std::numeric_limits<std::size_t>::max();
   for(std::size_t i=0;i<face.size();i++){
    auto prev=face[(i+face.size()-1)%face.size()],cur=face[i],next=face[(i+1)%face.size()];auto a=result_.points[prev],b=result_.points[cur],c=result_.points[next];
    if(dot(cross(sub(b,a),sub(c,b)),normal)<=eps)continue;
    bool blocked=false;for(auto id:face){if(id==prev||id==cur||id==next)continue;auto p=result_.points[id];double x=dot(cross(sub(b,a),sub(p,a)),normal),y=dot(cross(sub(c,b),sub(p,b)),normal),z=dot(cross(sub(a,c),sub(p,c)),normal);if(x>=-eps&&y>=-eps&&z>=-eps){blocked=true;break;}}
    if(!blocked&&cur<best){choice=i;best=cur;}
   }
   if(choice==face.size()){
#ifdef TPMS_BOX_CLIP_DEBUG
    std::cerr<<std::setprecision(17)<<"bad polygon "<<face.size()<<" normal "<<normal[0]<<","<<normal[1]<<","<<normal[2]<<"\n";for(auto id:face){auto p=result_.points[id];std::cerr<<id<<" "<<p[0]<<" "<<p[1]<<" "<<p[2]<<"\n";}
#endif
    throw std::runtime_error("cannot robustly triangulate clipped polygon");}
   tris.push_back({face[(choice+face.size()-1)%face.size()],face[choice],face[(choice+1)%face.size()]});face.erase(face.begin()+choice);
  }
  tris.push_back({face[0],face[1],face[2]});return tris;
 }
 void addCell(Tet t){
  for(auto v:t.v)if(v>=originalPointCount_)throw std::runtime_error("invalid vertex id");
  const auto&a=result_.points[t.v[0]],&b=result_.points[t.v[1]],&c=result_.points[t.v[2]],&d=result_.points[t.v[3]];
  double vol=det(a,b,c,d);if(!std::isfinite(vol)||vol<=1e-15*scale_*scale_*scale_)throw std::runtime_error("input tetrahedron is inverted or degenerate");
  bool allInside=true;for(auto id:t.v)for(int plane=0;plane<6;plane++)allInside&=inside(id,plane);
  if(allInside){result_.cells.push_back(t);return;}
  std::vector<Face> faces{{t.v[1],t.v[2],t.v[3]},{t.v[0],t.v[3],t.v[2]},{t.v[0],t.v[1],t.v[3]},{t.v[0],t.v[2],t.v[1]}};
  for(int p=0;p<6&&!faces.empty();p++)faces=clipPlane(faces,p);if(faces.empty())return;
  std::vector<std::size_t> ids;for(auto& f:faces)for(auto i:f)ids.push_back(i);std::sort(ids.begin(),ids.end());ids.erase(std::unique(ids.begin(),ids.end()),ids.end());
  Point center{};for(auto i:ids)for(int k=0;k<3;k++)center[k]+=result_.points[i][k]/ids.size();auto mid=result_.points.size();result_.points.push_back(center);
  for(auto& face:faces)for(auto tri:triangulate(face)){
   std::array<std::size_t,4> vertices{mid,tri[0],tri[1],tri[2]};double d=det(result_.points[vertices[0]],result_.points[vertices[1]],result_.points[vertices[2]],result_.points[vertices[3]]);
   if(!std::isfinite(d)||std::abs(d)<=1e-15*scale_*scale_*scale_)throw std::runtime_error("degenerate clipped face");if(d<0)std::swap(vertices[2],vertices[3]);result_.cells.push_back({vertices,t.material});
  }
 }
 public:
 ClipBox(const std::vector<Point>& points,Point lo,Point hi):lo_(lo),hi_(hi),scale_(0),originalPointCount_(points.size()){
  for(int k=0;k<3;k++){if(!std::isfinite(lo[k])||!std::isfinite(hi[k])||!(lo[k]<hi[k]))throw std::invalid_argument("invalid box");scale_=std::max(scale_,hi[k]-lo[k]);}
  for(auto p:points)for(double v:p)if(!std::isfinite(v))throw std::invalid_argument("invalid point");result_.points=points;
 }
 Mesh clip(const std::vector<Tet>& cells){if(used_)throw std::logic_error("clipper is single-use");used_=true;for(auto t:cells){if(!t.material)throw std::invalid_argument("material zero is not an input cell");addCell(t);}return std::move(result_);}
};
}
