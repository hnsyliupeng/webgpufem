#pragma once
#include <algorithm>
#include <array>
#include <cstdint>
#include <functional>
#include <unordered_map>
#include <utility>
// Vertices are stable IDs within one completed triangulation. Both endpoints
// may be translated together by any integer period without changing the edge.
struct PeriodicEdgeKey {
 std::uintptr_t a,b;
 std::array<int,3> relative;
 bool operator==(const PeriodicEdgeKey& o)const{return a==o.a&&b==o.b&&relative==o.relative;}
};
inline PeriodicEdgeKey periodicEdge(std::uintptr_t a,std::array<int,3> ao,std::uintptr_t b,std::array<int,3> bo){
 if(b<a||(a==b&&bo<ao)){std::swap(a,b);std::swap(ao,bo);}
 return {a,b,{bo[0]-ao[0],bo[1]-ao[1],bo[2]-ao[2]}};
}
struct PeriodicEdgeHash{
 std::size_t operator()(const PeriodicEdgeKey& k)const{
  std::size_t h=std::hash<std::uintptr_t>{}(k.a);auto mix=[&](std::size_t x){h^=x+0x9e3779b9+(h<<6)+(h>>2);};mix(std::hash<std::uintptr_t>{}(k.b));for(int x:k.relative)mix(std::hash<int>{}(x));return h;
 }
};
// Each material's complete boundary surface must have exactly two incident
// triangles at each edge. Passing is necessary, but not a vertex-manifold or
// geometric fidelity proof. The counts for distinct materials are independent.
struct BoundaryEdgeDefects{std::array<std::size_t,3> open{},nonmanifold{};};
inline bool boundaryNonWorsening(const BoundaryEdgeDefects& before,const BoundaryEdgeDefects& after){
 for(int i=0;i<3;i++)if(after.open[i]>before.open[i]||after.nonmanifold[i]>before.nonmanifold[i])return false;
 return true;
}
class PeriodicBoundaryEdges {
 std::unordered_map<PeriodicEdgeKey,std::array<std::uint32_t,4>,PeriodicEdgeHash> edges;
 public:
 void add(const PeriodicEdgeKey& key,unsigned material){if(material>=1&&material<=3)++edges[key][material];}
 BoundaryEdgeDefects defects()const{BoundaryEdgeDefects out;for(const auto& p:edges)for(unsigned m=1;m<=3;m++){auto n=p.second[m];if(n==1)out.open[m-1]++;else if(n>2)out.nonmanifold[m-1]++;}return out;}
 template<class F> void forEachNonmanifold(F fn)const{for(const auto& p:edges)for(unsigned m=1;m<=3;m++)if(p.second[m]>2)fn(p.first,m,p.second[m]);}
 std::size_t size()const{return edges.size();}
};
