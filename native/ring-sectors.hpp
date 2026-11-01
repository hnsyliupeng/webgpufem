#pragma once
#include <vector>
// Number of connected runs of the target in a cyclic discrete sample.
// A finite ring is diagnostic: sampling can miss narrower sectors.
inline int cyclicMaterialSectors(const std::vector<int>& labels,int target){
 if(labels.empty())return 0;
 int in=0,starts=0;for(std::size_t i=0;i<labels.size();i++){bool a=labels[i]==target,b=labels[(i+labels.size()-1)%labels.size()]==target;if(a){in++;if(!b)starts++;}}
 return in==0?0:(starts==0?1:starts);
}
