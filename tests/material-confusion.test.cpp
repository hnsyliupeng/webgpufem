#include "../native/material-confusion.hpp"
#include <cassert>
#include <iostream>
int main(){MaterialConfusion a;assert(a.add(1,1));assert(a.add(1,0));assert(a.add(0,2));assert(!a.add(-1,0));assert(!a.add(2,4));assert(a.total()==3&&a.matches()==1);assert(a.counts[1][0]==1&&a.counts[0][2]==1);
 MaterialConfusion improved;improved.add(1,1);improved.add(1,1);improved.add(0,2);assert(materialConfusionNonWorsening(a,improved)&&materialConfusionImproved(a,improved));
 MaterialConfusion traded;traded.add(1,1);traded.add(1,1);traded.add(0,3);assert(!materialConfusionNonWorsening(a,traded));assert(materialConfusionWorsenedKinds(a,traded)==1);assert(materialConfusionWorsenedKinds(a,improved)==0);
 MaterialConfusion smaller;smaller.add(1,1);assert(!materialConfusionNonWorsening(a,smaller));std::cout<<"Material confusion matrix tests passed\n";}
