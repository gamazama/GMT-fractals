//#version 330 //to make sure it will work on glsl 1.10 compliant drivers

#info A little shader that renders various algebraic surfaces (knighty 2016-2022).
#info It uses transformation in order to visualise what happens on the plane at infinity.
#info in "DE parameters" tab use RotVector and RotAngle sliders to rotate the implicit surface in xyz space.
#info  Use WAngle to perform a rotation in zw plane.
#info and Use GFactor for other fancy effects.
#info Based on: algebraic surfaces (and others) Distance Estimator (knighty 2011). See: algebraic07.frag in menu examples->Knighty collection

#define providesNormal
#define KN_VOLUMETRIC
#define USE_EIFFIE_SHADOW
#define MULTI_SAMPLE_AO
#define providesInit
#define providesColor

#include "renderer\DE-kn2.frag"

//Set the algebraic surface to render.
//Choose one of those : CayleyNodal3, Kummer4, Togliatti5, Barth6, Labs7, Endrass8, Endrass_8 (minus version), Sarti8, Chmutov8, Escudero9_2, Barth10, Sarti12, Chmutovn, Escudero9_2
#define Fn1 Barth6 

uniform float time;
#group Implicit surface parametres
//DE correction param: scaling factor. Better use "FudgeFactor" in "Raytracer" tab
uniform float param1; slider[0,1,12]
//DE correction param: Lipschitzator (lol) factor
uniform float param2; slider[0,4,50]
//Interior Thickness
uniform float IntThick; slider[0,0.01,0.1]
//Implicit type: 0: Barth sextic; 1:Labs septic; 2:Barth decic; 3:Sarti dodecic;
//uniform int ImpType; slider[0,1,4]
//Rotation in xyz space
uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]
uniform float RotAngle; slider[-180,0,180]
//Rotation involving w
uniform float WAngle; slider[-180,0,180]
//float WAngle=18.*time;
//Cut by plane at infinity?
uniform bool CutByPlane; checkbox[false]
//Cut by sphere. For convenience
uniform bool CutBySphere; checkbox[false]
//Cutting sphere radius
uniform float SphereCutRad; slider[0.1,1,10]
//float SphereCutRad = 10.-(time*.9);
//Geometry factor: -1: hyperbolic; 0:euclidean; 1:spherical;
uniform float GFactor; slider[-1,0,1]
//float GFactor = 0.1 * time;
#if Fn1 == Kummer4
//Parameters for Kummer surface
uniform float Mu; slider[-3,1.6666,3]
uniform float Lambda; slider[-5,3,5]
#endif

#if Fn1 == Chmutovn
//Parameters for Chmutovn
uniform int ChN; slider[1,6,20]
#endif

#group Implicit surface colors
uniform vec3 PSide; color[0.75,0.75,0.75]
uniform vec3 NSide; color[1.0,0.0,0.0]
uniform float NormalMix; slider[0,0.2,1]

#define Phi (.5*(1.+sqrt(5.)))

#define PHI  1.618034
#define PHI2 2.618034
#define PHI4 6.854102

#define Tau (1.+2.*Phi)

#define Eps 0.00048828125               //epsilon
#define IEps 2048.0                     //Inverse of epsilon



mat3 rot;
mat2 wrot;

//problems with mathutils.frag !!!
#if 1
// Return rotation matrix for rotating around vector v by angle
mat3  rotationMatrix3(vec3 v, float angle)
{
	float c = cos(radians(angle));
	float s = sin(radians(angle));

	return mat3(c + (1.0 - c) * v.x * v.x, (1.0 - c) * v.x * v.y - s * v.z, (1.0 - c) * v.x * v.z + s * v.y,
		(1.0 - c) * v.x * v.y + s * v.z, c + (1.0 - c) * v.y * v.y, (1.0 - c) * v.y * v.z - s * v.x,
		(1.0 - c) * v.x * v.z - s * v.y, (1.0 - c) * v.y * v.z + s * v.x, c + (1.0 - c) * v.z * v.z
		);
}
#endif

void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
	float c = cos(radians(WAngle));
	float s = sin(radians(WAngle));
	wrot=mat2(vec2(c,s),vec2(-s,c));
}

//Implicits ---------------------------------------
float thing(vec4 p){
	return p.z*(p.x+p.y) - p.x*p.w;
}

float sines(vec4 p){
	float P = sin(p.x)*sin(p.y);
	float Q = (p.z*p.z-p.w*p.w);
	Q = Q*Q;
	return dot(p.xy,p.xy) -  Lambda*dot(p.zw,p.zw);
}
//Quadratics
//Cubics
float CayleyNodal3(vec4 z) //https://en.wikipedia.org/wiki/Cayley%27s_nodal_cubic_surface
{
#if 0	
	//one have to rotate z in order to get the nodes on a tetrahedron (see: http://www.mathcurve.com/surfaces/cayley/cayley.shtml)
	//Approximate rotation is given by:
	// RotVector = (0.75, 0, 1)
	// RotAngle = 100
	// Wangle = 120
	vec4 z2 = z * z.yzwx;
	return dot(z2, z.zwxy);
#else
	return dot(z.xyz,z.xyz) * z.w + 2. * z.x * z.y * z.z - z.w*z.w*z.w;
#endif
}
//Quartics
float Kummer4(vec4 z) //See https://en.wikipedia.org/wiki/Kummer_surface and http://www.mathcurve.com/surfaces/kummer/kummer.shtml
{
	float p = z.z - z.w + z.x * sqrt(2.);
	float q = z.z - z.w - z.x * sqrt(2.);
	float r = z.z + z.w + z.y * sqrt(2.);
	float s = z.z + z.w - z.y * sqrt(2.);
	float fmu = dot(z.xyz,z.xyz) - Mu * z.w*z.w;
	return fmu*fmu - Lambda * p*q*r*s;
}
//Quintics
float Togliatti_5(vec4 z) //See http://www2.mathematik.uni-mainz.de/alggeom/docs/Etogliatti.shtml http://mathworld.wolfram.com/TogliattiSurface.html
{
	vec4 z2 = z*z;
	float P = z2.x*(z2.x-4.*z.x*z.w-10.*z2.y-4.*z2.w)+z.x*z.w*(16.*z2.w-20.*z2.y)+5.*z2.y*z2.y+z2.w*(16.*z2.w-20.*z2.y);
	float Q = 4.*(z2.x+z2.y-z2.z)+(1.+3.*sqrt(5.))*z2.w;
	Q = (2.*z.z - z.w*sqrt(5.-sqrt(5.))) * Q*Q;
	return  64.*(z.x-z.w)*P - 5.*sqrt(5.-sqrt(5.))*Q;
}

