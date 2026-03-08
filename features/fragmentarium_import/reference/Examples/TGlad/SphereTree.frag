#info Sphere Tree Distance Estimator.
#define providesInit
#include "DE-Raytracer.frag"
#include "MathUtils.frag"
#group Sphere Tree

uniform int Iterations;  slider[0,6,100]
uniform float PackRatio;  slider[0,1.0,1.22] 
uniform bool Rotated; checkbox[true]

void init() {
}

// distance estimation function
float DE(vec3 p)
{
     float root3 = sqrt(3.0);
     vec3 t0 = vec3(0.0,1.0,0.0);
     vec3 t1 = vec3(root3/2.0, -0.5,0.0);
     vec3 t2 = vec3(-root3/2.0, -0.5,0.0);
     vec3 n0 = vec3(1.0,0.0,0.0);
     vec3 n1 = vec3(-0.5, -root3/2.0,0.0);
     vec3 n2 = vec3(-0.5, root3/2.0,0.0);

     float scale = 1.0;
     float k = PackRatio;

     float scl = Rotated ? root3 : 1.0;
     float innerScale = k*scl/(k*k + scl);
     float innerScaleB = innerScale*innerScale*0.25;
     float shift = (k*k + scl)/(k*(1.0 + scl));
     float mid = 0.5*(k+1)/2.0;
     float bufferRad = 0.6*k;

     for (int i = 0; i < Iterations; i++)
     {
        vec3 pB = p-vec3(0,0,innerScale*0.5);
        if (dot(pB, pB) < innerScaleB)
          break; // definitely inside
        float maxH = 0.4;
        if (i==0)
          maxH = -100;
        vec3 pC = p-vec3(0,0,bufferRad);
        if (p.z > maxH && dot(pC, pC) > bufferRad*bufferRad)
          break; // definitely outside
        vec3 pD = p-vec3(0,0,mid);
        float sc = dot(p,p);
        if (p.z < maxH && dot(pD, pD) > mid*mid)
        {
          // needs a sphere inverse
          scale *= sc; 
          p /= sc; 
        }
        else 
        {
          // stretch onto a plane at zero 
          scale *= sc;
          p /= sc;
          p.z -= shift;
          p.z *= -1.0;
          p *= scl;
          scale /= scl;
          p.z += shift;
          if (Rotated)
          {
            // and rotate it a twelfth of a revolution
            float a = 3.14159265/6.0;
            float cosA = cos(a);
            float sinA = sin(a);
            float xx = p.x*cosA + p.y*sinA;
            float yy = -p.x*sinA + p.y*cosA;
            p.x = xx; 
            p.y = yy;
          }
        }
        // now modolu the space so we move to being in just the central hexagon, inner radius 0.5
        float h = p.z;
        float x = dot(p, -n2) * 2.0/root3;
        float y = dot(p, -n1) * 2.0/root3;  
        x = mod(x, 1.0);
        y = mod(y, 1.0);
        if (x + y > 1.0)
        {
          x = 1.0-x;
          y = 1.0-y;
        }
        p = x*t1 - y*t2;

        // fold the space to be in a kite
        float l0 = dot(p,p);
        float l1 = dot(p-t1, p-t1);
        float l2 = dot(p+t2,p+t2);
        if (l1 < l0 && l1 < l2)
          p -= t1 * (2.0*dot(t1, p) - 1.0);
        else if (l2 < l0 && l2 < l1)
          p -= t2 * (2.0 * dot(p, t2) + 1.0);
        p.z = h;
      }
      float d = (length(p-vec3(0,0,0.5*k)) - 0.5*k);		
      return d * scale;
}

#preset Default
FOV = 0.4
Eye = -3.72729,-0.0860174,-1.93389
Target = 5.14721,0.118786,2.6706
Up = -0.00486875,0.999305,-0.0369503
Detail = -2.84956
DetailAO = -1.33
FudgeFactor = 1
MaxRaySteps = 96
Dither = 0.0
AO = 0,0,0,0.7
Specular = 0.1666
SpecularExp = 16
SpotLight = 1,1,1,0.03261
SpotLightDir = 0.37142,0.1
CamLight = 1,1,1,1.13978
CamLightMin = 0.61176
Glow = 1,1,1,0.05479
Fog = 0.25926
HardShadow = 0
Reflection = 0
BaseColor = 1,1,1
OrbitStrength = 0
X = 0.5,0.6,0.6,0.2126
Y = 1,0.6,0,0.30708
Z = 0.8,0.78,1,0.35434
R = 0.666667,0.666667,0.498039,0.03174
BackgroundColor = 0.278431,0.513725,0.6
GradientBackground = 0.4348
CycleColors = false
Cycles = 1.1
FloorNormal = 0,0,0
FloorHeight = 0
FloorColor = 1,1,1
Iterations = 6
#endpreset
