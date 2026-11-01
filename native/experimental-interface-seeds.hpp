// GPL-3.0-or-later. Isolated research probe, not a thin-wall guarantee.
#pragma once
#include <array>
#include <vector>
#include <cstdint>
#include <stdexcept>
#include <cmath>
#include <algorithm>

struct InterfaceSeed {std::array<double,3> point;int a,b;};
// Field must itself wrap coordinates modulo 1, including at the seam.
// Uniform periodic grid, label transitions on every grid edge, deterministic
// reservoir selection. A feature between grid nodes may be missed completely.
template<class Field> std::vector<InterfaceSeed> periodicInterfaceSeeds(int n,std::size_t limit,double tolerance,Field field){
 if(n<2||n>128||!limit||!(tolerance>0)||!std::isfinite(tolerance))throw std::invalid_argument("invalid seed grid");
 std::vector<int> labels(std::size_t(n)*n*n);auto idx=[&](int x,int y,int z){return (std::size_t(z)*n+y)*n+x;};
 for(int z=0;z<n;z++)for(int y=0;y<n;y++)for(int x=0;x<n;x++)labels[idx(x,y,z)]=field(std::array<double,3>{double(x)/n,double(y)/n,double(z)/n});
 std::vector<InterfaceSeed> seeds;seeds.reserve(limit);std::size_t seen=0;std::uint64_t state=0x132edcba45678901ULL;
 for(int z=0;z<n;z++)for(int y=0;y<n;y++)for(int x=0;x<n;x++)for(int axis=0;axis<3;axis++){
  int c[3]={x,y,z},d[3]={x,y,z};d[axis]=(d[axis]+1)%n;int left=labels[idx(x,y,z)],right=labels[idx(d[0],d[1],d[2])];if(left==right)continue;
  state=state*6364136223846793005ULL+1442695040888963407ULL;std::size_t slot=seen<limit?seen:state%(seen+1);seen++;if(slot>=limit)continue;
  std::array<double,3>a{double(c[0])/n,double(c[1])/n,double(c[2])/n},b=a;b[axis]+=1.0/n;
  for(int i=0;i<64&&b[axis]-a[axis]>tolerance;i++){
   auto m=a;m[axis]=(a[axis]+b[axis])*.5;int v=field(m);if(v==left)a=m;else {b=m;right=v;}
  }
  auto point=a;point[axis]=(a[axis]+b[axis])*.5;for(double &v:point)v-=std::floor(v);
  InterfaceSeed s{point,std::min(left,right),std::max(left,right)};if(slot==seeds.size())seeds.push_back(s);else seeds[slot]=s;
 }
 return seeds;
}
