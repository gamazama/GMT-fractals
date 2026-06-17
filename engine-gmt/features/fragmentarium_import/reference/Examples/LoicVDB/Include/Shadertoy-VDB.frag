#donotrun
#buffer RGBA32F
#buffershader "Shadertoy-VDB-BufferShader.frag"
#vertex

uniform vec2 pixelSize;
uniform float time;

#group Camera
uniform vec2 Center; slider[(0,0),(0,0),(1,1)] NotLockable
uniform float Zoom; slider[0,2,100] NotLockable
uniform bool MouseClickedIn; checkbox[false]

varying float iTime;
varying vec3 iResolution;
varying vec4 iMouse;

varying vec2 fragShift;

void main(void) {
	iTime = time;
	iResolution = abs(vec3(1./(pixelSize*vec2(gl_ProjectionMatrix[0][0],gl_ProjectionMatrix[1][1])), 1.));
	iMouse = vec4(vec2(1,MouseClickedIn?1:-1).xxyy*((1.-Center.xyxy)*iResolution.xyxy+.5));
	
	fragShift = ((gl_ProjectionMatrix * vec4(-1, -1, 0, 1)).xy*.5+.5)*iResolution.xy;
	
	gl_Position = gl_Vertex;
}
#endvertex

#extension GL_EXT_gpu_shader4 : enable
#extension GL_ARB_gpu_shader5 : enable
#extension GL_ARB_shader_bit_encoding : enable

uniform sampler2D backbuffer;
uniform vec2 pixelSize;
uniform int subframe;

varying float iTime;
varying vec3 iResolution;
varying vec4 iMouse;
#define iFrame subframe

varying vec2 fragShift;

#define Texture 1
#define Cubemap 2

#group Textures/Cubemaps

#if iChannel0==Texture
#undef iChannel0
uniform sampler2D iChannel0; file[texture2.jpg]
#endif
#if iChannel1==Texture
#undef iChannel1
uniform sampler2D iChannel1; file[texture2.jpg]
#endif
#if iChannel2==Texture
#undef iChannel2
uniform sampler2D iChannel2; file[texture2.jpg]
#endif
#if iChannel3==Texture
#undef iChannel3
uniform sampler2D iChannel3; file[texture2.jpg]
#endif

#if iChannel0==Cubemap
#undef iChannel0
uniform samplerCube iChannel0; file[cubemap.png]
#endif
#if iChannel1==Cubemap
#undef iChannel1
uniform samplerCube iChannel1; file[cubemap.png]
#endif
#if iChannel2==Cubemap
#undef iChannel2
uniform samplerCube iChannel2; file[cubemap.png]
#endif
#if iChannel3==Cubemap
#undef iChannel3
uniform samplerCube iChannel3; file[cubemap.png]
#endif

#group Post
uniform float Exposure; slider[0.0,1.0,30.0]
uniform float Gamma; slider[0.0,2.2,5.0];
uniform bool Tonemapping; checkbox[true];
uniform bool DivideByAlpha; checkbox[true]

void mainImage( out vec4 fragColor, in vec2 fragCoord );

void main() {
	mainImage(gl_FragColor, gl_FragCoord.xy+fragShift);
}

vec4 backbufferPixel() {
	return texture2D(backbuffer, gl_FragCoord.xy*pixelSize);
}
