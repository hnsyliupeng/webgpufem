#include "app-field.hpp"
#include <iomanip>
#include <iostream>
int main(){try{AppGeometry g(AppParameters::read(std::cin));double x,y,z;std::cout<<std::setprecision(17);while(std::cin>>x>>y>>z){auto f=g.fields(x,y,z);std::cout<<f[0]<<' '<<f[1]<<' '<<f[2]<<' '<<g.classify(x,y,z)<<'\n';}}catch(const std::exception&e){std::cerr<<e.what();return 1;}}