float Togliatti5(vec4 z) //inferred from: http://mathworld.wolfram.com/Dervish.html
{
	vec4 z2 = z*z;
	const float ro = 0.25*(1.+3.*sqrt(5.));
	const float a = - 8./5.*(1.+1./sqrt(5.))*sqrt(5.-sqrt(5.));
	const float c = 0.5*sqrt(5.-sqrt(5.));
	
	float h1 = z.x - z.w;
	float h2 = cos(2.*PI/5.)*z.x - sin(2.*PI/5.)*z.y - z.w;
	float h3 = cos(4.*PI/5.)*z.x - sin(4.*PI/5.)*z.y - z.w;
	float h4 = cos(6.*PI/5.)*z.x - sin(6.*PI/5.)*z.y - z.w;
	float h5 = cos(8.*PI/5.)*z.x - sin(8.*PI/5.)*z.y - z.w;

	float P =h1*h2*h3*h4*h5;
	float Q = z2.x + z2.y - z2.z + ro*z2.w ;
	Q = (z.z - c*z.w) * Q*Q;
	return  Mu*(a*P + Q);
}

float Dervish5(vec4 z) //See http://mathworld.wolfram.com/Dervish.html
{
	vec4 z2 = z*z;
	const float ro = 0.25*(1.+3.*sqrt(5.));
	const float a = - 8./5.*(1.+1./sqrt(5.))*sqrt(5.-sqrt(5.));
	const float c = 0.5*sqrt(5.-sqrt(5.));
	float h1 = z.x + z.z;
	float h2 = cos(2.*PI/5.)*z.x - sin(2.*PI/5.)*z.y + z.z;
	float h3 = cos(4.*PI/5.)*z.x - sin(4.*PI/5.)*z.y + z.z;
	float h4 = cos(6.*PI/5.)*z.x - sin(6.*PI/5.)*z.y + z.z;
	float h5 = cos(8.*PI/5.)*z.x - sin(8.*PI/5.)*z.y + z.z;

	float P =h1*h2*h3*h4*h5;
	float Q = z2.x + z2.y + ro*z2.z - z2.w;
	Q = (z.w + c*z.z) * Q*Q;
	return  a*P + Q;
}
//Sextics
float Barth6(vec4 z)
{
	vec4 z2=z*z;
	vec3 z3=PHI2*z2.xyz-z2.yzx;
	float p1=4.*z3.x*z3.y*z3.z;
	float r2=dot(z.xyz,z.xyz)-z2.w;
	float p2=Tau*(r2*r2)*z2.w;
	return p2-p1;
}

//Septics
float Labs7(vec4 p){
   float a = -0.140106854987125;//the real root of 7*a^3+7*a+1=0
   //Constants
   float a1= -0.0785282014969835;//(-12./7.*a-384./49.)*a-8./7.;
   float a2= -4.1583605922880200;//(-32./7.*a+24./49.)*a-4.; 
   float a3= -4.1471434889655100;//(-4.*a+24./49.)*a-4.;
   float a4= -1.1881659380714800;//(-8./7.*a+8./49.)*a-8./7.; 
   float a5= 51.9426145948147000;//(49.*a-7.)*a+50.;

   float	r2= dot(p.xy,p.xy);
   vec4 p2=p*p;
   float U = (p.z+p.w)*r2+(a1*p.z+a2*p.w)*p2.z+(a3*p.z+a4*p.w)*p2.w;
   U = (p.z+a5*p.w)*U*U;
   float P = p.x*((p2.x-3.*7.*p2.y)*p2.x*p2.x+(5.*7.*p2.x-7.*p2.y)*p2.y*p2.y);
   P+= p.z*(7.*(((r2-8.*p2.z)*r2+16.*p2.z*p2.z)*r2)-64.*p2.z*p2.z*p2.z);
   return U-P;
}

//Octics
float Endrass8(vec4 p){
	vec4 p2 = p*p;
	float r2 = dot(p.xy,p.xy);
	float U = 64.*(p2.x-p2.w)*(p2.y-p2.w)*((p.x+p.y)*(p.x+p.y)-2.*p2.w)*((p.x-p.y)*(p.x-p.y)-2.*p2.w);
	float V = -4.*(1.+sqrt(2.))*r2*r2+(8.*(2.+sqrt(2.))*p2.z+2.*(2.+7.*sqrt(2.))*p2.w)*r2;
	V = V + p2.z*(-16.*p2.z+8.*(1.-2.*sqrt(2.))*p2.w) - (1.+12.*sqrt(2.))*p2.w*p2.w;
	return V*V-U;
}

