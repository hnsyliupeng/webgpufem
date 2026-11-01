// Isolated adaptive-sizing experiment. A local distance estimate is not a
// certified thin-wall thickness or a guarantee of FEM-quality elements.
#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <limits>

// Estimate distance from a point to the nearest local implicit zero-set using
// central finite differences. Input and output distances use the same units.
template<class Fields> double localInterfaceDistance(const std::array<double,3>& p,double step,Fields fields){
 if(!(step>0)||!std::isfinite(step))return 0;
 auto center=fields(p);std::array<double,3> norm2{};
 for(int axis=0;axis<3;axis++){
  auto a=p,b=p;a[axis]-=step;b[axis]+=step;auto x=fields(a),y=fields(b);
  for(int i=0;i<3;i++){double d=(y[i]-x[i])/(2*step);norm2[i]+=d*d;}
 }
 double best=std::numeric_limits<double>::infinity();
 for(int i=0;i<3;i++)if(std::isfinite(center[i])&&std::isfinite(norm2[i])&&norm2[i]>1e-20)best=std::min(best,std::abs(center[i])/std::sqrt(norm2[i]));
 return std::isfinite(best)?best:0.; // conservative fallback for constant fields
}
inline double adaptiveCellRadius(double maxSize,double distance,double fraction=.25){
 if(!(maxSize>0)||!std::isfinite(maxSize)||!std::isfinite(distance)||distance<0||!std::isfinite(fraction)||fraction<=0||fraction>1)return 0;
 return std::min(maxSize,std::max(fraction*maxSize,fraction*maxSize+2*distance));
}
