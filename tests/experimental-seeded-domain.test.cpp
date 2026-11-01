#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>
#include "../native/experimental-seeded-domain.hpp"
#include <cassert>
#include <iostream>
#include <vector>
int main(){
 using K=CGAL::Exact_predicates_inexact_constructions_kernel;using D=ExperimentalSeededDomain<K>;using P=K::Point_3;
 auto field=[](const P&p){auto x=p.x()-std::floor(p.x());return x>=.25&&x<.75?1:0;};
 D domain(field,K::Iso_cuboid_3(0,0,0,1,1,1),1e-6);std::vector<std::pair<P,D::Index>> points;
 domain.construct_initial_points_object()(std::back_inserter(points),0);
 assert(points.size()==1152&&domain.extraSeeds==1152);
 for(auto &p:points){auto patch=domain.surface_patch_index(p.second);assert(patch.first==0&&patch.second==1);assert(std::abs(p.first.x()-.25)<2e-6||std::abs(p.first.x()-.75)<2e-6);}
 std::cout<<"CGAL seeded domain tests passed\n";
}
