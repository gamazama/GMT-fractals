#version 120 
#include "MathUtils.frag"
#define providesInit 
//#include "2D.frag"
#include "Progressive2D.frag"
//#include "MathUtils.frag" 
#info Cut and project aperiodic tiling 

#group Plotter2D 
uniform float Width; slider[0,1,10]
uniform float DRadius; slider[0,0.71,2]
//uniform float Gamma; slider[1,1,3]
uniform float AxisDetail; slider[1,1,10]
uniform vec3 CurveColor; color[0.0,0.0,0.0]
uniform vec3 BackgroundColor; color[1.0,1.0,1.0]
uniform float time;

#group CutNproject 
uniform float CP_tans_u2dir; slider[0,0,1]
uniform float CP_tans_v2dir; slider[0,0,1]
uniform float CP_tans_adir;   slider[0,0,1]

//the two vectors defining the cut and project plane
const float udir[5] = float[5](0.632456, 0.19544, -0.511667, -0.511667, 0.19544);
const float vdir[5] = float[5](0, 0.601501, 0.371748, -0.371748, -0.601501);
//the 3 directions perpendicular to the cut and project plane
const float u2dir[5] = float[5](0.632456, -0.511667, 0.19544, 0.19544, -0.511667);
const float v2dir[5] = float[5](0, 0.371748, -0.601501, 0.601501, -0.371748);
const float adir[5] = float[5](0.447214, 0.447214, 0.447214, 0.447214, 0.447214);
//Cut and project plane origin
float CPO[5];

const vec2 vvv = vec2(0.);
//results of tiling search
struct Data{
	float dist;
	ivec2 sides;
	vec2 posInTile;
};

//
float theData_dist;
ivec2 theData_sides;
vec2  theData_posInTile;

void init(){
	for(int i=0; i<5; i++)
		CPO[i] = CP_tans_u2dir * u2dir[i] + CP_tans_v2dir * v2dir[i] + CP_tans_adir * adir[i]; 
}

//Gives the coordinates of the point (x,y) on the "cutting" plane into the 5D space
void P2E5(in vec2 z, inout float[5] p){
	//float p[5];
	for(int i=0; i<5; i++)
		p[i] = CPO[i] + z.x * udir[i] + z.y * vdir[i];
	//return p;
}

//given a point p, return the nearest vertex in the lattice and the offset.
void getRoundAndOffest(in float[5] p, out float[5] ip, out float[5] ofs){
	for(int i=0; i<5; i++){
		ip[i] = floor(p[i]+.5);
		ofs[i] = p[i] - ip[i];
	}
}

//given a vector Ofs, return the vector of 1 when component >0 and -1 otherwise 
void getOfsDir(in float[5] ofs, inout float[5] dir){
	//float dir[5];
	for(int i=0; i<5; i++){
		//if(ofs[i]>0.) dir[i]=1.; else dir[i]=-1.;
		dir[i] = 2. * float(ofs[i] > 0.) - 1.;
	}
	//return dir;
}

//project the vector ofs onto the plane (udir,vdir)
vec2 projectOfs(float[5] ofs){
   //dot products
	vec2 pofs = vec2(0);
	for(int i=0; i<5; i++){
		pofs.x += ofs[i] * udir[i];
		pofs.y += ofs[i] * vdir[i];
	}
	return pofs;
}

//returns the coordinates of a in the basis (u,v)
vec2 PinUV(vec2 a, vec2 u, vec2 v){
	//get the coordinates of a in (u,v) basis
	//p = (u,v)^(-1) a ...where a,u and v are 2D column vectors
	//to rewrite in terms of product by inverse matrix of (u,v)
	vec2 p;
	float d = 1./(u.x*v.y - v.x*u.y);
	p.x = d * (v.y*a.x - v.x*a.y);
	p.y = d * (u.x*a.y - u.y*a.x);
   
	return p;//
}

//Distance from a to the parallelogramm defined
//by u and v. a is expressed in the (u,v) basis
float Dist22V2(vec2 a, vec2 u, vec2 v){
	//these should be precomputed
	float u2 = dot(u,u);
	float v2 = dot(v,v); 
	float uv = dot(u,v);
	float du = sqrt(u2 - uv*uv / v2);
	float dv = sqrt(v2 - uv*uv / u2);

	//Compute the distance.
	float p0 = abs(a.x-.5)-.5;
	float p1 = abs(a.y-.5)-.5;
	//return max(p0,p1);
	return max(p0*du,p1*dv);//
}

