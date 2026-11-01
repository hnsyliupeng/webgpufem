#pragma once
#include <cstddef>
// Do not accept an optimization which improves an extremum at the expense of
// either more failing cells or a larger fraction of failing cells.
inline bool qualityDistributionNonWorsening(std::size_t oldBad,std::size_t oldTotal,std::size_t newBad,std::size_t newTotal){
 if(!oldTotal||!newTotal||oldBad>oldTotal||newBad>newTotal)return false;
 return newBad<=oldBad && static_cast<long double>(newBad)*oldTotal<=static_cast<long double>(oldBad)*newTotal;
}
