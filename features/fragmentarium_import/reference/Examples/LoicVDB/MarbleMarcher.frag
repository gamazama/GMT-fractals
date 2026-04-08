#include "Background-VDB.frag"
#include "DE-Raytracer-VDB.frag"
#include "MM-DE.frag"

float DE(vec3 pos) {
	return MM_DE(pos);
}

#preset Default
Precision = 4
LightDirection = 0.826487608,0.562862426,-0.01020408
FracScale = 1.9073
FracAng1 = 2.736
FracAng2 = -1.16
FracShift = -3.508,-3.593,3.295
FracCol = -0.34, 0.12, -0.08
FOV = 0.3
Eye = 15.6722137,7.80950098,-16.2439805
Target = 9.01074264,4.57260511,-9.5248058
Up = -0.154114645,0.941207943,0.300626484
FocalPlane = 19.601329
Aperture = 0.2
BaseColor = 0,0,0
OrbitStrength = 0.333333333
X = 1,0,0,1
Y = 0,1,0,1
Z = 0,0,1,1
#endpreset
