# fragm-examples

Claude's Examples for Fragmentarium
(FragM fork, <https://github.com/3Dickulus/FragM>)

(c) 2020 Claude Heiland-Allen <https://mathr.co.uk>

SPDX-License-Identifier: GPL-3.0-or-later

See `COPYING.md` for terms.


## Examples

Files named starting with `00` are top-level runnable examples.  See
their `#info` for descriptions.

Note that `00-Mandelbulb-vs-Menger.frag` takes a *long* time to compile
on Mesa 20 AMDGPU; `00-MandelbarDE.frag` is currently broken due to
missing support files; `00-Mandelbrot-3D.frag` is *extremely* heavy and
may cause your desktop session to crash.


## Library

  - `TwoD.frag`

    Main include file for 2D frags.

  - `ThreeD.frag`

    Main include file for 3D frags with FragM's DE-Raytracer.

  - `Raymond.frag`

    Main include file for 3D frags with Raymond physically inspired ray tracer.


## Auxiliarys files

  - `Common.frag`

    Library include file.

  - `sRGB.frag`

    Helper for setting up buffer shader for sRGB.

  - `Buffer-sRGB.frag`

    Buffer shader storing linear values, converting to sRGB on display.
    Exposure control and debug setting to highlight out of gamut pixels.

  - `Builtin.frag`
    `BuiltinInt.frag` `BuiltinFloat.frag` `BuiltinDouble.frag`

    Capture of built-in GLSL functions for later overloading.

  - `Overload.frag`
    `OverloadInt.frag` `OverloadFloat.frag` `OverloadDouble.frag`

    Overloading of built-in GLSL functions.

  - `Int.frag` `Real.frag` `RealBase.frag`

    Overloading for basic operators.

  - `Const.frag`

    Mathematical constants.

  - `Double.frag`

    Double-precision special functions.  From FragM upstream, with mods.

  - `FloatX.frag` `FloatXBase.frag`

    Floating point with extended exponent range.

  - `Compensated.frag`

    Compensated double-double arithmetic for higher precision.

  - `Complex.frag` `ComplexBase.frag`

    Complex numbers.

  - `Dual.frag` `DualBase.frag`

    Dual numbers for automatic differentiation.

  - `Vec.frag` `VecBase.frag`

    Generalized vectors.

  - `Triplex.frag`, `TriplexBase.frag`

    Triplex algebra (as used in Mandelbulb fractal).

  - `DistanceEstimate.frag`

    Distance estimator for 3D fractal formulas.

  - `MengerSponge.frag`, `Mandelbulb.frag`, `Magnetbulb.frag`

    Example 3D fractal formulas.

  - `Hash.frag`

    A selection of integer hash functions (from BurtleBurtle).

  - `LambertW.frag`, `LambertWBase.frag`

    Lambert W function (Product-Log).  From GNU Scientific Library.

  - `Camera2D.frag`

    Enhanced 2D camera frag with many features.

  - `MandelbrotNumerics.frag`
  
    Library include file for Mandelbrot and related functions.

  - `m_attractor.frag` `m_interior_de.frag` `m_misiurewicz.frag`
    `m_newton.frag` `m_nucleus.frag` `m_render.frag`

    Mandelbrot and related functions.
