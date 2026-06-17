#donotrun
#vertex

varying vec2 coord;

void main(void) {
	gl_Position =  gl_Vertex;
	coord = (gl_ProjectionMatrix*gl_Vertex).xy;
}

#endvertex

#include "Color-Management.frag"
#include "Utils-VDB.frag"

#group Post
uniform float Gamma;
uniform float Exposure;

varying vec2 coord;
uniform sampler2D frontbuffer;


void main() {
    vec3 c = texture2D(frontbuffer, coord*.5+.5).rgb;
	
	// Exposure
	c *= Exposure;
	
	// Tonemapping
	c = acescg2linear * RRTAndODTFit(linear2acescg * c);
	
	// To sRGB
	c = linear2srgb(c);
	
	// Gamma
	c = pow(c, vec3(2.2/Gamma));	// we are already in sRGB, so we remove the default 2.2 gamma
	
	// Dithering to avoid banding
	c += (vec3(random(), random(), random()) - .5) / 255.;
	
	gl_FragColor = vec4(clamp(c, vec3(0.), vec3(1.)), 1.);
}
