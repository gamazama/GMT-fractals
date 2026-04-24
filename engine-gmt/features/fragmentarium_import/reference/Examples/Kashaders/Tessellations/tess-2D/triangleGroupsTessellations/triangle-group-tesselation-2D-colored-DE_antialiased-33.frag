#version 130 //needed for hyperbolic functions
#info triangular groups tessellations. Coxeter group p-q-r. Stereographic projection. 
#info (knighty 2012)
#info the type of the space embedding the tessellation depend on the value: 1/p+1/q+1/r
#info if >1 its the sphere
#info if =1 its the euclidean plane
#info if <1 its the hyperbolic plane
#info 
#info No duals for now. Also no snubs. Snubs are a little special :o)
#info
#info Distance estimation to lines and vertices is used for antialiasing.
#info use AntiAliasScale value control (in camera Tab) to adjust antialiasing. Good values are between 1 and 1.5.
#info You can still improve quality by using fragmentarium built in antialiasing (AntiAlias control).
#info Experimenting with half-plane and band projections.... Unfinished.

#define providesInit
#define providesColor
//#include "2D.frag"
#include "MathUtils.frag"
#include "Progressive2D.frag"
//

#define PI 3.1416 

#group Hyperbolic-tesselation
// Iteration number.
uniform int Iterations;  slider[0,10,100]

// Pi/p: angle beween reflexion planes a and b .
uniform int pParam;  slider[2,2,200]

// Pi/q: angle beween reflexion planes b and c .
uniform int qParam;  slider[2,3,200]

// Pi/r: angle beween reflexion planes c and a .
uniform int rParam;  slider[2,7,200]

// U 'barycentric' coordinate for the 'principal' node.
uniform float U; slider[0,1,1]

// V
uniform float V; slider[0,0,1]

// W
uniform float W; slider[0,0,1]

//'Translation' direction.
uniform vec2 RotVector; slider[(0,0),(1,0),(1,1)]

//'Translation' value
uniform float RotAngle; slider[-3,0,3]

uniform bool DisplayVertices; checkbox[true]

//vertex radius 
uniform float VRadius; slider[0,0.05,.25]

uniform bool DisplaySegments; checkbox[true]
//segments width 
uniform float SRadius; slider[0,0.01,.05]

uniform bool DisplayFaces; checkbox[true]

#group HTess-Transformations 
//These transformations are taken from "Conformal Mappings of the Hyperbolic Plane to Arbitrary Shapes" by Eryk Kopczynski and Dorota Celinska-Kopczynska.
//Do the transformation from Poincaré disc model to upper half plane model.
uniform bool toHalfPlane; checkbox[false]

//Do the transformation from upper half plane model to band view.
uniform bool toBand; checkbox[false]

//Do the transformation from band view to spiral view.
uniform bool toSpiral; checkbox[false]

vec2 Hp2Pc(vec2 z, inout float tderiv){
	// z' = 1/(z - i) + 1/2 => z = 1/(z' - 1/2) + i 

	z.y += 0.5;
	float r = 1. / dot(z, z);
	tderiv /= r;
	z *= r;
	z.y = -z.y;
	z.y += 1.;
	return z;
}

vec2 Pc2Bd(vec2 z, inout float tderiv){
	// z' = log(z) / PI => z = exp( z' * PI ) = exp( re* PI ) * exp( i * im * PI) = exp( re* PI ) * ( cos( im * PI) + i * sin( im * PI));

	tderiv /= PI * exp( z.x * PI);

	z.y += 0.5;
	z *= PI;
	float r = exp(z.x);
	float t = z.y;
	return r * vec2(cos(t), sin(t));
}

vec2 doTrans(vec2 z, inout float tderiv){
	if (toBand)
		z = Pc2Bd(z+vec2(-0.25,0), tderiv);
	if (toHalfPlane)
		return Hp2Pc(z+vec2(0,0), tderiv);
	return z;
}

#group HTess-Color
uniform vec3 faceAColor; color[1.0,0.0,0.0]
uniform vec3 faceBColor; color[0.0,1.0,0.0]
uniform vec3 faceCColor; color[0.0,0.0,1.0]
uniform vec3 segColor; color[0.0,0.0,0.0]
uniform vec3 vertexColor; color[0.5,0.5,0.]
uniform vec3 backGroundColor; color[1.0,1.0,1.0]


vec3 nb,nc,p,q;
vec3 pA,pB,pC;
float tVR,tSR,cRA,sRA;
//float qq,Aq,Bq,Cq;
vec3 gA,gB,gC;

float spaceType=0.;


float hdott(vec3 a, vec3 b){//dot product for "time like" vectors.
	return spaceType*dot(a.xy,b.xy)+a.z*b.z;
}
float hdots(vec3 a, vec3 b){//dot product for "space like" vectors.
	return dot(a.xy,b.xy)+spaceType*a.z*b.z;
}

