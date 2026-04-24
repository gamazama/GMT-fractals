#info fold and cut regular polyhedra Distance Estimator (knighty 2012)
#info Experimenting with rotating facets.

#include "MathUtils.frag"
#define providesInit
#include "DE-Raytracer.frag"

#group polyhedra

//#define PI 3.14159
// Symmetry group type.
uniform int Type;  slider[3,5,5]

// U 'barycentric' coordinate for the 'principal' node
uniform float U; slider[0,1,1]

// V
uniform float V; slider[0,0,1]

// W
uniform float W; slider[0,0,1]

// Angle for stellation
uniform float Angle; slider[-1,0,1]

vec3 na,nb,nc,p,pab,pbc,pca,nab,nbc,nca;
float dab,dbc,dca;
void init() {
	na=vec3(1.,0.,0.);
	nb=vec3(0.,1.,0.);
	float cospin=cos(PI/float(Type)), scospin=sqrt(0.75-cospin*cospin);
	nc=vec3(-0.5,-cospin,scospin);
	pab=vec3(0.,0.,1.);
	pbc=normalize(vec3(scospin,0.,0.5));
	pca=normalize(vec3(0.,scospin,cospin));
	p=normalize((U*pab+V*pbc+W*pca));
	nab=normalize(cross(cross(pab,p),pab));
	nbc=normalize(cross(cross(pbc,p),pbc));
	nca=normalize(cross(cross(pca,p),pca));
}

float DE(vec3 pos) {
	for(int i=0;i<Type;i++){
		pos.xy=abs(pos.xy);
		float t=-2.*min(0.,dot(pos,nc));
		pos+=t*nc;
	}
	float sina=sin(Angle), cosa=cos(Angle);
	vec3 n=pab*cosa+nab*sina;
	float d=dot(pos,n)-dot(n,p);
	n=pbc*cosa+nbc*sina;
	d=max(d,dot(pos,n)-dot(n,p));
	n=pca*cosa+nca*sina;
	d=max(d,dot(pos,n)-dot(n,p));
	return min(d,length(pos-p)-0.1);
}