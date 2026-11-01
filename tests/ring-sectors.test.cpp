#include "../native/ring-sectors.hpp"
#include "../native/material-ring-probe.hpp"
#include <cassert>
#include <iostream>
int main(){
 assert(cyclicMaterialSectors({},1)==0);
 assert(cyclicMaterialSectors({0,0,0,0},1)==0);
 assert(cyclicMaterialSectors({1,1,1,1},1)==1);
 assert(cyclicMaterialSectors({1,1,0,0,1},1)==1);
 assert(cyclicMaterialSectors({1,0,1,0},1)==2);
 assert(cyclicMaterialSectors({1,0,2,0,1,2,1,0},1)==3);
 std::array<int,3> sectors{};auto quad=[](auto p){return p[0]*p[1]>0?1:2;};
 assert(sampleMaterialRing({0,0,-1},{0,0,1},.2,quad,sectors));assert((sectors==std::array<int,3>{2,2,0}));
 assert(!sampleMaterialRing({0,0,0},{0,0,0},.2,quad,sectors));
 auto periodic=[](auto p){double x=p[0]-std::floor(p[0]),y=p[1]-std::floor(p[1]);return (x<.5)==(y<.5)?1:2;};
 std::array<int,3> shifted{};assert(sampleMaterialRing({0,0,0},{0,0,1},.2,periodic,sectors));assert(sampleMaterialRing({1,1,0},{1,1,1},.2,periodic,shifted));assert(sectors==shifted);
 std::cout<<"Cyclic material ring sectors passed\n";
}
