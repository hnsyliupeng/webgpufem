// Verify that two faces are the same three vertex handles up to one common
// periodic translation. A shared material face cannot use independent nodes.
#pragma once
#include <array>
template<class Vertex>
bool samePeriodicFace(const std::array<Vertex,3>& a,const std::array<std::array<int,3>,3>& ao,
                      const std::array<Vertex,3>& b,const std::array<std::array<int,3>,3>& bo){
 std::array<bool,3> used{false,false,false};std::array<int,3> shift{};
 for(int i=0;i<3;i++){int match=-1;for(int j=0;j<3;j++)if(!used[j]&&a[i]==b[j]){match=j;break;}if(match<0)return false;used[match]=true;for(int k=0;k<3;k++){int d=ao[i][k]-bo[match][k];if(i==0)shift[k]=d;else if(d!=shift[k])return false;}}
 return true;
}
