// GPL-3.0-or-later. Isolated experiment, NOT a certified mesh domain.
// Sampling detects some same-label-endpoint crossings, but finite sampling
// cannot guarantee detection and a dual edge with multiple crossings still
// cannot be represented exactly by a single restricted-Delaunay facet.
#pragma once
#include <CGAL/Labeled_mesh_domain_3.h>
#include <functional>
#include <optional>
#include <cmath>
#include <utility>

#include "sampled-transition.hpp"

template<class Kernel> class ExperimentalCrossingDomain:public CGAL::Labeled_mesh_domain_3<Kernel>{
 using Base=CGAL::Labeled_mesh_domain_3<Kernel>;
 public:
 using typename Base::Point_3;using typename Base::Segment_3;using typename Base::Ray_3;using typename Base::Line_3;
 using typename Base::Surface_patch;using typename Base::Intersection;
 using Function=std::function<int(const Point_3&)>;
 ExperimentalCrossingDomain(Function f,const typename Kernel::Iso_cuboid_3& box,double relative):Base(f,box,CGAL::parameters::relative_error_bound(relative)),field_(std::move(f)),tol_(relative*std::sqrt(3.0)){}
 struct Bracket{Point_3 a,b;int left,right;};
 mutable std::size_t scanned=0,sameEndpointHits=0;
 std::optional<Bracket> find(const Segment_3& segment)const{
  ++scanned;const auto a=segment.source(),b=segment.target();constexpr int intervals=4;
  auto point=[&](double t){return a+(b-a)*t;};
  auto interval=firstSampledTransition(intervals,[&](int i){return field_(point(double(i)/intervals));});
  if(!interval)return std::nullopt;
  if(field_(a)==field_(b))++sameEndpointHits;
  auto lo=point(double(interval->first)/intervals),hi=point(double(interval->second)/intervals);int left=field_(lo),right=field_(hi);
  // Refine here, so both functors report precisely the same patch even when
  // a third material appears within an initial interval.
  for(int i=0;i<64&&CGAL::to_double(CGAL::squared_distance(lo,hi))>tol_*tol_;i++){
   auto mid=CGAL::midpoint(lo,hi);int m=field_(mid);if(m!=left){hi=mid;right=m;}else lo=mid;
  }
  return Bracket{lo,hi,left,right};
 }
 Surface_patch patch(int a,int b)const{return Surface_patch(this->make_surface_index(a,b));}
 struct Do_intersect_surface{
  const ExperimentalCrossingDomain& d;
  Surface_patch operator()(const Segment_3&s)const{
#ifdef TPMS_SAME_ENDPOINT_ONLY
   if(d.field_(s.source())!=d.field_(s.target()))return static_cast<const Base&>(d).do_intersect_surface_object()(s);
#endif
   auto hit=d.find(s);return hit?d.patch(hit->left,hit->right):Surface_patch();
  }
  Surface_patch operator()(const Ray_3&r)const{return static_cast<const Base&>(d).do_intersect_surface_object()(r);}
  Surface_patch operator()(const Line_3&r)const{return static_cast<const Base&>(d).do_intersect_surface_object()(r);}
 };
 struct Construct_intersection{
  const ExperimentalCrossingDomain& d;
  Intersection operator()(const Segment_3&s)const{
#ifdef TPMS_SAME_ENDPOINT_ONLY
   if(d.field_(s.source())!=d.field_(s.target()))return static_cast<const Base&>(d).construct_intersection_object()(s);
#endif
   auto hit=d.find(s);if(!hit)return Intersection();
   auto sp=d.make_surface_index(hit->left,hit->right);return Intersection(CGAL::midpoint(hit->a,hit->b),d.index_from_surface_patch_index(sp),2);
  }
  Intersection operator()(const Ray_3&r)const{return static_cast<const Base&>(d).construct_intersection_object()(r);}
  Intersection operator()(const Line_3&r)const{return static_cast<const Base&>(d).construct_intersection_object()(r);}
 };
 Do_intersect_surface do_intersect_surface_object()const{return {*this};}
 Construct_intersection construct_intersection_object()const{return {*this};}
 private:Function field_;double tol_;
};
