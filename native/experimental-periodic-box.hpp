// GPL-3.0-or-later. Diagnostic-only full unit-box clipping experiment.
// Preserves shared vertex handles + absolute periodic offsets when tiling.
// Does not certify geometry, thin walls, topology, or element quality.
#pragma once
#include "conforming-box-clip.hpp"
#include <map>
#include <cstdint>
#include <cmath>
#include <tuple>

template<class Mesh> boxclip::Mesh experimentalPeriodicBox(const Mesh& mesh){
 const auto& tr=mesh.triangulation();using Tr=typename Mesh::Triangulation;
 using Key=std::tuple<std::uintptr_t,int,int,int>;std::map<Key,std::size_t> nodes;boxclip::Mesh raw;
 for(auto it=mesh.cells_in_complex_begin();it!=mesh.cells_in_complex_end();++it){
  typename Tr::Cell_handle c=it;auto tet=tr.tetrahedron(c);boxclip::Point points[4],base[4];std::uintptr_t ids[4];int offset[4][3];
  for(int i=0;i<4;i++){
   auto p=tet.vertex(i),q=c->vertex(i)->point().point();points[i]={p.x(),p.y(),p.z()};base[i]={q.x(),q.y(),q.z()};ids[i]=reinterpret_cast<std::uintptr_t>(std::addressof(*c->vertex(i)));
   for(int a=0;a<3;a++){double delta=points[i][a]-base[i][a];offset[i][a]=int(std::llround(delta));if(std::abs(delta-offset[i][a])>1e-8)throw std::runtime_error("invalid periodic vertex offset");}
  }
  int from[3],to[3];for(int a=0;a<3;a++){double lo=points[0][a],hi=lo;for(int i=1;i<4;i++){lo=std::min(lo,points[i][a]);hi=std::max(hi,points[i][a]);}if(!std::isfinite(lo)||!std::isfinite(hi)||hi-lo>1+1e-8||lo< -8||hi>9)throw std::runtime_error("unsupported periodic tetrahedron extent");from[a]=int(std::floor(-hi))+1;to[a]=int(std::ceil(1-lo))-1;}
  for(int x=from[0];x<=to[0];x++)for(int y=from[1];y<=to[1];y++)for(int z=from[2];z<=to[2];z++){
   boxclip::Tet out{{},unsigned(mesh.subdomain_index(c))};for(int i=0;i<4;i++){
    Key key{ids[i],offset[i][0]+x,offset[i][1]+y,offset[i][2]+z};auto found=nodes.find(key);
    if(found==nodes.end()){auto n=raw.points.size();boxclip::Point p{base[i][0]+offset[i][0]+x,base[i][1]+offset[i][1]+y,base[i][2]+offset[i][2]+z};raw.points.push_back(p);found=nodes.emplace(key,n).first;}
    out.v[i]=found->second;
   }raw.cells.push_back(out);
  }
 }
 boxclip::ClipBox clip(raw.points,{0,0,0},{1,1,1});return clip.clip(raw.cells);
}
