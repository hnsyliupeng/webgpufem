#pragma once
#include <optional>
#include <utility>
// Finite samples only: a missed transition is not evidence of no crossing.
template<class Sample> std::optional<std::pair<int,int>> firstSampledTransition(int intervals,Sample sample){
 if(intervals<1)return std::nullopt;
 int previous=sample(0);
 for(int i=1;i<=intervals;i++){int current=sample(i);if(current!=previous)return std::make_pair(i-1,i);previous=current;}
 return std::nullopt;
}
