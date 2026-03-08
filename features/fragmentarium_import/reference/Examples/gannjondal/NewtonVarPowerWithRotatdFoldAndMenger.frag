#info 3D Newton implementation for the polynomial q^n + JuliaC=0 with real JuliaC PLUS MB3D style 'Rotated Folding' (as a pretransform), PLUS an Menger iteration after Newton + fold has finished

//See the original thread at https://fractalforums.org/fractal-mathematics-and-new-theories/28/revisiting-the-3d-newton/1026
//Sample:  https://fractalforums.org/fractal-mathematics-and-new-theories/28/revisiting-the-3d-newton/1026/msg25046#msg25046
//Basic implementation by gannjondal

/** Background, and explanation:
  - Meaning of the identifiers in below explanations:   
    + z stands for the variable that is visible to the fractal program, and that is used for bailout check, calculation of the distance estimation etc etc   
    + q stands for the variable that is used for the calculation of the Newton method   
   
  - Explanation of the "trick".   
    It was necessary to keep the following conditions in mind:   
    + First of all: To get a useful 3D image it is necessary to define an 'inside', and an 'outside' region (keep in mind that a clean Newton fractal converges everywhere)
    + This flavor of Newton 3D fractal implementation has originally been implemented for MB3D. 
	  The common bailout control, and DE mechanisms of MB3D, (and also MB2) need a DIVERGENT iteration value (here z)    
    + It is of course necessary to have a variable (here q) that is used for the actual Newton iteration
    + In MB3D (and maybe also in MB2) it is not possible to keep another triplex value than z between the iterations.   
   
    Therefore it was necessary to have a z that diverges - AND it must be possible to always calculate q from z uniquely, and vice versa 
	(mathematically: There must be a one-to-one relation between q, and z).   
    Furthermore I decided that the area that converges to one specific value (below 'solution') is taken as 'outside'. The other areas are 'inside'.     
    Of course that way you see only the outer surface of the 'inside' area, but it turned out that with some tweaks it's possible to see ... more of the transition area.
   
    Below algorithm fullfills all above conditions - Each iteration looks like:   
    a)  Extract q[n] as q[n] = 1/z[n] + solution   
    b)  Run the Newton method calculation which provdes a new q[n+1]   
    c)  Calculate z[n+1] as z[n+1] = 1/(q[n+1]-solution), and hand it over to the fractal program   
   
    To have a classical Newton star one would need to skip the very first inversion.   
    But I decided to keep that first inversion -   
    It transforms the formula to a finite object - so to speak a Newton bulb.   
    And this object is of course much more handleable than the classical infinite star - in fact I see that as a benefit which has been introduced without any cost....   
**/

/** Parameters to manipulate the Newton calculation:
Power:   
   Default = 3   
   The power of the polynom   
    (x,y,z)^power - c = 0   
   to be solved   
  
Fac_Phi, Fac_Theta:   
   Default = 1 for both   
   With this params you can vary the radial angles of the potence when calculating the power of (x,y,z).   
   Hence it disturbs the power calculation, but in a very smooth way.   
   You even may try to set one of the params to 0.   
	
Vary_Inversion:
   Default = -1
   On a first view that looks similar like the Fake_Bailout_xyz params.
   But it's for y, and z axes only - and they are not equivalent to x here.
   Try values not too far from -1 (start with -0.75 ... -1.5)
  
Fake_Bailout_pre, Fake_Bailout_post:   
   Default = 1 / 1   
   ORIGINAL INTENTION:   
     In some hybrids it is necessary to increase the value of the bailout on the formula window to avoid unwanted cuts.   
     In this case you may set both Fake_Bailout_xyz to bailout/4 as a start value.   
	 It is especially amazing to use different values for both - try for instance Fake_Bailout_pre = 1, Fake_Bailout_post = -1
   MEANWHILE:   
     It turned out that changing this value can lead to completely different structures.   
     I don't have a simple suggestion - you may use samples that exist especially on ff.org   
   ATTENTION:   
     Changing the value of both params in parallel scales the complete object.   
     You may add a general scaling (when used in hybrids) to scale the object back.   
   Fake_Bailout_pre - used BEFORE the transformation   
   Fake_Bailout_post - used AFTER the transformation   
**/

