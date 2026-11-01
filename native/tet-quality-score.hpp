#pragma once
#include <algorithm>
#include <array>
#include <cmath>
// Same corner-Jacobian and longest-edge/altitude metrics as the periodic audit.
// A score > 1 requires both acceptance thresholds to be strictly met.
inline double tetQualityScore(const std::array<std::array<double,3>,4>& v){
 auto sub=[](auto a,auto b){return std::array<double,3>{a[0]-b[0],a[1]-b[1],a[2]-b[2]};};
 auto cross=[](auto a,auto b){return std::array<double,3>{a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]};};
 auto dot=[](auto a,auto b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];};
 auto len=[&](auto a){return std::sqrt(dot(a,a));};
 double det=dot(sub(v[1],v[0]),cross(sub(v[2],v[0]),sub(v[3],v[0])));
 if(!std::isfinite(det)||det<=1e-18)return 0.;
 double longest=0,jac=1,aspect=0;
 for(int i=0;i<4;i++)for(int j=i+1;j<4;j++)longest=std::max(longest,len(sub(v[i],v[j])));
 for(int i=0;i<4;i++){int ids[3],k=0;for(int j=0;j<4;j++)if(i!=j)ids[k++]=j;auto a=sub(v[ids[0]],v[i]),b=sub(v[ids[1]],v[i]),c=sub(v[ids[2]],v[i]);double denom=len(a)*len(b)*len(c);if(!(denom>0))return 0.;jac=std::min(jac,det/denom);aspect=std::max(aspect,longest*len(cross(sub(v[ids[1]],v[ids[0]]),sub(v[ids[2]],v[ids[0]])))/det);}
 if(!std::isfinite(jac)||!std::isfinite(aspect)||aspect<=0)return 0.;
 return std::min(jac/.3,10./aspect);
}
