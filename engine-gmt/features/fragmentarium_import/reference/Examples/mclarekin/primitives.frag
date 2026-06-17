// #version 130

// http://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
#define providesInit
#include "MathUtils.frag"
#include "DE-Raytracer.frag" 

uniform bool sphere; checkbox[false]
uniform bool cylinder; checkbox[false]
uniform bool torus; checkbox[false]

uniform bool box; checkbox[false]
uniform bool prism; checkbox[false]
uniform bool hexPr; checkbox[false]
uniform bool grid; checkbox[false]
// radius
uniform float rad; slider[0.0,1,12]
uniform float radT; slider[0.0,0.3,12]
// length
uniform float len; slider[0.00,2,12]
uniform float lenX; slider[0.00,2,12]
uniform float lenY; slider[0.00,2,12]
uniform float lenZ; slider[0.00,2,12]


uniform bool hexPr2; checkbox[false]

uniform bool Repeat; checkbox[false]
uniform bool Clamp; checkbox[false]
uniform vec3 repeat3d; slider[(0,0,0),(2,2,2),(12,12,12)]
uniform float clampd; slider[0.00,1,12]

// Pre_Rotation
uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)]
uniform float RotAngle; slider[0.00,0,180]

// 3 angle rotation
uniform vec3 Rotation; slider[(-180,-180,-180),(0,0,0),(180,180,180)]

//float DE(vec3 pos) {
	//return abs(length(abs(pos)+vec3(-1.0))-1.2);
mat3 rotA;
mat3 rotB;
void init() {
	rotA = rotationMatrix3(normalize(RotVector), RotAngle);
	rotB = rotationMatrixXYZ(Rotation);

}
float Sphere (vec3 pos)
	{return length(abs(pos))-rad;}

float Cylinder (vec3 pos)
	{ vec2 d = abs(vec2(length(pos.xy),pos.z)) - vec2(rad,len);
	return min(max(d.x,d.y),0.0) + length(max(d,0.0));}

float Torus (vec3 pos)
	{ vec2 q = vec2(length(pos.xy)-rad,pos.z);
 		return length(q)-radT;}

float Prism (vec3 pos)
	{vec3 q = abs(pos);
    return max(q.z-lenY,max(q.x*0.866025+pos.y*0.5,-pos.y)-lenX*0.5);}

float Box (vec3 pos)
	{vec3 q = abs(pos) - vec3(lenX,lenY,lenZ);
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);}

float HexPr (vec3 pos)
	{vec3 p = abs(pos);
	vec3 k = vec3(-0.8660254, 0.5, 0.57735); 
  p.xy -= 2.0*min(dot(k.xy, p.xy), 0.0) * k.xy;
	vec2 d = vec2(length(p.xy-vec2(clamp(p.x,-k.z*lenX,k.z*lenX), lenX)) * sign(p.y-lenX), p.z-lenY);
		return min(max(d.x,d.y),0.0) + length(max(d,0.0));}

float Grid (vec3 pos)
	{vec3 p = abs(pos);
	float xFloor = abs(p.x - lenX * floor(p.x / lenX + 0.5));
	float yFloor = abs(p.y - lenY * floor(p.y / lenY + 0.5));
	float gridXY = min(xFloor, yFloor);
	float grid = sqrt(gridXY * gridXY + p.z * p.z);
		return  (grid - radT);}
float DE( vec3 pos )
{
	if (Repeat) // pos.z is commented out, but can be included
	{
	  // pos.x = mod(pos.x+0.5*c.x,c.x)-0.5*c.x;
	  // pos.y = mod(pos.y+0.5*c.y,c.y)-0.5*c.y;
		//float size = fractal->transformCommon.offset2;
		pos.x = abs(pos.x - repeat3d.x * floor(pos.x / repeat3d.x + 0.5));
		pos.y = abs(pos.y - repeat3d.y * floor(pos.y / repeat3d.y + 0.5));
		//pos.z = abs(pos.z - repeat3d.z * floor(pos.z / repeat3d.z + 0.5));
	}
	if (Clamp) // clamped version repeat
	{ 
	   pos.x = pos.x-clampd*clamp(round(pos.x/clampd),-repeat3d.x,repeat3d.x);
	   pos.y = pos.y-clampd*clamp(round(pos.y/clampd),-repeat3d.y,repeat3d.y);
	  // pos.z = pos.z-clampd*clamp(round(pos.z/clampd),-repeat3d.z,repeat3d.z);
	}

	// rotate before shape
	pos *= 	rotA;

	if(sphere) return Sphere(pos);

  if(cylinder) return Cylinder(pos);

	if(torus) return Torus(pos);

	if(box) return Box(pos);

	if(prism ) return Prism(pos);

	if(hexPr) return HexPr(pos);

	if(grid) return Grid(pos);

}

#preset ggg
FOV = 0.4
Eye = 4.166667,9.821429,-11.309523
Target = 0.030143695,-0.45401698,-0.010357367
Up = 0,0.998968802,0.045401904
EquiRectangular = false
AutoFocus = false
FocalPlane = 1
Aperture = 0
Gamma = 2
ToneMapping = 4
Exposure = 1
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1
LumCoeff = 0.2125,0.7154,0.0721
Hue = 0
GaussianWeight = 1
AntiAliasScale = 2
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -2.3
DetailAO = -0.5
FudgeFactor = 1
MaxDistance = 1000
MaxRaySteps = 56
Dither = 0.5
NormalBackStep = 1 NotLocked
AO = 0,0,0,0.699999988
Specular = 0.4
SpecularExp = 16
SpecularMax = 10
SpotLight = 1,1,1,0.400000006
SpotLightDir = 0.1,0.1
CamLight = 1,1,1,1
CamLightMin = 0
Glow = 1,1,1,0
GlowMax = 20
Fog = 0
HardShadow = 0
ShadowSoft = 2
QualityShadows = false
Reflection = 0
DebugSun = false
BaseColor = 1,1,1
OrbitStrength = 0
X = 0.5,0.6,0.6,0.699999988
Y = 1,0.6,0,0.400000006
Z = 0.8,0.78,1,0.5
R = 0.4,0.7,1,0.119999997
BackgroundColor = 0.6,0.6,0.45
GradientBackground = 0.3
CycleColors = false
Cycles = 1.1
EnableFloor = false NotLocked
FloorNormal = 0,0,1
FloorHeight = 0
FloorColor = 1,1,1
sphere = false
cylinder = false
torus = false
box = true
prism = false
hexPr = false
grid = false
rad = 1
radT = 0.3
len = 2
lenX = 2
lenY = 2
lenZ = 2
hexPr2 = false
Repeat = false
Clamp = false
repeat3d = 2,2,2
clampd = 1
RotVector = 1,1,1
RotAngle = 0
Rotation = 0,0,0
#endpreset
