#pragma once
#include "tet-quality-score.hpp"
#include <CGAL/Mesh_3/sliver_criteria.h>
// Disable the CGAL cell-value cache: it may contain values from a different
// criterion. Moves remain subject to the transactional global quality gate.
template<class Tri> class DirectCriterion:public CGAL::Mesh_3::Sliver_criterion<Tri,false>{
 using Base=CGAL::Mesh_3::Sliver_criterion<Tri,false>;
 using Cell_vector=typename Base::Cell_vector;
 using Tetrahedron=typename Base::Tetrahedron_3;
 mutable double previous=0;
 public:
 using Base::operator();
 explicit DirectCriterion(const Tri& tr):Base(1.,tr){}
 double get_default_value()const override{return 1.;}
 double get_max_value()const override{return 100.;}
 double get_perturbation_unit()const override{return .05;}
 double operator()(const Tetrahedron& t)const override{
  std::array<std::array<double,3>,4> v;
  for(int i=0;i<4;i++){auto p=t.vertex(i);v[i]={CGAL::to_double(p.x()),CGAL::to_double(p.y()),CGAL::to_double(p.z())};}
  return tetQualityScore(v);
 }
 void before_move(const Cell_vector& cells)const override{CGAL::Mesh_3::Min_value<DirectCriterion,Cell_vector> m(*this);previous=m(cells);}
 bool valid_move(const Cell_vector& cells,bool soft=false)const override{CGAL::Mesh_3::Min_value<DirectCriterion,Cell_vector> m(*this);double now=m(cells);return now>previous||(soft&&now>this->sliver_bound_);}
};
