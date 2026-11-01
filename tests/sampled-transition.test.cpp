#include "../native/sampled-transition.hpp"
#include <cassert>
#include <iostream>
int main(){
 // A slab is invisible to an endpoint-only query.
 auto thin=[](int i){return i==2?2:0;};assert(!firstSampledTransition(1,[](int){return 0;}));
 auto cross=firstSampledTransition(4,thin);assert(cross&&cross->first==1&&cross->second==2);
 auto three=[](int i){return i==0?0:i<3?1:2;};cross=firstSampledTransition(4,three);assert(cross&&cross->first==0&&cross->second==1);
 assert(!firstSampledTransition(4,[](int){return 3;}));assert(!firstSampledTransition(0,[](int){return 1;}));
 // A thinner feature between sample points is deliberately missed.
 assert(!firstSampledTransition(4,[](int){return 0;}));
 std::cout<<"Finite multi-crossing sampler tests passed\n";
}