float Endrass_8(vec4 p){
	vec4 p2 = p*p;
	float r2 = dot(p.xy,p.xy);
	float U = 64.*(p2.x-p2.w)*(p2.y-p2.w)*((p.x+p.y)*(p.x+p.y)-2.*p2.w)*((p.x-p.y)*(p.x-p.y)-2.*p2.w);
	float V = -4.*(1.-sqrt(2.))*r2*r2+(8.*(2.-sqrt(2.))*p2.z+2.*(2.-7.*sqrt(2.))*p2.w)*r2;
	V = V + p2.z*(-16.*p2.z+8.*(1.+2.*sqrt(2.))*p2.w) - (1.-12.*sqrt(2.))*p2.w*p2.w;
	return V*V-U;
}

float Sarti8(vec4 p){
	vec4 p2 = p*p;
	vec4 p4 = p2*p2;
	vec4 p8 = p4*p4;
	float r2  = dot(p,p);
	return dot(p4,p4) + 14.*(p4.x*dot(p2.yzw,p2.yzw) + p4.y*dot(p2.zw,p2.zw)+p4.z*p4.w) + 168. * (p2.x*p2.y*p2.z*p2.w) - 9.0/16. * r2*r2*r2*r2; 
	//x^8+y^8+z^8+w^8+14*(x^4*(y^4+z^4+w^4)+y^4*(z^4+w^4)+(z*w)^4)+   168*(x*y*z*w)^2-9/16*(x^2+y^2+z^2+w^2)^4
}

float Chmutov8(in vec4 P){//octic
   vec4 P2=P*P;
   //vec3 R = 1.*P2.w*P2.w*P2.w*P2.w+P2.xyz*32.*(-1.*P2.w*P2.w*P2.w+P2.xyz*(5.*P2.w*P2.w+P2.xyz*(-8.*P2.w+P2.xyz*4.)));
   vec3 R=P2.w*P2.w*P2.w*P2.w+P2.xyz*32.0*(-1.0*P2.w*P2.w*P2.w+P2.xyz*(5.0*P2.w*P2.w+P2.xyz*(-8.0*P2.w+P2.xyz*4.0)));
   return R.x+R.y+R.z+Mu*P2.w*P2.w*P2.w*P2.w;
}

float Cheby(float x, int n){
	float t0=1., t1=x;
	while(n>1){
		float t=2.*x*t1-t0;
		t0=t1; t1=t;
		n-=1;
	}
	return t1;
}
vec3 Cheby(vec3 x,float w,  int n, out float wn){
	vec3 t0=vec3(1.), t1=x;
	float w2=w*w;
	wn=w;
	while(n>1){
		vec3 t=2.*x*t1-t0*w2;
		t0=t1; t1=t;
		n-=1;
		wn*=w;
	}
	return t1;
}

float Chmutovn(in vec4 p){
	float wn=0.;
	vec3 t=Cheby(p.xyz,p.w,ChN,wn);
	return t.x+t.y+t.z+wn;
}

//nonics
float Escudero9(vec4 p){
   	float alpha=sqrt(3.);
	vec4 p2 = p*p, p3=p*p2, p4=p2*p2, p5=p2*p3;
   
	float P= p5.w*((27.*p2.x-p2.w)*p2.w-9.*(p.w+6.*p.x)*p3.x)+p5.x*((36.*p.w+21.*p.x)*p3.w-(9.*(3.*p2.w-p.w*p.x)+p2.x)*p2.x)
			+alpha*(81.*(2.*p2.x-p2.w)*p4.w-(54.*(p.w+1.5*p.x)*p2.w+9.*(p.x-6.*p.w)*p2.x)*p3.x)*p2.x*p.y
			+((27.*p2.w*(p.w+p.x)-72.*(1.5*p.w+p.x)*p2.x)*p4.w+(p2.w*(225.*p.w+27.*p.x)+36.*p2.x*(p.x-3.5*p.w))*p4.x)*p2.y
			+alpha*((27.*p3.w+(108.*p.w+180.*p.x)*p2.x)*p3.w-(135.*p2.w+(126.*p.w-84.*p.x)*p.x)*p4.x)*p3.y
			+((-54.*p2.w-108.*p.w*p.x-45.*p2.x)*p3.w+(135.*p2.w-126.*p2.x)*p3.x)*p4.y
			+(alpha*(-54.*(p.w+p.x)*p3.w-27.*p2.w*p2.x-126.*(p.w+p.x)*p3.x)
			+(p2.w*(39.*p.w+81.*p.x)+(126.*p.w+84.*p.x)*p2.x)*p.y
			+alpha*9.*(3.*p2.w+6.*p.w*p.x+4.*p2.x)*p2.y
			-9.*(p.w+p.x)*p3.y-alpha*p4.y)*p5.y;
   
	float Q= (((27.*p2.z-4.*p2.w)*p2.w-9.*(p.w+6.*p.z)*p3.z)*p5.w+((36.*p2.w+(21.*p.w-27.*p.z)*p.z)*p2.w+(9.*p.w-p.z)*p3.z)*p5.z)/4.;

	return P-Q;
}
float Escudero9_2(vec4 p){
   	float alpha=sqrt(3.);
	vec4 p2 = p*p, p3=p*p2, p4=p2*p2, p5=p2*p3;
   
	float P= ((27.*p2.x-1.)-9.*(1.+6.*p.x)*p3.x)+p5.x*((36.*1.+21.*p.x)-(9.*(3.-p.x)+p2.x)*p2.x)
			+alpha*(81.*(2.*p2.x-1.)-(54.*(1.+1.5*p.x)+9.*(p.x-6.)*p2.x)*p3.x)*p2.x*p.y
			+((27.*(1.+p.x)-72.*(1.5+p.x)*p2.x)+((225.+27.*p.x)+36.*p2.x*(p.x-3.5))*p4.x)*p2.y
			+alpha*((27.+(108.+180.*p.x)*p2.x)-(135.+(126.-84.*p.x)*p.x)*p4.x)*p3.y
			+((-54.-108.*p.x-45.*p2.x)+(135.-126.*p2.x)*p3.x)*p4.y
			+(alpha*(-54.*(1.+p.x)-27.*p2.x-126.*(1.+p.x)*p3.x)
			+((39.+81.*p.x)+(126.+84.*p.x)*p2.x)*p.y
			+alpha*9.*(3.+6.*p.x+4.*p2.x)*p2.y
			-9.*(1.+p.x)*p3.y-alpha*p4.y)*p5.y;
   
	float Q= (((27.*p2.z-4.)-9.*(1.+6.*p.z)*p3.z)+((36.+(21.-27.*p.z)*p.z)+(9.-p.z)*p3.z)*p5.z)/4.;

	return P-Q;
}
//Decics
float Barth10(in vec4 P){//decic
   float r2=dot(P.xyz,P.xyz);
   vec4 P2=P*P;
   float r4=dot(P2.xyz,P2.xyz);
   vec4 P4=P2*P2;
   return (8.0*(P2.x-PHI4*P2.y)*(P2.y-PHI4*P2.z)*(P2.z-PHI4*P2.x)*(r4-2.0*((P.x*P.y)*(P.x*P.y)+(P.x*P.z)*(P.x*P.z)+(P.y*P.z)*(P.y*P.z)))+(3.0+5.0*PHI)*(r2-P2.w)*(r2-P2.w)*(r2-(2.0-PHI)*P2.w)*(r2-(2.0-PHI)*P2.w)*P2.w);
}

