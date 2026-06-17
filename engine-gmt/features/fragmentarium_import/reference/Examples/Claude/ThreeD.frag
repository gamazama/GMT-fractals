#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later
#info Progressive 3D with FragM's original DE-Raytracer

#include "Common.frag"
#include "MathUtils.frag"
#include "DE-Raytracer.frag" 

uint hash(uint a)
{
  return hash_burtle_9(a);
}
