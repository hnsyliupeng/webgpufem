#pragma once
#include <array>
#include <cstddef>
// Rows are the original implicit material; columns are the mesh label.
struct MaterialConfusion{
 std::array<std::array<std::size_t,4>,4> counts{};
 bool add(int truth,int mesh){if(truth<0||truth>3||mesh<0||mesh>3)return false;counts[truth][mesh]++;return true;}
 std::size_t total()const{std::size_t n=0;for(auto r:counts)for(auto x:r)n+=x;return n;}
 std::size_t matches()const{std::size_t n=0;for(int i=0;i<4;i++)n+=counts[i][i];return n;}
};

// Compare identical samples. Never trade one kind of misclassification for
// another; this is only a sampled safeguard, not a geometric proof.
inline bool materialConfusionNonWorsening(const MaterialConfusion& before,const MaterialConfusion& after){
 if(before.total()!=after.total())return false;
 for(int i=0;i<4;i++){std::size_t a=0,b=0;for(int j=0;j<4;j++){a+=before.counts[i][j];b+=after.counts[i][j];if(i!=j&&after.counts[i][j]>before.counts[i][j])return false;}if(a!=b)return false;}
 return true;
}
inline std::size_t materialConfusionWorsenedKinds(const MaterialConfusion& before,const MaterialConfusion& after){
 std::size_t n=0;for(int i=0;i<4;i++)for(int j=0;j<4;j++)if(i!=j&&after.counts[i][j]>before.counts[i][j])n++;return n;
}
inline bool materialConfusionImproved(const MaterialConfusion& before,const MaterialConfusion& after){
 return materialConfusionNonWorsening(before,after)&&after.matches()>before.matches();
}
