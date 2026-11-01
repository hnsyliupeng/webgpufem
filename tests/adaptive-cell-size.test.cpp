#include "../native/adaptive-cell-size.hpp"
#include <cassert>
#include <iostream>
int main(){
 auto plane=[](std::array<double,3> p){return std::array<double,3>{2*(p[0]-.5),100,100};};
 assert(std::abs(localInterfaceDistance({.6,.3,.4},.001,plane)-.1)<1e-10);
 assert(std::abs(localInterfaceDistance({.5,.3,.4},.001,plane))<1e-10);
 auto constant=[](std::array<double,3>){return std::array<double,3>{1,100,100};};assert(localInterfaceDistance({0,0,0},.001,constant)==0);
 assert(adaptiveCellRadius(8,0)==2);assert(adaptiveCellRadius(8,0,.125)==1);assert(adaptiveCellRadius(8,0,0)==0);assert(adaptiveCellRadius(8,1)==4);assert(adaptiveCellRadius(8,9)==8);assert(adaptiveCellRadius(0,1)==0);assert(adaptiveCellRadius(8,-1)==0);
 std::cout<<"Adaptive cell sizing tests passed\n";
}
