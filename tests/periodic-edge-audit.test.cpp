#include "../native/periodic-edge-audit.hpp"
#include <cassert>
#include <iostream>
int main(){
 auto a=periodicEdge(3,{2,3,1},9,{3,3,0});
 assert(a==periodicEdge(9,{1,2,-1},3,{0,2,0}));
 assert(!(a==periodicEdge(3,{2,3,1},9,{3,3,1})));
 auto wrap=periodicEdge(4,{0,0,0},4,{1,0,0});
 assert(wrap==periodicEdge(4,{3,2,0},4,{2,2,0}));
 PeriodicBoundaryEdges edges;edges.add(a,1);edges.add(a,2);edges.add(a,1);edges.add(wrap,3);assert((edges.defects().open==std::array<std::size_t,3>{0,1,1}));edges.add(a,1);edges.add(a,2);edges.add(wrap,3);assert((edges.defects().nonmanifold==std::array<std::size_t,3>{1,0,0}));
 // Two tetrahedra sharing (1,2,3): each material's separate closed
 // boundary counts the common triangle as part of its own surface.
 PeriodicBoundaryEdges closed;auto tri=[&](unsigned m,int a,int b,int c){for(auto p:{std::pair<int,int>{a,b},{b,c},{c,a}})closed.add(periodicEdge(p.first,{0,0,0},p.second,{0,0,0}),m);};
 for(auto f:{std::array<int,3>{1,2,3},{1,2,4},{2,3,4},{3,1,4}})tri(1,f[0],f[1],f[2]);
 for(auto f:{std::array<int,3>{1,2,3},{1,2,5},{2,3,5},{3,1,5}})tri(2,f[0],f[1],f[2]);
 assert((closed.defects().open==std::array<std::size_t,3>{0,0,0}));assert((closed.defects().nonmanifold==std::array<std::size_t,3>{0,0,0}));
 BoundaryEdgeDefects previous{{1,2,0},{2,0,0}},better{{1,1,0},{1,0,0}},worse{{0,1,0},{3,0,0}};
 assert(boundaryNonWorsening(previous,better));assert(!boundaryNonWorsening(previous,worse));
 std::cout<<"Periodic material boundary edge audit passed\n";
}