//   Dodecics
float Sarti12(vec4 p){
	vec4 p2 = p*p;
	vec4 p4 = p2*p2;
	float l1 = dot(p2,p2);
	float l2 = p2.x*p2.y+p2.z*p2.w;
	float l3 = p2.x*p2.z+p2.y*p2.w;
	float l4 = p2.y*p2.z+p2.x*p2.w;
	float l5 = p.x*p.y*p.z*p.w;
	float s10 = l1*(l2*l3+l2*l4+l3*l4), s11 = l1*l1*(l2+l3+l4);
	float s12=l1*(l2*l2+l3*l3+l4*l4),    s51=l5*l5*(l2+l3+l4),  s234=l2*l2*l2+l3*l3*l3+l4*l4*l4;
	float s23p=l2*(l2+l3)*l3,   s23m=l2*(l2-l3)*l3; 
	float s34p=l3*(l3+l4)*l4,       s34m=l3*(l3-l4)*l4; 
	float s42p=l4*(l4+l2)*l2,       s42m=l4*(l4-l2)*l2;
	float Q12=dot(p,p); Q12=Q12*Q12*Q12; Q12=Q12*Q12; 
	float S12=33.*sqrt(5.)*(s23m+s34m+s42m)+19.*(s23p+s34p+s42p)+10.*s234-14.*s10+2.*s11-6.*s12-352.*s51+336.*l5*l5*l1+48.*l2*l3*l4;
	return 22.*Q12-243.*S12;
}

//---------------------------------------
//Just for information. This function is not used
//Barth sextic with transformation: p-> 2*p/(1-p^2) . This transformation is related to Stereographic projection (the result is actually equivalent).
//The plane at infinity is mapped to the unit sphere and we get two copies of the original implicit. One inside the unit sphere and the other outside.
//This one preserves the symmetries unlihe the homographic transformation.
//... After some algebra and simplification :-)
float Barth6T(vec3 p){
	float r2 = dot(p,p);
	float m2 = 1.-r2; m2 *= m2;
	float n2 = r2- 0.25 * m2; n2 *= n2;
	vec3 p2 = p*p;
	return -(16.*(PHI2*p2.x - p2.y)*(PHI2*p2.y - p2.z)*(PHI2*p2.z - p2.x) - Tau * m2 * n2);
}
//---------------------------------------
float fff=0.;
vec4 Trans(vec3 z){//A (inverse) stereographic transformation. Depending on GFactor we will get:  -1: hyperbolic; 0:euclidean; 1:spherical;
	//Hyperbolic means we choose the homogeneous 4-coordinates to lie on the 3-hyperboloid: x²+y²+z²-w²+1=0
	//Euclidean means we choose the homogeneous 4-coordinates to lie on the 3-plane: w=1
	//Spherical means we choose the homogeneous 4-coordinates to lie on the 3-sphere: x²+y²+z²+w²-1=0
	vec4 p = vec4(z,0.);
	float r2 = dot(p.xyz,p.xyz);
	r2 *= GFactor;
	p.xyz *= 2./(r2+1.);
	p.w = (1.-r2)/(1.+r2);
	fff=1./(1.+p.w);
	//rotate in wz plane
	p.zw = wrot *p.zw;
	//rotate in xyz space
	p.xyz = rot * p.xyz;
	return p;
}

float Fn(vec3 p)
{
	vec4 p4 = Trans(p);
	float v =Fn1(p4); float ff=fff; //v-=LevelSet;
	float dv=length(IEps*(vec4(Fn1(p4+vec4(Eps,0.,0.,0.)),Fn1(p4+vec4(0.,Eps,0.,0.)),Fn1(p4+vec4(0.,0.,Eps,0.)),Fn1(p4+vec4(0.,0.,0.,Eps)))-vec4(v)));
	float k = 1.-1./(abs(v)+1.);
	v=v/(dv+param2*k+.001);
	return v*abs(ff);
}

#ifdef providesNormal
vec3 normal(vec3 p, float normalDistance){
	vec2 epsv=vec2(Eps,0.);
	float v = Fn1(Trans(p));
	vec3 n = vec3(Fn1(Trans(p+epsv.xyy)), Fn1(Trans(p+epsv.yxy)),Fn1(Trans(p+epsv.yyx))) - vec3(v);
	return sign(v)*normalize(n);
}
#endif

float InfPlnImg(vec3 p){//Image of the plane at infinity
	vec4 p4 = Trans(p);
	return -p4.w*min(1.,fff);
}

