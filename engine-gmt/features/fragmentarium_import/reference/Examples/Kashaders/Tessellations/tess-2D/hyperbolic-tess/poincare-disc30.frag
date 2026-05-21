#version 120
#include "my_2D.frag"
#info hyperbolic tesselations by knighty
#group hyperbolic Tesselations
//Licence:
// Free but no warranty

//Description:
// Hyperbolic tesselations on the Poincare disc using linear and "circular" foldings

//Todo: Other (möbius & other) transformations
//          Using textures to get Escher like pictures
//          ...etc.

//Some references:
//         Jos Leys, « "Ringworld" » — Images des Mathématiques, CNRS, 2010. En ligne, URL : http://images.math.cnrs.fr/Ringworld.html
//         Jos Leys, « Une chambre hyperbolique » — Images des Mathématiques, CNRS, 2008. En ligne, URL : http://images.math.cnrs.fr/Une-chambre-hyperbolique.html
//         D.E. Joyce. http://aleph0.clarku.edu/~djoyce/poincare/index.html

varying float sx;//center of folding circle (its y coord is 0.0)
varying float sr;//radius of folding circle
varying vec2 nfp;//normal vector of 2nd fold line
uniform int maxiter; slider[0,20,40]

#vertex
#define PI 3.14159
uniform int n; slider[3,5,20]
uniform int p; slider[3,5,20]
varying float sx;
varying float sr;
varying vec2 nfp;
void init() {
	float a=PI/float(n);
	float b=PI/float(p);
	//we should have: 1/n+1/p<1/2
	//otherwise the result is undefined
	if(a+b>=0.5*PI) b=0.5*PI-a-0.01;
	float ca=cos(a), sa=sin(a);
	float sb=sin(b);
	float c1=cos(a+b);
	float s=c1/sqrt(1.-sa*sa-sb*sb);
	sx=(s*s+1.)/(2.*s*ca);
	sr=sqrt(sx*sx-1.);
	nfp=vec2(sa,-ca);
}
#endvertex

uniform vec2 mba; slider[(-1,-1),(1,0),(1,1)]
uniform vec2 mbb; slider[(-1,-1),(0,0),(1,1)]
uniform int checker0;slider[0,1,1]
uniform int checker1;slider[0,1,1]
uniform int checker2;slider[0,1,1]

void init() {}
vec2 mbtpc(vec2 z){//Möbius Transform Peserving (unit) Circle
	vec2 zn=vec2(z.x*mba.x-z.y*mba.y+mbb.x,
					z.x*mba.y+z.y*mba.x+mbb.y);
	vec2 zd=vec2(z.x*mbb.x+z.y*mbb.y+mba.x,
					-z.x*mbb.y+z.y*mbb.x-mba.y);
	float idn2=1./dot(zd,zd);
	z=idn2*vec2(dot(zn,zd),dot(zn,zd.yx*vec2(-1.,1.)));
	return z;
}
vec3 getColor2D(vec2 z) {
	//if(dot(z,z)>1.) return 0.;//if you don't want to see the patternes outside the unit disc
	z=mbtpc(z);
	vec2 az=z+1.;
	vec3 fc=vec3(0.);//captures the number of folds performed
	for(int i=0; i<maxiter && az!=z; i++){
		az=z;
		//first fold
		z.y=abs(z.y);fc.x+=float(az.y!=z.y);
		//second fold
		float t=2.*min(0.,dot(z,nfp));fc.y+=float(t<0.);
		z-=t*nfp;
		//third fold
		z.x-=sx;
		float r2=dot(z,z);
		float k=max(sr*sr/r2,1.);fc.z+=float(k!=1.);
		z*=k;
		z.x+=sx;
	}
	float r=abs(length(vec2(z.x-sx,z.y))-sr);
	r=pow(r,0.25);
	return (0.5*mod(float(checker0)*fc.x+float(checker1)*fc.y+float(checker2)*fc.z,2.)+0.5)*vec3(r);//*vec3(fc%2) ;
}