float hlengtht(vec3 v){
	return sqrt(abs(hdott(v,v)));
}
float hlengths(vec3 v){
	return sqrt(abs(hdots(v,v)));
}

vec3 hnormalizet(vec3 v){//normalization of "time like" vectors.
	float l=1./hlengtht(v);
	return v*l;
}
vec3 hnormalizes(vec3 v){//normalization of "space like" vectors.(not used in this script)
	float l=1./hlengths(v);
	return v*l;
}

void init() {
	spaceType=float(sign(qParam*rParam+pParam*rParam+pParam*qParam-pParam*qParam*rParam));//1./pParam+1./qParam+1./rParam-1.;

	float cospip=cos(PI/float(pParam)), sinpip=sin(PI/float(pParam));
	float cospiq=cos(PI/float(qParam)), sinpiq=sin(PI/float(qParam));
	float cospir=cos(PI/float(rParam)), sinpir=sin(PI/float(rParam));
	float ncsincos=(cospiq+cospip*cospir)/sinpip;

	//na is simply vec3(1.,0.,0.).
	nb=vec3(-cospip,sinpip,0.);
	nc=vec3(-cospir,-ncsincos,sqrt(abs((ncsincos+sinpir)*(-ncsincos+sinpir))));

	if(spaceType==0.){//This case is a little bit special
		nc.z=0.25;
	}

	pA=vec3(nb.y*nc.z,-nb.x*nc.z,nb.x*nc.y-nb.y*nc.x);
	pB=vec3(0.,nc.z,-nc.y);
	pC=vec3(0.,0.,nb.y);

	q=U*pA+V*pB+W*pC;
	float qq=hlengtht(q), Aq=hdott(pA,q), Bq=hdott(pB,q), Cq=hdott(pC,q);//needed for face identification
	gA=pA*qq/Aq-q; gB=pB*qq/Bq-q; gC=pC*qq/Cq-q;
	p=hnormalizet(q);//p=q;

	if(spaceType==-1.){
		tVR=sinh(0.5*VRadius)/cosh(0.5*VRadius);
		tSR=sinh(0.5*SRadius)/cosh(0.5*SRadius);
		cRA=cosh(RotAngle);sRA=sinh(RotAngle);
	}else if (spaceType==1.){
		tVR=sin(0.5*VRadius)/cos(0.5*VRadius);
		tSR=sin(0.5*SRadius)/cos(0.5*SRadius);
		cRA=cos(RotAngle);sRA=sin(RotAngle);
	}else{
		tVR=0.5*VRadius;
		tSR=0.5*SRadius;
		cRA=1.;sRA=RotAngle;
	}
}

vec3 Rotate(vec3 p){
	vec3 p1=p;
	vec2 rv;
	rv=normalize(RotVector);
	float vp=dot(rv,p.xy);
	p1.xy+=rv*(vp*(cRA-1.)-p.z*sRA);
	p1.z+=vp*spaceType*sRA+p.z*(cRA-1.);
	return p1;
}

float nbrFolds=0.;
vec3 fold(vec3 pos) {
	vec3 ap=pos+1.;
	for(int i=0;i<Iterations && any(notEqual(pos,ap));i++){
		ap=pos;
		pos.x=abs(pos.x);
		float t=-2.*min(0.,dot(nb,pos)); pos+=t*nb*vec3(1.,1.,spaceType);
		t=-2.*min(0.,dot(nc,pos)); pos+=t*nc*vec3(1.,1.,spaceType);
		nbrFolds+=1.;
	}
	return pos;
}

float DD(float tha, float r){
	return tha*(1.+spaceType*r*r)/(1.+spaceType*spaceType*r*tha);
}

float dist2Vertex(vec3 z, float r){
	float tha=hlengths(p-z)/hlengtht(p+z);
	return DD((tha-tVR)/(1.+spaceType*tha*tVR),r);
}

vec3 closestFTVertex(vec3 z){
		vec3 R=z-q*hdott(z,q)/hdott(q,q);
		float fa=hdots(gA,R);
		float fb=hdots(gB,R);
		float fc=hdots(gC,R);

		float f=max(fa,max(fb,fc));
		vec3 c=vec3(float(fa==f),float(fb==f),float(fc==f));
		//float k=1./(c.x+c.y+c.z);
		return c;//*k;
}

float dist2Segment(vec3 z, vec3 n){
	//pmin is the orthogonal projection of z onto the plane defined by p and n
	//then pmin is projected onto the unit sphere
	
	//we are assuming that p and n are normalized. If not, we should do: 
	//mat2 smat=mat2(vec2(hdots(n,n),-hdots(p,n)),vec2(-hdott(p,n),hdott(p,p)));
	mat2 smat=mat2(vec2(1.,-hdots(p,n)),vec2(-hdott(p,n),1.));//should be sent as uniform
	vec2 v=smat*vec2(hdott(z,p),hdots(z,n));//v is the componenents of the "orthogonal" projection (depends on the metric) of z on the plane defined by p and n wrt to the basis (p,n)
	v.y=min(0.,v.y);//crops the part of the segment past the point p
	
	vec3 pmin=hnormalizet(v.x*p+v.y*n);
	float tha=hlengths(pmin-z)/hlengtht(pmin+z);
	//return DD((tha-tSR)/(1.+spaceType*tha*tSR),r);
	//return (tha-tSR)/(1.+spaceType*tha*tSR);
	return tha;
}

