#include "../native/quality-gate.hpp"
#include <cassert>
#include <iostream>
int main(){
 assert(qualityDistributionNonWorsening(50,100,40,100));
 assert(qualityDistributionNonWorsening(50,100,50,100));
 assert(!qualityDistributionNonWorsening(50,100,51,200));
 assert(!qualityDistributionNonWorsening(50,100,49,90));
 assert(!qualityDistributionNonWorsening(1,0,0,1));
 assert(!qualityDistributionNonWorsening(1,1,2,1));
 std::cout<<"Periodic quality distribution gate passed\n";
}
