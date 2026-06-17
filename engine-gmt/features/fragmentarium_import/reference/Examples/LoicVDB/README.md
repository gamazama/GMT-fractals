# VDB-frags
Additional frags for Fragmentarium.

# Setup
1. Download Fragmentarium [here](https://github.com/3Dickulus/FragM).
2. Clone this repository, or download it as a zip, and put it wherever you want.
3. Add the `VDB-frags/Include/` folder to the include path in `Edit > Preferences... > Include Paths`. You probably want to add the path after the default Include separated with a `;` and not completely replace it.
4. You can now open the examples to see how to use the frags.

# How to use the Shadertoy fragments
The basic idea of the Shadertoy fragments (Shadertoy-VDB.frag and Shadertoy-VDB-BufferShader.frag) is to provide a way for monte carlo shaders, as well as single buffer shaders, to be rendered outside of shadertoy. It can only render shaders which use either only the Image buffer or one buffer for acumulation and Image as the display/tonemapping buffer.

## Importing the fragments
You first need to import the fragments to your project, for that you just need to write `#include "Shadertoy-VDB.frag"` at the top of the file. I'd also strongly suggest choosing a more recent version of OpenGL since fragmentarium will default to OGL 2.0, for that just add `#version 130` at the very top of your shader (it has to be the first line), or a later version if your GPU supports it. You're then ready to paste the mainImage from the shadertoy you want. You can also open `ShadertoyExample.frag` if you want to see an example with the default Shadertoy project.

## Defining the iChannels
When using an iChannel in your code, you have to tell Fragmentarium what it's supposed to be so that it compiles the shader correctly, for that you have to define it before the `#import`. Currently 3 types of channels are supported:
1. Textures: to use a texture write `#define iChannelX Texture`, you can then select a texture from `VDB-frags/Include/Shadertoy_Textures/` in the "Textures/Cubemaps" tab.
2. Cubemaps: to use a cubemap write `#define iChannelX Cubemap`, you can then select a texture from `VDB-frags/Include/Shadertoy_Cubemaps/` in the "Textures/Cubemaps" tab.
3. The backbuffer: to use an iChannel as a backbuffer write `#define iChannelX backbuffer`, this is just for quick compatibility though, if you want to make high resolution renders with tile rendering you can't just define an iChannel or you'll get unexpected behaviors. I'd suggest reading the section below for more information.

## Using the backbuffer
When not using tile rendering, a simple define of an iChannel to the backbuffer is enough, but to use tile rendering you have to get the pixel with `backbufferPixel()`. This function take into account the shift in fragCoord caused by tile rendering and returns the color from the previous subframe, it also samples directly the backbuffer without assigning it to a channel. For instance if my backbuffer was on iChannel0 in my Shadertoy and I was getting the pixel with `vec4 tex = texelFetch(iChannel0, ivec2(fragCoord), 0);`, I would simply need to replace it with `vec4 tex = backbufferPixel();`.

## Additional uniforms
A few uniforms were also added to the "Post" tab to give the user at least a little bit of control over the postprocessing:
1. `DivideByAlpha`: tells the display fragment wether or not it should divide the color by alpha before displaying it.
2. `Tonemapping`: applies a filmic curve when enabled.
3. `Gamma`: the gamma.
4. `Exposure`: the exposure.

You can also set iMouse with the `Center` uniform which is controled by your mouse in Fragmentarium. It goes from 0 to 1, 0 being one edge of the screen and 1 the other. `Zoom` is the sensitivity, I'd suggest leaving it at 2. To click with the mouse you have to check the `MouseClickedIn` uniform, it's not very practical, but it's the best I can do with just uniforms.

## Common issues
This is really just a hack, lots of things can go wrong when copy/pasting your shader into fragmentarium, here's a quick list or problems you might run into, and how to fix them:
 - My preview is black: disable `DivideByAlpha`.
 - My preview is white: enable `DivideByAlpha`.
 - My final render doesn't accumulate properly and stays noisy on all but one tile: for tile rendering you need to use the backbuffer with `backbufferPixel()` see section "Using the backbuffer" for more info.
 - Logs `error C1115: unable to find compatible overloaded function "texture(samplerCube, vec3)"` or `error C1115: unable to find compatible overloaded function "texture(sampler2D, vec2)"`: add `#version 130` or later before the `#import`.
 - Logs `[...] requires "#version XXX" or later`: add `#version XXX` or later before the `#import`.
 - Logs `error C1503: undefined variable "iChannelX"` or `error C0105: Syntax error in #if`: define the channels as explained in section "Defining the iChannels".
