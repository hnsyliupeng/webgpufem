#include <CGAL/Exact_predicates_inexact_constructions_kernel.h>
#include "../native/experimental-crossing-domain.hpp"
#include <cassert>
#include <iostream>
int main(){
 using K=CGAL::Exact_predicates_inexact_constructions_kernel;using D=ExperimentalCrossingDomain<K>;using P=K::Point_3;using S=K::Segment_3;
 auto slab=[](const P& p){return p.x()>.3&&p.x()<.7?1:0;};
 D d(slab,K::Iso_cuboid_3(0,0,0,1,1,1),1e-6);CGAL::Labeled_mesh_domain_3<K> base(slab,K::Iso_cuboid_3(0,0,0,1,1,1));
 S ray(P(0,.5,.5),P(1,.5,.5));assert(!base.do_intersect_surface_object()(ray));auto patch=d.do_intersect_surface_object()(ray);assert(patch&&patch->first==0&&patch->second==1);auto hit=d.construct_intersection_object()(ray);assert(std::get<2>(hit)==2);assert(std::abs(std::get<0>(hit).x()-.3)<.00001);assert(d.surface_patch_index(std::get<1>(hit))==*patch);
 S none(P(0,.5,.5),P(.1,.5,.5));assert(!d.do_intersect_surface_object()(none));assert(std::get<2>(d.construct_intersection_object()(none))==0);
 auto multi=[](const P&p){return p.x()<.1?0:(p.x()<.15?2:1);};D d2(multi,K::Iso_cuboid_3(0,0,0,1,1,1),1e-6);auto p2=d2.do_intersect_surface_object()(ray);auto h2=d2.construct_intersection_object()(ray);assert(p2&&*p2==d2.surface_patch_index(std::get<1>(h2)));assert(p2->first==0&&p2->second==2);
 std::cout<<"CGAL sampled multi-crossing domain tests passed\n";
}