float InfPlnImg2(vec3 p){//Image of the plane at infinity
	float t11 = wrot[1,1]*GFactor;
	float t10 = wrot[1,0];
	vec3 D0v= t11*p; D0v.z-=t10;
	vec3 Q0v = p; Q0v.z-=t10;
	float A = t11*dot(D0v,D0v);
	float B = dot(D0v,Q0v);
	Q0v.z-=t10;
	float C = dot(p,Q0v)-wrot[1,1];
	float D = B*B - A*C;
	if (D<0.) return -100000.;
	D = sqrt(D);
	float D0 = B+D, D1=B-D;
	return 0.;
}

float DE(vec3 z)
{
	float v =Fn(z); v=abs(v+IntThick)-IntThick;

	float pinf = InfPlnImg(z);

	if (CutByPlane) v = max(v,pinf);
	if (CutBySphere) v = max(v,length(z)-SphereCutRad);
	return v;
}

vec3 baseColor(vec3 z, vec3 n){
	float v =Fn(z);
#if 0
	if(dot(z,z)>1. && v>0.) return vec3(.5, 0., 0.5);
#endif
	if(v>-2.*IntThick) return mix(PSide, n, NormalMix);
	return mix(NSide, n, NormalMix);// NSide;
}

#preset Default
FOV = 0.42276
Eye = -1.42679,0.69728,4.20781
Target = 0.00686202,-0.0259871,0.644545
Up = 0.486417,-0.112805,0.866414
FocalPlane = 2.91642
Aperture = 0
InFocusAWidth = 0.16981
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 0.74699
MaxRaySteps = 1027
MaxDistance = 100
Dither = 0.86598
NormalBackStep = 2
DetailAO = -3.5
coneApertureAO = 0.9
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.0784314,0.0784314,0.0627451
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,1,1,5
LightPos = -2.043,3.3334,10
LightSize = 0.07921
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 1.19565
CycleColors = false
Cycles = 1.1
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 1.0105
HF_Const = 0.01042
HF_Intensity = 0.19753
HF_Dir = 0,0,1
HF_Offset = -0.3614
HF_Color = 0.478431,0.580392,0.737255,0.47826
HF_Scatter = 0
HF_Anisotropy = 0.352941,0.356863,0.407843
HF_FogIter = 1
HF_CastShadow = false
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 42.857
IntThick = 0.005
RotVector = 0,0,1
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 7.228
GFactor = 0
Mu = 1.6666
Lambda = 0.3922
PSide = 0.75,0.75,0.75
NSide = 1,0,0
NormalMix = 0.2
ChN = 6
#endpreset

#preset normal view
FOV = 0.42276
Eye = -3.07064,1.83216,5.07514
Target = -1.11302,0.665394,1.89996
Up = 0.0488075,-0.0120273,0.998736
FocalPlane = 5.58638
Aperture = 0.115
InFocusAWidth = 0.16981
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 0.74699
MaxRaySteps = 1027
MaxDistance = 100
Dither = 0.86598
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.43548
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.0784314,0.0784314,0.0627451
ReflectionsNumber = 2 Locked
SpotGlow = false
SpotLight = 1,1,1,5
LightPos = -2.043,3.3334,10
LightSize = 0.07921
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 1.19565
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 1.0105
HF_Const = 0.01042
HF_Intensity = 0.19753
HF_Dir = 0,0,1
HF_Offset = -0.3614
HF_Color = 0.478431,0.580392,0.737255,0.47826
HF_Scatter = 0
HF_Anisotropy = 0.352941,0.356863,0.407843
HF_FogIter = 1
HF_CastShadow = false
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 20.238
LevelSet = 0
IntThick = 0.005
ImpType = 4 Locked
RotVector = 0,0,1
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 2.31641
GFactor = 0
#endpreset

#preset doubled
FOV = 0.42276
Eye = -4.14166,2.47168,6.88678
Target = -2.29387,1.36618,3.62506
Up = 0.0826408,-0.0313657,0.996086
FocalPlane = 6.40422
Aperture = 0.115
InFocusAWidth = 0.16981
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 0.74699
MaxRaySteps = 1027
MaxDistance = 100
Dither = 0.86598
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.43548
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.0784314,0.0784314,0.0627451
ReflectionsNumber = 2 Locked
SpotGlow = false
SpotLight = 1,1,1,5
LightPos = -2.043,3.3334,10
LightSize = 0.07921
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 1.19565
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 1.0105
HF_Const = 0.01042
HF_Intensity = 0.19753
HF_Dir = 0,0,1
HF_Offset = -0.3614
HF_Color = 0.478431,0.580392,0.737255,0.47826
HF_Scatter = 0
HF_Anisotropy = 0.352941,0.356863,0.407843
HF_FogIter = 1
HF_CastShadow = false
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 20.238
LevelSet = 0
IntThick = 0.005
ImpType = 4 Locked
RotVector = 0,0,1
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = false Locked
SphereCutRad = 2.31641
GFactor = 1
#endpreset

#preset doubled-inf-cut
FOV = 0.42276
Eye = -1.55073,1.07425,2.3502
Target = 0.491239,-0.313931,-0.679431
Up = -0.00441462,0.0168531,0.999848
FocalPlane = 2.6
Aperture = 0.09
InFocusAWidth = 0.24286
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 0.74699
MaxRaySteps = 1027
MaxDistance = 100
Dither = 0.86598
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.43548
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.0784314,0.0784314,0.0627451
ReflectionsNumber = 2 Locked
SpotGlow = false
SpotLight = 1,1,1,5
LightPos = -2.043,3.3334,10
LightSize = 0.07921
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 1.19565
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 1.0105
HF_Const = 0.01042
HF_Intensity = 0.19753
HF_Dir = 0,0,1
HF_Offset = -0.3614
HF_Color = 0.478431,0.580392,0.737255,0.47826
HF_Scatter = 0
HF_Anisotropy = 0.352941,0.356863,0.407843
HF_FogIter = 1
HF_CastShadow = false
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 20.238
LevelSet = 0
IntThick = 0.005
ImpType = 4 Locked
RotVector = 0,0,1
RotAngle = 0
WAngle = 0
CutByPlane = true Locked
CutBySphere = false Locked
SphereCutRad = 2.31641
GFactor = 1
#endpreset