#include "MathUtils.frag"
#include "DE-Raytracer.frag" 

#group NewtonVarPower
   //Power n for the equation q^n + JuliaC = 0
   uniform float Power; slider[-32,3,32]
   
   //Known solution of the polynomial (and origin of the implicite inversion)
   uniform vec3 Solution; slider[(-4,-4,-4),(1,0,0),(4,4,4)]
   //HINT:  Start with Solution = 1.0, Julia=true, JuliaC=(-1,0,0)
   //       Other params for Solution, and JuliaC are mainly useful if using this frag as pretransform
   
   //Core parameters to tweak the fractal
   //Factor to vary the phi angle of the power calculations
   uniform float Factor_Phi; slider[-20,1,20]
   //Factor to vary the theta angle of the power calculations
   uniform float Factor_Theta; slider[-20,1,20]
   //Vary the calculation of the absolute value of q BEFORE the Newton calc (HINT:  Try also negative values) 
   uniform float Fake_Bailout_pre; slider[-20,1,20]
   //Vary the calculation of the absolute value of q AFTER the Newton calc (HINT:  Try also negative values) 
   uniform float Fake_Bailout_post; slider[-20,1,20]
   //Vary the inversion of q (similar to Fake_Bailout, but affects only y, and z)
   uniform float Vary_Inversion; slider[-4,-1,0]
   
   //Core iteration controls - FOR NEWTON + FOLDING ONLY
   //Offset to avoid the division by zero, you usually don't need to change the value
   uniform float Offset; slider[1.0e-15,0.0001,1]
   //Usual bailout value (for |1/(q-solution)|). ATTENTION:  Needs to be changed for powers <> 3!
   uniform float Bailout; slider[0.001,4,1024]
   //Number of Newton iterations. HINT: Start with a value of 1 or 2 - here the Newton function is used as pretransform !!
   uniform int Iterations; slider[0,1,200]
   //Number of Newton iteration taken into account for color calculation
   uniform int ColorIterations; slider[0,3,200]
   
   //DE tweaks - Scale
   uniform float DEscale1; slider[0,1,2]
   //DE tweaks - Offset
   uniform float DEoffset1; slider[0,0,8]
   
   //Julia + c controls
   //HINT:  Start with Solution = 1.0, Julia=true, JuliaC=(-1,0,0)
   //       Other params for Solution, and JuliaC are mainly useful if using this frag as pretransform
   //Julia calculation?
   uniform bool Julia; checkbox[true]
   //C value for Julia calculation
   uniform vec3 JuliaC; slider[(-4,-4,-4),(-1,0,0),(4,4,4)]

#group RotationFolding
//Folding BEFORE the Newton method calculation
  uniform bool enablePreFolding; checkbox[false]
  //Angles for rotation around the 3 axes of the coordinate system
  uniform vec3 preAngleXYZ; slider[(-360,-360,-360),(0,0,0),(360,360,360)]
  // Folding value for the folding in Tglad style
  uniform float preFolding; slider[-10,1,10]

//Folding AFTER the Newton method calculation
  uniform bool enablePostFolding; checkbox[false]
  //Angles for rotation around the 3 axes of the coordinate system
  uniform vec3 postAngleXYZ; slider[(-360,-360,-360),(0,0,0),(360,360,360)]
  // Folding value for the folding in Tglad style
  uniform float postFolding; slider[-10,1,10]

#group Menger
// Based on Knighty's Kaleidoscopic IFS 3D Fractals, described here:
// https://www.fractalforums.com/sierpinski-gasket/kaleidoscopic-(escape-time-ifs)/
// Scale:   Scale parameter. A perfect Menger is 3.0
// Offset:  Scaling center
   uniform float MengerScale; slider[0.00,3.0,4.00]
   uniform vec3 MengerRotVector; slider[(0,0,0),(1,1,1),(1,1,1)]
   uniform float MengerRotAngle; slider[0.00,0,180]
   uniform vec3 MengerOffset; slider[(0,0,0),(1,1,1),(1,1,1)]
   
   //Menger - ONLY iteration control - Menger iteration happens AFTER Newton + fold iteration
   uniform int MengerIterations;  slider[0,8,100]
   uniform int MengerColorIterations;  slider[0,8,100]

