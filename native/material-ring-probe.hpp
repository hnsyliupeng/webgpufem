#pragma once
#include "ring-sectors.hpp"
#include <array>
#include <cmath>
#include <vector>
// Probe an orthogonal ring about an edge in normalized coordinates. The field
// is responsible for periodic wrapping. This samples, not proves, topology.
template<class Field>
bool sampleMaterialRing(const std::array<double,3>& a,const std::array<double,3>& b,double radius,Field field,std::array<int,3>& sectors){
 std::array<double,3> d{b[0]-a[0],b[1]-a[1],b[2]-a[2]};double n=std::hypot(d[0],d[1],d[2]);if(!std::isfinite(n)||n<1e-15||!(radius>0))return false;for(auto& x:d)x/=n;
 int axis=0;if(std::abs(d[1])<std::abs(d[axis]))axis=1;if(std::abs(d[2])<std::abs(d[axis]))axis=2;
 std::array<double,3> t{};t[axis]=1;std::array<double,3> u{d[1]*t[2]-d[2]*t[1],d[2]*t[0]-d[0]*t[2],d[0]*t[1]-d[1]*t[0]};double un=std::hypot(u[0],u[1],u[2]);for(auto& x:u)x/=un;
 std::array<double,3> v{d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]};std::array<double,3> center{(a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5};
 std::vector<int> labels;labels.reserve(48);constexpr double pi=3.14159265358979323846;for(int i=0;i<48;i++){double angle=2*pi*(i+.5)/48;std::array<double,3> p{};for(int k=0;k<3;k++)p[k]=center[k]+radius*(u[k]*std::cos(angle)+v[k]*std::sin(angle));labels.push_back(field(p));}
 for(int m=1;m<=3;m++)sectors[m-1]=cyclicMaterialSectors(labels,m);return true;
}
