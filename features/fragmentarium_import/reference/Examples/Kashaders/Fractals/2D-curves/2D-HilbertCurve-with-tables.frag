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

float scl=1.;
float scl2=1.;
void init(){
	scl=pow(0.5,float(MaxIter));
	scl2=scl*scl;
}

float d2hline(vec2 p){
   float t=max(-1.,min(1.,p.x));
   p.x-=t;
   return length(p);
}

//Coposition of two "rotations". Tow bits by component ->  32 bits. Used for composition of "rotations"
//this matrix have nice symmetries. For example G[i][j]=not(G[4-i][j])...etc. so it can be turned into a function instead.
mat4 G=mat4(vec4(0.,1.,2.,3.),
			        vec4(1.,0.,3.,2.),
		              vec4(2.,3.,0.,1.),
	 		      vec4(3.,2.,1.,0.));

//Action of rotation on "elementary" coordinates. 32 bits. if t is the index of the rotation and c the "elementary" coordinates then A[t][c] is the rotated point
//this matrix also have nice symmetries
mat4 A=mat4(vec4(0.,1.,2.,3.),
			        vec4(0.,2.,1.,3.),
				 vec4(3.,2.,1.,0.),
				 vec4(3.,1.,2.,0.));

//Given "elementary" coordinates of position (c=(i,j)=0..3; i,j=0..1), returns the index of the corresponding "rotation".
ivec4 Cg=ivec4(1,0,3,0);//8 bits

//Given "elementary" coordinates of position (c=(i,j)=0..3; i,j=0..1), returns the "elementary" linear coordinates L[c]
ivec4    L=ivec4(0,1,3,2);//8 bits

//Given a point inside unit square, return the linear coordinate
float C2L(vec2 p){
	//t: current rotation
	//l: linear coordinate
	//c: "elementary" cartesian coordinates
	//scl2: to keep the curve inside the unit square
	int t=0;//initial rotation is the identity
	float l=0.;//initial linear coordinate
	for(int i=0; i<MaxIter;i++){
		//extract leading bits from p. Those are the "elementary" (cartesian) coordinates.
		p*=2.; vec2 p0=floor(p); p-=p0;
		int c= int(p0.x*2.+p0.y);//c is the "elementary" cartesian coordinates
		//Rotate c by the current rotation
		c=int(A[t][c]);
		//update the current rotation
		t=int(G[t][Cg[c]]);
		//update l
		l=l*4.+float(L[c]);
	}
	return l*scl2;
}

//Given the linear coordinate of a point (in [0,1[), return the coordinates in unit square
//it's the reverse of C2L
vec2 L2C(float l){
	int t=0;//initial rotation is the identity
	vec2 p=vec2(0.,0.);//initial cartesian coordinates
	for(int i=0; i<MaxIter;i++){
		l*=4.; float l0=floor(l); l-=l0;//get the two leadin bits of the linear coordinate: l0: "elementary" linear coordiante
		int p0= L[int(l0)];//get the "elementary" cartesian coordinates from l0
		t=int(G[t][Cg[p0]]);//Update current "rotation"
		p0=int(A[t][p0]);//rotate p0 by the current "rotation"
		float pf=0.5*float(p0);
		p=p*2.+vec2(floor(pf),2.*(pf-floor(pf)));//update cartesian coordinate
	}
	return p*scl;//keep it inside unit square
}

float dist2box(vec2 p, float a){
	p=abs(p)-vec2(a);
	return max(p.x,p.y);
}

float d2line(vec2 p, vec2 a, vec2 b){
	vec2 v=b-a;
	p-=a;
	p=p-v*clamp(dot(p,v)/(dot(v,v)),0.,1.);
	return min(0.5*scl,length(p));
}

float ll=0.;
float DE(vec2 p) {
	float ds=dist2box(p-0.5,.5-0.5*scl);
	p=p-floor(p);
	
	float l=C2L(p);//get "linear" coordinate of p
	
	vec2 p0=scl*floor(p/scl)+vec2(.5*scl);//nearest pont to p in the (integer) grid.
	vec2 pp=L2C(max(l-scl2,0.))+vec2(.5*scl);//get previous node on the curve
	vec2 ps=L2C(min(l+scl2,1.-scl2))+vec2(.5*scl);//next node
	ll=l+0.5;
	return max(ds,min(d2line(p,p0,pp),d2line(p,p0,ps)));//return distance to the two segments near p. the DE is discontinuous but for 2D it is fine.
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
