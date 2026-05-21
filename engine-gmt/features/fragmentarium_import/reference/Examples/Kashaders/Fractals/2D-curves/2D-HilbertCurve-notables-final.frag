#define providesInit
#include "2D.frag"
#include "MathUtils.frag"
#info Hilbert curve

#group Plotter2D
uniform float Width; slider[0,1,10]
uniform float DRadius; slider[0,0.71,2]
uniform float Gamma; slider[1,1,3]
uniform float AxisDetail; slider[1,1,10]
uniform vec3 CurveColor; color[0.0,0.0,0.0]
uniform vec3 BackgroundColor; color[1.0,1.0,1.0]
uniform float time;

#groupHulbert Curve
uniform int MaxIter; slider[0,3,10]

float scl=1.;//scale
float scl2=1.;//scale squared
void init(){
	scl=pow(0.5,float(MaxIter));
	scl2=scl*scl;
}

//Coposition of two "rotations"
vec2 fG(vec2 t0, vec2 t1){
	return vec2(dot(t0,t1), dot(t0, t1.yx));
}

//Action of rotation on "elementary" coordinates
vec2 fA(vec2 t, vec2 p){
	return fG(t,p-vec2(0.5))+vec2(0.5);
}

//Given "elementary" coordinates of position, returns the corresponding "rotation".
vec2 fCg(vec2 p){
	return vec2(p.y, (1.-2.*p.x)*(1.-p.y));
}

//Given "elementary" coordinates of position (c=2*p.x+p.y), returns the "elementary" linear coordinates
float fL(float c){
	return max(0.,0.5*((-3.*c+13.)*c-8.));
}

//Given a point inside unit square, return the linear coordinate
float C2L(vec2 p){
	vec2 t=vec2(1.,0.);//initial rotation is the identity
	float l=0.;//initial linear coordinate
	for(int i=0; i<MaxIter;i++){
		p*=2.; vec2 p0=floor(p); p-=p0;//extract leading bits from p. Those are the "elementary" (cartesian) coordinates.
		p0=fA(t,p0);//Rotate p0 by the current rotation
		t=fG(t,fCg(p0));//update the current rotation
		float c= p0.x*2.+p0.y;
		l=l*4.+fL(c);//update l
	}
	return l*scl2;//scale the result in order to keep between 0. and 1.
}

//Given the linear coordinate of a point (in [0,1[), return the coordinates in unit square
//it's the reverse of C2L
vec2 L2C(float l){
	vec2 t=vec2(1.,0.);
	vec2 p=vec2(0.,0.);
	for(int i=0; i<MaxIter;i++){
		l*=4.; float c=floor(l); l-=c;
		c=0.5* fL(c);
		vec2 p0=vec2(floor(c),2.*(c-floor(c)));
		t=fG(t,fCg(p0));
		p0=fA(t,p0);
		p=p*2.+p0;
	}
	return p*scl;
}

float dist2box(vec2 p, float a){
	p=abs(p)-vec2(a);
	return max(p.x,p.y);
}

float d2line(vec2 p, vec2 a, vec2 b){//distance to line (a,b)
	vec2 v=b-a;
	p-=a;
	p=p-v*clamp(dot(p,v)/(dot(v,v)),0.,1.);//Fortunately it still work well when a==b => division by 0
	return min(0.5*scl,length(p));
}

float ll=0.;//for coloring
float DE(vec2 p) {//Returns the distance to Hilbert curve.
	float ds=dist2box(p-0.5,.5-0.5*scl);
	if(ds>0.5*scl) return ds;//p=p-floor(p);
	float l=C2L(p);//Get linear coordinate of the Nearest vertex in the curve to p
	vec2 p0=scl*floor(p/scl)+vec2(.5*scl);//Nearest vertex in the curve to p
	vec2 pp=L2C(max(l-scl2,0.))+vec2(.5*scl);//Previous vertex
	vec2 ps=L2C(min(l+scl2,1.-scl2))+vec2(.5*scl);//next vertex
	ll=l+0.5;
	return max(ds,min(d2line(p,p0,pp),d2line(p,p0,ps)));
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
	//return (1.-(100.*DE(pos)))*(0.5+0.5*sin(vec3(ll,2.*ll,3.*ll)));
	float pixsize=dFdx(pos.x);
	float v=coverageLine(abs(DE(pos)), Width, pixsize);
	return pow(mix(pow(BackgroundColor,vec3(Gamma)),pow(CurveColor,vec3(Gamma)),v),vec3(1./Gamma));
}

#preset default
Center = 0.499215071,0.466019417
Zoom = 1
AntiAliasScale = 1
EnableTransform = true
RotateAngle = 0
StretchAngle = 0
StretchAmount = 0
AntiAlias = 1
Width = 1
DRadius = 0.71
Gamma = 1
AxisDetail = 1
CurveColor = 0,0,0
BackgroundColor = 1,1,1
MaxIter = 6
#endpreset