float sq_r, r, r1, dr, theta, phi, r_pow, theta_pow, phi_pow, pow_eff, fac_eff, cth, cph, sph, sth, tmpx, tmpy, tmpz, tmpx2, tmpy2, tmpz2, r_zxy, r_cxy, h, scale, returnValue;
vec3 c;
int i;
mat3 preRotMatrix, postRotMatrix;
 
float DE(vec3 pos) {

// Preparation operations
    vec3 z = pos;
	r1 = length(z);
	
    pow_eff = 1.0 - Power;
    fac_eff = (Power - 1.0)/Power;
        
	dr = 1.0;
    scale = 1.0;
    i = 0;
    
	c = (Julia ? JuliaC : pos);
	r_cxy = sqrt(c.x*c.x + c.y*c.y);
	
	preRotMatrix = rotationMatrixXYZ(preAngleXYZ);
    postRotMatrix = rotationMatrixXYZ(postAngleXYZ);

//Newton + fold iteration loop
//HINT:  Start with a value of 1 or 2 iterations - this is maily useful as pretransform!!
    while(r1<Bailout && (i<Iterations)) {
       dr = dr*r1*2.0;

    //Pre - Rotation Folding
       if (enablePreFolding) {
           z = z * preRotMatrix; 
           z.x = abs(z.x + preFolding) - abs(z.x - preFolding) - z.x;
           z = preRotMatrix * z;
          }
   
    // Converting the diverging z back to the variable q
    // that can be used for the (converging) Newton method calculation
          sq_r = Fake_Bailout_pre/(dot(z,z) + Offset);
          z.x = z.x*sq_r + Solution.x;
          z.y = Vary_Inversion*z.y*sq_r + Solution.y;
          z.z = Vary_Inversion*z.z*sq_r + Solution.z;
           
    // Calculate 1/z^(power-1)
          sq_r = dot(z,z);
          r = sqrt(sq_r);
          phi = Factor_Phi*asin(z.z/r) ;
          theta = Factor_Theta*atan(z.y,z.x) ;
            
          r_pow = pow(r, pow_eff);
          phi_pow = phi*pow_eff;
          theta_pow = theta*pow_eff;
      
          cth = cos(theta_pow);
          sth = sin(theta_pow);
          cph = cos(phi_pow);
          sph = sin(phi_pow);
      
          tmpx = -cph*cth*r_pow/Power;
          tmpy = -cph*sth*r_pow/Power;
          tmpz = sph*r_pow/Power;
      
    // Multiply c and z
          r_zxy = sqrt(tmpx*tmpx + tmpy*tmpy);
                    
          h = 1 - c.z*tmpz/(r_cxy*r_zxy + Offset);
          
          tmpx2 = (c.x*tmpx - c.y*tmpy)*h;
          tmpy2 = (c.y*tmpx + c.x*tmpy)*h;
          tmpz2 = r_cxy*tmpz + r_zxy*c.z;
   
    // Bring everything together        
          z.x = fac_eff*z.x + tmpx2;
          z.y = fac_eff*z.y + tmpy2;
          z.z = fac_eff*z.z + tmpz2;
         
    // Below the hack that provides a divergent value of z
    // although the plain Newton method does always converge
          sq_r = Fake_Bailout_post/((dot(z-Solution,z-Solution))+ Offset);
          
          z.x = (z.x - Solution.x)*sq_r;
          z.y = Vary_Inversion*(z.y - Solution.y)*sq_r;
          z.z = Vary_Inversion*(z.z - Solution.z)*sq_r;
           
    //Post - Rotation Folding
       if (enablePostFolding) {
           z = z * postRotMatrix; 
           z.x = abs(z.x + postFolding) - abs(z.x - postFolding) - z.x;
           z = postRotMatrix * z;
      }
   
    //DE helper calculations (?)
          dr = dr * DEscale1 + DEoffset1;
    //     dr =  pow(r, pow_eff)*(Power - 1.0)*dr + 10.0;
    //     dr = max(dr*DerivativeBias, r_pow*dr*pow_eff + 1.0);
          r1 = length(z);
        
          if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(z.x,z.y,z.z,r1*r1)));
          i++;
    }