float dist2Segments(vec3 z, float r){
	float da=dist2Segment(z, vec3(1.,0.,0.));
	float db=dist2Segment(z, nb);
	float dc=dist2Segment(z, nc*vec3(1.,1.,spaceType));
	
	float tha = min(min(da,db),dc);
	//return DD(, r);
	return DD((tha-tSR)/(1.+spaceType*tha*tSR),r);
}

//vec3 getColor2D(vec2 pos)
vec3 color(vec2 pos){
	float tderiv = 1. * 0.5 / aaScale.y;
	pos = doTrans(pos, tderiv);

	
	float r = length( pos );

	//reflect the tiling outside the Poincaré circle
	if( spaceType == -1. && r >= 1. ){
			//pos.y=-pos.y; 
			pos*=1./(r*r);
			tderiv *= r*r;
			r=1./r;//because we will use it 
	}

	vec3 z3 = vec3(2.*pos, 1. - spaceType * r * r ) * 1. / ( 1. + spaceType * r * r );
	//if( spaceType == -1. && r >= 1. ) return backGroundColor;//We are outside Poincaré disc.
	
	z3 = Rotate( z3 );
	z3 = fold( z3 );
	
	vec3 color = backGroundColor;
	if( DisplayFaces ){
		vec3 c = closestFTVertex(z3);
		color     = c.x * faceAColor + c.y * faceBColor + c.z * faceCColor;
	}
	//antialiasing using distance de segments and vertices (ds and dv) (see:http://www.iquilezles.org/www/articles/distance/distance.htm)
	//I'm using aaSale.y because aaScale.x behaves strangely :-/. the problem seems to be in pixelSize uniform (see 2D.frag)
	if(DisplaySegments){
		float ds = dist2Segments(z3, r);
		color       = mix(segColor,color,smoothstep(-1., 1., ds * tderiv ));//clamp(ds/aaScale.y,0.,1.));
	}
	if(DisplayVertices){
		float dv = dist2Vertex(z3, r);
		color       = mix(vertexColor,color,smoothstep(-1., 1., dv * tderiv ));//clamp(dv/aaScale.y,0.,1.));
	}
	//final touch in order to remove jaggies at the edge of the circle
	if(spaceType==-1.) color=mix(backGroundColor,color,smoothstep(0.,1.,(1.-r)*0.5/aaScale.y));//clamp((1.-r)/aaScale.y,0.,1.));
	return color;
}
#preset Default
Iterations = 13
U = 1
V = 1
W = 0
RotAngle = 0
pParam = 2
qParam = 3
rParam = 7
Center = -0.0273418,-0.015116
Zoom = 0.848647
AntiAliasScale = 1.
AntiAlias = 1
VRadius = 0
SRadius = 0.02528
RotVector = 0,1,0
faceAColor = 1,0,0
faceBColor = 0,1,0
faceCColor = 0,0,1
segColor = 0,0,0
vertexColor = 0.5,0.5,0
backGroundColor = 1,1,1
#endpreset

#preset t237
Center = 0,0
Zoom = 0.901143
AntiAliasScale = 1.
AntiAlias = 1
Iterations = 20
pParam = 2
qParam = 3
rParam = 7
U = 0
V = 0.62044
W = 0
RotVector = 0,1
RotAngle = 0
DisplayVertices = true
VRadius = 0
DisplaySegments = true
SRadius = 0.00449
DisplayFaces = true
faceAColor = 0.74902,0.576471,0.462745
faceBColor = 0.580392,0.796078,0.529412
faceCColor = 0.388235,0.45098,0.862745
segColor = 0.0980392,0.0313725,0.184314
vertexColor = 0.760784,0.760784,0
backGroundColor = 0.87451,0.909804,0.788235
#endpreset

#preset t254
Center = 0,0
Zoom = 0.626318
AntiAliasScale = 1
AntiAlias = 1
Iterations = 20
pParam = 2
qParam = 5
rParam = 4
U = 0
V = 1
W = 0
RotVector = 0,1
RotAngle = 0
DisplayVertices = true
VRadius = 0.04048
DisplaySegments = true
SRadius = 0.05
DisplayFaces = true
faceAColor = 0.74902,0.576471,0.462745
faceBColor = 0.305882,0.737255,0.298039
faceCColor = 0.266667,0.423529,0.721569
segColor = 0.160784,0.0509804,0.290196
vertexColor = 0.866667,0.423529,0.337255
backGroundColor = 0.47451,0.6,0.247059
#endpreset