#preset inf-cut
FOV = 0.42276
Eye = -1.91645,1.32288,2.89282
Target = -0.135295,0.120383,-0.371664
Up = 0.0802623,-0.0390142,0.99601
FocalPlane = 3.4978
Aperture = 0.105
InFocusAWidth = 0.24286
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.2
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 0.74699
MaxRaySteps = 1027
MaxDistance = 100
Dither = 0.86598
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.43548
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.0784314,0.0784314,0.0627451
ReflectionsNumber = 2 Locked
SpotGlow = false
SpotLight = 1,1,1,5
LightPos = -0.7526,5.2688,9.1398
LightSize = 0.07921
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 1.19565
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 2.0205
HF_Const = 0.0625
HF_Intensity = 0.2963
HF_Dir = 0,0,1
HF_Offset = -0.3614
HF_Color = 0.478431,0.580392,0.737255,0.04347
HF_Scatter = 10
HF_Anisotropy = 0.247059,0.247059,0.290196
HF_FogIter = 4
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 20.238
LevelSet = 0
IntThick = 0.002
ImpType = 4 Locked
RotVector = 0,0,1
RotAngle = 0
WAngle = -90
CutByPlane = true Locked
CutBySphere = false Locked
SphereCutRad = 2.31641
GFactor = 0
#endpreset


#preset ForCayleyNodal
FOV = 0.2439
Eye = -0.270674,-2.33682,9.10926
Target = 0,0,0
Up = -0.137478,0.39036,0.91034
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.2
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Detail = -5
FudgeFactor = 1
MaxRaySteps = 1027
Dither = 0.86598
NormalBackStep = 2
CamLight = 1,1,1,0.08696
Glow = 1,1,1,0
GlowMax = 20
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.64935
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.5534
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.21568
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 0
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
FocalPlane = 9.31064
Aperture = 0.195
InFocusAWidth = 0.04286
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
RefineSteps = 2
MaxDistance = 100
DetailAO = -4
coneApertureAO = 0.93548
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
AmbiantLight = 1,1,1,2
Reflection = 0.227451,0.227451,0.180392
ReflectionsNumber = 2 Locked
SpotGlow = false
SpotLight = 1,1,1,5
LightPos = -1.1828,-8.4946,5.914
LightSize = 0.07921
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
HF_Fallof = 0.90951
HF_Const = 0.0002
HF_Intensity = 0.12346
HF_Dir = 0,0,1
HF_Offset = 0.6024
HF_Color = 0.478431,0.580392,0.737255,0.43479
HF_Scatter = 0
HF_Anisotropy = 0.352941,0.356863,0.407843
HF_FogIter = 1
HF_CastShadow = false
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 1
LevelSet = 0
IntThick = 0.005
ImpType = 4 Locked
RotVector = 0,0,1
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 2.1
GFactor = 0
#endpreset

#preset ForKummer4
FOV = 0.2439
Eye = 4.357,-0.790718,1.87335
Target = -0.816294,0.109449,-0.364789
Up = -0.202282,-0.0187814,0.979147
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.2
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Detail = -5
FudgeFactor = 1
MaxRaySteps = 1027
Dither = 0.86598
NormalBackStep = 2
CamLight = 1,1,1,0.08696
Glow = 1,1,1,0
GlowMax = 20
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.64935
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.5534
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.21568
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 0
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
FocalPlane = 5.24145
Aperture = 0
InFocusAWidth = 0.04286
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
RefineSteps = 2
MaxDistance = 100
DetailAO = -4
coneApertureAO = 0.93548
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
AmbiantLight = 1,1,1,2
Reflection = 0.227451,0.227451,0.180392
ReflectionsNumber = 2 Locked
SpotGlow = false
SpotLight = 1,1,1,5
LightPos = 7.8494,-3.7634,5.914
LightSize = 0.07921
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
HF_Fallof = 1.97
HF_Const = 0.0002
HF_Intensity = 0.12346
HF_Dir = 0,0,1
HF_Offset = 0.6024
HF_Color = 0.478431,0.580392,0.737255,0.43479
HF_Scatter = 0
HF_Anisotropy = 0.352941,0.356863,0.407843
HF_FogIter = 1
HF_CastShadow = false
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 5
LevelSet = 0
IntThick = 0.005
ImpType = 4 Locked
RotVector = 0,0,1
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 1
GFactor = 0
Mu = 1.66666
Lambda = 3
#endpreset

#preset ForDerwiche
FOV = 0.22764
Eye = 7.15814,9.32179,4.82311
Target = -1.0142,-1.32076,-0.683363
Up = -0.0139098,0.0471332,0.998792
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Detail = -5
FudgeFactor = 0.74699
MaxRaySteps = 1027
Dither = 0.86598
NormalBackStep = 2
CamLight = 1,1,1,0.08696
Glow = 1,1,1,0
GlowMax = 20
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 1.19565
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
FocalPlane = 12.2171
Aperture = 0.245
InFocusAWidth = 0.05714
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
RefineSteps = 2
MaxDistance = 100
DetailAO = -4.00001
coneApertureAO = 0.51613
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
AmbiantLight = 1,1,1,2
Reflection = 0.0784314,0.0784314,0.0627451
ReflectionsNumber = 2 Locked
SpotGlow = false
SpotLight = 1,1,1,5
LightPos = -2.043,3.3334,10
LightSize = 0.07921
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
HF_Fallof = 1.5155
HF_Const = 0.01042
HF_Intensity = 0.30864
HF_Dir = 0,0,1
HF_Offset = -1.5662
HF_Color = 0.478431,0.580392,0.737255,0.47826
HF_Scatter = 0
HF_Anisotropy = 0.352941,0.356863,0.407843
HF_FogIter = 1
HF_CastShadow = false
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 0
LevelSet = 0
IntThick = 0.0001
ImpType = 4 Locked
RotVector = 0,0,1
RotAngle = 0
WAngle = 90
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 2.674
GFactor = 0
Mu = 2.27778
Lambda = 3
#endpreset

