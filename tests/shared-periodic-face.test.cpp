#include "../native/shared-periodic-face.hpp"
#include <array>
#include <cassert>
#include <iostream>
int main(){std::array<int,3>a{1,2,3},b{3,1,2};std::array<std::array<int,3>,3>ao{{{0,1,0},{1,0,0},{0,0,1}}},bo{{{-1,0,1},{-1,1,0},{0,0,0}}};assert(samePeriodicFace(a,ao,b,bo));auto bad=bo;bad[0][0]++;assert(!samePeriodicFace(a,ao,b,bad));b[0]=4;assert(!samePeriodicFace(a,ao,b,bo));b={3,1,1};assert(!samePeriodicFace(a,ao,b,bo));std::cout<<"Shared periodic material face: handle and offset invariants passed\n";}
