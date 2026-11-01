// GPL-3.0-or-later. Controlled CGAL refinement experiment only.
// Forcing a quality score during Delaunay refinement has no known termination
// guarantee for slivers or unprotected features. Never enable in production.
#pragma once
#include "tet-quality-score.hpp"
#include <CGAL/Mesh_3/mesh_standard_criteria.h>
template<class Tri,class Visitor> class RefineByQuality : public CGAL::Mesh_3::Abstract_criterion<Tri,Visitor>{
 using Base=CGAL::Mesh_3::Abstract_criterion<Tri,Visitor>;
 using Handle=typename Base::Handle;
 using Is_bad=typename Base::Is_bad;
 using Quality=typename Base::Quality;
 protected:
 void do_accept(Visitor& v)const override { v.visit(*this); }
 RefineByQuality* do_clone()const override{return new RefineByQuality(*this);}
 Is_bad do_is_bad(const Tri& tr,const Handle& c)const override {
  auto tet=tr.tetrahedron(c);std::array<std::array<double,3>,4> v;
  for(int i=0;i<4;i++){auto p=tet.vertex(i);v[i]={CGAL::to_double(p.x()),CGAL::to_double(p.y()),CGAL::to_double(p.z())};}
  auto score=tetQualityScore(v);return score<=1?Is_bad(Quality(score)):Is_bad();
 }
};
