#include "../native/conforming-box-clip.hpp"
#include <cassert>
#include <iostream>
#include <map>
using namespace boxclip;
double volume(const Mesh&m,unsigned mat){double v=0;for(auto t:m.cells)if(t.material==mat)v+=det(m.points[t.v[0]],m.points[t.v[1]],m.points[t.v[2]],m.points[t.v[3]])/6;return v;}
int main(){
 // Two tetrahedra share the same triangular material interface x+y+z=1.
 // The finite box cuts that interface. Its vertices and triangulation must
 // remain shared, not merely coincident in space.
 Mesh input{{{0,0,0},{1,0,0},{0,1,0},{0,0,1},{1,1,1}},{{{0,1,2,3},1},{{4,2,1,3},2}}};
 ClipBox clip(input.points,{0,0,0},{.6,1,1});auto out=clip.clip(input.cells);
 assert(!out.cells.empty());std::map<std::array<std::size_t,3>,std::vector<unsigned>> faces;
 for(auto t:out.cells){assert(t.material==1||t.material==2);assert(det(out.points[t.v[0]],out.points[t.v[1]],out.points[t.v[2]],out.points[t.v[3]])>0);
  for(int k=0;k<4;k++){std::array<std::size_t,3> f;int j=0;for(int i=0;i<4;i++)if(i!=k)f[j++]=t.v[i];std::sort(f.begin(),f.end());faces[f].push_back(t.material);}}
 int shared=0;for(auto& kv:faces){assert(kv.second.size()<=2);if(kv.second.size()==2&&kv.second[0]!=kv.second[1])shared++;}
 assert(shared>0);for(auto& kv:faces)if(kv.second.size()==1){auto f=kv.first;bool onInterface=true;for(auto id:f){auto p=out.points[id];onInterface&=std::abs(p[0]+p[1]+p[2]-1)<1e-12;}assert(!onInterface);}
 // Exact volumes: tetra 1 minus a similar corner tetra, and the other
 // tetra from a cross-sectional integral.
 assert(std::abs(volume(out,1)-(1-std::pow(.4,3))/6)<1e-12);
 assert(std::abs(volume(out,2)-(.6*.6-2.*.6*.6*.6/3.))<1e-12);
 for(auto t:out.cells)for(auto id:t.v)for(int k=0;k<3;k++)assert(out.points[id][k]>=-1e-12&&out.points[id][k]<=(k==0?.6:1.)+1e-12);
 // Whole 2x2x2 conforming tetrahedral lattice, clipped on all six planes.
 Mesh lattice;for(int z=0;z<3;z++)for(int y=0;y<3;y++)for(int x=0;x<3;x++)lattice.points.push_back({double(x),double(y),double(z)});
 auto vid=[](int x,int y,int z){return std::size_t((z*3+y)*3+x);};
 for(int z=0;z<2;z++)for(int y=0;y<2;y++)for(int x=0;x<2;x++){
  std::array<int,3> perm{0,1,2};do{int q[3]={x,y,z};std::array<std::size_t,4> v;v[0]=vid(q[0],q[1],q[2]);for(int i=0;i<3;i++){q[perm[i]]++;v[i+1]=vid(q[0],q[1],q[2]);}if(det(lattice.points[v[0]],lattice.points[v[1]],lattice.points[v[2]],lattice.points[v[3]])<0)std::swap(v[1],v[2]);lattice.cells.push_back({v,unsigned(x+1)});}while(std::next_permutation(perm.begin(),perm.end()));
 }
 Point lower{.2,.15,.1},upper{1.65,1.8,1.9};ClipBox clipGrid(lattice.points,lower,upper);auto grid=clipGrid.clip(lattice.cells);std::map<std::array<std::size_t,3>,std::vector<unsigned>> gridFaces;
 for(auto t:grid.cells)for(int j=0;j<4;j++){std::array<std::size_t,3> f;int k=0;for(int i=0;i<4;i++)if(i!=j)f[k++]=t.v[i];std::sort(f.begin(),f.end());gridFaces[f].push_back(t.material);}
 int gridShared=0;for(auto& pair:gridFaces){assert(pair.second.size()<=2);if(pair.second.size()==2){if(pair.second[0]!=pair.second[1])gridShared++;continue;}bool outer=false;for(int a=0;a<3;a++)for(double plane:{lower[a],upper[a]}){bool all=true;for(auto i:pair.first)all&=std::abs(grid.points[i][a]-plane)<1e-12;outer|=all;}assert(outer);}
 assert(gridShared>0);assert(std::abs(volume(grid,1)-.8*1.65*1.8)<1e-10);assert(std::abs(volume(grid,2)-.65*1.65*1.8)<1e-10);
 ClipBox whole(input.points,{-1,-1,-1},{2,2,2});auto unchanged=whole.clip({input.cells[0]});assert(unchanged.cells.size()==1&&unchanged.cells[0].v==input.cells[0].v);
 // A tetrahedron merely touching the box must not generate zero-volume cells.
 Mesh touch{{{1,0,0},{2,0,0},{1,1,0},{1,0,1}},{{{0,1,2,3},1}}};ClipBox empty(touch.points,{0,0,0},{1,1,1});assert(empty.clip(touch.cells).cells.empty());
 bool rejected=false;try{Mesh tiny{{{0,0,0},{1e-16,0,0},{0,1,0},{0,0,1}},{{{0,1,2,3},1}}};ClipBox c(tiny.points,{0,0,0},{1,1,1});c.clip(tiny.cells);}catch(const std::runtime_error&){rejected=true;}assert(rejected);
 rejected=false;try{ClipBox c(input.points,{0,0,0},{1,1,1});c.clip({{{0,1,3,2},1}});}catch(const std::runtime_error&){rejected=true;}assert(rejected);
 rejected=false;try{clip.clip(input.cells);}catch(const std::logic_error&){rejected=true;}assert(rejected);
 std::cout<<"Conforming finite-box clipping tests passed\n";
}