//Menger iteration loop
	int n = 0;
	while (n < MengerIterations) {
		z = z*rotationMatrix3(normalize(MengerRotVector), MengerRotAngle);
		z = abs(z);
		if (z.x < z.y){ z.xy = z.yx;}
		if (z.x < z.z){ z.xz = z.zx;}
		if (z.y < z.z){ z.yz = z.zy;}
		z = MengerScale*z - MengerOffset*(MengerScale - 1.0);
		if( z.z < - 0.5*MengerOffset.z*(MengerScale - 1.0))  z.z += MengerOffset.z*(MengerScale - 1.0);
		if (n < MengerColorIterations) orbitTrap = min(orbitTrap, (vec4(abs(z),dot(z,z))));
		r1 = length(z);
		n++;
	}

   if (MengerIterations > 0)
       {returnValue = abs(length(z) - 0.0 )*pow(MengerScale, float(-n));}
   else 
       {returnValue = 0.5*log(r1)*r1/dr;}

   return returnValue;

}

#preset Default
FOV = 0.35632184
Eye = 22.78755,-1.11592746,-14.200532
Target = 11.4108305,-0.270116895,-9.18564034
Up = 0.202544078,0.026172403,0.455074638
EquiRectangular = false
AutoFocus = false
FocalPlane = 30
Aperture = 0
Gamma = 2.08335
ToneMapping = 3
Exposure = 0.6522
Brightness = 1
Contrast = 1
AvgLumin = 0.5,0.5,0.5
Saturation = 1.2
LumCoeff = 0.212500006,0.715399981,0.0720999986
Hue = 0
GaussianWeight = 1
AntiAliasScale = 1.5
DepthToAlpha = false
ShowDepth = false
DepthMagnitude = 1
Detail = -4.325
DetailAO = -0.5
FudgeFactor = 0.02
MaxDistance = 3000
MaxRaySteps = 5250
Dither = 0.5
NormalBackStep = 1.5 NotLocked
AO = 0,0,0,0.699999988
Specular = 0.25
SpecularExp = 20
SpecularMax = 20
SpotLight = 1,1,1,0.22
SpotLightDir = 0.37142,0.1
CamLight = 1,1,1,1.13978
CamLightMin = 0.25
Glow = 1,1,1,0.075
GlowMax = 115
Fog = 0
HardShadow = 0.33846 NotLocked
ShadowSoft = 12.6
QualityShadows = true
Reflection = 0 NotLocked
DebugSun = false NotLocked
BaseColor = 1,1,1
OrbitStrength = 0.2987
X = 0.5,0.600000024,0.600000024,0.2126
Y = 1,0.600000024,0,0.30708
Z = 0.800000012,0.779999971,1,0.35434
R = 0.666666985,0.666666985,0.498039007,0.03174
BackgroundColor = 0.600000024,0.600000024,0.450003803
GradientBackground = 0.3
CycleColors = false
Cycles = 6.95699
EnableFloor = false NotLocked
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Power = 16
Solution = 1,-0.05,0
Factor_Phi = 1
Factor_Theta = 1
Fake_Bailout_pre = 2
Fake_Bailout_post = 2
Vary_Inversion = -1
Offset = 1e-5
Bailout = 512
DEscale1 = 1
DEoffset1 = 4
Julia = true
JuliaC = -1,0,0
enablePreFolding = false
preAngleXYZ = 30,-5,5
preFolding = 0.42
enablePostFolding = true
postAngleXYZ = 0,90,0
postFolding = -0.3
Iterations = 2
ColorIterations = 2
MengerScale = 2.5
MengerRotVector = 1,1,1
MengerRotAngle = 0
MengerOffset = 1,1,1
MengerIterations = 16
MengerColorIterations = 2
#endpreset
