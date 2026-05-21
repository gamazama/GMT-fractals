#donotrun

#include "Color-Management.frag"
#include "Utils-VDB.frag"

#group Fractal
uniform float FracScale; slider[1,1.8,3]
uniform float FracAng1; slider[-3.14159265358979323846264,-.12,3.14159265358979323846264]
uniform float FracAng2; slider[-3.14159265358979323846264,.5,3.14159265358979323846264]
uniform vec3 FracShift; slider[(-12,-12,-12),(-2.12,-2.75,.49),(12,12,12)]
uniform int FracIter; slider[1,16,32]
uniform vec3 FracAnimation; slider[(-10,-10,-10),(0,0,0),(10,10,10)]
uniform float FracMotionBlur; slider[0,0,1]
#group Coloring
uniform vec3 FracCol; slider[(-2,-2,-2),(.42,.38,.19),(2,2,2)]
uniform float FracColGamma; slider[1,2.2,4]

float animBlur = random()-.5;
float animFracAng1 = FracAng1 + FracAnimation.x * sin((time + FracMotionBlur*animBlur) * 60. * .015);
float animFracAng2 = FracAng2 + FracAnimation.y * sin((time + FracMotionBlur*animBlur) * 60. * .015);
vec3 animFracShift = FracShift + vec3(0, FracAnimation.z * sin((time + FracMotionBlur*animBlur) * 60. * .015), 0);

float de_box(vec3 p, vec3 s) {
	vec3 a = abs(p.xyz) - s;
	return (min(max(max(a.x, a.y), a.z), 0.) + length(max(a, 0.0)));
}

float MM_DE(vec3 pos) {
	vec2 a1 = vec2(sin(animFracAng1), cos(animFracAng1));
	vec2 a2 = vec2(sin(animFracAng2), cos(animFracAng2));
	mat2 rmZ = mat2(a1.y, a1.x, -a1.x, a1.y);
	mat2 rmX = mat2(a2.y, a2.x, -a2.x, a2.y);
	orbitTrap = vec4(0);
	vec4 p = vec4(pos, 1);
	const vec2 mp = vec2(-1,1);
	for (int i = 0; i < FracIter; i++) {
		p.xyz = abs(p.xyz);
		p.xy *= rmZ;
		p.xy += min(p.x - p.y, 0.0)*mp;
		p.xz += min(p.x - p.z, 0.0)*mp;
		p.yz += min(p.y - p.z, 0.0)*mp;
		p.yz *= rmX;
		p *= FracScale;
		p.xyz += animFracShift;
		orbitTrap.xyz = max(orbitTrap.xyz, p.xyz*FracCol);
	}
	orbitTrap = pow(orbitTrap, vec4(FracColGamma));
	return de_box(p.xyz, vec3(6.))/p.w;
}

#preset JumpTheCrater
FracScale = 1.8
FracAng1 = -0.119999886
FracAng2 = 0.5
FracShift = -2.12, -2.75, 0.49
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset TooManyTrees
FracScale = 1.9073
FracAng1 = 2.7363713
FracAng2 = -1.16
FracShift = -3.508, -3.593, 3.295
FracCol = -0.34, 0.12, -0.08
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset HoleInOne
FracScale = 2.02
FracAng1 = -1.57
FracAng2 = 1.6200001
FracShift = -3.31, 6.19, 1.53
FracCol = 0.12, -0.09, -0.09
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset AroundTheWorld
FracScale = 1.65
FracAng1 = 0.37000012
FracAng2 = -1.023185
FracShift = -1.41, -0.22, -0.77
FracCol = 0.14, -1.71, 0.31
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset TheHillsAreAlive
FracScale = 1.77
FracAng1 = -0.22000003
FracAng2 = -0.66318536
FracShift = -2.08, -1.42, -1.93
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.0, 0.06, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset BewareOfBumps
FracScale = 1.66
FracAng1 = 1.5199997
FracAng2 = 0.19000006
FracShift = -3.83, -1.94, -1.09
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset MountainClimbing
FracScale = 1.58
FracAng1 = -1.45
FracAng2 = -2.3331854
FracShift = -1.55, -0.13, -2.52
FracCol = -1.17, -0.4, -1.0
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset TheCatwalk
FracScale = 1.87
FracAng1 = -3.12
FracAng2 = 0.01999998
FracShift = -3.57, 0.129, 2.95
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.0, 0.0, 0.05
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset MindTheGap
FracScale = 1.81
FracAng1 = 1.4431851
FracAng2 = -2.99
FracShift = -2.905, 0.765, -4.165
FracCol = 0.16, 0.38, 0.15
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset DontGetCrushed
FracScale = 1.93
FracAng1 = 1.34637
FracAng2 = 1.5800002
FracShift = -2.31, 1.123, 1.56
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.1, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset TheSponge
FracScale = 1.88
FracAng1 = 1.5199997
FracAng2 = -1.3731854
FracShift = -4.54, -1.26, 0.1
FracCol = -1.0, 0.3, -0.43
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset RideTheGecko
FracScale = 1.6
FracAng1 = -2.5131857
FracAng2 = -2.3531854
FracShift = -2.0, -0.41, -1.43
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.02, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset BuildUpSpeed
FracScale = 2.08
FracAng1 = 1.4931853
FracAng2 = -3.1231854
FracShift = -7.43, 5.96, -6.23
FracCol = 0.16, 0.38, 0.15
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset AroundTheCitadel
FracScale = 2.0773
FracAng1 = 2.9063714
FracAng2 = -1.34
FracShift = -1.238, -1.533, 1.085
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset PlanetCrusher
FracScale = 1.78
FracAng1 = -0.099999905
FracAng2 = -3.0031855
FracShift = -1.47, 1.7, -0.4
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.0, 0.08, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset TopOfTheCitadel
FracScale = 2.0773
FracAng1 = 2.9063714
FracAng2 = -1.34
FracShift = -1.238, -1.533, 1.085
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset BuildingBridges
FracScale = 1.8093
FracAng1 = 3.1181853
FracAng2 = 3.0737078
FracShift = -1.0939, -0.43495, -3.1113
FracCol = -0.61, -0.92, 0.33
FracAnimation = 0.0, 0.0, 0.06
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset PylonPalace
FracScale = 1.95
FracAng1 = 1.5707963
FracAng2 = 0.0
FracShift = -6.75, -3.0, 0.0
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset TheCrownJewels
FracScale = 1.91
FracAng1 = 0.059999943
FracAng2 = -0.76
FracShift = -3.44, -0.69, -1.14
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.0, 0.05, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset Expressways
FracScale = 1.8986
FracAng1 = -0.4166
FracAng2 = 0.006829977
FracShift = -2.513, -5.4067, -2.51
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset BunnyHops
FracScale = 2.03413
FracAng1 = 1.688
FracAng2 = -1.57798
FracShift = -4.803822, -4.1, -1.39063
FracCol = -0.95, -0.16, 0.14
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset AsteroidField
FracScale = 1.6516888
FracAng1 = 0.026083946
FracAng2 = -0.7996323
FracShift = -3.85863, -5.13741, -0.918303
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset LilyPads
FracScale = 1.77746
FracAng1 = -1.6600058
FracAng2 = 0.070730686
FracShift = -4.6867, -0.84376, 1.98158
FracCol = -0.35, 1.5, 0.48
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset

#preset FatalFissures
FracScale = 2.13
FracAng1 = -1.77
FracAng2 = -1.62
FracShift = -4.99, -3.05, -4.48
FracCol = 0.42, 0.38, 0.19
FracAnimation = 0.0, 0.0, 0.0
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset
