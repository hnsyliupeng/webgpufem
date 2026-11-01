#include "../native/experimental-interface-seeds.hpp"
#include <cassert>
#include <iostream>
int main(){
 auto field=[](std::array<double,3> p){return p[0]>=.25&&p[0]<.75?1:0;};
 auto seeds=periodicInterfaceSeeds(8,200,1e-6,field);assert(seeds.size()==128);
 for(auto s:seeds){assert(s.a==0&&s.b==1);assert(std::abs(s.point[0]-.25)<1e-6||std::abs(s.point[0]-.75)<1e-6);}
 auto sampled=periodicInterfaceSeeds(8,10,1e-6,field),again=periodicInterfaceSeeds(8,10,1e-6,field);assert(sampled.size()==10);for(int i=0;i<10;i++)assert(sampled[i].point==again[i].point);
 auto layers=[](std::array<double,3>p){p[0]-=std::floor(p[0]);return p[0]<.25?0:p[0]<.5?1:2;};auto three=periodicInterfaceSeeds(8,1000,1e-6,layers);bool pair12=false,pair02=false;for(auto s:three){if(s.a==1&&s.b==2)pair12=true;if(s.a==0&&s.b==2){pair02=true;auto a=s.point,b=s.point;a[0]-=1e-5;b[0]+=1e-5;assert(layers(a)!=layers(b));}}assert(pair12&&pair02); // includes periodic seam
 auto flat=[](std::array<double,3>){return 0;};assert(periodicInterfaceSeeds(8,10,1e-6,flat).empty());
 // Narrow intervals between samples are not guaranteed to produce a seed.
 auto missed=[](std::array<double,3>p){return p[0]>.26&&p[0]<.30?1:0;};assert(periodicInterfaceSeeds(8,10,1e-6,missed).empty());
 std::cout<<"Periodic stratified interface seeds tests passed\n";
}
