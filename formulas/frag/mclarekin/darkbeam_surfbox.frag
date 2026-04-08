
#info SurfBox by DarkBeam
// Abox with the surfBox fold, ported to Fragmentarium mclarekin 16/04/20

// reference http://www.fractalforums.com/amazing-box-amazing-surf-and-variations/httpwww-shaperich-comproshred-elite-review/
/*If foldMod = 0, you disable the fold of the corresponding axis. Nice to create curly surfaces aka amazing surf grin
Conversely if foldMod tends to infinity, you get Tglad's fold. I found that 2000 can be enough.
If foldMod = 2*fold, you get the perfect Mixed Folding, simulating abs() and fold at the same time.
If foldMod = 4*fold, you get a double folding just like doing fold twice.
*/
#define providesInit

#include "MathUtils.frag"
#include "DE-Raytracer.frag"
#group Abox

/*
The distance estimator below was originalled devised by Buddhi.
See this thread for more info: http://www.fractalforums.com/3d-fractal-generation/a-mandelbox-distance-estimate-formula/15/
*/

// Number of fractal iterations.
uniform int Iterations;  slider[0,60,300]
uniform int ColorIterations;  slider[0,3,300]
uniform float Bailout;  slider[0,100,1000]

// surfbox fold parameters
uniform vec3 fold; slider[(-5.0,-5.0,-5.0),(1.0,1.0,1.0),(5.0,5.0,5.0)]
uniform vec3 foldMod; slider[(0.0,0.0,0.0),(2.0,2.0,2.0),(2000.0,2000.0,2000.0)]

//sphere fold controls
uniform float MinR2;  slider[0,0.25,2.0]
uniform float MaxR2;  slider[0,1.0,2.0]
float MxMnR2 = MaxR2/MinR2;

// scale controls
uniform float Scale;  slider[-5.0,2.0,5.0]
uniform float varyScale; slider[-1.0,0.0,1.0] 
uniform float varyOffset; slider[-1.0,1.0,1.0] 

// rotation controls
uniform vec3 RotVector; slider[(0,0,0),(1,1,1),(1,1,1)] 
uniform float RotAngle; slider[0.00,0,180]

// addition constants
uniform vec3 c3Mul; slider[(-5.0,-5.0,-5.0),(1.0,1.0,1.0),(5.0,5.0,5.0)]
uniform vec3 cJulia; slider[(-5.0,-5.0,-5.0),(0.0,0.0,0.0),(5.0,5.0,5.0)]

// DE tweak
uniform float DEtweak; slider[0.0,1.0,2.0]

float r2;
int i = 0;
mat3 rot;
float Dd;
float compound = 0.0;
float useScale = 0.0;
float vary = 0.0;
//vec3 initialPoint;
void init() {
	 rot = rotationMatrix3(normalize(RotVector), RotAngle);
}

float DE(vec3 pos)
{
	vec3 p3 = pos;
	//vec3 initialPoint = pos;
	vec3 c3 = pos * c3Mul;	
	Dd = 1.0;	

	for (int i=0; i<Iterations; i++)
	{
		// surfbox fold
		vec3 sg = p3; // or 0,0,0
		sg.x = sign(p3.x);
		sg.y = sign(p3.y);
		sg.z = sign(p3.z);

		vec3 folder = p3; // or 0,0,0
		vec3 Tglad = abs(p3 + fold) - abs(p3 - fold) - p3;

		folder.x = sg.x * (p3.x - Tglad.x);
		folder.y = sg.y * (p3.y - Tglad.y);
		folder.z = sg.z * (p3.z - Tglad.z);

		folder = abs(folder);

		folder.x = min(folder.x, foldMod.x);
		folder.y = min(folder.y, foldMod.y);
		folder.z = min(folder.z, foldMod.z);

		p3.x -= sg.x * folder.x;
		p3.y -= sg.y * folder.y;
		p3.z -= sg.z * folder.z;

	// sphere fold
		r2 = dot(p3,p3);
		if (i<ColorIterations) orbitTrap = min(orbitTrap, abs(vec4(p3,r2)));

		if (r2 < MinR2)
		{
			float tglad_factor1 = MaxR2 / MinR2;
			p3 *= tglad_factor1;
			Dd = Dd * tglad_factor1;
		}
		else if (r2 < MaxR2)
		{
			float tglad_factor2 = MaxR2 / r2;
			p3 *= tglad_factor2;
			Dd = Dd * tglad_factor2;
		}

		float useScale =  Scale + compound;	
		p3 *= useScale;
		Dd = Dd * abs(useScale) + DEtweak;

		// update compound for next iteration	
			vary = varyScale * (abs(compound) - varyOffset);
			compound = -vary;

		// rotation
		p3 *=rot;

	// add constants
		p3 +=  cJulia + c3;



		//r2 = dot(p3, p3); // bailout using the sphere fold r2. Smoothes the shape?
	
	  if ( r2>Bailout)		
		{
		float r = length(p3);
		return r / Dd;
		break;
		}
	}
}



