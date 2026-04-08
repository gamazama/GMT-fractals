#donotrun

#buffer RGBA32F
#buffershader "BufferShader-VDB.frag"

#camera 3D

#vertex

uniform vec2 pixelSize;

varying vec2 viewCoord;
varying vec2 texCoord;
varying vec2 pixelScale;

void main(void) {
	// 4 vertices, one for each corner of the tile: (-1,-1), (-1,1), (1,1), (1,-1)
	gl_Position = gl_Vertex;
	// we convert the vertex position from [-1,1] to [0,1] for the texture coordinate of the tile
	texCoord = gl_Vertex.xy*.5+.5;
	// the projection matrix is used for scaling and translating view coordinates for tile rendering, scaled by the height so we use pixelSize.yy
	viewCoord = pixelSize.yy * (gl_ProjectionMatrix*gl_Vertex).xy / pixelSize;
	pixelScale = pixelSize.yy * vec2(gl_ProjectionMatrix[0][0], gl_ProjectionMatrix[1][1]) * 2.; // times 2 because we go from -1 to 1
}
#endvertex

#include "Utils-VDB.frag"

#group Camera
uniform float FOV; slider[0,0.4,2.0] NotLockable
uniform vec3 Eye; slider[(-50,-50,-50),(0,0,-10),(50,50,50)] NotLockable
uniform vec3 Target; slider[(-50,-50,-50),(0,0,0),(50,50,50)] NotLockable
uniform vec3 Up; slider[(0,0,0),(0,1,0),(0,0,0)] NotLockable
uniform float FocalPlane; slider[0,1,20]
uniform float Aperture; slider[0,0.0,1.]
uniform float ApertureRatio; slider[.2,1.,5.]
uniform float ApertureRoundness; slider[0.1,0.5,1.]
uniform int Blades; slider[2,5,12]
uniform float BladeRotation; slider[0,0,1]
uniform float BloomStrength; slider[0.0,0.0,1.0]
uniform float BloomRadius; slider[0.0,.2,1.0]
#group Post
uniform float Gamma; slider[0.0,2.2,5.0]
uniform float Exposure; slider[0.0,1.0,3.0]
#group Rendering
uniform int SamplesPerFrame; slider[1,1,32]

varying vec2 viewCoord;
varying vec2 texCoord;
varying vec2 pixelScale;

#ifdef providesInit
void init();
#else
void init() {}
#endif

int cameraSample = 0;

// implement this;
vec3 color(vec3 pos, vec3 direction);

float discAreaCDF(float x) {
    return x < 1.0 ? 0.5 * (x * sqrt(1.0 - x * x) + asin(x)) : PI/4.0 + (x-1.0) * 0.001;
}

float discAreaInverseCDF(float y) {
    const float a = -0.393, b = -0.12, c = 0.28, d = -0.36, k = -0.26;
    
    float px = 2.0 * asin(y*(PI*0.5+y*y*(a+y*y*(b+y*y*(c+y*y*(d+y*y*k))))))/PI;
    float py = discAreaCDF(px) - y;
    float cx = px - 0.01;
    float cy = discAreaCDF(cx) - y;
	for (int i = 0; i < 2 && cy != 0 && py != cy; i++) {
		float dx = (cx - px) / (py/cy - 1.0);
		px = cx;
		py = cy;
		cx += dx;
		cy = discAreaCDF(cx) - y;
	}
	if (cy != 0 && py != cy) cx += (cx - px) / (py/cy - 1.0);
    return cx;
}

vec2 apertureSample(float r1, float r2) {
	
	float ap = ApertureRoundness;
    
    int b = int(floor(r1 * float(Blades)));
    r1 = fract(r1 * float(Blades));
    
    float theta = 2.0 * PI / float(Blades);
    float ct = ap * cos(theta * 0.5);
    float st = ap * sin(theta * 0.5);
    
    float theta2 = 2.0 * asin(st);
    float segmentArea = (theta2 - sin(theta2)) * 0.5;
    float triArea = ct * st;
    
    float t = triArea / (triArea + segmentArea);
    
    vec2 p;
    
    if (r2 < t)
    {
        r2 /= t;
        float sr2 = sqrt(r2);
        p = sr2 * vec2((2.0 * r1 - 1.0) * st, ct);
    }
    else
    {
        r2 = (r2 - t) / (1.0 - t);
        float hBase = sqrt(1.0 - st * st);
        float rMin = discAreaCDF(hBase);
        float rMax = discAreaCDF(1.0);
        float h = discAreaInverseCDF(r2 * (rMax-rMin) + rMin);
        p = vec2((2.0 * r1 - 1.0) * sqrt(1.0 - h * h), h - hBase + ct);
    }
    
	float sqAp = sqrt(ApertureRatio);
	vec2 r = vec2(1./sqAp, sqAp);
	r *= Aperture / (ap * max(r.x, r.y));
	
    float a = float(b) * theta + BladeRotation;
    float c = cos(a);
    float s = sin(a);
    return (mat2(c, -s, s, c) * p) * r;
}

void thinLensRefract(inout vec3 pos, inout vec3 dir, float focalDist) {
	vec3 fDir = dir/dir.z;
	pos -= pos.z * fDir;
    dir = normalize(fDir * focalDist-pos);
}

void main() {
	
	init();
	
	mat3 cam2world;
	{
		vec3 d = normalize(Target-Eye);
		vec3 r = normalize(cross(d, Up));
		vec3 u = cross(r, d);
		cam2world = mat3(r, u, d);
	}
	
	
	float sensorDist = 1.;
	float sensorSize = sensorDist * FOV;
	float lensFocalDist = 1./(1./sensorDist + 1./FocalPlane);
	
	vec3 c = vec3(0.);
	for(cameraSample = 0; cameraSample < SamplesPerFrame; cameraSample++) {
	
		prngSample = subframe * SamplesPerFrame + cameraSample + pixelHash;
		
		vec2 jitteredCoord = viewCoord + pixelScale*(vec2(prng(PRNG_AA_U), prng(PRNG_AA_V))-.5);
		if(random() < BloomStrength) {
			// normal distribution of the bloom, following https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
			float a = random() * TWO_PI;
			jitteredCoord += BloomRadius * vec2(cos(a), sin(a)) * sqrt(-2. * log(1.0 - random() * 0.99)) * cos(TWO_PI * random());
		}

		float r1 = prng(PRNG_DOF_U);
		float r2 = prng(PRNG_DOF_V);
		vec3 rayPos = vec3(apertureSample(r1, r2), 0);
		vec3 rayDir = normalize(rayPos + vec3(jitteredCoord * sensorSize, sensorDist));
		thinLensRefract(rayPos, rayDir, lensFocalDist);
		c += color(Eye + cam2world * rayPos, cam2world * rayDir);
	}
	c /= float(SamplesPerFrame);

	// Accumulate
	gl_FragColor = texture2D(backbuffer, texCoord);
	gl_FragColor.a++;
	gl_FragColor.rgb = mix(gl_FragColor.rgb, c, 1./gl_FragColor.a);
}
