// GPL-3.0-or-later. Isolated initial surface seed experiment.
#pragma once
#include <CGAL/Labeled_mesh_domain_3.h>
#include "experimental-interface-seeds.hpp"
#include <functional>
#include <utility>

template<class Kernel> class ExperimentalSeededDomain:public CGAL::Labeled_mesh_domain_3<Kernel>{
 using Base=CGAL::Labeled_mesh_domain_3<Kernel>;
 public:
 using typename Base::Point_3;using typename Base::Index;
 using Function=std::function<int(const Point_3&)>;
 ExperimentalSeededDomain(Function f,const typename Kernel::Iso_cuboid_3& box,double relative):Base(f,box,CGAL::parameters::relative_error_bound(relative)),field_(std::move(f)),tolerance_(relative*std::sqrt(3.0)){}
 mutable std::size_t extraSeeds=0;
 struct Construct_initial_points{
  const ExperimentalSeededDomain& domain;
  template<class Out> Out operator()(Out out,int n=12)const{
   out=static_cast<const Base&>(domain).construct_initial_points_object()(out,n);
   auto samples=periodicInterfaceSeeds(24,2000,domain.tolerance_,[&](auto p){return domain.field_(Point_3(p[0],p[1],p[2]));});
   domain.extraSeeds=samples.size();
   for(auto &s:samples){auto patch=domain.make_surface_index(s.a,s.b);*out++=std::make_pair(Point_3(s.point[0],s.point[1],s.point[2]),domain.index_from_surface_patch_index(patch));}
   return out;
  }
 };
 Construct_initial_points construct_initial_points_object()const{return {*this};}
 private:Function field_;double tolerance_;
};
