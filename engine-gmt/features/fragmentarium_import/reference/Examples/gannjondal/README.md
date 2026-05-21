# fragm-examples

## Intention, Notes:
This repository contains example .frag CONTRIBUTIONS to the fractal oriented GLSL shader IDE/renderer Fragmentarium example folder as maintained under https://github.com/3Dickulus/Fragmentarium_Examples_Folder .    
You can find more inofficial formulas, and samples in my repo [fragm-formulas](https://github.com/gannjondal/fragm-formulas).   
   
This repository is intended to contain my own contributions to the example folder only.   
Please feel free to share your ideas, thoughts, notes upon bugs etc. - For now I won't open a bugtracker, or any other communication here at Github.   
Unless there should be too much feedback please use [this section](https://fractalforums.org/fragmentarium/17/) of fractalforums.org.   
   
If you want to share own sample frags please check [this ff-org thread](https://fractalforums.org/index.php?topic=3488.0).   
   
## Usage:
To use this .frag files you should generally know how to work with Fragmentarium, especially the fork maintained at https://github.com/3Dickulus/FragM .
The formulas will be part of the Examples folder of that distribution.    
   
## Formula list
_NOTE:  Details, parameter descriptions etc will be shared as part of the .frag files._   
- **NewtonVarPower.frag**    
  Pure Newton3D implementation for z^k+c=0 with configurable solution/inversion point    
- **NewtonVarPowerSimplified.frag**    
  Pure Newton3D implementation for z^k-_1_=0 with _fix_ solution/inversion point 1,0,0
- **NewtonVarPowerWithRotatedFold.frag**    
  Newton3D implementation for z^k+c=0 with configurable solution/inversion point    
  PLUS MB3D style rotated foldings before, and after the Newton calculations    
- **NewtonVarPowerWithRotatdFoldAndMenger.frag**    
  Main calculation is a Menger calculation.    
  Thought as pre-transforms:     
  + Newton3D implementation for z^k-c=0 with configurable solution/inversion point    
  + PLUS MB3D style rotated foldings before, and after the Newton calculations    
 
    
## Disclaimer:
At the begin the formulas will be tested on my box (currently a Windows 10 with an old AMD 280X card) - and sometimes nowhere else.     
I know that glsl code is highly dependent from the hardware, especially there are differences in impementation between the hardware producers.   
But I neither have the capacity, nor the intention to test them somewhere else than on my normal boxes.   
Hence I cannot provide any warranty for this code. -    
Please however do not hesitate to share your experiences, or to add code that helps to run it on other hardware.   
As of now I'm publishing all of my formulas under the LGPL license (see the according license file if you really should like that stuff)...   

My formulas (need to) incorporate frags from other people using the \#include command to be able to run on Fragmentarium.   
For the includes I use (if not explicitely stated differently) only frags available through the above linked FragM, and example repositories.    
These frags have several authors with their own licenses, and disclaimers (if any). And the same is of course valid for the actual Fragmentarium program.   
Hence please check the according notes in the FragM, and example repositories.   