#preset ForKummer02
FOV = 0.30894
Eye = -4.20766,-1.42103,1.5638
Target = -0.72598,-0.225009,0.251238
Up = -0.0812478,-0.0416205,0.995825
FocalPlane = 4.66007
Aperture = 0.125
InFocusAWidth = 0.18571
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 0.9
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 0.74699
MaxRaySteps = 1027
MaxDistance = 100
Dither = 0.86598
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.85484
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.2745
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.0352941,0.0627451,0.0862745
ReflectionsNumber = 2 Locked
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = -2.4732,0.1076,4.4086
LightSize = 0.07921
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.317647,0.560784,0.392157
OrbitStrength = 0.74026
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 1.19565
CycleColors = false
Cycles = 1.1
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.133333,0.227451,0.160784
HF_Fallof = 2.27302
HF_Const = 0.0002
HF_Intensity = 0.19753
HF_Dir = 0,0,1
HF_Offset = -0.6024
HF_Color = 0.54902,0.623529,0.737255,0.05
HF_Scatter = 7
HF_Anisotropy = 0.580392,0.631373,0.690196
HF_FogIter = 8
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 20.238
LevelSet = 0
IntThick = 0.005
ImpType = 4 Locked
RotVector = 0,0,1
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 1.288
GFactor = 0
Mu = 1.6666
Lambda = 3
PSide = 0.490196,0.490196,0.490196
NSide = 0.941176,0.0784314,0.0666667
NormalMix = 0.12766
#endpreset

#preset ForKummer3
FOV = 0.30894
Eye = -2.85567,-1.12812,1.69758
Target = 0.331968,0.122624,-0.186572
Up = 0.0886686,0.0114681,0.995995
FocalPlane = 3.3
Aperture = 0.105
InFocusAWidth = 0.1
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 0.8
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 0.74699
MaxRaySteps = 1027
MaxDistance = 100
Dither = 0.86598
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.85484
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.2745
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.0666667,0.0352941,0.0313725
ReflectionsNumber = 2 Locked
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = -1.828,1.828,1.5
LightSize = 0.07921
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.258824,0.560784,0.188235
OrbitStrength = 0.83117
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 1.19565
CycleColors = false
Cycles = 1.1
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.133333,0.227451,0.160784
HF_Fallof = 3.485
HF_Const = 0.002
HF_Intensity = 0.32099
HF_Dir = 0,0,1
HF_Offset = -0.8434
HF_Color = 0.54902,0.623529,0.737255,0.05
HF_Scatter = 5
HF_Anisotropy = 0.580392,0.631373,0.690196
HF_FogIter = 8
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 20.238
LevelSet = 0
IntThick = 0.002
ImpType = 4 Locked
RotVector = 0,0,1
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 0.9914
GFactor = 0
Mu = 1.6666
Lambda = 3
PSide = 0.580392,0.580392,0.580392
NSide = 0.776471,0.211765,0.192157
NormalMix = 0.08
#endpreset

#preset ForTogliattiDoubleA60
FOV = 0.57514
Eye = -4.83676,-0.758847,6.7127
Target = -2.95617,-0.439893,4.00946
Up = 0.547976,0.0954078,0.831036
FocalPlane = 8.27535
Aperture = 0.17442
InFocusAWidth = 0.10288
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 0.8
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 2
Bloom = false
BloomIntensity = 0.05
BloomPow = 2.0225
BloomTaps = 19
Detail = -4
RefineSteps = 8
FudgeFactor = 0.77273
MaxRaySteps = 2000
MaxDistance = 20
Dither = 0.74227
NormalBackStep = 2
DetailAO = -3
coneApertureAO = 0.85484
maxIterAO = 10
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.2745
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.0666667,0.0352941,0.0313725
ReflectionsNumber = 2 Locked
SpotGlow = false
SpotLight = 1,1,1,10
LightPos = -6,-5,4.5
LightSize = 0.06
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.258824,0.560784,0.188235
OrbitStrength = 0.83117
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 1.19565
CycleColors = false
Cycles = 1.1
EnableFloor = false Locked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.133333,0.227451,0.160784
HF_Fallof = 1.92266
HF_Const = 0.003
HF_Intensity = 0.33333
HF_Dir = 0,0,1
HF_Offset = -2.4248
HF_Color = 0.54902,0.623529,0.737255,0.08697
HF_Scatter = 5
HF_Anisotropy = 0.709804,0.764706,0.807843
HF_FogIter = 8
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 20.8335
LevelSet = 0
IntThick = 0.005
RotVector = 0,0,1
RotAngle = -18.396
WAngle = 60
CutByPlane = false Locked
CutBySphere = false Locked
SphereCutRad = 3.54352
GFactor = 1
Mu = -0.77082
Lambda = 3
PSide = 0.580392,0.580392,0.580392
NSide = 0.776471,0.211765,0.192157
NormalMix = 0.1
#endpreset

