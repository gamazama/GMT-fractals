#donotrun
// (c) 2020 Claude Heiland-Allen
// SPDX-License-Identifier: GPL-3.0-or-later

// implement this

uint hash(uint a);

// scaling from uint to [0,1)

float uniform01(uint a) { return float(a) / 4294967296.0; }

// hashes of other/larger objects

uint hash(int a) { return hash(uint(a)); }
uint hash(float a) { return hash(floatBitsToUint(a)); }
uint hash(uvec2 a) { return hash(a.x ^ hash(a.y)); }
uint hash(uvec3 a) { return hash(a.x ^ hash(a.yz)); }
uint hash(uvec4 a) { return hash(a.x ^ hash(a.yzw)); }
uint hash(ivec2 a) { return hash(uint(a.x) ^ hash(a.y)); }
uint hash(ivec3 a) { return hash(uint(a.x) ^ hash(a.yz)); }
uint hash(ivec4 a) { return hash(uint(a.x) ^ hash(a.yzw)); }
uint hash(vec2 a) { return hash(floatBitsToUint(a.x) ^ hash(a.y)); }
uint hash(vec3 a) { return hash(floatBitsToUint(a.x) ^ hash(a.yz)); }
uint hash(vec4 a) { return hash(floatBitsToUint(a.x) ^ hash(a.yzw)); }

// http://www.burtleburtle.net/bob/hash/integer.html

uint hash_burtle_1(uint a)
{
  a = (a ^ 61u) ^ (a >> 16u);
  a = a + (a << 3u);
  a = a ^ (a >> 4u);
  a = a * 0x27d4eb2du;
  a = a ^ (a >> 15u);
  return a;
}

uint hash_burtle_2(uint a)
{
  a = (a+0x7ed55d16u) + (a<<12u);
  a = (a^0xc761c23cu) ^ (a>>19u);
  a = (a+0x165667b1u) + (a<<5u);
  a = (a+0xd3a2646cu) ^ (a<<9u);
  a = (a+0xfd7046c5u) + (a<<3u);
  a = (a^0xb55a4f09u) ^ (a>>16u);
  return a;
}

uint hash_burtle_3(uint a)
{
  a -= (a<<6u);
  a ^= (a>>17u);
  a -= (a<<9u);
  a ^= (a<<4u);
  a -= (a<<3u);
  a ^= (a<<10u);
  a ^= (a>>15u);
  return a;
}

uint hash_burtle_4(uint a)
{
  a += ~(a<<15u);
  a ^=  (a>>10u);
  a +=  (a<<3u);
  a ^=  (a>>6u);
  a += ~(a<<11u);
  a ^=  (a>>16u);
  return a;
}

uint hash_burtle_5(uint a)
{
  a = (a+0x479ab41du) + (a<<8u);
  a = (a^0xe4aa10ceu) ^ (a>>5u);
  a = (a+0x9942f0a6u) - (a<<14u);
  a = (a^0x5aedd67du) ^ (a>>3u);
  a = (a+0x17bea992u) + (a<<7u);
  return a;
}

uint hash_burtle_6(uint a)
{
  a = (a^0xdeadbeefu) + (a<<4u);
  a = a ^ (a>>10u);
  a = a + (a<<7u);
  a = a ^ (a>>13u);
  return a;
}

uint hash_burtle_7(uint a)
{
  a = a ^ (a>>4u);
  a = (a^0xdeadbeefu) + (a<<5u);
  a = a ^ (a>>11u);
  return a;
}

uint hash_burtle_8(uint a)
{
  a = (a+0x479ab41du) + (a<<8u);
  a = (a^0xe4aa10ceu) ^ (a>>5u);
  a = (a+0x9942f0a6u) - (a<<14u);
  a = (a^0x5aedd67du) ^ (a>>3u);
  a = (a+0x17bea992u) + (a<<7u);
  return a;
}

uint hash_burtle_9(uint a)
{
  a = (a+0x7ed55d16u) + (a<<12u);
  a = (a^0xc761c23cu) ^ (a>>19u);
  a = (a+0x165667b1u) + (a<<5u);
  a = (a+0xd3a2646cu) ^ (a<<9u);
  a = (a+0xfd7046c5u) + (a<<3u);
  a = (a^0xb55a4f09u) ^ (a>>16u);
  return a;
}

uint hash_burtle_10(uint a)
{
  a = (a+0x7fb9b1eeu) + (a<<12u);
  a = (a^0xab35dd63u) ^ (a>>19u);
  a = (a+0x41ed960du) + (a<<5u);
  a = (a+0xc7d0125eu) ^ (a<<9u);
  a = (a+0x071f9f8fu) + (a<<3u);
  a = (a^0x55ab55b9u) ^ (a>>16u);
  return a;
}

uint hash_burtle_11(uint a)
{
  a -= (a<<6u);
  a ^= (a>>17u);
  a -= (a<<9u);
  a ^= (a<<4u);
  a -= (a<<3u);
  a ^= (a<<10u);
  a ^= (a>>15u);
  return a;
}

uint hash_burtle_12(uint a)
{
  a += ~(a<<15u);
  a ^=  (a>>10u);
  a +=  (a<<3u);
  a ^=  (a>>6u);
  a += ~(a<<11u);
  a ^=  (a>>16u);
  return a;
}