//Distance from a to the parallelogramm defined
//by u and v
float Dist22V(vec2 a, vec2 u, vec2 v){
	return Dist22V2( PinUV(a, u, v), u, v);
}

//Get the intersection of the cut plane with the dual of the current face
//The parameters of the current face (i,j) are in (u,v)
//Formally it solves a linear equations system... It should be rewritten in terms product by the inverse of the matrix (u,v)
vec2 intersectCutPlandWithFaceDual(vec2 u, vec2 v, vec2 lhs){
	float d = 1./(u.x*v.y - v.x*u.y);
	vec2 r;
	r.x = d * (v.y*lhs.x - v.x*lhs.y);
	r.y = d * (u.x*lhs.y - u.y*lhs.x);
	return r;
}


//Finds if p is inside a the tile defined by (i,j,ip)
//dir is not per se necessary it could be se to 1s
void section(int i, int j, float[5] p, float[5] ip, float[5] dir, float si, float sj){

	vec2 u, v;

	//check intersection with dual
	vec2 lhs;
	lhs.x = si*.5*dir[i] + ip[i] - CPO[i]; lhs.y = sj*.5*dir[j] + ip[j] - CPO[j];
	u[0]=udir[i]; u[1]=udir[j];
	v[0]=vdir[i]; v[1]=vdir[j];
	vec2 z = intersectCutPlandWithFaceDual(u, v, lhs);

	float[5]  ofs, q;
	P2E5(z, q);
	
	for(int k=0; k<5; k++){
		q[k] = floor(q[k]+.5);
		if(k==i || k==j) ofs[k]=p[k] - ip[k];
		else             ofs[k]=p[k] - q[k];
	}
	
	vec2 pofs = projectOfs(ofs);
	
	//get the face corresponding to the intersected dual
	u[0]=si*dir[i]*udir[i]; u[1]=si*dir[i]*vdir[i];
	v[0]=sj*dir[j]*udir[j]; v[1]=sj*dir[j]*vdir[j];
	
	vec2 pit = PinUV(pofs,u,v);
	float d   = Dist22V2(pit, u, v);
	theData_dist = d;
  theData_sides= ivec2(i,j);
  theData_posInTile = pit;
}

//Put it all together...
void DE(vec2 z){

	float[5] p; P2E5(z, p);
	
	float[5] ip, ofs;
	getRoundAndOffest(p,ip,ofs);

	float[5] dir; getOfsDir(ofs, dir);

#define THELOOP(dirx, diry) for(int i=0; i<4; i++)\
	{\
		for(int j=i+1; j<5; j++)\
		{\
			section(i,j,p,ip,dir,(dirx),(diry));\
			if(theData_dist < 0.) return ;\
		}\
	}\

	THELOOP( 1.,  1.)
	THELOOP(-1.,  1.)
	THELOOP( 1., -1.)
	THELOOP(-1., -1.)

	theData_dist = 0.;
  theData_sides= ivec2(0);
  theData_posInTile = vec2(0);
}

float getFaceSurf(int i, int j){
	vec2 u,v;
	u[0]=udir[i]; u[1]=vdir[i];
	v[0]=udir[j]; v[1]=vdir[j];
	return abs(u[0]*v[1]-u[1]*v[0]);
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

vec3 color(vec2 pos) {
	float pixsize=dFdx(pos.x);
	DE(pos);
	float v=coverageLine(abs(theData_dist), Width, pixsize);
	vec3 faceCol = vec3(getFaceSurf(theData_sides.x, theData_sides.y)*2.);
	vec3 linCol = pow(mix(pow(BackgroundColor,vec3(Gamma)),pow(CurveColor,vec3(Gamma)),v),vec3(1./Gamma));
	return linCol*faceCol;
}

#preset Default 
Center = 0,0
Zoom = 0.0102708
Width = 1
DRadius = 0.82802
AxisDetail = 1
CurveColor = 0,0,0
BackgroundColor = 1,1,1
CP_tans_u2dir = 0
CP_tans_v2dir = 0
CP_tans_adir = 0.66501
Gamma = 2.2
ToneMapping = 3
Exposure = 1
Brightness = 1
Contrast = 1
Saturation = 1
AARange = 1.45
AAExp = 1
GaussianAA = true
#endpreset
