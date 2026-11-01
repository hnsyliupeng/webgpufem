#include "../native/tet-quality-score.hpp"
#include <cassert>
#include <cmath>
#include <iostream>
int main(){
 std::array<std::array<double,3>,4> regular{{{0,0,0},{1,0,0},{.5,std::sqrt(3.)/2,0},{.5,std::sqrt(3.)/6,std::sqrt(2./3)}}};
 double score=tetQualityScore(regular);assert(score>1.0);assert(std::abs(score-std::sqrt(.5)/.3)<1e-10);
 auto transformed=regular;for(auto& p:transformed)for(double& x:p)x=2*x+3;assert(std::abs(tetQualityScore(transformed)-score)<1e-10);
 auto flat=regular;flat[3][2]=.001;assert(tetQualityScore(flat)<1);
 auto degenerate=regular;degenerate[3]=degenerate[0];assert(tetQualityScore(degenerate)==0);
 auto inverted=regular;std::swap(inverted[0],inverted[1]);assert(tetQualityScore(inverted)==0);
 std::cout<<"Tet quality score tests passed\n";
}
