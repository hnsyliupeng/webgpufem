// Native counterpart of index.html's F, transformed, hostField, geo and classify.
// The server checks a source fingerprint; tests compare numerical values against the App.
#pragma once
#include <array>
#include <algorithm>
#include <cmath>
#include <istream>
#include <stdexcept>
struct AppParameters {
 double form,type1,type2,type3,host,inner,nodes,sizeMM,shellMM,grad,gradAxis,exponent,stepsG,steep,osc,amp,split,beta,alpha,twist,chiral,nx,ny,nz,r2,r3,phase,w,t,t3,s,gap,iso,layer,lx,ly,lz,gx,gy,gz,axis,bond,bond2,s2,gaxis;
 std::array<float,512> table{};
 static AppParameters read(std::istream& in){AppParameters p{};
  double* fields[]={&p.form,&p.type1,&p.type2,&p.type3,&p.host,&p.inner,&p.nodes,&p.sizeMM,&p.shellMM,&p.grad,&p.gradAxis,&p.exponent,&p.stepsG,&p.steep,&p.osc,&p.amp,&p.split,&p.beta,&p.alpha,&p.twist,&p.chiral,&p.nx,&p.ny,&p.nz,&p.r2,&p.r3,&p.phase,&p.w,&p.t,&p.t3,&p.s,&p.gap,&p.iso,&p.layer,&p.lx,&p.ly,&p.lz,&p.gx,&p.gy,&p.gz,&p.axis,&p.bond,&p.bond2,&p.s2,&p.gaxis};
  for(auto v:fields)if(!(in>>*v)||!std::isfinite(*v))throw std::runtime_error("invalid geometry parameters");for(auto&v:p.table){double x;if(!(in>>x)||!std::isfinite(x))throw std::runtime_error("invalid gradient table");v=float(x);}return p;}
};
struct AppGeometry {
 AppParameters p;explicit AppGeometry(AppParameters a):p(a){}
 static double F(double x,double y,double z,int id){double a=std::cos(x),b=std::cos(y),c=std::cos(z),u=std::sin(x),v=std::sin(y),w=std::sin(z);switch(id){case 0:return(u*b+v*c+w*a)/1.5;case 1:return(a+b+c)/3;case 2:return(u*v*w+u*b*c+a*v*c+a*b*w)/2;case 3:return(3*(a+b+c)+4*a*b*c)/13;case 4:return(3*(a+b+c)+10*a*b*c)/19;default:{double d=std::cos(2*x),e=std::cos(2*y),f=std::cos(2*z);return(std::sin(2*x)*b*w+std::sin(2*y)*c*u+std::sin(2*z)*a*v-d*e-e*f-f*d+.3)/6.3;}}}
 std::array<double,2> sample(double u)const{double x=std::clamp(u,0.,1.)*255;int i=std::floor(x),j=std::min(i+1,255);double v=x-i;return {p.table[2*i]*(1-v)+p.table[2*j]*v,p.table[2*i+1]*(1-v)+p.table[2*j+1]*v};}
 double radial(const std::array<double,3>&v,int axis,double d)const{return axis==0?std::hypot(v[1]*p.ly/d,v[2]*p.lz/d):axis==1?std::hypot(v[2]*p.lz/d,v[0]*p.lx/d):std::hypot(v[0]*p.lx/d,v[1]*p.ly/d);}
 std::array<double,3> fields(double x,double y,double z)const{
  constexpr double pi=3.14159265358979323846;std::array<double,3> orig{x,y,z},v=orig;double weight=p.grad?p.alpha/(1+p.alpha):0,f=.5;int ga=int(p.gaxis),axis=int(p.axis);
  if(int(p.gradAxis)==3){double ww[]={p.gx,p.gy,p.gz},sum=ww[0]+ww[1]+ww[2];f=0;for(int i=0;i<3;i++){auto sm=sample((orig[i]+1)*.5);f+=sm[0]*ww[i];v[i]+=weight*ww[i]*(2*sm[1]-1-orig[i]);}f/=sum;}
  else if(int(p.gradAxis)==1){auto sm=sample((orig[ga]+1)*.5);f=sm[0];v[ga]+=weight*(2*sm[1]-1-orig[ga]);}
  else if(int(p.gradAxis)==0){double d=ga==0?std::min(p.ly,p.lz):ga==1?std::min(p.lz,p.lx):std::min(p.lx,p.ly),r=radial(orig,ga,d),lo=p.host>=2?p.inner:0,hi=.94;auto sm=sample((r-lo)/(hi-lo));f=sm[0];if(r>1e-8&&r>=lo&&r<=hi){double mapped=lo+(hi-lo)*((1-weight)*(r-lo)/(hi-lo)+weight*sm[1]);for(int i=0;i<3;i++)if(i!=ga)v[i]*=mapped/r;}}
  double rr=radial(v,axis,p.sizeMM),theta=pi*(p.twist*v[axis]+p.chiral*(v[axis]+1)*rr*rr),cs=std::cos(theta),sn=std::sin(theta);std::array<double,3> physical{v[0]*p.lx,v[1]*p.ly,v[2]*p.lz};if(axis==0){double a=physical[1],b=physical[2];physical[1]=cs*a-sn*b;physical[2]=sn*a+cs*b;}else if(axis==1){double a=physical[2],b=physical[0];physical[2]=cs*a-sn*b;physical[0]=sn*a+cs*b;}else{double a=physical[0],b=physical[1];physical[0]=cs*a-sn*b;physical[1]=sn*a+cs*b;}
  std::array<double,3> q{physical[0]/p.lx,physical[1]/p.ly,physical[2]/p.lz};double ph=p.phase*pi,a=F(q[0]*p.nx*pi,q[1]*p.ny*pi,q[2]*p.nz*pi,int(p.type1))-p.iso;if(int(p.gradAxis)==2)f=sample(std::abs(a)/p.w)[0];double g=std::max(.3,1+p.beta*(2*f-1)),sf=p.s*g,h=std::abs(a)-p.w,bound=-100;if(p.host){double r=radial(orig,axis,p.sizeMM),m=2*p.shellMM/p.sizeMM;bound=std::max(r-(.94-m),p.host>=2?p.inner+m-r:-100.);}
  double k=h+sf,rib=10;if(int(p.host)==3){for(int i=1;i<=p.nodes;i++)rib=std::min(rib,std::abs(orig[axis]-(-1+2.*i/(p.nodes+1))));rib-=2*p.shellMM/(axis==0?p.lx:axis==1?p.ly:p.lz);}
  double A=std::max(bound,std::min(std::max(h,-k),std::max(h,rib))),core=std::max({bound,k,int(p.host)==3?-rib:-100.});double b=std::abs(F(q[0]*p.nx*pi*p.r2+ph,q[1]*p.ny*pi*p.r2+.7*ph,q[2]*p.nz*pi*p.r2+.3*ph,int(p.type2))),c=std::abs(F(q[0]*p.nx*pi*p.r2*p.r3+.3*ph,q[1]*p.ny*pi*p.r2*p.r3+ph,q[2]*p.nz*pi*p.r2*p.r3+.7*ph,int(p.type3)));double tb=p.t*g,tc=p.t3*g,skin2=p.s2*g,collar=-k-p.bond;double B=std::max(core,std::min(b-tb,collar)),C=100;
  if(int(p.form)==1){A=std::max(bound,std::abs(a)-sf);B=100;C=100;}
  if(int(p.form)==2){double middle=b-(tb-skin2),k2=k+p.bond;B=std::max(core,std::min(std::max(b-tb,-middle),collar));C=std::max({core,k2,middle,std::min({c-tc,-middle-p.bond2,-k2-p.bond2})});}
  if(int(p.form)==3){A=std::min(A,std::max(bound,std::abs(a)-sf));core=std::max(core,sf-std::abs(a));B=std::max({core,sf-a,std::min({b-tb,collar,a-sf-p.bond})});C=std::max({core,sf+a,std::min({c-tc,collar,-a-sf-p.bond})});}
  if(int(p.form)==4||int(p.form)==5){A=std::max(bound,std::abs(a)-sf);double outside=std::max({bound,sf-std::abs(a),int(p.host)==3?-rib:-100.}),bridge=std::abs(a)-sf-p.bond;if(int(p.form)==4){B=std::max(outside,std::min(b-tb,bridge));C=100;}else{double k2=b-tb+skin2;B=std::max(outside,std::min(std::max(b-tb,-k2),bridge));C=std::max({outside,k2,-bridge,std::min({c-tc,-k2-p.bond2,bridge-p.bond2})});}}
  if(p.host){double radius=radial(orig,axis,p.sizeMM),m=2*p.shellMM/p.sizeMM,shell=std::max(radius-.94,.94-m-radius);if(p.host>=2)shell=std::min(shell,std::max(radius-(p.inner+m),p.inner-radius));if(int(p.host)==3)shell=std::min(shell,std::max({rib,radius-(.94-m),p.inner+m-radius}));A=std::min(A,shell);}return {A,B,C};
 }
 int classify(double x,double y,double z)const{auto d=fields(x,y,z);if(p.layer){int i=int(p.layer)-1;return d[i]<=0?i+1:0;}for(int i=0;i<3;i++)if(d[i]<=0)return i+1;return 0;}
};
