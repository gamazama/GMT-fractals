#define providesInit
#include "2D.frag"
#include "MathUtils.frag"
#info Koch curves

#group Plotter2D
uniform float Width; slider[0,1,10]
uniform float DRadius; slider[0,0.71,2]
uniform float Gamma; slider[1,1,3]
uniform float AxisDetail; slider[1,1,10]
uniform vec3 CurveColor; color[0.0,0.0,0.0]
uniform vec3 BackgroundColor; color[1.0,1.0,1.0]
uniform float time;

#group Koch Curve
uniform float Angle; slider[0,60,90]
uniform int MaxIter; slider[0,10,20]

#define PI 3.14159
#define A2B PI/360.
float lambda,ca,sa,lscl;
vec2 csa;

void init() {
	float ang=A2B*Angle;
	ca=cos(ang),sa=sin(ang);
	csa=vec2(ca,-sa);
	lambda=0.5/(ca*ca);
	lscl=2./lambda;
};

float d2hline(vec2 p){
   float t=max(-1.,min(1.,p.x));
   p.x-=t;
   return length(p);
}

float DE(vec2 p) {
	float d=1., r=dot(p,p);
	for(int i=0; i<MaxIter; i++) {
		p.x=abs(p.x);
		p.x-=1.-lambda;
		float t=2.*min(0.,dot(p,csa));
		p-=csa*t;
		p.x-=lambda;
		p*=lscl; d*=lscl;
		p.x+=1.;
		 r=dot(p,p);
	}
	return d2hline(p)/d;//length(p)-1.;
}

float coverageFunction(float t){
	//this function returns the area of the part of the unit disc that is at the rigth of the verical line x=t.
	//the exact coverage function is:
	//t=clamp(t,-1.,1.); return (acos(t)-t*sqrt(1.-t*t))/PI;
	//this is a good approximation
	return 1.-smoothstep(-1.,1.,t);
	//a better approximation:
	//t=clamp(t,-1.,1.); return (t*t*t*t-5.)*t*1./8.+0.5;//but there is no visual difference
}

float coverageLine(float d, float lineWidth, float pixsize){
	d=d*1./pixsize;
	float v1=(d-0.5*lineWidth)/DRadius;
	float v2=(d+0.5*lineWidth)/DRadius;
	return coverageFunction(v1)-coverageFunction(v2);
}

vec3 color(vec2 pos) {//getColor2D(vec2 pos) {
	float pixsize=dFdx(pos.x);
	float v=coverageLine(abs(DE(pos)), Width, pixsize);
	return pow(mix(pow(BackgroundColor,vec3(Gamma)),pow(CurveColor,vec3(Gamma)),v),vec3(1./Gamma));
}