#preset For_Chmutov8
FOV = 0.22764
Eye = -2.83157,2.00868,1.7953
Target = -0.0277262,0.00421669,-0.047598
Up = -0.346787,0.227607,0.909908
FocalPlane = 3.7
Aperture = 0.065
InFocusAWidth = 0.11429
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 4
FudgeFactor = 0.74699
MaxRaySteps = 1027
MaxDistance = 100
Dither = 0.86598
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.43548
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0.81928
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0.08696
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.027451,0.027451,0.0196078
ReflectionsNumber = 2 Locked
SpotGlow = false
SpotLight = 1,1,1,3
LightPos = -3.3334,4.6236,3.9784
LightSize = 0.0099
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 1.19565
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 3.485
HF_Const = 0.01042
HF_Intensity = 0.19753
HF_Dir = 0,0,1
HF_Offset = -0.8434
HF_Color = 0.478431,0.580392,0.737255,0
HF_Scatter = 34
HF_Anisotropy = 0.639216,0.654902,0.737255
HF_FogIter = 8
HF_CastShadow = true
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 2
LevelSet = -0.16326
IntThick = 0.005
RotVector = 0,0,1
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 2.31641
GFactor = 0
Mu = 1
Lambda = 3
PSide = 0.75,0.75,0.75
NSide = 1,0,0
NormalMix = 0.2
#endpreset


#preset ESCUDERO9
FOV = 0.2439
Eye = 1.16746,0.964696,6.49182
Target = -0.701973,-0.233414,-2.65052
Up = -0.105787,0.0210132,0.994167
FocalPlane = 5.2
Aperture = 0.04
InFocusAWidth = 0.04286
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.25
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.75
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 1
MaxRaySteps = 1027
MaxDistance = 100
Dither = 0.86598
NormalBackStep = 2
DetailAO = -2.5
coneApertureAO = 0.82258
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.0431373,0.0431373,0.0313725
ReflectionsNumber = 1 Locked
SpotGlow = false
SpotLight = 1,1,1,5
LightPos = -0.1076,-1.3978,7.4194
LightSize = 0.02
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.64935
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.5534
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.21568
BackgroundColor = 0.384314,0.501961,0.6
GradientBackground = 0
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 1.11149
HF_Const = 0.005
HF_Intensity = 0.09877
HF_Dir = 0,0,1
HF_Offset = 0.3614
HF_Color = 0.286275,0.517647,0.737255,0.43479
HF_Scatter = 0
HF_Anisotropy = 0.282353,0.235294,0.156863
HF_FogIter = 4
HF_CastShadow = false
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 50
LevelSet = 0
IntThick = 0.005
RotVector = 0,0,1
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 5.27166
GFactor = 0
Mu = 1.6666
Lambda = 3
PSide = 0.670588,0.670588,0.670588
NSide = 0.745098,0.180392,0.160784
NormalMix = 0.11702
#endpreset


#preset ForCmutovn
FOV = 0.42276
Eye = 1.03115,1.74477,1.30158
Target = -0.695665,-1.10393,-0.742533
Up = 0,0,1
FocalPlane = 1.86163
Aperture = 0.0209
InFocusAWidth = 0.12456
ApertureNbrSides = 2
ApertureRot = 0
ApStarShaped = false
Gamma = 2.2
ToneMapping = 2
Exposure = 1
Brightness = 1
Contrast = 1.1
Saturation = 1
GaussianWeight = 1
AntiAliasScale = 1.5
Bloom = false
BloomIntensity = 0.1
BloomPow = 0.9722
BloomTaps = 15
Detail = -5
RefineSteps = 2
FudgeFactor = 0.74699
MaxRaySteps = 1027
MaxDistance = 100
Dither = 0.86598
NormalBackStep = 2
DetailAO = -4
coneApertureAO = 0.73993
maxIterAO = 15
AO_ambient = 1
AO_camlight = 0
AO_pointlight = 0
AoCorrect = 0
Specular = 0.13726
SpecularExp = 368.055
CamLight = 1,1,1,0
AmbiantLight = 1,1,1,2
Glow = 1,1,1,0
GlowMax = 20
Reflection = 0.0784314,0.0784314,0.0627451
ReflectionsNumber = 0 Locked
SpotGlow = false
SpotLight = 1,1,1,4
LightPos = 3.1578,3.3552,6.8422
LightSize = 0.04487
LightFallOff = 0
LightGlowRad = 0.5769
LightGlowExp = 1.519
HardShadow = 1 Locked
ShadowSoft = 0
BaseColor = 0.447059,0.792157,0.556863
OrbitStrength = 0.63636
X = 0.5,0.6,0.6,0.7
Y = 1,0.6,0,0.4
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.12
BackgroundColor = 0,0,0
GradientBackground = 0
CycleColors = false
Cycles = 1.1
EnableFloor = false
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 0.313725,0.529412,0.376471
HF_Fallof = 1.9519
HF_Const = 0
HF_Intensity = 0.06507
HF_Dir = 0,0,1
HF_Offset = 0.6802
HF_Color = 0.478431,0.580392,0.737255,0.42858
HF_Scatter = 0
HF_Anisotropy = 0.352941,0.356863,0.407843
HF_FogIter = 1
HF_CastShadow = false
CloudScale = 1
CloudFlatness = 0
CloudTops = 1
CloudBase = -1
CloudDensity = 1
CloudRoughness = 1
CloudContrast = 1
CloudColor = 0.65,0.68,0.7
SunLightColor = 0.7,0.5,0.3
param1 = 1
param2 = 20.238
LevelSet = 0
IntThick = 0.005
RotVector = 0,0,1
RotAngle = 0
WAngle = 0
CutByPlane = false Locked
CutBySphere = true Locked
SphereCutRad = 1.09713
GFactor = 0
Mu = 1
Lambda = 1.3
PSide = 0.75,0.75,0.75
NSide = 1,0,0
NormalMix = 0.2
#endpreset



