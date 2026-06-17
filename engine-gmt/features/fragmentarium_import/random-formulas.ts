// Distance Estimator Compendium - 339 fractal DE functions
// Source: https://jbaker.graphics/writings/DEC.html
// Auto-extracted 2026-03-19

export interface DECFractal {
  id: string;
  author: string;
  code: string;
}

export const DEC_FRACTALS: DECFractal[] = [
  {
    "id": "fractal_de",
    "author": "unknown",
    "code": "  float de( vec3 p0 ){\n    vec4 p = vec4(p0, 1.);\n    for(int i = 0; i < 8; i++){\n      p.xyz = mod(p.xyz-1.,2.)-1.;\n      p*=1.4/dot(p.xyz,p.xyz);\n    }\n    return (length(p.xz/p.w)*0.25);\n  }"
  },
  {
    "id": "fractal_de3",
    "author": "unknown",
    "code": "  float de( vec3 p0 ){\n    vec4 p = vec4(p0, 1.);\n    for(int i = 0; i < 8; i++){\n      p.xyz = mod(p.xyz-1., 2.)-1.;\n      p*=(1.2/dot(p.xyz,p.xyz));\n    }\n    p/=p.w;\n    return abs(p.x)*0.25;\n  }"
  },
  {
    "id": "fractal_de4",
    "author": "unknown",
    "code": "  float de( vec3 p0 ){\n    vec4 p = vec4(p0, 1.);\n    for(int i = 0; i < 8; i++){\n      if(p.x > p.z)p.xz = p.zx;\n      if(p.z > p.y)p.zy = p.yz;\n      p = abs(p);\n      p.xyz = mod(p.xyz-1., 2.)-1.;\n      p*=1.23;\n    }\n    p/=p.w;\n    return abs(p.y)*0.25;\n  }"
  },
  {
    "id": "fractal_de5",
    "author": "unknown",
    "code": "  float de( vec3 pos ) {\n    #define SCALE 2.8\n    #define MINRAD2 .25\n    #define scale (vec4(SCALE, SCALE, SCALE, abs(SCALE)) / minRad2)\n    float minRad2 = clamp(MINRAD2, 1.0e-9, 1.0);\n    float absScalem1 = abs(SCALE - 1.0);\n    float AbsScale = pow(abs(SCALE), float(1-10));\n    vec4 p = vec4(pos,1);\n    vec4 p0 = p;\n    for (int i = 0; i < 9; i++)\n    {\n      p.xyz = clamp(p.xyz, -1.0, 1.0) * 2.0 - p.xyz;\n      float r2 = dot(p.xyz, p.xyz);\n      p *= clamp(max(minRad2/r2, minRad2), 0.0, 1.0);\n      p = p*scale + p0;\n    }\n    return ((length(p.xyz) - absScalem1) / p.w - AbsScale);\n  }"
  },
  {
    "id": "fractal_de6",
    "author": "unknown",
    "code": "  // highly varied domain - take a look around\n  float de( vec3 p ){\n    p = p.xzy;\n    vec3 cSize = vec3(1., 1., 1.3);\n    float scale = 1.;\n    for( int i=0; i < 12; i++ ){\n      p = 2.0*clamp(p, -cSize, cSize) - p;\n      float r2 = dot(p,p);\n      float k = max((2.)/(r2), .027);\n      p *= k; scale *= k;\n    }\n    float l = length(p.xy);\n    float rxy = l - 4.0;\n    float n = l * p.z;\n    rxy = max(rxy, -(n) / 4.);\n    return (rxy) / abs(scale);\n  }"
  },
  {
    "id": "fractal_de7",
    "author": "unknown",
    "code": "  // highly varied domain - take a look around\n  float de( vec3 p ){\n    p = p.xzy;\n    vec3 cSize = vec3(1., 1., 1.3);\n    float scale = 1.;\n    for( int i=0; i < 12; i++ ){\n      p = 2.0*clamp(p, -cSize, cSize) - p;\n      float r2 = dot(p,p+sin(p.z*.3));\n      float k = max((2.)/(r2), .027);\n      p *= k;  scale *= k;\n    }\n    float l = length(p.xy);\n    float rxy = l - 4.0;\n    float n = l * p.z;\n    rxy = max(rxy, -(n) / 4.);\n    return (rxy) / abs(scale);\n  }"
  },
  {
    "id": "fractal_de8",
    "author": "iq",
    "code": "  float de( vec3 p ){\n    float scale = 1.0;\n    float orb = 10000.0;\n    for( int i=0; i<6; i++ ){\n      p = -1.0 + 2.0*fract(0.5*p+0.5);\n      p -= sign(p)*0.04; // trick\n      float r2 = dot(p,p);\n      float k = 0.95/r2;\n      p  *= k;  scale *= k;\n      orb = min( orb, r2);\n    }\n\n    float d1 = sqrt( min( min( dot(p.xy,p.xy),\n      dot(p.yz,p.yz) ), dot(p.zx,p.zx) ) ) - 0.02;\n    float d2 = abs(p.y);\n    float dmi = d2;\n    if( d1 < d2 ) dmi = d1;\n    return 0.5*dmi/scale;\n  }"
  },
  {
    "id": "fractal_de9",
    "author": "unknown",
    "code": "  // highly varied domain - take a look around\n  float de( vec3 p ){\n    vec3 CSize = vec3(1., 1.7, 1.);\n    p = p.xzy;\n    float scale = 1.1;\n    for( int i=0; i < 8;i++ ){\n      p = 2.0*clamp(p, -CSize, CSize) - p;\n      float r2 = dot(p,p);\n      float k = max((2.)/(r2), .5);\n      p *= k; scale *= k;\n    }\n    float l = length(p.xy);\n    float rxy = l - 1.0;\n    float n = l * p.z;\n    rxy = max(rxy, (n) / 8.);\n    return (rxy) / abs(scale);\n  }"
  },
  {
    "id": "fractal_de10",
    "author": "unknown",
    "code": "  // highly varied domain - take a look around\n  float de( vec3 p ){\n    vec3 CSize = vec3(1., 1.7, 1.);\n    p = p.xzy;\n    float scale = 1.1;\n    for( int i=0; i < 8;i++ ){\n      p = 2.0*clamp(p, -CSize, CSize) - p;\n      float r2 = dot(p,p+sin(p.z*.3));\n      float k = max((2.)/(r2), .5);\n      p *= k; scale *= k;\n    }\n    float l = length(p.xy);\n    float rxy = l - 1.0;\n    float n = l * p.z;\n    rxy = max(rxy, (n) / 8.);\n    return (rxy) / abs(scale);\n  }"
  },
  {
    "id": "fractal_de12",
    "author": "unknown",
    "code": "  vec3 fold( vec3 p0 ){\n    vec3 p = p0;\n    if(length(p) > 1.2) return p;\n    p = mod(p,2.)-1.;\n    return p;\n  }\n\n  float de( vec3 p0 ){\n    vec4 p = vec4(p0, 1.);\n    for(int i = 0; i < 12; i++){\n      if(p.x > p.z)p.xz = p.zx;\n      if(p.z > p.y)p.zy = p.yz;\n      p = abs(p);\n      p.xyz = fold(p.xyz);\n      p.xyz = mod(p.xyz-1., 2.)-1.;\n      p*=(1.2/dot(p.xyz,p.xyz));\n    }\n    p/=p.w;\n    return abs(p.x)*0.25;\n  }"
  },
  {
    "id": "fractal_de15",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    p=abs(p)-1.2;\n    if(p.x < p.z)p.xz=p.zx;\n    if(p.y < p.z)p.yz=p.zy;\n    if(p.x < p.y)p.xy=p.yx;\n    float s=1.;\n    for(int i=0;i<6;i++){\n      p=abs(p);\n      float r=2./clamp(dot(p,p),.1,1.);\n      s*=r; p*=r; p-=vec3(.6,.6,3.5);\n    }\n    float a=1.5;\n    p-=clamp(p,-a,a);\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de16",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    // box fold\n    p=abs(p)-15.;\n    if(p.x < p.z)p.xz=p.zx;\n    if(p.y < p.z)p.yz=p.zy;\n    if(p.x < p.y)p.xy=p.yx;\n    float s=2.;\n    for (int i=0; i<8; i++){\n      p=-sign(p)*(abs(abs(abs(p)-2.)-1.)-1.);\n      float r=-1.55/max(.41,dot(p,p));\n      s*=r; p*=r; p-=.5;\n    }\n    s=abs(s);\n    return dot(p,normalize(vec3(1,2,3)))/s;\n  }"
  },
  {
    "id": "fractal_de17",
    "author": "gaziya5 aka gaz",
    "code": "  void sFold90( inout vec2 p ){\n    vec2 v=normalize(vec2(1,-1));\n    float g=dot(p,v);\n    p-=(g-sqrt(g*g+1e-1))*v;\n  }\n\n  float de( vec3 p ){\n  #define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n    p=abs(p)-1.8;\n    sFold90(p.zy);\n    sFold90(p.xy);\n    sFold90(p.zx);\n    float s=2.;\n    vec3  offset=p*.5;\n    for(int i=0;i<8;i++){\n      p=1.-abs(p-1.);\n      float r=-1.3*max(1.5/dot(p,p),1.5);\n      s*=r; p*=r; p+=offset;\n      p.zx*=rot(-1.2);\n    }\n    s=abs(s); float a=8.5;\n    p-=clamp(p,-a,a);\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de18",
    "author": "gaziya5 aka gaz",
    "code": "  float lpNorm( vec3 p, float n ){\n    p = pow(abs(p), vec3(n));\n    return pow(p.x+p.y+p.z, 1.0/n);\n  }\n\n  float de( vec3 p ){\n    vec3 offset=p*.5;\n    float s=2.;\n    for (int i=0; i<5; i++){\n      p=clamp(p,-1.,1.)*2.-p;\n      float r=-10.*clamp(max(.3/pow(\n      lpNorm(p,5.),2.),.3),.0,.6);\n      s*=r; p*=r; p+=offset;\n    }\n    s=abs(s); float a=10.;\n    p-=clamp(p,-a,a);\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de19",
    "author": "gaziya5 aka gaz",
    "code": "  #define sabs1(p)sqrt((p)*(p)+1e-1)\n  #define sabs2(p)sqrt((p)*(p)+1e-3)\n  float de( vec3 p ){\n    float s=2.; p=abs(p);\n    for (int i=0; i<4; i++){\n      p=1.-sabs2(p-1.);\n      float r=-9.*clamp(max(.2/pow(min(min(sabs1(p.x),\n        sabs1(p.y)),sabs1(p.z)),.5), .1), 0., .5);\n      s*=r; p*=r; p+=1.;\n    }\n    s=abs(s); float a=2.;\n    p-=clamp(p,-a,a);\n    return length(p)/s-.01;\n  }"
  },
  {
    "id": "fractal_de20",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    float s=3.;\n    for(int i = 0; i < 4; i++) {\n      p=mod(p-1.,2.)-1.;\n      float r=1.2/dot(p,p);\n      p*=r; s*=r;\n    }\n    p = abs(p)-0.8;\n    if (p.x < p.z) p.xz = p.zx;\n    if (p.y < p.z) p.yz = p.zy;\n    if (p.x < p.y) p.xy = p.yx;\n    return length(cross(p,normalize(vec3(0,1,1))))/s-.001;\n  }"
  },
  {
    "id": "fractal_de21",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    float s=3.; p=abs(p);\n    for (float i=0.; i<9.; i++){\n      p-=clamp(p,-1.,1.)*2.;\n      float r=6.62*clamp(.12/min(dot(p,p),1.),0.,1.);\n      s*=r; p*=r; p+=1.5;\n    }\n    s=abs(s); float a=.8;\n    p-=clamp(p,-a,a);\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de22",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    float s=12.; p=abs(p);\n    vec3 offset=p*3.;\n    for (float i=0.; i<5.; i++){\n      p=1.-abs(p-1.);\n      float r=-5.5*clamp(.3*max(2.5/dot(p,p),.8),0.,1.5);\n      p*=r; p+=offset; s*=r;\n    }\n    s=abs(s); p=abs(p)-3.;\n    if(p.x < p.z)p.xz=p.zx;\n    if(p.y < p.z)p.yz=p.zy;\n    if(p.x < p.y)p.xy=p.yx;\n    float a=3.;\n    p-=clamp(p,-a,a);\n    return length(p.xz)/s;\n  }"
  },
  {
    "id": "fractal_de23",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    #define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n    p=abs(p)-3.;\n    if(p.x < p.z)p.xz=p.zx;\n    if(p.y < p.z)p.yz=p.zy;\n    if(p.x < p.y)p.xy=p.yx;\n    float s=3.;\n    vec3  offset=p*1.2;\n    for (float i=0.;i<8.;i++){\n      p=1.-abs(p-1.);\n      float r=-6.5*clamp(.41*max(1.1/dot(p,p),.8),.0,1.8);\n      s*=r; p*=r; p+=offset;\n      p.yz*=rot(-1.2);\n    }\n    s=abs(s);\n    float a=20.;\n    p-=clamp(p,-a,a);\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de24",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ) {\n    #define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n    p=abs(p)-2.;\n    if(p.x < p.z)p.xz=p.zx;\n    if(p.y < p.z)p.yz=p.zy;\n    if(p.x < p.y)p.xy=p.yx;\n    float s=2.5;\n    vec3 off=p*2.8;\n    for (float i=0.;i<6.;i++) {\n      p=-sign(p)*(abs(abs(abs(p)-2.)-1.)-1.);\n      float r=-11.*clamp(.8*max(2.5/dot(p,p),.2),.3,.6);\n      s*=r; p*=r; p+=off;\n      p.yz*=rot(2.1);\n    }\n    s=abs(s);\n    float a=30.;\n    p-=clamp(p,-a,a);\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de25",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    p=abs(p);\n    float s=3.;\n    vec3  offset = p*.5;\n    for (float i=0.; i<5.; i++){\n      p=1.-abs(p-1.);\n      float r=-3.*clamp(.57*max(3./dot(p,p),.9),0.,1.);\n      s*=r; p*=r; p+=offset;\n    }\n    s=abs(s);\n    return length(cross(p,normalize(vec3(1))))/s-.008;\n  }"
  },
  {
    "id": "fractal_de26",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    p.xy=abs(p.xy)-2.;\n    if(p.x < p.y)p.xy=p.yx;\n    p.z=mod(p.z,4.)-2.;\n    p.x-=3.2; p=abs(p);\n    float s=2.;\n    vec3 offset= p*1.5;\n    for (float i=0.; i<5.; i++){\n      p=1.-abs(p-1.);\n      float r=-7.5*clamp(.38*max(1.2/dot(p,p),1.),0.,1.);\n      s*=r; p*=r; p+=offset;\n    }\n    s=abs(s);\n    float a=100.;\n    p-=clamp(p,-a,a);\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de27",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    #define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n    float s=1.;\n    for(int i=0;i<3;i++){\n      p=abs(p)-.3;\n      if(p.x < p.y)p.xy=p.yx;\n      if(p.x < p.z)p.xz=p.zx;\n      if(p.y < p.z)p.yz=p.zy;\n      p.xy=abs(p.xy)-.2;\n      p.xy*=rot(.3);\n      p.yz*=rot(.3);\n      p*=2.; s*=2.;\n    }\n    p/=s;\n    float h=.5;\n    p.x-=clamp(p.x,-h,h);\n    return length(vec2(length(p.xy)-.5,p.z))-.05;\n  }"
  },
  {
    "id": "fractal_de28",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    float s=1.;\n    for(int i=0;i<3;i++){\n      p=abs(p)-.3;\n      if(p.x < p.y)p.xy=p.yx;\n      if(p.x < p.z)p.xz=p.zx;\n      if(p.y < p.z)p.yz=p.zy;\n      p.xy-=.2; p*=2.; s*=2.;\n    }\n    p/=s;\n    float h=.5;\n    p.x-=clamp(p.x,-h,h);\n    return length(vec2(length(p.xy)-.5,p.z))-.05;\n  }"
  },
  {
    "id": "fractal_de29",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    #define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n    for(int i=0;i<3;i++){\n      p=abs(p)-.3;\n      if(p.x < p.y)p.xy=p.yx;\n      if(p.x < p.z)p.xz=p.zx;\n      if(p.y < p.z)p.yz=p.zy;\n      p.xy-=.2; p.xy*=rot(.5); p.yz*=rot(.5);\n    }\n    float h=.5;\n    p.x-=clamp(p.x,-h,h);\n    return length(vec2(length(p.xy)-.5,p.z))-.05;\n  }"
  },
  {
    "id": "fractal_de30",
    "author": "gaziya5 aka gaz",
    "code": "  #define TAUg atan(1.)*8.\n  vec2 pmodg(vec2 p, float n){\n    float a=mod(atan(p.y, p.x),TAUg/n)-.5 *TAUg/n;\n    return length(p)*vec2(sin(a),cos(a));\n  }\n\n  float de( vec3 p ){\n    for(int i=0;i<4;i++){\n      p.xy = pmodg(p.xy,10.);  p.y-=2.;\n      p.yz = pmodg(p.yz, 12.); p.z-=10.;\n    }\n    return dot(abs(p),normalize(vec3(13,1,7)))-.7;\n  }"
  },
  {
    "id": "fractal_de31",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    p.x-=4.;\n    p=mod(p,8.)-4.;\n    for(int j=0;j<3;j++){\n      p.xy=abs(p.xy)-.3;\n      p.yz=abs(p.yz)+.7,\n      p.xz=abs(p.xz)-.2;\n    }\n    return length(cross(p,vec3(.5)))-.1;\n  }"
  },
  {
    "id": "fractal_de32",
    "author": "gaziya5 aka gaz",
    "code": "  vec3 fold(vec3 p0){\n    vec3 p = p0;\n    if(length(p) > 2.)return p;\n    p = mod(p,2.)-1.;\n    return p;\n  }\n\n  float de( vec3 p0 ){\n    vec4 p = vec4(p0, 1.);\n    escape = 0.;\n    if(p.x > p.z)p.xz = p.zx;\n    if(p.z > p.y)p.zy = p.yz;\n    if(p.y > p.x)p.yx = p.xy;\n    p = abs(p);\n    for(int i = 0; i < 8; i++){\n      p.xyz = fold(p.xyz);\n      p.xyz = fract(p.xyz*0.5 - 1.)*2.-1.0;\n      p*=(1.1/clamp(dot(p.xyz,p.xyz),-0.1,1.));\n    }\n    p/=p.w;\n    return abs(p.x)*0.25;\n  }"
  },
  {
    "id": "fractal_de35",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p=mod(p,2.)-1.;\n    p=abs(p)-1.;\n    if(p.x < p.z)p.xz=p.zx;\n    if(p.y < p.z)p.yz=p.zy;\n    if(p.x < p.y)p.xy=p.yx;\n    float s=1.;\n    for(int i=0;i<10;i++){\n      float r2=2./clamp(dot(p,p),.1,1.);\n      p=abs(p)*r2-vec3(.6,.6,3.5);\n      s*=r2;\n    }\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de36",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ) {\n    float itr=10.,r=0.1;\n    p=mod(p-1.5,3.)-1.5;\n    p=abs(p)-1.3;\n    if(p.x < p.z)p.xz=p.zx;\n    if(p.y < p.z)p.yz=p.zy;\n    if(p.x < p.y)p.xy=p.yx;\n    float s=1.;\n    p-=vec3(.5,-.3,1.5);\n  \tfor(float i=0.;i++ < itr;) {\n  \t\tfloat r2=2./clamp(dot(p,p),.1,1.);\n  \t\tp=abs(p)*r2;\n  \t\tp-=vec3(.7,.3,5.5);\n  \t\ts*=r2;\n  \t}\n    return length(p.xy)/(s-r);\n  }"
  },
  {
    "id": "fractal_de37",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ) {\n    float s=2.,r2;\n    p=abs(p);\n    for(int i=0; i<12;i++) {\n      p=1.-abs(p-1.);\n      r2=1.2/dot(p,p);\n      p*=r2; s*=r2;\n    }\n    return length(cross(p,normalize(vec3(1))))/s-0.003;\n  }"
  },
  {
    "id": "fractal_de38",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    float s=2.,r2;\n    p=abs(p);\n    for(int i=0; i<12;i++) {\n      p=1.-abs(p-1.);\n      r2=(i%3==1)?1.3:1.3/dot(p,p);\n      p*=r2; s*=r2;\n    }\n    return length(cross(p,normalize(vec3(1))))/s-0.003;\n  }"
  },
  {
    "id": "fractal_de40",
    "author": "gaziya5 aka gaz",
    "code": "  #define fold45(p)(p.y>p.x)?p.yx:p\n  float de(vec3 p) {\n    float scale = 2.1, off0 = .8, off1 = .3, off2 = .83;\n    vec3 off =vec3(2.,.2,.1);\n    float s=1.0;\n    for(int i = 0;++i<20;) {\n      p.xy = abs(p.xy);\n      p.xy = fold45(p.xy);\n      p.y -= off0;\n      p.y = -abs(p.y);\n      p.y += off0;\n      p.x += off1;\n      p.xz = fold45(p.xz);\n      p.x -= off2;\n      p.xz = fold45(p.xz);\n      p.x += off1;\n      p -= off;\n      p *= scale;\n      p += off;\n      s *= scale;\n    }\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de41",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    float s=4.;\n    p=abs(p);\n    vec3 off=p*4.6;\n    for (float i=0.; i<8.; i++){\n      p=1.-abs(abs(p-2.)-1.);\n      float r=-13.*clamp(.38*max(1.3/dot(p,p),.7),0.,3.3);\n      s*=r; p*=r; p+=off;\n    }\n    return length(cross(p,normalize(vec3(1,3,3))))/s-.006;\n  }"
  },
  {
    "id": "fractal_de43",
    "author": "gaziya5 aka gaz",
    "code": "  vec3 rotate(vec3 p,vec3 axis,float theta){\n    vec3 v = cross(axis,p), u = cross(v, axis);\n    return u * cos(theta) + v * sin(theta) + axis * dot(p, axis);\n  }\n\n  vec2 pmod(vec2 p, float r){\n    float a = mod(atan(p.y, p.x), (M_PI*2) / r) - 0.5 * (M_PI*2) / r;\n    return length(p) * vec2(-sin(a), cos(a));\n  }\n\n  float de(vec3 p){\n    for(int i=0;i<5;i++){\n      p.xy = pmod43(p.xy,12.0); p.y-=4.0;\n      p.yz = pmod43(p.yz,16.0); p.z-=6.8;\n    }\n    return dot(abs(p),rotate43(normalize(vec3(2,1,3)),\n        normalize(vec3(7,1,2)),1.8))-0.3;\n  }"
  },
  {
    "id": "fractal_de44",
    "author": "gaziya5 aka gaz",
    "code": "  #define pmod(p,n)length(p)*sin(vec2(0.,M_PI/2.)\\\n   +mod(atan(p.y,p.x),2.*M_PI/n)-M_PI/n)\n  #define fold(p,v)p-2.*min(0.,dot(p,v))*v;\n\n  float de( vec3 p ){\n    float s = 1.0;\n    p.z=fract(p.z)-.5;\n    for(int i=0;i<20;i++){ // expensive\n      p.y += .15;\n      p.xz = abs(p.xz);\n      for(int j=0;j<2;j++){\n        p.xy = pmod(p.xy,8.);\n        p.y -= .18;\n      }\n      p.xy = fold(p.xy,normalize(vec2(1,-.8)));\n      p.y = -abs(p.y);\n      p.y += .4;\n      p.yz = fold(p.yz,normalize(vec2(3,-1)));\n      p.x -= .47;\n      p.yz = fold(p.yz,normalize(vec2(2,-7)));\n      p -= vec3(1.7,.4,0);\n      float r2= 3.58/dot(p,p);\n      p *= r2;\n      p += vec3(1.8,.7,.0);\n      s *= r2;\n    }\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de45",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    p.z-=2.5;\n    float s = 3.;\n    float e = 0.;\n    for(int j=0;j++<8;)\n      s*=e=3.8/clamp(dot(p,p),0.,2.),\n      p=abs(p)*e-vec3(1,15,1);\n    return length(cross(p,vec3(1,1,-1)*.577))/s;\n  }"
  },
  {
    "id": "fractal_de46",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    float s = 2.;\n    float e = 0.;\n    for(int j=0;++j<7;)\n      p.xz=abs(p.xz)-2.3,\n      p.z>p.x?p=p.zyx:p,\n      p.z=1.5-abs(p.z-1.3+sin(p.z)*.2),\n      p.y>p.x?p=p.yxz:p,\n      p.x=3.-abs(p.x-5.+sin(p.x*3.)*.2),\n      p.y>p.x?p=p.yxz:p,\n      p.y=.9-abs(p.y-.4),\n      e=12.*clamp(.3/min(dot(p,p),1.),.0,1.)+\n      2.*clamp(.1/min(dot(p,p),1.),.0,1.),\n      p=e*p-vec3(7,1,1),\n      s*=e;\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de47",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    float s = 4.;\n    for(int i = 0; i < 8; i++) {\n      p=mod(p-1.,2.)-1.;\n      float r2=(i%3==0)?1.5:1.2/dot(p,p);\n      p*=r2; s*=r2;\n    }\n    vec3 q=p/s;\n    q.xz=mod(q.xz-.002,.004)-.002;\n    return min(length(q.yx)-.0003,length(q.yz)-.0003);\n  }"
  },
  {
    "id": "fractal_de48",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ){\n    p.z-=-1.;\n    #define fold(p,v)p-2.*min(0.,dot(p,v))*v;\n    float s=3., l=0.;\n    for(int i = 0;++i<15;){\n      p.xy=fold(p.xy,normalize(vec2(1,-1.3)));\n      p.y=-abs(p.y);\n      p.y+=.5;\n      p.xz=abs(p.xz);\n      p.yz=fold(p.yz,normalize(vec2(8,-1)));\n      p.x-=.5;\n      p.yz=fold(p.yz,normalize(vec2(1,-2)));\n      p-=vec3(1.8,.4,.1);\n      l = 2.6/dot(p,p);    p*=l;\n      p+=vec3(1.8,.7,.2);  s*=l;\n    }\n    return length(p.xy)/s;\n  }"
  },
  {
    "id": "fractal_de49",
    "author": "gaziya5 aka gaz",
    "code": "  float lpNorm(vec3 p, float n){\n    p = pow(abs(p), vec3(n));\n    return pow(p.x+p.y+p.z, 1.0/n);\n  }\n\n  float de(vec3 p){\n    float s = 1.;\n    for(int i = 0; i < 9; i++) {\n      p=p-2.*round(p/2.);\n      float r2=1.1/max(pow(lpNorm(p.xyz, 4.5),1.6),.15);\n      p*=r2; s*=r2;\n    }\n    return length(p)/s-.001;\n  }"
  },
  {
    "id": "fractal_de50",
    "author": "gaziya5 aka gaz",
    "code": "  #define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n  float hash(float x){\n    return fract(sin(x*234.123+156.2));\n  }\n  float lpNorm(vec3 p, float n){\n    p = pow(abs(p), vec3(n));\n    return pow(p.x+p.y+p.z, 1.0/n);\n  }\n  float de(vec3 p){\n    vec2 id=floor(p.xz);\n    p.xz=mod(p.xz,1.)-.5;\n    p.y=abs(p.y)-.5;\n    p.y=abs(p.y)-.5;\n    p.xy*=rot(hash(dot(id,vec2(12.3,46.7))));\n    p.yz*=rot(hash(dot(id,vec2(32.9,76.2))));\n    float s = 1.;\n    for(int i = 0; i < 6; i++) {\n      float r2=1.2/pow(lpNorm(p.xyz, 5.0),1.5);\n      p-=.1; p*=r2; s*=r2; p=p-2.*round(p/2.);\n    }\n    return .6*dot(abs(p),normalize(vec3(1,2,3)))/s-.002;\n  }"
  },
  {
    "id": "fractal_de51",
    "author": "gaziya5 aka gaz",
    "code": "  #define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n  float de(vec3 p){\n    for(int j=0;++j<8;)\n      p.z-=.3,\n      p.xz=abs(p.xz),\n      p.xz=(p.z>p.x)?p.zx:p.xz,\n      p.xy=(p.y>p.x)?p.yx:p.xy,\n      p.z=1.-abs(p.z-1.),\n      p=p*3.-vec3(10,4,2);\n\n    return length(p)/6e3-.001;\n  }"
  },
  {
    "id": "fractal_de52",
    "author": "gaziya5 aka gaz",
    "code": "  float lpNorm(vec3 p, float n){\n    p = pow(abs(p),vec3(n));\n    return pow(p.x+p.y+p.z,1./n);\n  }\n  float de( vec3 p ){\n    float scale=4.5;\n    float mr2=.5;\n    float off=.5;\n    float s=1.;\n    vec3 p0 = p;\n    for (int i=0; i<16; i++) {\n      if(i%3==0)p=p.yzx;\n      if(i%2==1)p=p.yxz;\n      p -= clamp(p,-1.,1.)*2.;\n      float r2=pow(lpNorm(p.xyz,5.),2.);\n      float g=clamp(mr2*max(1./r2,1.),0.,1.);\n      p=p*scale*g+p0*off;\n      s=s*scale*g+off;\n    }\n    return length(p)/s-.01;\n  }"
  },
  {
    "id": "fractal_de55",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2.;\n    float e=0.;\n    vec3 q=vec3(3,3,.0);\n    for(int i=0; i++<7; p=q-abs(p-q*.4))\n      s*=e=15./min(dot(p,p),15.),\n      p=abs(p)*e-2.;\n    return (length(p.xz)-.5)/s;\n  }"
  },
  {
    "id": "fractal_de56",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    vec3 q;\n    p-=vec3(1.,.1,.1);\n    q=p;\n    float s=1.5;\n    float e=0.;\n    for(int j=0;j++<15;s*=e)\n      p=sign(p)*(1.2-abs(p-1.2)),\n      p=p*(e=8./clamp(dot(p,p),.3,5.5))+q*2.;\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de57",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p.xz=fract(p.xz)-.5;\n    float k=1.;\n    float s=0.;\n    for(int i=0;i++<9;)\n      s=2./clamp(dot(p,p),.1,1.),\n      p=abs(p)*s-vec3(.5,3,.5),\n      k*=s;\n    return length(p)/k-.001;\n  }"
  },
  {
    "id": "fractal_de59",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p.xz=fract(p.xz)-.5;\n    float k=1.;\n    float s=0.;\n    for(int i=0;i++<9;)\n      s=2./clamp(dot(p,p),.1,1.),\n      p=abs(p)*s-vec3(.5,3,.5),\n      k*=s;\n    return length(p)/k-.001;\n  }"
  },
  {
    "id": "fractal_de61",
    "author": "gaziya5 aka gaz",
    "code": "  #define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n  float de(vec3 p){\n    p=abs(p)-3.;\n    if(p.x < p.z)p.xz=p.zx;\n    if(p.y < p.z)p.yz=p.zy;\n    if(p.x < p.y)p.xy=p.yx;\n    float s=2.; vec3 off=p*.5;\n    for(int i=0;i<12;i++){\n      p=1.-abs(p-1.);\n      float k=-1.1*max(1.5/dot(p,p),1.5);\n      s*=abs(k); p*=k; p+=off;\n      p.zx*=rot(-1.2);\n    }\n    float a=2.5;\n    p-=clamp(p,-a,a);\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de66",
    "author": "xem",
    "code": "  float de(vec3 p){\n    vec4 o=vec4(p,1);\n    vec4 q=o;\n    for(float i=0.;i<9.;i++){\n      o.xyz=clamp(o.xyz,-1.,1.)*2.-o.xyz;\n      o=o*clamp(max(.25/dot(o.xyz,o.xyz),.25),0.,1.)*vec4(11.2)+q;\n    }\n    return (length(o.xyz)-1.)/o.w-5e-4;\n  }"
  },
  {
    "id": "fractal_de72",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float g=1.;\n    float e=0.;\n    vec3 q=vec3(0);\n    p.z-=1.;\n    q=p;\n    float s=2.;\n    for(int j=0;j++<8;)\n      p-=clamp(p,-.9,.9)*2.,\n      p=p*(e=3./min(dot(p,p),1.))+q,\n      s*=e;\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de75",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    vec3 q;\n    p.z-=1.5;\n    q=p;\n    float e=0.;\n    float s=3.;\n    for(int j=0;j++<8;s*=e)\n      p=sign(p)*(1.-abs(abs(p-2.)-1.)),\n      p=p*(e=6./clamp(dot(p,p),.3,3.))+q-vec3(8,.2,8);\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de76",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    #define R(a)a=vec2(a.x+a.y,a.x-a.y)*.7\n    #define G(a,n)R(a);a=abs(a)-n;R(a)\n      p=fract(p)-.5;\n      G(p.xz,.3);\n      G(p.zy,.1);\n      G(p.yz,.15);\n      return .6*length(p.xy)-.01;\n    #undef R\n    #undef G\n  }"
  },
  {
    "id": "fractal_de78",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2.;\n    float l=dot(p,p);\n    float e=0.;\n    escape=0.;\n    p=abs(abs(p)-.7)-.5;\n    p.x < p.y?p=p.yxz:p;\n    p.y < p.z?p=p.xzy:p;\n    for(int i=0;i++<8;){\n      s*=e=2./clamp(dot(p,p),.004+tan(12.)*.002,1.35);\n      p=abs(p)*e-vec2(.5*l,12.).xxy;\n    }\n    return length(p-clamp(p,-1.,1.))/s;\n  }"
  },
  {
    "id": "fractal_de79",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p.z-=1.5;\n    vec3 q=p;\n    float s=1.5;\n    float e=0.;\n    for(int j=0;j++<8;s*=e)\n      p=sign(p)*(1.2-abs(p-1.2)),\n      p=p*(e=8./clamp(dot(p,p),.6,5.5))+q-vec3(.3,8,.3);\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de80",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float e=1.,B=2.95,H=.9, s=2.;\n    p.z=mod(p.z-2.,4.)-2.;\n    for(int j=0;j++<8;)\n    {\n      p=abs(p);\n      p.x < p.z?p=p.zyx:p;\n      p.x=H-abs(p.x-H);\n      p.y < p.z?p=p.xzy:p;\n      p.xz+=.1;\n      p.y < p.x?p=p.yxz:p;\n      p.y-=.1;\n    }\n    p*=B; p-=2.5; s*=B;\n    return length(p.xy)/s-.007;\n  }"
  },
  {
    "id": "fractal_de81",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    #define hash(n) fract(sin(n*234.567+123.34))\n    float seed=dot(floor((p+3.5)/7.)+3.,vec3(123.12,234.56,678.22));\n    p-=clamp(p,-3.5,3.5)*2.;\n    float scale=-5.;\n    float mr2=.38;\n    float off=1.2;\n    float s=3.;\n    p=abs(p);\n    vec3  p0 = p;\n    for (float i=0.; i<4.+hash(seed)*6.; i++){\n      p=1.-abs(p-1.);\n      float g=clamp(mr2*max(1.2/dot(p,p),1.),0.,1.);\n      p=p*scale*g+p0*off;\n      s=s*abs(scale)*g+off;\n    }\n    return length(cross(p,normalize(vec3(1))))/s-.005;\n  }"
  },
  {
    "id": "fractal_de82",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    #define hash(n) fract(sin(n*234.567+123.34))\n    float zoom=2.1;\n    p*=zoom;\n    float seed=dot(floor((p+3.5)/7.)+3.,vec3(123.12,234.56,678.22));\n    p-=clamp(p,-8.,8.)*2.;\n    float s=3.*zoom;\n    p=abs(p);\n    vec3  p0 = p*1.6;\n    for (float i=0.; i<10.; i++){\n      p=1.-abs(abs(p-2.)-1.);\n      float g=-8.*clamp(.43*max(1.2/dot(p,p),.8),0.,1.3);\n      s*=abs(g); p*=g; p+=p0;\n    }\n    return length(cross(p,normalize(vec3(1))))/s-.005;\n  }"
  },
  {
    "id": "fractal_de84",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p.z-=16.; float s=3.; float e=0.;\n    p.y=abs(p.y)-1.8;\n    p=clamp(p,-3.,3.)*2.-p;\n    s*=e=6./clamp(dot(p,p),1.5,50.);\n    p=abs(p)*e-vec3(0,1.8,0);\n    p.xz =.8-abs(p.xz-2.);\n    p.y =1.7-abs(p.y-2.);\n    s*=e=12./clamp(dot(p,p),1.0,50.);\n    p=abs(p)*e-vec2(.2,1).xyx;\n    p.y =1.5-abs(p.y-2.);\n    s*=e=16./clamp(dot(p,p),.1,9.);\n    p=abs(p)*e-vec2(.3,-.7).xyx;\n    return min(\n            length(p.xz)-.5,\n            length(vec2(length(p.xz)-12.,p.y))-3.\n            )/s;\n  }"
  },
  {
    "id": "fractal_de86",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    vec4 p = vec4(p0/10., 1.);\n    escape = 0.; p=abs(p);\n    for(int i = 0; i < 8; i++){\n      if(p.x > p.z)p.xz = p.zx;\n      if(p.z > p.y)p.zy = p.yz;\n      if(p.y > p.x)p.yx = p.xy;\n      p*=(1.3/clamp(dot(p.xyz,p.xyz),0.1,1.));\n      p.xyz-=vec3(.5,0.2,0.2);\n    }\n    float m = 1.5;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return (length(p.xyz)/p.w)*10.;\n  }"
  },
  {
    "id": "fractal_de87",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    vec4 p = vec4(p0/10., 1.);\n    escape = 0.; p=abs(p);\n    if(p.x < p.z)p.xz = p.zx;\n    if(p.z < p.y)p.zy = p.yz;\n    if(p.y < p.x)p.yx = p.xy;\n    for(int i = 0; i < 6; i++){\n      if(p.x < p.z)p.xz = p.zx;\n      if(p.z < p.y)p.zy = p.yz;\n      if(p.y < p.x)p.yx = p.xy;\n      p = abs(p);\n      p*=(1.9/clamp(dot(p.xyz,p.xyz),0.1,1.));\n      p.xyz-=vec3(0.2,1.9,0.6);\n    }\n    float m = 1.2;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return (length(p.xyz)/p.w)*10.;\n  }"
  },
  {
    "id": "fractal_de88",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    vec4 p = vec4(p0/10., 1.);\n    escape = 0.; p=abs(p);\n    if(p.x < p.z)p.xz = p.zx;\n    if(p.z < p.y)p.zy = p.yz;\n    if(p.y < p.x)p.yx = p.xy;\n    for(int i = 0; i < 6; i++){\n      if(p.x < p.z)p.xz = p.zx;\n      if(p.z < p.y)p.zy = p.yz;\n      if(p.y < p.x)p.yx = p.xy;\n      p = abs(p);\n      p*=(2./clamp(dot(p.xyz,p.xyz),0.1,1.));\n      p.xyz-=vec3(0.9,1.9,0.9);\n    }\n    float m = 1.5;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return (length(p.xyz)/p.w)*10.;\n  }"
  },
  {
    "id": "fractal_de89",
    "author": "Ivan Dianov",
    "code": "  float de(vec3 p){\n    #define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n    p.z-=.25;\n    float j=0.,c=0.,s=1.;\n    p.y = fract(p.y)-.5;\n    for(;j<10.;j++){\n      p=abs(p);\n      p-=vec2(.05,.5).xyx;\n      p.xz*=rot(1.6);\n      p.yx*=rot(.24);\n      p*=2.; s*=2.;\n    }\n    return (length(p)-1.)/s*.5;\n  }"
  },
  {
    "id": "fractal_de90",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    float j = 0.5;\n    for(p.xz=mod(p.xz,6.)-3.;++j<9.;p=3.*p-.9)\n      p.xz=abs(p.xz),\n      p.z>p.x?p=p.zyx:p,\n      p.y>p.z?p=p.xzy:p,\n      p.z--,\n      p.x-=++p.y*.5;\n    return min(.2,p.x/4e3-.2);\n  }"
  },
  {
    "id": "fractal_de91",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=4.;\n    float l=0;\n    p.z-=.9;\n    vec3 q=p;\n    s=2.;\n    for(int j=0;j++<9;)\n      p-=clamp(p,-1.,1.)*2.,\n      p=p*(l=8.8*clamp(.72/min(dot(p,p),2.),0.,1.))+q,\n      s*=l;\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de92",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=3., l=0.;\n    vec3 q=p;\n    p=mod(p,4.)-2.;\n    p=abs(p);\n    for(int j=0;j++<8;)\n      p=1.-abs(p-1.),\n      p=p*(l=-1.*max(1./dot(p,p),1.))+.5,\n      s*=l;\n    return max(.2-length(q.xy),length(p)/s);\n  }"
  },
  {
    "id": "fractal_de93",
    "author": "eiffie",
    "code": "  float de(vec3 p){\n    const int iters=5;\n    const int iter2=3;\n    const float scale=3.48;\n    const vec3 offset=vec3(1.9,0.0,2.56);\n    const float psni=pow(scale,-float(iters));\n    const float psni2=pow(scale,-float(iter2));\n    p = abs(mod(p+3., 12.)-6.)-3.;\n    vec3 p2;\n    for (int n = 0; n < iters; n++) {\n      if(n==iter2)p2=p;\n      p = abs(p);\n      if (p.x < p.y)p.xy = p.yx;\n      p.xz = p.zx;\n      p = p*scale - offset*(scale-1.0);\n      if(p.z<-0.5*offset.z*(scale-1.0))\n      p.z+=offset.z*(scale-1.0);\n    }\n    float d1=(length(p.xy)-1.0)*psni;\n    float d2=length(max(abs(p2)-vec3(0.2,5.1,1.3),0.0))*psni2;\n    escape=(d1 < d2)?0.:1.;\n    return min(d1,d2);\n  }"
  },
  {
    "id": "fractal_de94",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    p=fract(p)-.5;\n    vec3 O=vec3(2.,0,3.);\n    for(int j=0;j++<7;){\n      p=abs(p);\n      p=(p.x < p.y?p.zxy:p.zyx)*3.-O;\n      if(p.z < -.5*O.z)\n      p.z+=O.z;\n    }\n    return length(p.xy)/3e3;\n  }"
  },
  {
    "id": "fractal_de95",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    p=fract(p)-.5;\n    vec3 O=vec3(2.,0,5.);\n    for(int j=0;j++<7;){\n      p=abs(p);\n      p=(p.x < p.y?p.zxy:p.zyx)*3.-O;\n      if(p.z < -.5*O.z)\n      p.z+=O.z;\n    }\n    return length(p.xy)/3e3;\n  }"
  },
  {
    "id": "fractal_de96",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    vec3 a=vec3(.5);\n    p.z-=55.; p = abs(p);\n    float s=2., l=0.;\n    for(int j=0;j++<8;)\n      p=-sign(p)*(abs(abs(abs(p)-2.)-1.)-1.),\n      s*=l=-2.12/max(.2,dot(p,p)),\n      p=p*l-.55;\n    return dot(p,a)/s;\n  }"
  },
  {
    "id": "fractal_de97",
    "author": "adapted from gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    vec3 a=vec3(.5);\n    p.z-=55.;\n    float s=2., l=0.;\n    for(int j=0;j++<8;)\n      p=-sign(p)*(abs(abs(abs(p)-2.)-1.)-1.),\n      s*=l=-2.12/max(.2,dot(p,p)),\n      p=p*l-.55;\n    return dot(p,a)/s;\n  }"
  },
  {
    "id": "fractal_de98",
    "author": "adapted from gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    vec3 a=vec3(.5, 0.1, 0.2);\n    p.z-=55.;\n    float s=2., l=0.;\n    for(int j=0;j++<8;)\n      p=-sign(p)*(abs(abs(abs(p)-2.)-1.)-1.),\n      s*=l=-2.12/max(.2,dot(p,p)),\n      p=p*l-.55;\n    return dot(p,a)/s;\n  }"
  },
  {
    "id": "fractal_de99",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e=1.,s=2.,l;\n    vec3 a=vec3(.5);\n    p.z-=55.; p=abs(p);\n    for(int j=0;j++<8;)\n      p=-sign(p)*(abs(abs(abs(p)-2.)-1.)-1.),\n      s*=l=-1.55/max(.4,dot(p,p)),\n      p=p*l-.535;\n    return dot(p,a)/s;\n  }"
  },
  {
    "id": "fractal_de100",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e,R,S;vec3 q;\n    q=p*2.;\n    R=7.;\n    for(int j=0;j++<9;){\n      p=-sign(p)*(abs(abs(abs(p)-2.)-1.)-1.);\n      S=-9.*clamp(.7/min(dot(p,p),3.),0.,1.);\n      p=p*S+q; R=R*abs(S);\n    }\n    return length(p)/R;\n  }"
  },
  {
    "id": "fractal_de101",
    "author": "gaziya5 aka gaz",
    "code": "  void rot101(inout vec3 p,vec3 a,float t){\n  \ta=normalize(a);\n  \tvec3 u=cross(a,p),v=cross(a,u);\n  \tp=u*sin(t)+v*cos(t)+a*dot(a,p);\n  }\n  #define G dot(p,vec2(1,-1)*.707)\n  #define V v=vec2(1,-1)*.707\n  void sfold101(inout vec2 p){\n    vec2 v=vec2(1,-1)*.707;\n    float g=dot(p,v);\n    p-=(G-sqrt(G*G+.01))*v;\n  }\n  float de(vec3 p){\n    float k=.01;\n    for(int i=0;i<8;i++){\n      p=abs(p)-1.;\n      sfold101(p.xz);\n      sfold101(p.yz);\n      sfold101(p.xy);\n      rot101(p,vec3(1,2,2),.6);\n      p*=2.;\n    }\n    return length(p.xy)/exp2(8.)-.01;\n  }"
  },
  {
    "id": "fractal_de102",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    #define V vec2(.7,-.7)\n    #define G(p)dot(p,V)\n    float i=0.,g=0.,e=1.;\n    float t = 0.34; // change to see different behavior\n    for(int j=0;j++<8;){\n      p=abs(rotate3D(0.34,vec3(1,-3,5))*p*2.)-1.,\n      p.xz-=(G(p.xz)-sqrt(G(p.xz)*G(p.xz)+.05))*V;\n    }\n    return length(p.xz)/3e2;\n  }\n"
  },
  {
    "id": "fractal_de103",
    "author": "Kali",
    "code": "  float de(vec3 p) {\n    const float width=.22;\n    const float scale=4.;\n    float t=0.2;\n    float dotp=dot(p,p);\n    p.x+=sin(t*40.)*.007;\n    p=p/dotp*scale;\n    p=sin(p+vec3(sin(1.+t)*2.,-t,-t*2.));\n    float d=length(p.yz)-width;\n    d=min(d,length(p.xz)-width);\n    d=min(d,length(p.xy)-width);\n    d=min(d,length(p*p*p)-width*.3);\n    return d*dotp/scale;\n  }"
  },
  {
    "id": "fractal_de106",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    float i,a,n,h,d=1.,t=0.3; // change t for different behavior\n    vec3 q;\n    n=.4;\n    for(a=1.;a<2e2;n+=q.x*q.y*q.z/a)\n      p.xy*=rotate2D(a+=a),\n      q=cos(p*a+t);\n    return n*.3;\n  }"
  },
  {
    "id": "fractal_de107",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    vec3 z,q;\n    p.z -= 9.; z=p;\n    float a=1.,n=.9;\n    for(int j=0;j++<15;){\n      p.xy*=rotate2D(float(j*j));\n      a*=.66;\n      q=sin(p*=1.5);\n      n+=q.x*q.y*q.z*a;\n    }\n    return (n*.2-z.z*.2);\n  }"
  },
  {
    "id": "fractal_de108",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    vec3 q;\n    float s=1., a=1., n=.5;\n    for(int j=0;j++<9;){\n      p.xy*=rotate2D(float(j*j));\n      a*=.5; q=sin(p+=p);\n      n+=q.x*q.y*q.z*a;\n    }\n    return n*.2;\n  }"
  },
  {
    "id": "fractal_de109",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    float h,d=1.,i,u,s, t = 0.8; // vary t for different behavior\n    p+=vec3(1,1,sin(t/4.)*3.);\n    s=2.;\n    for(int j=0;j<9;j++){\n      p.xy*=rotate2D(t/4.);\n      u=4./3./dot(p,p);\n      s*=u;\n      p=mod(1.-p*u,2.)-1.;\n    }\n    return (length(p)/s);\n  }"
  },
  {
    "id": "fractal_de110",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,d=1.,s,h;\n    vec3 e,q;\n    s=2.;h=.3;\n    for(int j=0;j++<8;){\n      p=abs(p)-1.; q=p;\n      for(int k=0;++k<3;)\n        p-=clamp(dot(q,e=vec3(9>>k&1,k>>1&1,k&1)-.5),-h,h)*e*2.;\n      p*=1.4;s*=1.4;\n    }\n    return length(p)/(4.*s);\n  }"
  },
  {
    "id": "fractal_de111",
    "author": "gaziya5 aka gaz",
    "code": "  float  de(vec3 p){\n    float i,g,e=1.,s,l;\n    p.z-=9.; s=2.;\n    p=abs(p);\n    for(int j=0;j++<6;)\n      p=-sign(p)*(abs(abs(abs(p)-2.)-1.)-1.),\n      p*=l=-2./max(.3,sqrt(min(min(p.x,p.y),p.z))),\n      p-=2., s*=l;\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de112",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e,s;\n    vec3 q=p; s=5.;\n    for(int j=0;j++<6;s*=e)\n      p=sign(p)*(1.7-abs(p-1.7)),\n      p=p*(e=8./clamp(dot(p,p),.3,5.))+q-vec3(.8,12,.8);\n    return length(p.yz)/s;\n  }"
  },
  {
    "id": "fractal_de113",
    "author": "adapted from code by catzpaw",
    "code": "  float de(vec3 p){\n    float k = M_PI*2.;\n    vec3 v = vec3(0.,3.,fract(k));\n    return (length(cross(p=cos(p+v),p.zxy))-0.1)*0.4;\n  }"
  },
  {
    "id": "fractal_de114",
    "author": "adapted from code by catzpaw",
    "code": "  float de(vec3 p){\n    float k = M_PI*2.;\n    vec3 v = vec3(0.,3.,fract(k));\n    return (length(cross(cos(p+v),p.zxy))-0.4)*0.2;\n  }"
  },
  {
    "id": "fractal_de115",
    "author": "catzpaw",
    "code": "  float de(vec3 p){  (distance bound doesn't hold)\n    vec3 v=vec3(0,1.5,6.3);\n    return min(6.-length((p-v).xy+sin(p.yx)),\n      dot(cos(p),sin(p.yzx)))+sin(sin(p.z*3.5)+v.z)*.1+1.;\n  }"
  },
  {
    "id": "fractal_de116",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p.z-=80.; p=abs(p);\n    float s=3., l=0.;\n    for(int j=0;j++<8;)\n      p=-sign(p)*(abs(abs(abs(p)-2.)-1.)-1.),\n      p*=l=-.8/min(2.,length(p)),\n      p-=.5, s*=l;\n    return (length(p)/s)-0.1;\n  }"
  },
  {
    "id": "fractal_de117",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s = 1.;\n    for(int j=0;j<7;j++)\n      p=mod(p-1.,2.)-1.,\n      p*=1.2, s*=1.2,\n      p=abs(abs(p)-1.)-1.;\n    return (length(cross(p,normalize(vec3(2,2.03,1))))/s)-0.02;\n  }"
  },
  {
    "id": "fractal_de118",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., l=0.;\n    p=abs(p);\n    for(int j=0;j++<8;)\n      p=1.-abs(abs(p-2.)-1.),\n      p*=l=1.2/dot(p,p), s*=l;\n    return dot(p,normalize(vec3(3,-2,-1)))/s;\n  }"
  },
  {
    "id": "fractal_de119",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., l=0.;\n    p=abs(p);\n    for(int j=0;j++<8;)\n      p=-sign(p)*(abs(abs(abs(p)-2.)-1.)-1.),\n      p*=l=-1.3/dot(p,p),\n      p-=.15, s*=l;\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de120",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p.z-=20;\n    float s=3., l=0.;\n    p=abs(p);\n    for(int j=0;j++<10;)\n      p=-sign(p)*(abs(abs(abs(p)-2.)-1.)-1.),\n      p*=l=-1./max(.19,dot(p,p)),\n      p-=.24, s*=l;\n    return (length(p)/s);\n  }"
  },
  {
    "id": "fractal_de121",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., l=0.;\n    p=abs(mod(p-1.,2.)-1.);\n    for(int j=0;j++<8;)\n      p=1.-abs(abs(abs(p-5.)-2.)-2.),\n      p*=l=-1.3/dot(p,p),\n      p-=vec3(.3,.3,.4), s*=l;\n    return length(p.yz)/s;\n  }"
  },
  {
    "id": "fractal_de122",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e=1.,R,S;\n    vec3 q=p*8.; R=8.;\n    for(int j=0;j++<6;)\n      p=-sign(p)*(abs(abs(abs(p)-2.)-1.)-1.),\n      S=-5.*clamp(1.5/dot(p,p),.8,5.),\n      p=p*S+q, R*=S;\n    return length(p)/R;\n  }"
  },
  {
    "id": "fractal_de124",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e,s=2.,k;\n    vec3 q;\n    p=vec3(length(p.xy)-PI,atan(p.y,p.x)*PI,p.z);\n    p.yz=mod(p.yz,4.)-2.;\n    p=abs(p); q=p;\n    for(int j=0;++j<5;)\n      p=1.-abs(p-1.),\n      p=-p*(k=max(3./dot(p,p),3.))+q, s*=k;\n    return length(p.xz)/s;\n  }"
  },
  {
    "id": "fractal_de125",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e,R=2.,S;\n    for(int j=0;j++<9;)\n      p=1.-abs(p-1.),\n      p*=S=(j%3>1)?1.3:1.2/dot(p,p),\n      R*=S;\n    return length(cross(p,vec3(.5)))/R-5e-3;\n  }"
  },
  {
    "id": "fractal_de126",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2.,r2;\n    p=abs(p);\n    for(int i=0; i<12;i++){\n      p=1.-abs(p-1.);\n      r2=(i%3==1)?1.1:1.2/dot(p,p);\n      p*=r2; s*=r2;\n    }\n    return length(cross(p,normalize(vec3(1))))/s-0.005;\n  }"
  },
  {
    "id": "fractal_de127",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e,s=3.,l;\n    vec3 q=p;\n    for(int j=0;j++<9;)\n      p=mod(p-1.,2.)-1.,\n      l=1.2/pow(pow(dot(pow(abs(p),vec3(5)),vec3(1)),.2),1.6),\n      p*=l, s*=l;\n    return abs(p.y)/s;\n  }"
  },
  {
    "id": "fractal_de128",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e,s=4.,l;\n    vec3 q=p;\n    for(int j=0;j++<9;)\n      p=mod(p-1.,2.)-1.,\n      l=1.2/dot(p,p),\n      p*=l, s*=l;\n    return abs(p.y)/s;\n  }"
  },
  {
    "id": "fractal_de129",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e,s=1.,l;\n    vec3 q=p;\n    for(int j=0;j++<4;)\n      p=mod(p-1.,2.)-1.,\n      l=2./dot(p,p),\n      p*=l, s*=l;\n    return length(p.xy)/s;\n  }"
  },
  {
    "id": "fractal_de130",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    #define F1(s)p.s=abs(p.s)-1.\n    p+=vec3(0,3.8,5.);\n    vec3 q=p;\n    p=mod(p,vec3(8,8,2))-vec3(4,4,1);\n    F1(yx); F1(yx); F1(xz);\n    return min(length(cross(p,vec3(.5)))-.03,length(p.xy)-.05);\n  }"
  },
  {
    "id": "fractal_de131",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float l,s=3.;\n    float t = 4.5;\n    for(int j=0;j++<5;p.xy=fract(p.xy+p.x)-.5)\n      p=vec3(log(l=length(p.xy)),atan(p.y,p.x)/PI*2.,p.z/l+1.),\n      s*=.5*l;\n    return abs(p.z)*s;\n  }"
  },
  {
    "id": "fractal_de133",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e,R,S;\n    vec3 q=p; R=2.;\n    for(int j=0;j++<9;)\n      p-=clamp(p,-1.,1.)*2.,\n      S=9.*clamp(.7/min(dot(p,p),3.),0.,1.),\n      p=p*S+q,\n      R=R*abs(S)+1.,\n      p=p.yzx;\n    return length(p)/R;\n  }"
  },
  {
    "id": "fractal_de134",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e,R=1.,S;\n    vec3 q=p;\n    for(int j=0;j++<9;)\n      p-=clamp(p,-1.,1.)*2.,\n      S=6.*clamp(.2/min(dot(p,p),7.),0.,1.),\n      p=p*S+q*.7,  R=R*abs(S)+.7;\n    return length(p)/R;\n  }"
  },
  {
    "id": "fractal_de135",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e,R,S;\n    vec3 q;\n    p.z-=3.;\n    q=p; R=1.;\n    for(int j=0;j++<9;)\n      p-=clamp(p,-.9,.9)*2.,\n      S=9.*clamp(.1/min(dot(p,p),1.),0.,1.),\n      p=p*S+q, R=R*S+1.;\n    return .7*length(p)/R;\n  }"
  },
  {
    "id": "fractal_de136",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g,e,R,S;\n    vec3 q;\n    p.z-=4.;\n    q=p; R=1.;\n    for(int j=0;j++<9;)\n      p-=clamp(p,-1.,1.)*2.,\n      S=9.*clamp(.3/min(dot(p,p),1.),0.,1.),\n      p=p*S+q*.5,\n      R=R*abs(S)+.5;\n    return .6*length(p)/R-1e-3;\n  }"
  },
  {
    "id": "fractal_de137",
    "author": "takusakuw",
    "code": "  float de(vec3 p){\n    return length(sin(p)+cos(p*.5))-.4;\n  }"
  },
  {
    "id": "fractal_de138",
    "author": "yosshin",
    "code": "  float de(vec3 p){\n    return min(.65-length(fract(p+.5)-.5),p.y+.2);\n  }"
  },
  {
    "id": "fractal_de139",
    "author": "takusakuw",
    "code": "  float de(vec3 p){\n    return (length(sin(p.zxy)-cos(p.zzx))-.5);\n  }"
  },
  {
    "id": "fractal_de140",
    "author": "yuruyurau",
    "code": "  float de(vec3 p){\n    #define b(p)length(max(abs(mod(p,.8)-.4)-.05,0.))\n    vec3 l;\n    p=cos(p)-vec3(.3), p.yx*=mat2(cos(.8+vec4(0,3,5,0)));\n    return min(min(b(p.xy),b(p.xz)),b(p.yz));\n  }"
  },
  {
    "id": "fractal_de141",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    #define F1(a,n)a=abs(a)-n,a=vec2(a.x*.5+a.y,a.x-a.y*.5)\n    p=fract(p)-.5;\n    for(int j=0;j++<8;)\n      F1(p.zy,.0),\n      F1(p.xz,.55);\n    return .4*length(p.yz)-2e-3;\n  }"
  },
  {
    "id": "fractal_de142",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    #define M(a)mat2(cos(a+vec4(0,2,5,0)))\n    #define F1(a)for(int j=0;j<5;j++)p.a=abs(p.a*M(3.));(p.a).y-=3.\n    float t = 0.96;\n    p.z-=9.;\n    p.xz*=M(t);\n    F1(xy);\n    F1(zy);\n    return dot(abs(p),vec3(.3))-.5;\n  }"
  },
  {
    "id": "fractal_de143",
    "author": "adapted from code by alia",
    "code": "  float de(vec3 p){\n    vec3 q=fract(p)-.5;\n    float f=-length(p.xy)+2., g=length(q)-.6;\n    return max(f,-g);\n  }"
  },
  {
    "id": "fractal_de144",
    "author": "adapted from code by wrighter",
    "code": "  float de(vec3 p){ // has aliasing issues\n    vec3 a = sin(p/dot(p,p)*4);\n    return 0.95*min(length(a.yx),length(a.yz))-0.52+0.2;\n  }"
  },
  {
    "id": "fractal_de145",
    "author": "phi16",
    "code": "  float de(vec3 p){\n    return length(.05*cos(9.*p.y*p.x)+cos(p)-.1*cos(9.*(p.z+.3*p.x-p.y)))-1.;\n  }"
  },
  {
    "id": "fractal_de146",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    vec3 q=p;\n    float s=5., e=0.;\n    for(int j=0;j++<8;s*=e)\n      p=sign(p)*(1.-abs(abs(p-2.)-1.)),\n      p=p*(e=6./clamp(dot(p,p),.1,3.))-q*vec3(2,8,5);\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de147",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float e=2., s=0., z=0.;\n    for(int j=0;++j<6;p=abs(p)-1.5,e/=s=min(dot(p,p),.75),p/=s);\n    z+=length(p.xz)/e;\n    return z;\n  }"
  },
  {
    "id": "fractal_de148",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    float i,j,e,g,h,s;\n    p.y-=p.z*.5;\n    for(j=s=h=.01;j++<9.;s+=s)\n      p.xz*=rotate2D(2.),\n      h+=abs(sin(p.x*s)*sin(p.z*s))/s;\n    return max(0.,p.y+h);\n  }"
  },
  {
    "id": "fractal_de149",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    float i,g,e,s,q;\n    q=length(p)-1.;\n    p.y++;\n    s=3.;\n    for(int i=0;i++<7;p=vec3(0,5,0)-abs(abs(p)*e-3.))\n      s*=e=max(1.,14./dot(p,p));\n    return max(q,min(1.,length(p.xz)-.3))/s;\n  }"
  },
  {
    "id": "fractal_de150",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., e=0.;\n    for(int i=0;i++<8;p=abs(p)*e)\n      p=vec3(.8,2,1)-abs(p-vec3(1,2,1)),\n      s*=e=1.3/clamp(dot(p,p),.1,1.2);\n    return min(length(p.xz),p.y)/s+.001;\n  }"
  },
  {
    "id": "fractal_de151",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float i,g=.3,e,s=2.,q;\n    for(int i=0;i++<7;p=vec3(2,5,1)-abs(abs(abs(p)*e-3.)-vec3(2,5,1)))\n      s*=e=12./min(dot(p,p),12.);\n    return min(1.,length(p.xz)-.2)/s;\n  }"
  },
  {
    "id": "fractal_de152",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q;\n    float i,d=1.,a,b=sqrt(3.);\n    Q=mod(p,b*2.)-b;\n    a=1.; d=9.;\n    for(int j=0;j++<7;){\n      Q=abs(Q);\n      d=min(d,(dot(Q,vec3(1)/b)-1.)/a);\n      Q=Q*3.-6./b;a*=3.;\n    }\n    return d;\n  }"
  },
  {
    "id": "fractal_de153",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    float i,d=1.,b=1.73;\n    vec3 Q=mod(p,b*2.)-b;\n    for(int j=0;j++<6;){\n      Q=abs(Q);\n      if(Q.y>Q.x)Q.xy=Q.yx;\n      if(Q.z>Q.x)Q.zx=Q.xz;\n      Q*=2.;\n      Q.x-=b;\n    }\n    return (dot(abs(Q),vec3(1)/b)-1.)/64.;\n  }"
  },
  {
    "id": "fractal_de154",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    return (length(vec2((length(vec2(length(p.xy)-1.3,\n      length(p.zy)-1.3))-.5), dot(cos(p*12.),sin(p.zxy*12.))*.1))-.02)*.3;\n  }"
  },
  {
    "id": "fractal_de156",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p.yz*=rotate2D(-.3);\n    float ss=3., s=1.;\n    for(int j=0; j++<7;){\n      p=abs(p); p.y-=.5;\n      s = 1./clamp(dot(p,p),.0,1.);\n      p*=s; ss*=s;\n      p-=vec2(1,.1).xxy;\n      p.xyz=p.zxy;\n    }\n    return length(p.xy)/ss-.01;\n  }"
  },
  {
    "id": "fractal_de157",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p.yz*=rotate2D(-.3);\n    float ss=3., s=1.;\n    for(int j=0; j++<7;){\n      p=abs(p); p.y-=.5;\n      s = 1./clamp(dot(p,p),.0,1.);\n      p*=s; ss*=s;\n      p-=vec2(1,.1).xxy;\n      p.xyz=p.zxy;\n    }\n    return length(max(abs(p)-.6,0.))/ss-.01;\n  }"
  },
  {
    "id": "fractal_de158",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., e;\n    for(int j=0;j++<8;){\n      p=.1-abs(p-.2);\n      p.x < p.z?p=p.zyx:p;\n      s*=e=1.6;\n      p=abs(p)*e-vec3(.1,3,1);\n      p.yz*=rotate2D(.8);\n    }\n    return length(p.yx)/s-.04;\n  }"
  },
  {
    "id": "fractal_de159",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., e;\n    for(int i=0;i++<8;){\n      p=.5-abs(p);\n      p.x < p.z?p=p.zyx:p;\n      p.z < p.y?p=p.xzy:p;\n      s*=e=1.6;\n      p=abs(p)*e-vec3(.5,30,5);\n      p.yz*=rotate2D(.3);\n    }\n    return length(p.xy)/s-.005;\n  }"
  },
  {
    "id": "fractal_de160",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=3.,e;\n    for(int i=0;i++<3;p=vec3(2,4,2)-abs(abs(p)*e-vec3(3,6,1)))\n      s*=e=1./min(dot(p,p),.6);\n    return min(length(p.xz),abs(p.y))/s+.001;\n  }"
  },
  {
    "id": "fractal_de161",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=3., e;\n    s*=e=3./min(dot(p,p),50.);\n    p=abs(p)*e;\n    for(int i=0;i++<5;)\n      p=vec3(2,4,2)-abs(p-vec3(4,4,2)),\n      s*=e=8./min(dot(p,p),9.),\n      p=abs(p)*e;\n    return min(length(p.xz)-.1,p.y)/s;\n  }"
  },
  {
    "id": "fractal_de162",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    float s=3., offset=8., e;\n    for(int i=0;i++<9;p=vec3(2,4,2)-abs(abs(p)*e-vec3(4,4,2)))\n      s*=e=max(1.,(8.+offset)/dot(p,p));\n    return min(length(p.xz),p.y)/s;\n  }"
  },
  {
    "id": "fractal_de163",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p=sin(2.8*p+5.*sin(p*.3));\n    float s=2., e;\n    for(int i=0;i++<6;)\n      p=abs(p-1.7)-1.5,\n      s*=e=2.3/clamp(dot(p,p),.3,1.2),\n      p=abs(p)*e;\n    return length(p.zy)/s;\n  }"
  },
  {
    "id": "fractal_de164",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    p0=p0/10.;\n    p0 = mod(p0, 2.)-1.;\n    vec4 p = vec4(p0, 1.);\n    p=abs(p);\n    if(p.x < p.z)p.xz = p.zx;\n    if(p.z < p.y)p.zy = p.yz;\n    if(p.y < p.x)p.yx = p.xy;\n    for(int i = 0; i < 8; i++){\n      if(p.x < p.z)p.xz = p.zx;\n      if(p.z < p.y)p.zy = p.yz;\n      if(p.y < p.x)p.yx = p.xy;\n      p.xyz = abs(p.xyz);\n      p*=(1.6/clamp(dot(p.xyz,p.xyz),0.6,1.));\n      p.xyz-=vec3(0.7,1.8,0.5);\n      p*=1.2;\n    }\n    float m = 1.5;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return (length(p.xyz)/p.w)*10.;\n  }"
  },
  {
    "id": "fractal_de165",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=5., e;\n    p=p/dot(p,p)+1.;\n    for(int i=0;i++<8;p*=e)\n      p=1.-abs(p-1.),\n      s*=e=1.6/min(dot(p,p),1.5);\n    return length(cross(p,normalize(vec3(1))))/s-5e-4;\n  }"
  },
  {
    "id": "fractal_de166",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=3., e, offset = 1.; //offset can be adjusted\n    for(int i=0;i++<8;p*=e)\n      p=abs(p-vec3(1,3,1.5+offset*.3))-vec3(1,3.+offset*.3,2),\n      p*=-1., s*=e=7./clamp(dot(p,p),.7,7.);\n    return (p.z)/s+1e-3;\n  }"
  },
  {
    "id": "fractal_de167",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p=sin(p+3.*sin(p*.5));\n    float s=2., e;\n    for(int i=0;i++<5;)\n      p=abs(p-1.7)-1.3,\n      s*=e=2./min(dot(p,p),1.5),\n      p=abs(p)*e-1.;\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de168",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    #define M(p)p=vec2(sin(atan(p.x,p.y)*4.)/3.,1)*length(p),p.y-=2.\n    float i,g,e,s;\n    for(s=3.;s<4e4;s*=3.)\n      M(p.xy),\n      M(p.zy),\n      p*=3.;\n    return length(p.xy)/s-.001;\n  }"
  },
  {
    "id": "fractal_de169",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p=1.-abs(abs(p+sin(p))-1.);\n    p=p.x < p.y?p.zxy:p.zyx;\n    float s=5., l;\n    for(int j=0;j++<4;)\n      s*=l=2./min(dot(p,p),1.5),\n      p=abs(p)*l-vec3(2,1,3);\n    return length(p.yz)/s;\n  }"
  },
  {
    "id": "fractal_de170",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=3., e;\n    for(int j=0;++j<5;)\n      s*=e=1./min(dot(p,p),1.),\n      p=abs(p)*e-1.5;\n    return length(p.yz)/s;\n  }"
  },
  {
    "id": "fractal_de171",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., e;\n    for(int j=0;j++<8;)\n      s*=e=2./clamp(dot(p,p),.2,1.),\n      p=abs(p)*e-vec3(.5,8,.5);\n    return length(cross(p,vec3(1,1,-1)))/s;\n  }"
  },
  {
    "id": "fractal_de172",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    p.xz=mod(p.xz,2.)-1.;\n    vec3 q=p;\n    float s=2., e;\n    for(int j=0;j++<8;)\n      s*=e=2./clamp(dot(p,p),.5,1.),\n      p=abs(p)*e-vec3(.5,8,.5);\n    return max(q.y,length(p.xz)/s);\n  }"
  },
  {
    "id": "fractal_de173",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p.xz=abs(p.xz)-1.;\n    p.x>p.z?p=p.zyx:p;\n    float s=2., e;\n    for(int j=0;j++<7;)\n      s*=e=2.2/clamp(dot(p,p),.3,1.2),\n      p=abs(p)*e-vec3(1,8,.03);\n    return length(p.yz)/s;\n  }"
  },
  {
    "id": "fractal_de174",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., e;\n    for(int j=0;j++<7;)\n      s*=e=2.2/clamp(dot(p,p),.3,1.2),\n      p=abs(p)*e-vec3(1,8,1);\n    return length(cross(p,vec3(1,1,-1)))/s;\n  }"
  },
  {
    "id": "fractal_de175",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p.xz=mod(p.xz,2.)-1.;\n    float s=2., e;\n    for(int j=0;j++<8;)\n      s*=e=2./clamp(dot(p,p),.5,1.),\n      p=abs(p)*e-vec3(.5,8,.5);\n    return length(p.xz)/s;\n  }"
  },
  {
    "id": "fractal_de176",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2.,e;\n    for(int i=0;i<9;i++){\n      p=.5-abs(p-.5);\n      p.x < p.z?p=p.zyx:p;\n      p.z < p.y?p=p.xzy:p;\n      s*=e=2.4;\n      p=abs(p)*e-vec3(.1,13,5);\n    }\n    return length(p)/s-0.01;\n  }"
  },
  {
    "id": "fractal_de177",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., e;\n    for(int i=0;i++<7;){\n      p.xz=.8-abs(p.xz);\n      p.x < p.z?p=p.zyx:p;\n      s*=e=2.1/min(dot(p,p),1.);\n      p=abs(p)*e-vec3(1,18,9);\n    }\n    return length(p)/s-0.01;\n  }"
  },
  {
    "id": "fractal_de179",
    "author": "yonatan",
    "code": "  float de(vec3 p){\n    float n=1.+snoise3D(p), s=4., e;\n    for(int i=0;i++<7;p.y-=20.*n)\n      p.xz=.8-abs(p.xz),\n      p.x < p.z?p=p.zyx:p,\n      s*=e=2.1/min(dot(p,p),1.),\n      p=abs(p)*e-n;\n    return length(p)/s+1e-4;\n  }"
  },
  {
    "id": "fractal_de180",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=3., e;\n    for(int i=0;i++<8;)\n      p=mod(p-1.,2.)-1.,\n      s*=e=1.4/dot(p,p),\n      p*=e;\n    return length(p.yz)/s;\n  }"
  },
  {
    "id": "fractal_de181",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=4., e;\n    for(int i=0;i++<7;p.y-=10.)\n      p.xz=.8-abs(p.xz),\n      p.x < p.z?p=p.zyx:p,\n      s*=e=2.5/clamp(dot(p,p),.1,1.2),\n      p=abs(p)*e-1.;\n    return length(p)/s+.001;\n  }"
  },
  {
    "id": "fractal_de182",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., e;\n    for(int i=0;i++<10;){\n      p=.3-abs(p-.8);\n      p.x < p.z?p=p.zyx:p;\n      p.z < p.y?p=p.xzy:p;\n      s*=e=1.7;\n      p=abs(p)*e-vec3(1,50,5);\n    }\n    return length(p.xy)/s+.001;\n  }"
  },
  {
    "id": "fractal_de183",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=1., e, offset=0.26; // vary between 0 and 1\n    for(int i=0;i++<5;){\n      s*=e=2./min(dot(p,p),1.);\n      p=abs(p)*e-vec3(1,10.*offset,1);\n    }\n    return length(max(abs(p)-1.,0.))/s;\n  }"
  },
  {
    "id": "fractal_de184",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2.5, e;\n    p=abs(mod(p-1.,2.)-1.)-1.;\n    for(int j=0;j++<10;)\n      p=1.-abs(p-1.),\n      s*=e=-1.8/dot(p,p),\n      p=p*e-.7;\n    return abs(p.z)/s+.001;\n  }"
  },
  {
    "id": "fractal_de185",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., e;\n    for(int j=0;++j<8;s*=e=2./clamp(dot(p,p),.4,1.),p=abs(p)*e-vec3(2,1,.7));\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de186",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., e;\n    for(int j=0;++j<8;s*=e=2./clamp(dot(p,p),.4,1.),p=abs(p)*e-vec3(2,1,.7));\n    return length(p-clamp(p,-2.,2.))/s;\n  }"
  },
  {
    "id": "fractal_de187",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2., e;\n    for(int j=0;++j<18;s*=e=2./clamp(dot(p,p),.4,1.),p=abs(p)*e-vec3(2,1,.7));\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de188",
    "author": "amini",
    "code": "  float de(vec3 p){\n    float s=3., e;\n    s*=e=3./min(dot(p,p),50.);\n    p=abs(p)*e;\n    for(int i=0;i++<5;)\n      p=vec3(8,4,2)-abs(p-vec3(8,4,2)),\n      s*=e=8./min(dot(p,p),9.),\n      p=abs(p)*e;\n    return min(length(p.xz)-.1,p.y)/s;\n  }"
  },
  {
    "id": "fractal_de191",
    "author": "Kali",
    "code": "  float de(vec3 p){\n    p.x = abs(p.x) - 3.3;\n    p.z = mod(p.z + 2.0, 4.0) -  2.0;\n    vec4 q = vec4(p, 1);\n    q.xyz -= 1.0;\n    q.xyz = q.zxy;\n    for(int i = 0; i < 6; i++) {\n      q.xyz = abs(q.xyz + 1.0) - 1.0;\n      q /= clamp(dot(q.xyz, q.xyz), 0.25, 1.0);\n      q *= 1.1;\n      float s = sin(-0.35);\n      float c = cos(-0.35);\n      q.xy = mat2(c,s,-s,c)*q.xy;\n    }\n    return (length(q.xyz) - 1.5)/q.w;\n  }"
  },
  {
    "id": "fractal_de192",
    "author": "Kali",
    "code": "  float de(vec3 p){\n    p.xz=abs(.5-mod(p.xz,1.))+.01;\n    float DEfactor=1.;\n    for (int i=0; i<14; i++) {\n      p = abs(p)-vec3(0.,2.,0.);\n      float r2 = dot(p, p);\n      float sc=2./clamp(r2,0.4,1.);\n      p*=sc;\n      DEfactor*=sc;\n      p = p - vec3(0.5,1.,0.5);\n    }\n    return length(p)/DEfactor-.0005;\n  }"
  },
  {
    "id": "fractal_de193",
    "author": "Kali",
    "code": "  float de(vec3 pos){\n    vec3 tpos=pos;\n    tpos.xz=abs(.5-mod(tpos.xz,1.));\n    vec4 p=vec4(tpos,1.);\n    float y=max(0.,.35-abs(pos.y-3.35))/.35;\n    for (int i=0; i<7; i++) {\n      p.xyz = abs(p.xyz)-vec3(-0.02,1.98,-0.02);\n      p=p*(2.0+0.*y)/clamp(dot(p.xyz,p.xyz),.4,1.)-vec4(0.5,1.,0.4,0.);\n      p.xz*=mat2(-0.416,-0.91,0.91,-0.416);\n    }\n    return (length(max(abs(p.xyz)-vec3(0.1,5.0,0.1),vec3(0.0)))-0.05)/p.w;\n  }"
  },
  {
    "id": "fractal_de194",
    "author": "shane",
    "code": "  float de(vec3 p){\n    const vec3 offs = vec3(1, .75, .5); // Offset point.\n    const vec2 a = sin(vec2(0, 1.57079632) + 1.57/2.);\n    const mat2 m = mat2(a.y, -a.x, a);\n    const vec2 a2 = sin(vec2(0, 1.57079632) + 1.57/4.);\n    const mat2 m2 = mat2(a2.y, -a2.x, a2);\n    const float s = 5.; // Scale factor.\n    float d = 1e5; // Distance.\n    p  = abs(fract(p*.5)*2. - 1.);\n    float amp = 1./s;\n    for(int i=0; i<2; i++){\n      p.xy = m*p.xy;\n      p.yz = m2*p.yz;\n      p = abs(p);\n      p.xy += step(p.x, p.y)*(p.yx - p.xy);\n      p.xz += step(p.x, p.z)*(p.zx - p.xz);\n      p.yz += step(p.y, p.z)*(p.zy - p.yz);\n      p = p*s + offs*(1. - s);\n      p.z -= step(p.z, offs.z*(1. - s)*.5)*offs.z*(1. - s);\n      p=abs(p);\n      d = min(d, max(max(p.x, p.y), p.z)*amp);\n      amp /= s;\n    }\n    return d - .035;\n  }"
  },
  {
    "id": "fractal_de195",
    "author": "avi",
    "code": "  float de(vec3 p) {\n    const vec3 va = vec3(  0.0,  0.57735,  0.0 );\n    const vec3 vb = vec3(  0.0, -1.0,  1.15470 );\n    const vec3 vc = vec3(  1.0, -1.0, -0.57735 );\n    const vec3 vd = vec3( -1.0, -1.0, -0.57735 );\n    float a = 0.0;\n    float s = 1.0;\n    float r = 1.0;\n    float dm;\n    vec3 v;\n    for(int i=0; i<16; i++) {\n      float d, t;\n      d = dot(p-va,p-va);              v=va; dm=d; t=0.0;\n      d = dot(p-vb,p-vb); if( d < dm ) { v=vb; dm=d; t=1.0; }\n      d = dot(p-vc,p-vc); if( d < dm ) { v=vc; dm=d; t=2.0; }\n      d = dot(p-vd,p-vd); if( d < dm ) { v=vd; dm=d; t=3.0; }\n      p = v + 2.0*(p - v); r*= 2.0;\n      a = t + 4.0*a; s*= 4.0;\n    }\n    return (sqrt(dm)-1.0)/r;\n  }"
  },
  {
    "id": "fractal_de196",
    "author": "guil",
    "code": "  vec3 foldY(vec3 P, float c){\n    float r = length(P.xz);\n    float a = atan(P.z, P.x);\n    a = mod(a, 2.0 * c) - c;\n    P.x = r * cos(a);\n    P.z = r * sin(a);\n    return P;\n  }\n\n  float de(vec3 p){\n    float l= length(p)-1.;\n    float dr = 1.0, g = 1.25;\n    vec4 ot=vec4(.3,.5,0.21,1.);\n    ot = vec4(1.);\n    mat3 tr = rotate3D(-0.55, normalize(vec3(-1., -1., -0.5)));\n\n    for(int i=0;i<15;i++) {\n      if(i-(i/3)*5==0)\n      p = foldY(p, .95);\n      p.yz = abs(p.yz);\n      p = tr * p * g -1.;\n      dr *= g;\n      ot=min(ot,vec4(abs(p),dot(p,p)));\n      l = min (l ,(length(p)-1.) / dr);\n    }\n    return l;\n  }"
  },
  {
    "id": "fractal_de197",
    "author": "marvelousbilly",
    "code": "mat3 rotmat(float angle, vec3 axis){\n\taxis = normalize(axis);\n\tfloat s = sin(angle);\n\tfloat c = cos(angle);\n\tfloat oc = 1.0 - c;\n\treturn mat3(oc * axis.x * axis.x + c,  oc * axis.x * axis.y - axis.z * s,\n\t  oc * axis.z * axis.x + axis.y * s,  oc * axis.x * axis.y + axis.z * s,\n\t  oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s,\n\t  oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,\n\t  oc * axis.z * axis.z + c);\n}\nfloat de(vec3 p){\n  mat3 r = rotmat(3.14159, vec3(0.,1.,0.)); //rotation matrix\n  float scale= 2.;\n  int Iterations = 10;\n  int i;\n  vec3 C = vec3(1.,5.4,10.+10.*sin(0.5));\n  for(i = 0; i < Iterations; i++){\n    p = r * (p);\n    float x = p.x; float y = p.y; float z = p.z; float x1 = x; float y1 = y;\n    x=abs(x);y = abs(y);\n    if(x-y<0.){x1=y;y=x;x=x1;}\n    if(x-z<0.){x1=z;z=x;x=x1;}\n    if(y-z<0.){y1=z;z=y;y=y1;}\n\n    z-=0.5*C.z*(scale-1.)/scale;\n    z=-abs(-z);\n    z+=0.5*C.z*(scale-1.)/scale;\n\n    p = vec3(x,y,z);\n    r = rotmat(31.4159/4.+5.60,vec3(1.,0.5,0.6));\n    p = r * (p);\n    x = p.x; y = p.y; z = p.z;\n\n    x=scale*x-C.y*(scale-1.);\n    y=scale*y-C.y*(scale-1.);\n    z=scale*z;\n\n    p = vec3(x,y,z);\n  }\n  return (length(p) - 2.) * pow(scale,float(-i));\n}"
  },
  {
    "id": "fractal_de198",
    "author": "adapted from code by marvelousbilly",
    "code": "  float de(vec3 p){\n    mat3 r = rotate3D(3.14159, vec3(0.,1.,0.));\n    float scale= 2.;\n    int Iterations = 10;\n    int i;\n    vec3 C = vec3(1.,5.4,10.+10.*sin(0.5));\n    for(i = 0; i < Iterations; i++){\n      p = r * (p);\n      float x = p.x; float y = p.y; float z = p.z; float x1 = x; float y1 = y;\n\n      x=abs(x);y = abs(y);\n      if(x-y<0.){x1=y;y=x;x=x1;}\n      if(x-z<0.){x1=z;z=x;x=x1;}\n      if(y-z<0.){y1=z;z=y;y=y1;}\n\n      z-=0.5*C.z*(scale-1.)/scale;\n      z=-abs(-z);\n      z+=0.5*C.z*(scale-1.)/scale;\n\n      p = vec3(x,y,z);\n      r = rotate3D(31.4159/4.+5.60,vec3(1.,0.5,0.6));\n      p = r * (p);\n      x = p.x; y = p.y; z = p.z;\n\n      x=scale*x-C.y*(scale-1.);\n      y=scale*y-C.y*(scale-1.);\n      z=scale*z;\n\n      p = vec3(x,y,z);\n    }\n    return (length(p) - 2.) * pow(scale,float(-i));\n  }"
  },
  {
    "id": "fractal_de199",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    vec4 p = vec4(p0, 1.);\n    p.xyz=abs(p.xyz);\n    if(p.x > p.z)p.xz = p.zx;\n    if(p.z < p.y)p.zy = p.yz;\n    if(p.y > p.x)p.yx = p.xy;\n    for(int i = 0; i < 8; i++){\n      if(p.x > p.z)p.xz = p.zx;\n      if(p.z < p.y)p.zy = p.yz;\n      if(p.y > p.x)p.yx = p.xy;\n      p.xyz = abs(p.xyz);\n      p*=(2.15/clamp(dot(p.xyz,p.xyz),.4,1.));\n      p.xyz-=vec3(0.3,0.2,1.6);\n    }\n    float m = 1.5;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return length(p.xyz)/p.w;\n  }"
  },
  {
    "id": "fractal_de200",
    "author": "evilryu",
    "code": "  void ry(inout vec3 p, float a){\n    float c,s;vec3 q=p;\n    c = cos(a); s = sin(a);\n    p.x = c * q.x + s * q.z;\n    p.z = -s * q.x + c * q.z;\n  }\n  float plane(vec3 p, float y) {\n    return length(vec3(p.x, y, p.z) - p);\n  }\n  float menger_spone(in vec3 z0){\n    z0=z0.yzx;\n    vec4 z=vec4(z0,1.0);\n    vec3 offset =0.83*normalize(vec3(3.4,2., .2));\n    float scale = 2.;\n    for (int n = 0; n < 8; n++) {\n      z = abs(z);\n      ry(z.xyz, 1.5);\n      if (z.x < z.y)z.xy = z.yx;\n      if (z.x < z.z)z.xz = z.zx;\n      if (z.y < z.z)z.yz = z.zy;\n      ry(z.xyz, -1.21);\n      z = z*scale;\n      z.xyz -= offset*(scale-1.0);\n    }\n    return (length(max(abs(z.xyz)-vec3(1.0),0.0))-0.01)/z.w;\n  }\n  float de(vec3 p){\n    float d1 = plane(p, -0.5);\n    float d2 = menger_spone(p+vec3(0.,-0.1,0.));\n    float d = d1;\n    vec3 res = vec3(d1, 0., 0.);\n    if(d > d2){\n      d = d2;\n      res = vec3(d2, 1., 0.0);\n    }\n    return res.x;\n  }"
  },
  {
    "id": "fractal_de203",
    "author": "adapted from code by jorge2017a1",
    "code": "  float de( vec3 p ){\n    vec3  di = abs(p) - vec3(1.);\n    float mc = max(di.x, max(di.y, di.z));\n    float d =  min(mc,length(max(di,0.0)));\n    vec4 res = vec4( d, 1.0, 0.0, 0.0 );\n\n    const mat3 ma = mat3( 0.60, 0.00,  0.80,\n                          0.00, 1.00,  0.00,\n                          -0.20, 0.00,  0.30 );\n    float off = 0.0005;\n    float s = 1.0;\n    for( int m=0; m<4; m++ ){\n      p = ma*(p+off);\n      vec3 a = mod( p*s, 2.0 )-1.0;\n      s *= 3.0;\n      vec3 r = abs(1.0 - 3.0*abs(a));\n      float da = max(r.x,r.y);\n      float db = max(r.y,r.z);\n      float dc = max(r.z,r.x);\n      float c = (min(da,min(db,dc))-1.0)/s;\n      if( c > d )\n        d = c;\n    }\n    return d;\n  }"
  },
  {
    "id": "fractal_de204",
    "author": "unknown",
    "code": "  float de(vec3 p){\n    const float mr=0.25, mxr=1.0;\n    const vec4 scale=vec4(-3.12,-3.12,-3.12,3.12),p0=vec4(0.0,1.59,-1.0,0.0);\n    vec4 z = vec4(p,1.0);\n    for (int n = 0; n < 3; n++) {\n      z.xyz=clamp(z.xyz, -0.94, 0.94)*2.0-z.xyz;\n      z*=scale/clamp(dot(z.xyz,z.xyz),mr,mxr);\n      z+=p0;\n    }\n    z.y-=3.0*sin(3.0+floor(p.x+0.5)+floor(p.z+0.5));\n    float dS=(length(max(abs(z.xyz)-vec3(1.2,49.0,1.4),0.0))-0.06)/z.w;\n    return dS;\n  }"
  },
  {
    "id": "fractal_de211",
    "author": "shane",
    "code": "  mat2 rot2(in float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }\n  float de(vec3 p){\n    float d = 1e5;\n    const int n = 3;\n    const float fn = float(n);\n    for(int i = 0; i < n; i++){\n      vec3 q = p;\n      float a = float(i)*fn*2.422; //*6.283/fn\n      a *= a;\n      q.z += float(i)*float(i)*1.67; //*3./fn\n      q.xy *= rot2(a);\n      float b = (length(length(sin(q.xy) + cos(q.yz))) - .15);\n      float f = max(0., 1. - abs(b - d));\n      d = min(d, b) - .25*f*f;\n    }\n    return d;\n  }"
  },
  {
    "id": "fractal_de212",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float a=2.,s=3.,e,l=dot(p,p);\n    p=abs(p)-1.;\n    p.x < p.y?p=p.yxz:p;\n    p.x < p.z?p=p.zyx:p;\n    p.y < p.z?p=p.xzy:p;\n    for(int i=0;i<8;i++){\n      s*=e=2.1/clamp(dot(p,p),.1,1.);\n      p=abs(p)*e-vec3(.3*l,1,5.*l);\n    }\n    p-=clamp(p,-a,a);\n    return length(p)/s-0.;\n  }"
  },
  {
    "id": "fractal_de215",
    "author": "unknown",
    "code": "  float de(vec3 p0){\n    vec4 p = vec4(p0, 1.);\n\n    p.xyz=abs(p.xyz);\n    if(p.x < p.z)p.xz = p.zx;\n    if(p.z < p.y)p.zy = p.yz;\n    if(p.y < p.x)p.yx = p.xy;\n    for(int i = 0; i < 8; i++){\n      if(p.x < p.z)p.xz = p.zx;\n      if(p.z < p.y)p.zy = p.yz;\n      if(p.y > p.x)p.yx = p.xy;\n      p.xyz = abs(p.xyz);\n      p*=(1.8/clamp(dot(p.xyz,p.xyz),.0,1.));\n      p.xyz-=vec3(3.6,1.9,0.5);\n    }\n    float m = 1.5;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return length(p.xyz)/p.w;\n  }"
  },
  {
    "id": "fractal_de216",
    "author": "macbooktall",
    "code": "  float de(vec3 p0){\n    p0 = mod(p0, 2.)-1.;\n    vec4 p = vec4(p0, 1.);\n    p=abs(p);\n    if(p.x < p.z)p.xz = p.zx;\n    if(p.z < p.y)p.zy = p.yz;\n    if(p.y < p.x)p.yx = p.xy;\n    for(int i = 0; i < 8; i++){\n      if(p.x < p.z)p.xz = p.zx;\n      if(p.z < p.y)p.zy = p.yz;\n      if(p.y < p.x)p.yx = p.xy;\n      p.xyz = abs(p.xyz);\n      p*=(1.6/clamp(dot(p.xyz,p.xyz),0.6,1.));\n      p.xyz-=vec3(0.7,1.8,0.5);\n      p*=1.2;\n    }\n    float m = 1.5;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return length(p.xyz)/p.w;\n  }"
  },
  {
    "id": "fractal_de213",
    "author": "macbooktall",
    "code": "  void pR(inout vec2 p, float a) {\n  \tp = cos(a)*p + sin(a)*vec2(p.y, -p.x);\n  }\n\n  float de(vec3 p){\n    const int iterations = 20;\n    float d = -2.; // vary this parameter, range is like -20 to 20\n    p=p.yxz;\n    pR(p.yz, 1.570795);\n    p.x += 6.5;\n    p.yz = mod(abs(p.yz)-.0, 20.) - 10.;\n    float scale = 1.25;\n    p.xy /= (1.+d*d*0.0005);\n\n    float l = 0.;\n    for (int i=0; i < iterations; i++) {\n      p.xy = abs(p.xy);\n      p = p*scale + vec3(-3. + d*0.0095,-1.5,-.5);\n      pR(p.xy,0.35-d*0.015);\n      pR(p.yz,0.5+d*0.02);\n      vec3 p6 = p*p*p; p6=p6*p6;\n      l =pow(p6.x + p6.y + p6.z, 1./6.);\n    }\n    return l*pow(scale, -float(iterations))-.15;\n  }"
  },
  {
    "id": "fractal_de217",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    vec4 p = vec4(p0, 1.);\n    p.xyz=abs(p.xyz);\n    if(p.x < p.z)p.xz = p.zx;\n    if(p.z < p.y)p.zy = p.yz;\n    if(p.y < p.x)p.yx = p.xy;\n    for(int i = 0; i < 8; i++){\n      p.xyz = abs(p.xyz);\n      uint seed = uint(p.x+p.y+p.z);\n      p*=(2./clamp(dot(p.xyz,p.xyz),0.,1.));\n      p.xyz-=vec3(.6,.9,2.2);\n    }\n    float m = 1.0;\n    p.xyz-=clamp(p.xyz,-m,m);\n  }"
  },
  {
    "id": "fractal_de218",
    "author": "butadiene",
    "code": "float pi = acos(-1.);\nmat2 rot(float r){\n  vec2 s = vec2(cos(r),sin(r));\n  return mat2(s.x,s.y,-s.y,s.x);\n}\nfloat cube(vec3 p,vec3 s){\n  vec3 q = abs(p);\n  vec3 m = max(s-q,0.);\n  return length(max(q-s,0.))-min(min(m.x,m.y),m.z);\n}\nfloat tet(vec3 p,vec3 offset,float scale){\n  vec4 z = vec4(p,1.);\n  for(int i = 0;i<12;i++){\n    if(z.x+z.y<0.0)z.xy = -z.yx;\n    if(z.x+z.z<0.0)z.xz = -z.zx;\n    if(z.z+z.y<0.0)z.zy = -z.yz;\n    z *= scale;\n    z.xyz += offset*(1.0-scale);\n  }\n  return (cube(z.xyz,vec3(1.5)))/z.w;\n}\nfloat de(vec3 p){\n  p.xy *= rot(pi);\n\n  float np = 2.*pi/24.;\n  float r = atan(p.x,p.z)-0.5*np;\n  r = mod(r,np)-0.5*np;\n  p.xz = length(p.xz)*vec2(cos(r),sin(r));\n\n  p.x -= 5.1;\n  p.xy *= rot(0.3);\n  p.xz *= rot(0.25*pi);\n\n  p.yz *= rot(pi*0.5);\n  float s =1.;\n  p.z = abs(p.z)-3.;\n  p = abs(p)-s*8.;\n  p = abs(p)-s*4.;\n  p = abs(p)-s*2.;\n  p = abs(p)-s*1.;\n  vec3 col = vec3(0.082,0.647,0.894);\n  return tet(p,vec3(1),1.8);\n}"
  },
  {
    "id": "fractal_de219",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p.y+=1.4;\n    //p.xz*=rotate2D(t*.5+.5);\n    for(int j=0;++j<9;)\n      p=abs(p),\n      p.xy*=rotate2D(-9.78),\n      p.x<p.y?p=p.yxz:p,\n      p.x<p.z?p=p.zyx:p,\n      p.y<p.z?p=p.xzy:p,\n      p.yz*=rotate2D(-1.16),\n      p=1.9*p-vec3(1,1,-1);\n    return length(p-clamp(p,-5.,5.))/500.;\n  }"
  },
  {
    "id": "fractal_de220",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    float s=2.;\n    float e = 0;\n    float l=dot(p,p);\n    p=abs(abs(p)-.4)-.2;\n    p.x<p.y?p=p.yxz:p;\n    p.y<p.z?p=p.xzy:p;\n    for(int i=0;i++<8;){\n      s*=e=2./min(dot(p,p),1.3);\n      p=abs(p)*e-vec2(l,16.).xxy;\n    }\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de221",
    "author": "kamoshika",
    "code": "  mat2 rotate2D(float r){\n    return mat2(cos(r), sin(r), -sin(r), cos(r));\n  }\n  float de(vec3 p){\n    float d, a;\n    d=a=1.;\n    for(int j=0;j++<9;)\n      p.xz=abs(p.xz)*rotate2D(PI/4.),\n      d=min(d,max(length(p.zx)-.3,p.y-.4)/a),\n      p.yx*=rotate2D(.5),\n      p.y-=3.,\n      p*=1.8,\n      a*=1.8;\n    return d;\n  }"
  },
  {
    "id": "fractal_de222",
    "author": "Nameless",
    "code": "  float de(vec3 p){\n    float s=3., e;\n    s*=e=3./min(dot(p,p),20.);\n    p=abs(p)*e;\n    escape = 0.;\n    for(int i=0;i++<12;){\n      p=vec3(1,4,2)-abs(p-vec3(2,4,2)),\n      s*=e=8./min(dot(p,p),12.),\n      p=abs(p)*e;\n      escape += exp(-0.2*dot(p,p));\n    }\n    return min(length(p.xz)-.1,p.y)/s;\n  }"
  },
  {
    "id": "fractal_de223",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    vec4 p = vec4(p0,3.);\n    escape = 0.;\n    p*= 2./min(dot(p.xyz,p.xyz),30.);\n    for(int i = 0; i < 14; i++){\n      p.xyz = vec3(2.,4.,2.)-(abs(p.xyz)-vec3(2.,4.,2.));\n      p.xyz = mod(p.xyz-4., 8.)-4.;\n      p *= 9./min(dot(p.xyz,p.xyz),12.);\n      escape += exp(-0.2*dot(p.xyz,p.xyz));\n    }\n    p.xyz -= clamp(p.xyz, -1.2,1.2);\n    return length(p.xyz)/p.w;\n  }"
  },
  {
    "id": "fractal_de224",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    vec4 p = vec4(p0,3.);\n    escape = 0.;\n    p*= 2./min(dot(p.xyz,p.xyz),30.);\n    for(int i = 0; i < 14; i++){\n      p.xyz = vec3(2.,4.,2.)-(abs(p.xyz)-vec3(1.,4.,2.));\n      p.xyz = mod(p.xyz-4., 8.)-4.;\n      p *= 9./min(dot(p.xyz,p.xyz),12.);\n      escape += exp(-0.2*dot(p.xyz,p.xyz));\n    }\n    p.xyz -= clamp(p.xyz, -1.2,1.2);\n    return length(p.xyz)/p.w;\n  }"
  },
  {
    "id": "fractal_de225",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    vec4 p = vec4(p0,3.);\n    escape = 0.;\n    p*= 2./min(dot(p.xyz,p.xyz),30.);\n    for(int i = 0; i < 16; i++){\n      p.xyz = vec3(2.,4.1,1.)-(abs(p.xyz)-vec3(1.,4.1,3.));\n      p.xyz = mod(p.xyz-4., 8.)-4.;\n      p *= 9./min(dot(p.xyz,p.xyz),12.);\n      escape += exp(-0.2*dot(p.xyz,p.xyz));\n    }\n    p.xyz -= clamp(p.xyz, -1.2,1.2);\n    return length(p.xyz)/p.w;\n  }"
  },
  {
    "id": "fractal_de226",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    p0 = mod(p0, 2.)-1.;\n    vec4 p = vec4(p0, 1.);\n    //escape = 0.;\n    p=abs(p);\n    for(int i = 0; i < 8; i++){\n      if(p.x > p.z)p.xz = p.zx;\n      if(p.z > p.y)p.zy = p.yz;\n      if(p.y > p.x)p.yx = p.xy;\n      p*=(1.4/clamp(dot(p.xyz,p.xyz),0.1,1.));\n      p.xyz = vec3(2.,4.,2.)-(abs(p.xyz - vec3(2.,4.,1.)));\n      //escape += exp(-0.2*dot(p.xyz,p.xyz));\n    }\n    float m = 1.5;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return length(p.xyz)/p.w;\n  }"
  },
  {
    "id": "fractal_de227",
    "author": "Nameless",
    "code": "  float de(vec3 p){\n    float s = 1.;\n    float t = 999.;\n    for(int i = 0; i < 12; i++){\n      float k =  1.3/clamp(dot(p,p),0.1,1.);\n      p *= k; s *= k;\n      p=abs(p)-vec3(6.2,2.,1.7);\n      p=mod(p-1.,2.)-1.;\n      t = min(t, length(p)/s);\n    }\n    return t;\n  }"
  },
  {
    "id": "fractal_de228",
    "author": "unknown",
    "code": "  float de(vec3 p){\n    float s = 1.;\n    escape = 0.;\n    float t = 999.;\n    for(int i = 0; i < 12; i++){\n      p=abs(p);\n      p.yz = (p.y > p.z)?p.zy:p.yz;\n      p.xz = (p.x > p.z)?p.zx:p.xz;\n      p.yx = (p.y > p.x)?p.xy:p.yx;\n      s *= 4.0/clamp(dot(p,p),0., 11.);\n      p *= 4.0/clamp(dot(p,p), 0., 11.);\n      p = vec3(2.,4.,2.)-abs(p-vec3(2.,4.,2.));\n      t = min(t, (abs(p.x)/s)*0.76);\n      escape += exp(-0.4*dot(p,p));\n    }\n    return t;\n  }"
  },
  {
    "id": "fractal_de229",
    "author": "unknown",
    "code": "  float de(vec3 p) {\n    vec4 q = vec4(p - 1.0, 1);\n    for(int i = 0; i < 5; i++) {\n      q.xyz = abs(q.xyz + 1.0) - 1.0;\n      q /= clamp(dot(q.xyz, q.xyz), 0.25, 1.0);\n      q *= 1.15;\n    }\n    return (length(q.zy) - 1.2)/q.w;\n  }"
  },
  {
    "id": "fractal_de230",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q = abs(mod(p,1.8)-.9);\n    float a=3.;\n    float d = 1.;\n    for(int j=0;j++<9;)\n      Q=2.*clamp(Q,-.9,.9)-Q,\n      d=dot(Q,Q),\n      Q/=d,a/=d;\n    if(Q.z>Q.x)\n      Q.xz=Q.zx;\n    if(Q.z>Q.y)\n      Q.yz=Q.zy;\n    Q.yx*=rotate2D(3.1415/4.);\n    return (length(Q.zx)-.03)/a;\n  }"
  },
  {
    "id": "fractal_de231",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q=abs(mod(p,1.8)-.9);\n    float a=1.;\n    float d=1.;\n    for(int j=0;j++<8;)\n      Q=2.*clamp(Q,-.9,.9)-Q,\n      d=dot(Q,Q),\n      Q/=d,\n      a/=d;\n    return (Q.x+Q.y+Q.z-1.3)/a/3.;\n  }"
  },
  {
    "id": "fractal_de232",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q=abs(p);\n    float a=1., d=1.;\n    for(int j=0;j++<9;)\n      Q=2.*clamp(Q,-.9,.9)-Q,\n      d=dot(Q,Q),\n      Q/=d,\n      a/=d;\n    return (Q.x+Q.z-.6)/a/3.;\n  }"
  },
  {
    "id": "fractal_de233",
    "author": "kamoshika",
    "code": "  #define D(p) abs(dot(sin(p), cos(p.yzx)))\n  float map(vec3 p) {\n    float d = length(p) - .8;\n    p *= 10.;\n    d = max(d, (D(p) - .03) / 10.);\n    p *= 10.;\n    d = max(d, (D(p) - .3) / 100.);\n    return d;\n  }"
  },
  {
    "id": "fractal_de234",
    "author": "kamoshika",
    "code": "  // very compact menger sponge expression\n  float de(vec3 p){\n    float a=1.;\n    for(int i=0;i<5;i++){ // adjust iteration count here\n      p=abs(p)-1./3.;\n      if(p.y>p.x)p.xy=p.yx;\n      if(p.z>p.y)p.yz=p.zy;\n      p.z=abs(p.z);\n      p*=3.;\n      p-=1.;\n      a*=3.;\n    }\n    return length(max(abs(p)-1.,0.))/a;\n  }"
  },
  {
    "id": "fractal_de235",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q = fract(p)-.5;\n    for(int j=0;j++<5;){\n      Q=abs(Q)-.17;\n      if(Q.y>Q.x)\n        Q.xy=Q.yx;\n      if(Q.z>Q.y)\n        Q.yz=Q.zy;\n      Q.z=abs(Q.z);\n      Q-=.17;\n      Q*=3.;\n    }\n    return max((length(Q)-.9)/3e2,1.37-length(p.xy));\n  }"
  },
  {
    "id": "fractal_de236",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    float i,j,d=1.,a;\n    vec3 Q;\n    a=1.;\n    d=p.y+1.;\n    for(j=0.;j++<9.;)\n      Q=(p+fract(sin(j)*1e4)*3.141592)*a,\n      Q+=sin(Q)*2.,\n      d+=sin(Q.x)*sin(Q.z)/a,\n      a*=2.;\n    return d*.15;\n  }"
  },
  {
    "id": "fractal_de237",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q,S;\n    float i,d=1.,a;\n    Q=S=mod(p,8.)-4.;\n    a=1.;\n    for(int j=0;j++<9;a=a/d+1.)\n      Q=2.*clamp(Q,-.7,.7)-Q,\n      d=clamp(dot(Q,Q),.5,1.)*.5,\n      Q=Q/d+S;\n    return max((length(Q)-6.)/a,dot(sin(p),cos(p.yzx))+1.2)*0.6;\n  }"
  },
  {
    "id": "fractal_de238",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q;\n    float i,j,d=1.,a;\n    d=dot(sin(p),cos(p.yzx))+1.2;\n    a=1.;\n    for(j=0.;j++<9.;)\n      Q=(p+fract(sin(j)*3e3)*9.)*a,\n      Q+=sin(Q*1.05)*2.,\n      Q=sin(Q),\n      d+=Q.x*Q.y*Q.z/a*.4,\n      a*=2.;\n    return d*.4;\n  }"
  },
  {
    "id": "fractal_de239",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q;\n    float i,j,d=1.,a;\n    d=min(p.y,0.)+.3;\n    a=1.;\n    for(j=0.;j++<9.;)\n      Q=(p+vec3(9,0,0)+fract(sin(j)*1e3)*6.283)*a,\n      Q+=sin(Q)*2.,\n      Q=sin(Q),\n      d+=Q.x*Q.y*Q.z/a,\n      a*=2.;\n    return d*.3;\n  }"
  },
  {
    "id": "fractal_de240",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q;\n    float i,j,d=1.,a;\n    d=.6; a=1.;\n    for(j=0.;j++<9.;)\n      Q=(p+fract(sin(j*vec3(7,8,9))*1e3)*9.)*a,\n      Q+=sin(Q*.5),\n      Q=sin(Q),\n      d+=Q.x*Q.y*Q.z/a,\n      a*=2.;\n    return d*.3;\n  }"
  },
  {
    "id": "fractal_de241",
    "author": "adapted from code by kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q,S;\n    float d=1., a;\n    Q=S=mod(p,10.)-5.;\n    a=1.;\n    for(int j=0;j++<9;) // max(_, 0.001) added to deal with divide by zero\n      Q=2.*clamp(Q,-1.,1.)-Q,\n      d=max(3./max(dot(Q,Q),0.001),1.),\n      Q=2.*Q*d+S,\n      a=2.*a*d+1.;\n    return d=(length(Q)-9.)/max(a,0.001);\n  }"
  },
  {
    "id": "fractal_de242",
    "author": "gaziya5 aka gaz",
    "code": "  #define rot(a)mat2(cos(a),sin(a),-sin(a),cos(a))\n  float lpNorm(vec3 p, float n){\n  \tp = pow(abs(p), vec3(n));\n  \treturn pow(p.x+p.y+p.z, 1.0/max(n,0.001));\n  }\n  float map(vec3 p){\n    vec3 q=p;\n  \tfloat s = 2.5;\n  \tfor(int i = 0; i < 10; i++) {\n      p=mod(p-1.,2.)-1.;\n  \tfloat r2=1.1/max(pow(lpNorm(abs(p),2.+q.y*10.),1.75), 0.001);\n    \tp*=r2;\n    \ts*=r2;\n      p.xy*=rot(.001);\n    }\n    return q.y>1.3?length(p)/max(s,0.001):abs(p.y)/max(s,0.001);\n  }"
  },
  {
    "id": "fractal_de243",
    "author": "kamoshika",
    "code": "  mat2 rotate2D(float r){\n    return mat2(cos(r), sin(r), -sin(r), cos(r));\n  }\n  float de(vec3 p){\n    vec3 R=p,Q;\n    float i,d=1.,a;\n    Q=R;\n    d=a=1.5;\n    for(int j=0;j++<9;)\n      Q.xz=abs(Q.xz)*rotate2D(.785),\n      d=min(d,(Q.x+Q.y*.5)/1.12/a),\n      Q*=2., Q.x-=3., Q.y+=1.5,\n      Q.yx*=rotate2D(.3),\n      a*=2.;\n    return d;\n  }"
  },
  {
    "id": "fractal_de244",
    "author": "adapted from code by notargs",
    "code": "  float de(vec3 p){\n    float a=p.z*.1;\n    p.xy *= mat2(cos(a),sin(a),-sin(a),cos(a));\n    return abs(.1-length(cos(p.xy)+sin(p.yz)));\n  }"
  },
  {
    "id": "fractal_de245",
    "author": "kamoshika",
    "code": "  #define D (dot(sin(Q),cos(Q.yzx))+1.3)\n  float de(vec3 p){\n  \tvec3 Q;\n  \tfloat i,d=1.;\n  \tQ=p, d=D, Q.x+=M_PI, d=min(d,D);\n  \tQ.y+=M_PI;\n    d=min(d,D);\n  \tQ*=30.;\n  \td=max(abs(d),(abs(D-1.3)-.5)/30.);\n  \treturn d*.6;\n  }"
  },
  {
    "id": "fractal_de246",
    "author": "kamoshika",
    "code": "  #define D dot(sin(Q),cos(Q.yzx))+1.35\n  float de(vec3 p){\n    vec3 Q;\n    float d = 0.;\n    Q=p,  d=D,  Q.x+=M_PI;\n    d=min(d,D), Q.y+=M_PI;\n    d=max(abs(min(d,D)+snoise3D(Q*2.)*.05),.01);\n    return d*.5;\n  }"
  },
  {
    "id": "fractal_de247",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    vec3 Q,S;\n    Q=S=p;\n    float a=1.,d;\n    for(int j=0;j++<9;a=a/d+1.)\n      Q=2.*clamp(Q,-.6,.6)-Q,\n      d=clamp(dot(Q,Q),.1,1.)*.5,\n      Q=Q/d+S;\n    return d=(length(Q)-9.)/a;\n  }"
  },
  {
    "id": "fractal_de248",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q;\n    float i,d=1.,a;\n    Q=abs(mod(p,1.8)-.9);\n    a=3.;\n    for(int j=0;j++<8;)\n      Q=2.*clamp(Q,-.9,.9)-Q,\n      d=dot(Q,Q),\n      Q/=d,\n      a/=d,\n      Q+=.05;\n    return d=(Q.x+Q.y+Q.z-1.6)/a;\n  }"
  },
  {
    "id": "fractal_de250",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q;\n    float d=1.,a;\n    Q=p; d=a=1.;\n    for(int j=0;j++<8;)\n      d=min(d,(length(Q)-.5)/a),\n      Q.xz*=rotate2D(ceil(atan(Q.z,Q.x)/1.05-.5)*1.05),\n      Q.x-=1., a*=3., Q*=3.;\n    return d;\n  }"
  },
  {
    "id": "fractal_de251",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q;\n    float d=1.,a;\n    Q=mod(p,8.)-4.;\n    Q.y+=1.5;\n    d=a=2.;\n    for(int j=0;j++<15;)\n      Q.x=abs(Q.x),\n      d=min(d,length(max(abs(Q)-.5,0.))/a),\n      Q.xy=(Q.xy-vec2(.5,1))*rotate2D(-.785),\n      Q*=1.41,\n      a*=1.41;\n    return d;\n  }"
  },
  {
    "id": "fractal_de252",
    "author": "kamoshika",
    "code": "  #define D d=min(d,length(vec2(length(Q.zx)-.3,Q.y))-.02)\n  float de(vec3 p){\n    vec3 Q;\n    float i,d=1.;\n    Q=abs(fract(p)-.5),\n    Q=Q.x>Q.z?Q.zyx:Q,\n    d=9.,    D,\n    Q-=.5,   D,\n    Q.x+=.5,\n    Q=Q.xzy, D,\n    Q.z+=.5,\n    Q=Q.zxy, D;\n    return d;\n  }"
  },
  {
    "id": "fractal_de253",
    "author": "Nameless",
    "code": "  void sphere_folds(inout vec3 z, inout float dz) {\n    float fixed_radius2 = 1.9;\n    float min_radius2 = 0.1;\n    float r2 = dot(z, z);\n    if(r2 < min_radius2) {\n      float temp = (fixed_radius2 / min_radius2);\n      z *= temp; dz *= temp;\n    }else if(r2 < fixed_radius2) {\n      float temp = (fixed_radius2 / r2);\n      z *= temp; dz *= temp;\n    }\n  }\n\n  float de(vec3 p0){\n    vec4 p = vec4(p0, 1.);\n    escape = 0.;\n    if(p.x < p.z)p.xz = p.zx;\n    if(p.z > p.y)p.zy = p.yz;\n    if(p.y > p.x)p.yx = p.xy;\n\n    for(int i = 0; i < 12; i++){\n      if(p.z > p.y)p.zy = p.yz;\n      if(p.y > p.x)p.yx = p.xy;\n      sphere_folds(p.xyz,p.w);\n      uint seed = uint(p.x+p.y+p.z);\n      p*=(3.1/min(dot(p.xyz,p.xyz),1.9));\n      p.xyz=abs(p.xyz)-vec3(0.5,2.7,6.2);\n      p.yz -= sin(float(i)*2.)*0.7;\n      escape += exp(-0.2*dot(p.xyz,p.xyz));\n    }\n    float m = 3.5;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return length(p.xyz)/p.w;\n  }\n"
  },
  {
    "id": "fractal_de254",
    "author": "Nameless",
    "code": "  void sphere_folds(inout vec3 z, inout float dz) {\n    float fixed_radius2 = 1.9;\n    float min_radius2 = 0.1;\n    float r2 = dot(z, z);\n    if(r2 < min_radius2) {\n      float temp = (fixed_radius2 / min_radius2);\n      z *= temp; dz *= temp;\n    }else if(r2 < fixed_radius2) {\n      float temp = (fixed_radius2 / r2);\n      z *= temp; dz *= temp;\n    }\n  }\n\n  float de(vec3 p0){\n    vec4 p = vec4(p0, 1.);\n    escape = 999.;\n\n    if(p.x < p.z)p.xz = p.zx;\n    if(p.z > p.y)p.zy = p.yz;\n    if(p.y > p.x)p.yx = p.xy;\n\n    for(int i = 0; i < 12; i++){\n      if(p.y > p.x)p.yx = p.xy;\n      p.xyz = abs(p.xyz);\n\n      sphere_folds(p.xyz,p.w);\n      uint seed = uint(p.x+p.y+p.z);\n      p*=(3.1/min(dot(p.xyz,p.xyz),1.9));\n      p.xyz=abs(p.xyz)-vec3(0.5,2.7,6.2);\n      p.yz -= sin(float(i)*2.)*0.7;\n    }\n    float m = 3.5;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return length(p.xyz)/p.w;\n  }"
  },
  {
    "id": "fractal_de255",
    "author": "Nameless",
    "code": "  void sphere_folds(inout vec3 z, inout float dz) {\n    float fixed_radius2 = 1.9;\n    float min_radius2 = 0.1;\n    float r2 = dot(z, z);\n    if(r2 < min_radius2) {\n      float temp = (fixed_radius2 / min_radius2);\n      z *= temp; dz *= temp;\n    }else if(r2 < fixed_radius2) {\n      float temp = (fixed_radius2 / r2);\n      z *= temp; dz *= temp;\n    }\n  }\n  void box_folds(inout vec3 z, inout float dz) {\n    float folding_limit = 1.0;\n    z = clamp(z, -folding_limit, folding_limit) * 2.0 - z;\n  }\n  float de(vec3 z) {\n    vec3 offset = z;\n    float scale = -2.8;\n    float dr = 1.0;\n    escape = 0.;\n    for(int n = 0; n < 15; ++n) {\n      box_folds(z, dr);\n      sphere_folds(z, dr);\n      z = scale * z + offset;\n      dr = dr * abs(scale) + 1.0;\n      escape += exp(-0.2*dot(z.xyz,z.xyz));\n    }\n    float r = length(z);\n    return r / abs(dr);\n  }"
  },
  {
    "id": "fractal_de256",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    vec4 p = vec4(p0, 1.);\n    escape = 0.;\n    p=abs(p);\n    if(p.x < p.z)p.xz = p.zx;\n    if(p.z < p.y)p.zy = p.yz;\n    if(p.y < p.x)p.yx = p.xy;\n    for(int i = 0; i < 12; i++){\n      if(p.x < p.z)p.xz = p.zx;\n      if(p.z < p.y)p.zy = p.yz;\n      if(p.y < p.x)p.yx = p.xy;\n      p = abs(p);\n      p*=(1.9/clamp(dot(p.xyz,p.xyz),0.1,1.));\n      p.xyz-=vec3(0.2,1.9,0.6);\n      escape += exp(-0.2*dot(p.xyz,p.xyz)); \n    }\n    float m = 1.2;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return (length(p.xyz)/p.w);\n  }"
  },
  {
    "id": "fractal_de257",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\n    p=fract(p)-.5;\n    float s=3., l;\n    for(int j=0;j++<8;)\n      p=abs(p),\n      p=p.x<p.y?p.zxy:p.zyx,\n      s*=l=2./min(dot(p,p),1.),\n      p=p*l-vec3(.2,1,4);\n    return length(p)/s;\n  }"
  },
  {
    "id": "fractal_de258",
    "author": "gaziya5 aka gaz",
    "code": "  #define R(p,a,r)mix(a*dot(p,a),p,cos(r))+sin(r)*cross(p,a)\n  #define H(h)cos((h)*6.3+vec3(0,23,21))*.5+.5\n  float deee(vec3 p){\n    float i=0.,g=0.,e,s,a;\n    p=R(p,vec3(1),1.2);\n    p=mod(p,2.)-1.;\n    p.xy=vec2(dot(p.xy,p.xy),length(p.xy)-1.); // interesting\n    s=3.;\n    for(int i=0;i++<5;){\n        p=vec3(10,2,1)-abs(p-vec3(10,5,1));\n        s*=e=12./clamp(dot(p,p),.2,8.);\n        p=abs(p)*e;\n    }\n    return min(length(p.xz),p.y)/s+.001;\n  }"
  },
  {
    "id": "fractal_de259",
    "author": "kamoshika",
    "code": "  #define X(V)d=min(d,length(V)-.13),\n  float deee(vec3 p){\n    vec3 R=p,Q;\n    float d = 1.;\n    Q=fract(R)-.5,\n    X(Q.xy)\n    X(Q.yz)\n    X(Q.zx)\n    d=max(d,.68-length(fract(R-.5)-.5));\n    return d;\n  }"
  },
  {
    "id": "fractal_de260",
    "author": "kamoshika",
    "code": "  float de(vec3 p){\n    vec3 Q=p;\n    float i,d=1.,c;\n    Q.x+=M_PI/2.;\n    c=dot(sin(Q),cos(Q.yzx))+1.;\n    d=7.-length(p.xy);\n    return d=(c+d-sqrt((c-d)*(c-d)+.2))*.5+snoise3D(p)*.1;\n  }"
  },
  {
    "id": "fractal_de261",
    "author": "Nameless",
    "code": "  float de(vec3 p){\n    p.xz=abs(.5-mod(p.xz,1.))+.01;\n    float DEfactor=1.;\n    escape = 0.;\n    for (int i=0; i<14; i++) {\n      p = abs(p)-vec3(0.,2.,0.);  \n      float r2 = dot(p, p);\n      float sc=2./clamp(r2,0.4,1.);\n      p*=sc; \n      DEfactor*=sc;\n      p = p - vec3(0.1,1.2,0.5);\n      escape += exp(-0.2*dot(p,p));\n    }\n    return length(p)/DEfactor-.0005;\n  }"
  },
  {
    "id": "fractal_de262",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    vec4 p = vec4(p0, 1.);\n    escape = 0.;\n    p=abs(p);\n    if(p.x < p.z)p.xz = p.zx;\n    if(p.z < p.y)p.zy = p.yz;\n    if(p.y < p.x)p.yx = p.xy;\n    for(int i = 0; i < 8; i++){\n      if(p.x < p.z)p.xz = p.zx;\n      if(p.z < p.y)p.zy = p.yz;\n      if(p.y < p.x)p.yx = p.xy;\n      p.xyz = abs(p.xyz);\n      p*=(1.8/clamp(dot(p.xyz,p.xyz),-1.0,1.));\n      p.xyz-=vec3(0.3,1.9,0.4);\n      escape += exp(-0.2*dot(p.xyz,p.xyz));\n    }\n    float m = 1.5;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return length(p.xyz)/p.w;\n  }"
  },
  {
    "id": "fractal_de263",
    "author": "Nameless",
    "code": "  float de(vec3 p0){\n    vec4 p = vec4(p0, 1.);\n    escape = 0.;\n    p=abs(p);\n    if(p.x > p.z)p.xz = p.zx;\n    if(p.z < p.y)p.zy = p.yz;\n    if(p.y > p.x)p.yx = p.xy;\n    for(int i = 0; i < 12; i++){\n      if(p.x > p.z)p.xz = p.zx;\n      if(p.z < p.y)p.zy = p.yz;\n      if(p.y > p.x)p.yx = p.xy;\n      p.xyz = abs(p.xyz);\n      p*=(1.4/clamp(dot(p.xyz,p.xyz),0.0,1.));\n      p.xyz-=vec3(0.3,4.5,0.7);\n      escape += exp(-0.2*dot(p.xyz,p.xyz));\n    }\n    float m = 1.5;\n    p.xyz-=clamp(p.xyz,-m,m);\n    return length(p.xyz)/p.w;\n  }"
  },
  {
    "id": "fractal_de264",
    "author": "gaziya5 aka gaz",
    "code": "  float de(vec3 p){\r\n    p=cos(p);\r\n    float s=2., e;\r\n    for(int j=0;j++<7;)\r\n      p=1.8-abs(p-1.2),\r\n      p=p.x<p.y?p.zxy:p.zyx,\r\n      s*=e=4.5/min(dot(p,p),1.5),\r\n      p=p*e-vec3(.2,3,4);\r\n    return length(p.xz)/s;\r\n  }"
  },
  {
    "id": "swirl",
    "author": "nimitz/yonatan",
    "code": "  float de( vec3 p ) {\r\n    float i, e, s, g, k = 0.01;\r\n    p.xy *= mat2( cos( p.z ), sin( p.z ), -sin( p.z ), cos( p.z ) );\r\n    e = 0.3 - dot( p.xy, p.xy );\r\n    for( s = 2.0; s < 2e2; s /= 0.6 ) {\r\n      p.yz *= mat2( cos( s ), sin( s ), -sin( s ), cos( s ) );\r\n      e += abs( dot( sin( p * s * s * 0.2 ) / s, vec3( 1.0 ) ) );\r\n    }\r\n    return e;\r\n  }"
  },
  {
    "id": "water",
    "author": "yonatan",
    "code": "  mat2 rot( float a ) { return mat2( cos( a ), sin( a ), -sin( a ), cos( a ) ); }\r\n  float de( vec3 p ) {\r\n    float e, i = 0.0, j, f, a, w;\r\n    p.yz *= rot( 0.7 );\r\n    f = 0.4;\r\n    i < 45.0 ? p : p -= 0.001;\r\n    e = p.y + 5.0;\r\n    for( a = j = 0.9; j++ < 30.0; a *= 0.8 ) {\r\n      vec2 m = vec2( 1. ) * rot( j );\r\n      // float x = dot( p.xz, m ) * f + t + t; // time varying behavior\r\n      float x = dot( p.xz, m ) * f + 0.0;\r\n      w = exp( sin( x ) - 1.0 );\r\n      p.xz -= m * w * cos( x ) * a;\r\n      e -= w * a;\r\n      f *= 1.2;\r\n    }\r\n    return e;\r\n  }"
  },
  {
    "id": "htree",
    "author": "kamoshika",
    "code": "  float de( vec3 p ){\r\n    vec3 P=p, Q, b=vec3( 4, 2.8, 15 );\r\n    float i, d=1., a;\r\n    Q = mod( P, b ) - b * 0.5;\r\n    d = P.z - 6.0;\r\n    a = 1.3;\r\n    for( int j = 0; j++ < 11; )\r\n      d = min( d, length( max( abs( Q ) - b.zyy / 13.0, 0.0 ) ) / a ),\r\n      Q = vec3( Q.y, abs( Q.x ) - 1.0, Q.z + 0.3 ) * 1.4,\r\n      a *= 1.4;\r\n    return d;\r\n  }"
  },
  {
    "id": "boxframe",
    "author": "gaziya5 aka gaz",
    "code": "  float de( vec3 p ) {\r\n  #define L(p) p.y>p.x?p=p.yx:p\r\n    vec3 k=vec3(5,2,1);\r\n    p.y+=5.4;\r\n    for(int j=0;++j<8;)\r\n      p.xz=abs(p.xz),\r\n      L(p.xz),\r\n      p.z=1.-abs(p.z-.9),\r\n      L(p.xy),\r\n      p.x-=2.,\r\n      L(p.xy),\r\n      p.y+=1.,\r\n      p=k+(p-k)*3.;\r\n    return length(p)/1e4;\r\n  }"
  },
  {
    "id": "fractalCity",
    "author": "Leon Denise",
    "code": "  mat2 rot ( float a ) { return mat2( cos( a ), -sin( a ), sin( a ), cos( a ) ); }\r\n  float de ( vec3 p ) {\r\n    float scene = 100.;\r\n    float t = 1000; // arbitrary value\r\n    float falloff = 1.0;\r\n    for ( float index = 0.; index < 8.; ++index ) {\r\n      p.xz *= rot( t / falloff );\r\n      p = abs( p ) - 0.5 * falloff;\r\n      scene = min( scene, max( p.x, max( p.y, p.z ) ) );\r\n      falloff /= 1.8;\r\n    }\r\n    return -scene;\r\n  }"
  },
  {
    "id": "flipper",
    "author": "Adapted from code by Kali",
    "code": "  float de( vec3 p ) {\r\n    float t = 160.0; // designed as a time varying term\r\n    p = p.zxy;\r\n    float a = 1.5 + sin( t * 0.3578 ) * 0.5;\r\n    p.xy = p.xy * mat2( cos( a ), sin( a ), -sin( a ), cos( a ) );\r\n    p.x *= 0.75;\r\n    vec3 ani;\r\n    ani = vec3( sin( t ), sin( t ), cos( t ) ) * 0.6;\r\n    p += sin( p * 3.0 + t * 6.0 ) * 0.04;\r\n    vec3 pp = p;\r\n    float l;\r\n    vec3 rv = vec3( 0.5, -0.05, -1.0 );\r\n    for ( int i = 0; i < 20; i++ ) {\r\n      p.xy = abs( p.xy );\r\n      p = p * 1.25 + vec3( -3.0, -1.5, -0.5 );\r\n      vec3 axis = normalize( rv + ani );\r\n      float angle = ( 40.0 + sin( t ) * 10.0 ) * 0.017;\r\n      p = mix( dot( axis, p ) * axis, p, cos( angle ) ) + cross( axis, p ) * sin( angle ); \r\n      l = length( p );\r\n    }\r\n    return l * pow( 1.25, -20.0 ) - 0.1;\r\n  }"
  },
  {
    "id": "KIFS",
    "author": "Adapted from code by P_Malin",
    "code": "  mat3 SetRotQuat ( const in vec4 q ) {\r\n    vec4 qSq = q * q;\r\n    float xy2 = q.x * q.y * 2.0;\r\n    float xz2 = q.x * q.z * 2.0;\r\n    float yz2 = q.y * q.z * 2.0;\r\n    float wx2 = q.w * q.x * 2.0;\r\n    float wy2 = q.w * q.y * 2.0;\r\n    float wz2 = q.w * q.z * 2.0;\r\n    return mat3 (\r\n      qSq.w + qSq.x - qSq.y - qSq.z, xy2 - wz2, xz2 + wy2,\r\n      xy2 + wz2, qSq.w - qSq.x + qSq.y - qSq.z, yz2 - wx2,\r\n      xz2 - wy2, yz2 + wx2, qSq.w - qSq.x - qSq.y + qSq.z );\r\n  }\r\n  mat3 SetRot ( vec3 vAxis, float fAngle ) {\n    return SetRotQuat( vec4( normalize( vAxis ) * sin( fAngle ), cos( fAngle ) ) ); \n  }\r\n  float de( vec3 p ) {\r\n    vec2 ax = vec2( 0.2, 0.7 ); // pick two values in the range 0,1\r\n    vec3 vRotationAxis = vec3( ax.x, 1.0, ax.y );\r\n    float fRotationAngle = length( vRotationAxis );\r\n\r\n    mat3 m = SetRot( vRotationAxis, fRotationAngle );\r\n    float fTrap = 30.0;\r\n    float fTotalScale = 1.0;\r\n    const float fScale = 1.25;\r\n    vec3 vOffset = vec3( -1.0, -2.0, -0.2 );\r\n    for( int i = 0; i < 16; i++ ) {\r\n      p.xyz = abs( p.xyz );\r\n      p *= fScale;\r\n      fTotalScale *= fScale;\r\n      p += vOffset;\r\n      p.xyz = ( p.xyz ) * m;\r\n      float fCurrDist = length( p.xyz ) * fTotalScale;\r\n      // float fCurrDist = max(max( p.x,  p.y ),  p.z ) * fTotalScale;\r\n      // float fCurrDist = dot( p.xyz, p.xyz ); // * fTotalScale;\r\n      fTrap = min( fTrap, fCurrDist );\r\n    }\r\n    float l = length( p.xyz ) / fTotalScale;\r\n    float fDist = l - 0.1;\r\n    // return vec2(fDist, fTrap);\r\n    return fDist;\r\n  }"
  },
  {
    "id": "curly1",
    "author": "Jos Leys / Knighty",
    "code": "vec2 wrap ( vec2 x, vec2 a, vec2 s ) {\n  x -= s;\n  return ( x - a * floor( x / a ) ) + s;\n}\n\nvoid TransA( inout vec3 z, inout float DF, float a, float b ) {\n  float iR = 1. / dot(z,z);\n  z *= -iR;\n  z.x = -b - z.x; \n  z.y =  a + z.y; \n  DF *= max( 1.0, iR );\n}\n\nfloat de ( vec3 z ) {\n  float adjust = 6.2; // use this for time varying behavior\n  float box_size_x = 1.0;\n  float box_size_z = 1.0;\n  float KleinR = 1.94 + 0.05 * abs( sin( -adjust * 0.5 ) ); //1.95859103011179;\n  float KleinI = 0.03 * cos( -adjust * 0.5 ); //0.0112785606117658;\n  vec3 lz = z +  vec3( 1.0 ), llz = z + vec3( -1.0 );\n  float d = 0.0; float d2 = 0.0;\n  float DE = 1e10;\n  float DF = 1.0;\n  float a = KleinR;\n  float b = KleinI;\n  float f = sign( b ) * 1.0;\n  for ( int i = 0; i < 20 ; i++ ){\n    z.x = z.x + b / a * z.y;\n    z.xz = wrap( z.xz, vec2( 2.0 * box_size_x, 2.0 * box_size_z ), vec2( -box_size_x, -box_size_z ) );\n    z.x = z.x - b / a * z.y;\n    if ( z.y >= a * 0.5 + f * ( 2.0 * a - 1.95 ) / 4.0 * sign( z.x + b * 0.5 ) * \n     ( 1.0 - exp( -( 7.2 - ( 1.95 - a ) * 15.0 ) * abs( z.x + b * 0.5 ) ) ) ) { \n      z = vec3( -b, a, 0.0 ) - z;\n    } //If above the separation line, rotate by 180° about (-b/2, a/2)\n\n    TransA( z, DF, a, b ); //Apply transformation a\n    if ( dot( z - llz, z - llz ) < 1e-5 ) { break; } //If the iterated points enters a 2-cycle , bail out.\n    llz=lz; lz=z;  //Store previous iterates\n  }\n  \n  float y =  min( z.y, a - z.y );\n  DE = min( DE, min( y, 0.3 ) / max( DF, 2.0 ) );\n  return DE;\n}\n"
  },
  {
    "id": "curly2",
    "author": "Jos Leys / Knighty",
    "code": "// Spherical Inversion Variant of Above\nvec2 wrap( vec2 x, vec2 a, vec2 s ){\n  x -= s; \n  return ( x - a * floor( x / a ) ) + s;\n}\n\nvoid TransA( inout vec3 z, inout float DF, float a, float b ) {\n  float iR = 1.0 / dot( z, z );\n  z *= -iR;\n  z.x = -b - z.x; z.y = a + z.y; \n  DF *= max( 1.0, iR );\n}\n\nfloat de ( vec3 p ) {\n  float adjust = 6.28; // use this for time varying behavior\n  float box_size_x = 1.0;\n  float box_size_z = 1.0;\n  float KleinR = 1.94 + 0.05 * abs( sin( -adjust * 0.5 ) ); //1.95859103011179;\n  float KleinI = 0.03 * cos( -adjust*0.5 ); //0.0112785606117658;\n  vec3 lz = p + vec3( 1.0 ), llz = p + vec3( -1.0 );\n  float d = 0.0; float d2 = 0.0;\n  vec3 InvCenter = vec3( 1.0, 1.0, 0.0 );\n  float rad = 0.8;\n  p = p - InvCenter;\n  d = length( p );\n  d2 = d * d;\n  p = ( rad * rad / d2 ) * p + InvCenter;\n  float DE = 1e10;\n  float DF = 1.0;\n  float a = KleinR;\n  float b = KleinI;\n  float f = sign( b ) * 1.0;\n  for ( int i = 0; i < 20 ; i++ ) {\n    p.x = p.x + b / a * p.y;\n    p.xz = wrap( p.xz, vec2( 2. * box_size_x, 2. * box_size_z ), vec2( -box_size_x, - box_size_z ) );\n    p.x = p.x - b / a * p.y;\n    if ( p.y >= a * 0.5 + f *( 2.0 * a - 1.95 ) / 4.0 * sign( p.x + b * 0.5 ) * \n     ( 1.0 - exp( -( 7.2 - ( 1.95 - a ) * 15.0 )* abs( p.x + b * 0.5 ) ) ) ) { \n      p = vec3( -b, a, 0.0 ) - p;\n    } //If above the separation line, rotate by 180° about (-b/2, a/2)\n    TransA( p, DF, a, b ); //Apply transformation a\n    if ( dot( p - llz, p - llz ) < 1e-5 ) { \n      break; \n    } //If the iterated points enters a 2-cycle , bail out.\n    llz = lz; lz = p; //Store previous iterates\n  }\n\n  float y =  min( p.y, a-p.y );\n  DE = min( DE, min( y, 0.3 ) / max( DF, 2.0 ) );\n  DE = DE * d2 / ( rad + d * DE );\n  return DE;\n}\n"
  },
  {
    "id": "curly3",
    "author": "Jos Leys / Knighty / tdhooper",
    "code": "// tdhooper variant 1 - spherical inversion\nvec2 wrap ( vec2 x, vec2 a, vec2 s ) {\n  x -= s;\n  return (x - a * floor(x / a)) + s;\n}\n\nvoid TransA ( inout vec3 z, inout float DF, float a, float b ) {\n  float iR = 1. / dot( z, z );\n  z *= -iR;\n  z.x = -b - z.x;\n  z.y = a + z.y;\n  DF *= iR; // max( 1.0, iR );\n}\n\nfloat de( vec3 z ) {\n  vec3 InvCenter = vec3( 0.0, 1.0, 1.0 );\n  float rad = 0.8;\n  float KleinR = 1.5 + 0.39;\n  float KleinI = ( 0.55 * 2.0 - 1.0 );\n  vec2 box_size = vec2( -0.40445, 0.34 ) * 2.0;\n  vec3 lz = z + vec3( 1.0 ), llz = z + vec3( -1.0 );\n  float d = 0.0; float d2 = 0.0;\n  z = z - InvCenter;\n  d = length( z );\n  d2 = d * d;\n  z = ( rad * rad / d2 ) * z + InvCenter;\n  float DE = 1e12;\n  float DF = 1.0;\n  float a = KleinR;\n  float b = KleinI;\n  float f = sign( b ) * 0.45;\n  for ( int i = 0; i < 80; i++ ) {\n    z.x += b / a * z.y;\n    z.xz = wrap( z.xz, box_size * 2.0, -box_size );\n    z.x -= b / a * z.y;\n    if ( z.y >= a * 0.5 + f * ( 2.0 * a - 1.95 ) / 4.0 * sign( z.x + b * 0.5 ) * \n     ( 1.0 - exp( -( 7.2 - ( 1.95 - a ) * 15.0 )* abs(z.x + b * 0.5 ) ) ) ) {\n      z = vec3( -b, a, 0.0 ) - z;\n    } //If above the separation line, rotate by 180° about (-b/2, a/2)\n    TransA( z, DF, a, b ); //Apply transformation a\n    if ( dot( z - llz, z - llz ) < 1e-5 ) {\n      break;\n    } //If the iterated points enters a 2-cycle, bail out\n    llz = lz; lz = z; //Store previous iterates\n  }\n  float y =  min(z.y, a - z.y);\n  DE = min( DE, min( y, 0.3 ) / max( DF, 2.0 ) );\n  DE = DE * d2 / ( rad + d * DE );\n  return DE;\n}\n"
  },
  {
    "id": "curly4",
    "author": "Jos Leys / Knighty / tdhooper",
    "code": "// Tdhooper Variant 2 \nvec2 wrap ( vec2 x, vec2 a, vec2 s ) {\n  x -= s;\n  return ( x - a * floor( x / a ) ) + s;\n}\n\nvoid TransA ( inout vec3 z, inout float DF, float a, float b ) {\n  float iR = 1.0 / dot( z, z );\n  z *= -iR;\n  z.x = -b - z.x; \n  z.y =  a + z.y;\n  DF *= iR; //max( 1.0, iR );\n}\n\nfloat de( vec3 z ) {\n  float t = 0.0;\n  float KleinR = 1.5 + 0.39;\n  float KleinI = ( 0.55 * 2.0 - 1.0 );\n  vec2 box_size = vec2( -0.40445, 0.34 ) * 2.0;\n  vec3 lz = z + vec3( 1.0 ), llz = z + vec3( -1.0 );\n  float d = 0.0; float d2 = 0.0;\n  float DE = 1e12;\n  float DF = 1.0;\n  float a = KleinR;\n  float b = KleinI;\n  float f = sign( b ) * 0.45;\n  for ( int i = 0; i < 80 ; i++ ) {\n    z.x += b / a * z.y;\n    z.xz = wrap( z.xz, box_size * 2.0, -box_size );\n    z.x -= b / a * z.y;\n    if ( z.y >= a * 0.5 + f * ( 2.0 * a - 1.95 ) / 4.0 * sign( z.x + b * 0.5 ) * \n     ( 1.0 - exp( -( 7.2 - ( 1.95 - a ) * 15.0 )* abs(z.x + b * 0.5 ) ) ) ) {\n      z = vec3( -b, a, 0.0 ) - z;\n    } //If above the separation line, rotate by 180° about (-b/2, a/2)\n    TransA(z, DF, a, b); //Apply transformation a\n    if ( dot( z - llz, z - llz ) < 1e-5 ) {\n      break;\n    } //If the iterated points enters a 2-cycle, bail out\n    llz = lz; lz = z; //Store previous iterates\n  }\n  float y =  min( z.y, a - z.y );\n  DE = min( DE, min( y, 0.3 ) / max( DF, 2.0 ) );\n  return DE;\n}\n"
  },
  {
    "id": "SpiderApollo",
    "author": "gaziya5 aka gaz",
    "code": "#define rot(a)mat2(cos(a),sin(a),-sin(a),cos(a))\nfloat de( vec3 p ) {\n  float s = 4.0;\n  for( int i = 0; i < 8; i++ ) {\n    p.xz *= rot( 3.1415 / 3.0 );\n    p = mod( 1.0 - p, 2.0 ) - 1.0;\n    float r2 = ( 4.0 / 3.0 ) / dot( p, p );\n    p *= r2;\n    s *= r2;\n  }\n  return length( p ) * abs( p.y ) / s;\n}\n"
  },
  {
    "id": "ConstrainedApollo",
    "author": "gaziya5 aka gaz",
    "code": "#define rot(a)mat2(cos(a),sin(a),-sin(a),cos(a))\nfloat de( vec3 p ) {\n  float s = 4.0;\n  p = abs( p );\n  for( int i = 0; i < 10; i++ ) {\n    p = 1.0 - abs( p - 1.0 );\n    float r2 = 1.3 / dot( p, p );\n    p *= r2;\n    s *= r2;\n  }\n  return abs( p.y ) / s;\n}\n\n"
  },
  {
    "id": "BoneGrid",
    "author": "gaziya5 aka gaz",
    "code": "float de( vec3 p ){\n  vec3 k = vec3( 5.0, 2.0, 1.0 );\n  p.y += 5.5;\n  for( int j = 0; ++j < 8; ) {\n    p.xz = abs( p.xz );\n    p.xz = p.z > p.x ? p.zx : p.xz;\n    p.z = 0.9 - abs( p.z - 0.9 );\n    p.xy = p.y > p.x ? p.yx : p.xy;\n    p.x -= 2.3;\n    p.xy = p.y > p.x ? p.yx : p.xy;\n    p.y += 0.1;\n    p = k + ( p - k ) * 3.2;\n  }\n  return length( p ) / 6e3 - 0.001;\n}\n\n"
  },
  {
    "id": "TreeBell",
    "author": "wyatt",
    "code": "#define ei(a) mat2(cos(a),-sin(a),sin(a),cos(a))\nfloat ln ( vec3 p, vec3 a, vec3 b ) {\n    float l = clamp( dot( p - a, b - a ) / dot( b - a, b - a ), 0.0, 1.0 );\n    return mix( 0.7, 1.0, l ) * length( p - a - ( b - a ) * l );\n}\nfloat de( vec3 u ) {\n  u.xz *= ei( 0.9 );\n  u.xy *= ei( 1.5 );\n  float d = 1e9;\n  vec4 c = vec4( 0.0 ); // orbit trap term\n  float sg = 1e9;\n  float l = 0.1;\n  u.y = abs( u.y );\n  u.y += 0.1;\n  mat2 M1 = ei( 2.0 );\n  mat2 M2 = ei( 0.4 );\n  float w = 0.05;\n  for ( float i = 0.0; i < 18.0; i++ ) {\n    sg = ln( u, vec3( 0.0 ), vec3( 0.0, l, 0.0 ) ) / l;\n    d = min( d, sg * l - w );\n    w *= 0.66;\n    u.y -= l;\n    u.xz *= M1;\n    u.xz = abs( u.xz );\n    u.xy *= M2;\n    l *= 0.75;\n    c += exp( -sg * sg ) * ( 0.5 + 0.5 * sin( 3.1 * i / 16.0 + vec4( 1.0, 2.0, 3.0, 4.0 ) ) );\n  }\n  return d;\n}\n\n"
  },
  {
    "id": "TreeBell2",
    "author": "wyatt",
    "code": "#define ei(a) mat2(cos(a),-sin(a),sin(a),cos(a))\nfloat ln (vec3 p, vec3 a, vec3 b) {\n  float l = clamp( dot( p - a, b - a ) / dot( b - a, b - a ), 0.0, 1.0 );\n  return mix( 0.75, 1.0, l ) * length( p - a - ( b - a ) * l );\n}\nfloat de ( vec3 u ) {\n  float adjust = 0.0; // branching parameter\n  u.xz *= ei( 1.1 + adjust );\n  u.xy *= ei( 1.1 );\n  float d = 1e9;\n  vec4 c = vec4( 0.0 ); // orbit trap term\n  float sg = 1e9;\n  float l = 0.08;\n  u.y = abs( u.y );\n  u.y += 0.1;\n  mat2 M1 = ei( 1.0 );\n  float w = 0.02;\n  mat2 M2 = ei( 0.6 );\n  mat2 M3 = ei( 0.4 + 0.2 * sin( adjust ) );\n  for ( float i = 1.0; i < 20.0; i++ ) {\n    sg = ln( u, vec3( 0.0 ), vec3( 0.0, l, 0.0 ) ) / l;\n    d = min( d, sg * l - w );\n    w *= 0.7;\n    u.y -= l;\n    u.xz *= M1;\n    u.xz = abs( u.xz );\n    u.zy *= M3;\n    l *= 0.75;\n    c += exp( -sg * sg ) * ( 0.7 + 0.5 * sin( 2.0 + 3.0 * i / 16.0 + vec4( 1.0, 2.0, 3.0, 4.0 ) ) );\n  }\n  return d;\n}\n\n"
  },
  {
    "id": "teef",
    "author": "yonatan",
    "code": "float de ( vec3 p ) {\n  float t = 0.0; // adjustment term\n  float s = 12.0;\n  float e = 0.0;\n  for(int j = 0;j++ < 7; p /= e )\n    p = mod( p - 1.0, 2.0 ) - 1.0,\n    s /= e =dot( p, p );\n  e -= abs( p.y ) + sin( atan( p.x, p.z ) * 6.0 + t * 3.0 ) * 0.2 - 0.3;\n  return e / s;\n}\n"
  },
  {
    "id": "ringo",
    "author": "yonatan",
    "code": "float de ( vec3 p ) {\n  p -= round( p );\n  float s = 3.0;\n  float e = 0.0;\n  for( int i=0;i++ < 8; p = p / e + 2.0 )\n    p = abs( p ) - 1.5,\n    s /= e = min( dot( p, p ), 0.4 );\n  return e = length( p.yz ) / s;\n}\n\n"
  },
  {
    "id": "whorl",
    "author": "yonatan",
    "code": "float de ( vec3 p ) {\n  float e, j, s, k;\n  e = 0.0;\n  float t = 0.0; // time adjust term \n  float n = 9.0;\n  k = t / n;\n  p = vec3( log( length( p ) ) ,( atan( p.z, p.x ) - k ) / PI, sin( p.y / n + k ) );\n  for ( s = j = 1.0; j++ < n; p = 3.0 - abs( p * e ) )\n    p.y -= round( p.y ),\n    s *= e = 3.0 / min( dot( p, p ), 1.0 );\n  return e = length( p ) / s;\n}\n"
  },
  {
    "id": "tree",
    "author": "yonatan",
    "code": "mat2 rotate2D ( float r ) {\n  return mat2( cos( r ), sin( r ), -sin( r ), cos( r ) );\n}\nfloat de(vec3 p){\n  float e, s = 1.0;\n  for( e = p.y += 2.0; s > 0.01; s *= 0.77 )\n    p.x=abs(p.x),\n    e=min(e,max(abs(p.y-s*.5)-s*.4,length(p.xz))-s*.1),\n    p.y-=s,\n    p.xz*=rotate2D(1.6),\n    p.zy*=rotate2D(.7);\n  return e*.8;\n}\n\n"
  },
  {
    "id": "threads",
    "author": "kamoshika",
    "code": "mat2 rotate2D ( float r ) {\n  return mat2( cos( r ), sin( r ), -sin( r ), cos( r ) );\n}\nfloat de ( vec3 p ) {\n  vec3 q=p;\n  float d, t = 0.0; // t is time adjustment\n  q.xy=fract(q.xy)-.5;\n  for( int j=0; j++<9; q+=q )\n    q.xy=abs(q.xy*rotate2D(q.z + t))-.15;\n    d=(length(q.xy)-.2)/1e3;\n  return d;\n}\n"
  },
  {
    "id": "gate0",
    "author": "gaziya5 aka gaz",
    "code": "float de(vec3 p){\n  float e, s=3.;\n  p=.7-abs(p);\n  p.x<p.y?p=p.yxz:p;\n  for(int i=0;i++<8;)\n    p=abs(p)-.9,\n    e=dot(p,p),\n    s*=e=2./min(e,2.)+6./min(e,.9),\n    p=abs(p)*e-vec3(2,7,3);\n  return e=length(p.yz)/s;\n}\n\n"
  },
  {
    "id": "gates",
    "author": "yonatan",
    "code": "float de(vec3 p){\n  float y=p.y+=.2;\n  p.z-=round(p.z);\n  float e, s=3.;\n  p=.7-abs(p);\n  for(int i=0;i++<8;p.z+=5.)\n    p=abs(p.x>p.y?p:p.yxz)-.8,\n    s*=e=5./min(dot(p,p),.5),\n    p=abs(p)*e-6.;\n  return e=min(y,length(p.yz)/s);\n}\n"
  },
  {
    "id": "castleRing",
    "author": "yonatan",
    "code": "float de(vec3 p){\n  float e, r, s=3., t = 0.0;\n  p=vec3(log(r=length(p)),asin(p.z/r),atan(p.y,p.x)/PI*s)-t/PI;\n  p-=round(p);\n  for(int j=0;j++<7;p.z-=2.)\n    s/=e=min(.3,dot(p,p))+.2,\n    p=abs(p)/e-.2;\n  return e=(length(p.xy)-.1)*r/s;\n}\n\n"
  },
  {
    "id": "hatRing",
    "author": "yonatan",
    "code": "float de ( vec3 p ) {\n  float e, s, t=0.0; // time adjust term\n  vec3 q=p;\n  p.z+=7.;\n  p=vec3(log(s=length(p)),atan(p.y,p.x),sin(t/4.+p.z/s));\n  s=1.;\n  for(int j=0;j++<6;)\n    s*=e=PI/min(dot(p,p),.8),\n    p=abs(p)*e-3.,\n    p.y-=round(p.y);\n  return e=length(p)/s;\n}\n"
  },
  {
    "id": "gRails",
    "author": "yonatan",
    "code": "// same as above, without the space transform\nfloat de ( vec3 p ) {\n  float e, s, t=0.0; // time adjust term\n  vec3 q=p;\n  p.z+=7.;\n  s=1.;\n  for(int j=0;j++<6;)\n    s*=e=PI/min(dot(p,p),.8),\n    p=abs(p)*e-3.,\n    p.y-=round(p.y);\n  return e=length(p)/s;\n}\n"
  },
  {
    "id": "tree2",
    "author": "yonatan",
    "code": "mat2 rotate2D ( float r ) {\n  return mat2( cos( r ), sin( r ), -sin( r ), cos( r ) );\n}\nfloat de(vec3 p){\n  float e, s=.5;\n  for(e=++p.y;s>.005;s*=.77)\n    p.x=abs(p.x),\n    e=min(e,max(abs(p.y-s*.5)-s*.4,\n    length(p.xz))-s*.2),\n    p.y-=s,\n    p.xz*=rotate2D(1.57),\n    p.zy*=rotate2D(.5);\n  return e;\n}\n"
  },
  {
    "id": "ballDiamond",
    "author": "yonatan",
    "code": "float de(vec3 p){\n  float e, s=6., u=0.0;\n  for(int j=0;j++<7;p=mod(p+1.,2.)-1.)\n    s/=u=dot(p,p),\n    p/=u;\n  return e=dot(p,p)/s-abs(p.y)/s;\n}\n"
  },
  {
    "id": "sinDungeon",
    "author": "gaziya5 aka gaz",
    "code": "float de(vec3 p){\n  p = asin( sin( p ) ) - vec3( 2., -3., 0. );\n  float e=0., s=2.;\n  for(int i=0;i++<8;p=p*e-vec3(1,3,7))\n    p=abs(p),\n    p=p.x<p.y?p.zxy:p.zyx,\n    s*=e=2./clamp(dot(p,p),.2,1.);\n  return e=abs(length(p-clamp(p,-5.,5.))-5.)/s+1e-5;\n}\n"
  },
  {
    "id": "Julia",
    "author": "athibaul",
    "code": "vec2 cmul( vec2 a, vec2 b ) {\n  return vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x);\n}\n\nvec2 cpow( vec2 a, float p ) {\n  float rho = pow(length(a), p), theta = atan(a.y, a.x)*p;\n  return rho * vec2(cos(theta), sin(theta));\n}\n\nfloat juliaDistance( vec2 c, vec2 z ) {\n  const int iterations = 200;\n  vec2 dz = vec2(1.);\n  float m2 = 1.0;\n  int i;\n  for(i=0;i<iterations;i++) {\n    // z = z*z + c except * is complex multiplication\n    dz = 2.*cmul(z,dz);\n    z = cmul(z,z) + c;\n    m2 = dot(z,z);\n    if(m2>1e10) break;\n  }\n  if(i >= iterations) return 0.;\n  float lz = sqrt(m2);\n  float d = lz*log(lz) / length(dz);\n  return d;\n}\n\nfloat de( vec3 p ) {\n  vec2 c = vec2(0.28,-0.49); // julia set parameters\n  float d = juliaDistance(c, p.xz) * 0.5;\n  d = max(d, p.y ); // Cut extruded julia at y = 0\n  d = min(d, p.y + 1.); // Back plane at y = -1\n  return d;\n}\n\n"
  },
  {
    "id": "noby0",
    "author": "noby",
    "code": "float hash13(vec3 p3){\n  p3 = fract((p3)*0.1031);\n  p3 += dot(p3, p3.yzx  + 19.19);\n  return fract((p3.x + p3.y) * p3.z);\n}\nfloat de( vec3 p ){\n  vec3 po = p;\n  p = -p;\n  \n  float k=1.;\n  for(int i = 0; i < 8; ++i) {\n    vec3 ss = vec3(-.54,0.84,1.22);\n    p = 2.0*clamp(p,-ss,ss)-p;\n    float f = max(0.7/dot(p,p),0.75);\n    p *= f;\n    k *= f*1.05;\n  }\n\n  float res = max(length(p.xz)-.9,length(p.xz)*abs(p.y)/length(p))/k;\n  p = -p;\n\n  // crumbly\n  res += (-1.0+2.0*hash13( floor(p*10.0) ))*0.005 * (1.0-step(0.01, po.y));\n\n  // blast\n  const float ang = 0.04;\n  const mat2 rot = mat2(cos(ang),sin(ang),-sin(ang),cos(ang));\n  vec3 tpo = po-vec3(0,0.12,-1.5);\n  tpo.xy *= rot;\n  float blast = pow(smoothstep(-1.6, 0.35,po.x)-smoothstep(0.4,0.48,po.x), 3.0);\n  res = min(res, length( (tpo).yz )-0.02*blast);\n  return res;\n}\n"
  },
  {
    "id": "noby1",
    "author": "noby",
    "code": "float hash13(vec3 p3){\n  p3 = fract((p3)*0.1031);\n  p3 += dot(p3, p3.yzx  + 19.19);\n  return fract((p3.x + p3.y) * p3.z);\n}\nfloat de( vec3 p ){\n  vec3 po = p;\n  \n  float k=1.;\n  for(int i = 0; i < 8; ++i) {\n    vec3 ss = vec3(-.54,0.84,1.22);\n    p = 2.0*clamp(p,-ss,ss)-p;\n    float f = max(0.7/dot(p,p),0.75);\n    p *= f;\n    k *= f*1.05;\n  }\n\n  float res = max(length(p.xz)-.9,length(p.xz)*abs(p.y)/length(p))/k;\n  res += (-1.0+2.0*hash13( floor(p*10.0) ))*0.005 * (1.0-step(0.01, po.y));\n  const float ang = 0.04;\n  const mat2 rot = mat2(cos(ang),sin(ang),-sin(ang),cos(ang));\n  vec3 tpo = po-vec3(0,0.12,-1.5);\n  tpo.xy *= rot;\n  float blast = pow(smoothstep(-1.6, 0.35,po.x)-smoothstep(0.4,0.48,po.x), 3.0);\n  res = min(res, length( (tpo).yz )-0.02*blast);\n  return res;\n}\n"
  },
  {
    "id": "whorl2",
    "author": "aiekick",
    "code": "mat3 getRotZMat(float a){return mat3(cos(a),-sin(a),0.,sin(a),cos(a),0.,0.,0.,1.);}\nfloat fractus(vec3 p) {\n  vec2 z = p.xy;\n  vec2 c = vec2(0.28,-0.56) * cos(p.z*0.1);\n  float k = 1., h = 1.0;\n  for (float i=0.;i<8.;i++) {\n    h *= 4.*k;\n    k = dot(z,z);\n    if(k > 4.) break;\n    z = vec2(z.x * z.x - z.y * z.y, 2. * z.x * z.y) + c;\n  }\n  return sqrt(k/h)*log(k);   \n}\nfloat de(vec3 p) {\n  p *= getRotZMat(cos(p.z*0.2)*2.);\n  p.xy = mod(p.xy, 3.5) - 3.5*0.5;\n  p *= getRotZMat(cos(p.z*0.6)*2.);\n  return fractus(p);\n}\n"
  },
  {
    "id": "snowflake",
    "author": "Catzpaw",
    "code": "// Hash based domain repeat snowflakes - Rikka 2 demo\nfloat hash(float v){return fract(sin(v*22.9)*67.);}\nmat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,s,-s,c);}\nvec2 hexFold(vec2 p){return abs(abs(abs(p)*mat2(.866,.5,-.5,.866))*mat2(.5,-.866,.866,.5));}\nfloat sdHex(vec3 p){p=abs(p);return max(p.z-.02,max((p.x*.5+p.y*.866),p.x)-.015);}\nfloat de(vec3 p){\n  float h=hash(floor(p.x)+floor(p.y)*133.3+floor(p.z)*166.6),o=13.0,s=1.+h;\n  p=fract(p)-.5;\n  p.y+=h*.4-.2;\n  p.xz*=rot(time*(h+.8));\n  p.yz*=rot(time+h*5.);\n  h=hash(h);p.x+=h*.15;\n  float l=dot(p,p);\n  if(l>.1)return l*2.;\n  for(int i=0;i<5;i++){\n    p.xy=hexFold(p.xy);\n    p.xy*=mat2(.866,-.5,.5,.866);\n    p.x*=(s-h);\n    h=hash(h);p.y-=h*.065-.015;p.y*=.8;\n    p.z*=1.2;\n    h=hash(h);p*=1.+h*.3;\n    o=min(o,sdHex(p));\n    h=hash(h);s=1.+h*2.;\n  }\n  return o;\n}\n"
  },
  {
    "id": "cagedStar",
    "author": "Catzpaw",
    "code": "float cube(vec3 p){\n  p=abs(p)-.1;\n  return length(max(p,0.)+min(max(p.x,max(p.y,p.z)),0.));\n}\nfloat de(vec3 p){\n  float s=2.,r=.7;\n  vec3 o=p;\n  for(int i=0;i<8;i++){\n    p=clamp(p,-1.008,1.008)*2.03-p; //boxfold\n    float l=cube(p);\n    if(l<.5){p*=2.1;r*=2.1;}else if(l<3.8){p/=l;r/=l;} //ballfold\n    p=o+p*s;r=r*abs(s)+1.;\n  }\n  return .25-length(p)/abs(r);\n}\n"
  },
  {
    "id": "doubleNut",
    "author": "aiekick",
    "code": "mat3 rotZ ( float t ) {\n  float s = sin( t );\n  float c = cos( t );\n  return mat3( c, s, 0., -s, c, 0., 0., 0., 1. );\n}\n\nmat3 rotX ( float t ) {\n  float s = sin( t );\n  float c = cos( t );\n  return mat3( 1., 0., 0., 0., c, s, 0., -s, c );\n}\n\nmat3 rotY ( float t ) {\n  float s = sin( t );\n  float c = cos( t );\n  return mat3 (c, 0., -s, 0., 1., 0, s, 0, c);\n}\n\nfloat de ( vec3 p ){\n  vec2 rm = radians( 360.0 ) * vec2( 0.468359, 0.95317 ); // vary x,y 0.0 - 1.0\n  mat3 scene_mtx = rotX( rm.x ) * rotY( rm.x ) * rotZ( rm.x ) * rotX( rm.y );\n  float scaleAccum = 1.;\n  for( int i = 0; i < 18; ++i ) {\n    p.yz = sqrt( p.yz * p.yz + 0.16406 );\n    p *= 1.21;\n    scaleAccum *= 1.21;\n    p -= vec3( 2.43307, 5.28488, 0.9685 );\n    p = scene_mtx * p;\n  }\n  return length( p ) / scaleAccum - 0.15;\n}\n"
  },
  {
    "id": "snoflake3d",
    "author": "gaz",
    "code": "float de ( vec3 p ){\n  float e = 1.;\n  for( int i=0;i++<9; ){\n    p = abs( p ) - .2;\n    p = p.x > p.y ? p.zxy : p.zyx;\n    p *= 2.0;\n    e *= 2.0;\n    p.xz *= rotate2D( 2.6 );\n    p.yx = abs( p.yx ) - 4.0;\n  }\n  p /= e;\n  return e = length( p ) * .8 - .01;\n}\n\n"
  },
  {
    "id": "grid",
    "author": "yonatan",
    "code": "float de ( vec3 p ){\n  float v = 2., e = 0.0, g = 0.0;\n  p = abs(fract(p)-.5)+.12;\n  \n  if( p.x>p.y )\n    p.xy=p.yx;\n  \n  if( p.y<p.z )\n    p.yz=p.zy;\n  \n  for(int j=0;j++<16;p=abs(p)/e-.25)\n    p.y-=3.5-g*.4,\n    v/=e=min(dot(p,p)+.1,.5);\n  return g+=e=length(p)/v;\n}\n"
  },
  {
    "id": "bug",
    "author": "yonatan",
    "code": "float de ( vec3 p ) {\n  vec3 q = vec3( -1.0, -1.0, 5.0 );\n  vec3 d = vec3( 0.0 );\n  float e = 0.0, s, u;\n  e = s = 1.0;\n  for( int j = 0; j++ < 6; p = cos( p ) - 0.7)\n    s /= u = dot( p, p ),\n    p /= -u,\n    p.y = 1.72 - p.y,\n    p += 0.7,\n    e = min( e, p.y / s );\n   return e;\n}\n\n"
  },
  {
    "id": "spike",
    "author": "gaz",
    "code": "mat2 rotate2D ( float r ) {\n  return mat2( cos( r ), sin( r ), -sin( r ), cos( r ) );\n}\n\nfloat de ( vec3 p ) {\n  float e = 1.0, g;\n  p = asin( sin( p ) );\n  for( int i = 0; i++ < 7; ){\n    p = abs( p ) - 0.1;\n    p = p.x > p.y ? p.zxy : p.zyx;\n    p *= 2.0;\n    e *= 2.0;\n    p.xz *= rotate2D( 2.8 );\n    p.yx = abs( p.yx ) - 4.0;\n  }\n  p /= e;\n  return e = abs( p.z ) * 0.6 - 0.02;\n}\n\n"
  },
  {
    "id": "fractalPump",
    "author": "snolot",
    "code": "float de ( vec3 p ) {\n  float adjust = 62.0; // time based adjustment\n  p = mod( p, 2.0 ) - 1.0;\n  p = abs( p ) - 1.0;\n  if ( p.x < p.z ) p.xz = p.zx;\n  if ( p.y < p.z ) p.yz = p.zy;\n  if ( p.x < p.y ) p.xy = p.yx;\n  if ( p.x > p.y ) p.xy =- p.yx;\n  float s = 1.0;\n  for( int i = 0;i < 10;i++ ) {\n    p.y -= abs( sin( adjust * 0.1 ) );\n    float r2 = 2.0 / clamp( dot( p, p ), 0.2, 1.0 );\n    p = abs( p ) * r2 - vec3( 0.45, 0.2, clamp( abs( sin( adjust * 0.7 ) * 4.2 ), 3.0, 5.2 ) );\n    s *= r2;\n  }\n  return length( p ) / s;\n}\n\n"
  },
  {
    "id": "pentaflake",
    "author": "rickiters",
    "code": "mat2 rot ( float a ) {\n  return mat2( cos( a ), sin( a ), -sin( a ), cos( a ) );  \n}\nvec2 Rotate ( vec2 v, float angle ) {\n  return v * rot( angle );\n}\nvec2 Kaleido ( vec2 v, float power ) {\n  float TAO = 2.0 * 3.14159;\n  return Rotate( v, floor( 0.5 + atan( v.x, -v.y ) * power / tao ) * tao / power );\n}\nfloat sdCappedCone ( in vec3 p, in vec3 c ) {\n  vec2 q = vec2( length( p.xy ), -p.z );\n  float d1 = p.z - c.z;\n  float d2 = max( dot( q, c.xy ), -p.z );\n  return length( max( vec2( d1, d2 ), 0.0 ) ) + min( max( d1, d2 ), 0.0 );\n}\nfloat sceneCone ( vec3 p ) {\n  p += vec3( 0.0, 0.0, 7.5 );\n  return sdCappedCone( p,vec3( 264.0 / 265.0, 23.0 / 265.0, 7.5 ) );\n}\nfloat de ( vec3 p ) {\n  vec3 c = vec3( 10.0 );\n  float scl = 0.5;\n  float sclpow = 1.0;\n  float sc;\n  float sym = 5.0;\n  p.xz = Kaleido( p.xz, sym );\n  float d = sceneCone( p );\n  for ( int i = 0;i < 6 ; ++i ) {\n    p += vec3( 0.0, 0.0, 5.0 );\n    p *= 1.0 / scl;\n    sclpow *= scl;\n    p.xz = Kaleido( p.xz, sym );\n    sc = sceneCone( p ) * sclpow;\n    d = min( d, sc );\n  }\n  return d;\n}\n\n"
  },
  {
    "id": "waterbear",
    "author": "yonatan",
    "code": "float de ( vec3 p ) {\n  float e,v,u;\n  e = v = 2;\n  for(int j=0;j++<12;j>3?e=min(e,length(p.xz+length(p)/u*.55)/v-.006),p.xz=abs(p.xz)-.7,p:p=abs(p)-.86)\n    v /= u = dot( p, p ),\n    p /= u,\n    p.y = 1.7 - p.y;\n  return e;\n}\n"
  },
  {
    "id": "flowerz",
    "author": "yonatan",
    "code": "// minor tweak of above\nfloat de ( vec3 p ) {\n  float e,v,u;\n  e=v=2.;\n  for(int j=0;j++<12;j>3?e=min(e,length(p.xz+length(p)/u*.557)/v),p.xz=abs(p.xz)-.7,p:p=abs(p)-.9)\n    v/=u=dot(p,p),\n    p/=u,\n    p.y=1.7-p.y;\n  return e;\n}\n"
  },
  {
    "id": "griddy",
    "author": "Catzpaw",
    "code": "float de ( vec3 p ) {\n  float a,e,v,s;\n  vec3 q;\n  v=3.;\n\n  // parameter originally randomized with twigl fsnoise()\n    // a = fsnoise( ceil( p.xz * v + .5 ) ) * v + v;\n  a = 10.0; // picked floats work too, but not as cool\n  \n  e=s;\n  for(int j=0;++j<6;v*=a)\n    q=abs(mod(p*v,2.)-1.),\n    q=max(q,q.zyx),\n    e=max(e,(min(q.y,q.z)-.3)/v);\n  return e;\n}\n"
  },
  {
    "id": "dark",
    "author": "yonatan",
    "code": "float de ( vec3 p ) {\n  // added some clamping to prevent potential div by 0\n  float y,s,e;\n  p+=vec3(1.0);\n  y=p.y*.3-.3;\n  s=9.;\n  for(int j=0;j++<9;p/=max(e,0.0001))\n    p=mod(p-1.,2.)-1.,\n    p.zx*=rotate2D(PI/4.0),\n    e = dot(p,p)*(0.6+y),\n    s /= max(e,0.0001);\n  return e=sqrt(e)/s;\n}\n\n"
  },
  {
    "id": "reeds",
    "author": "gaz",
    "code": "float de ( vec3 p ) {\n  float e,s;\n  e=s=2.;\n  for(int i=0;i++<6;s*=2.,p*=2.)\n    p=.1-abs(abs(p)-.2),\n    p=p.x<p.y?p.zxy:p.zyx,\n    e=min(e,(length(vec2(length(p.xy)-1.,p.z)))/s+5e-4);\n  return e;\n}\n\n"
  },
  {
    "id": "temple",
    "author": "sxolastikos",
    "code": "float de ( vec3 p ) {\n  float d;\n  p.z-=6.;\n  p.yz*=rotate2D(1.57);\n  for(int j=0;j++<4;)\n    p=abs(fract(abs(p))-.1),\n    d=dot(p.z,max(p.x,p.y))-.001,\n    d-=.8*min(d,dot(p,p-vec3(-1)));\n  return d*4.;\n}\n"
  },
  {
    "id": "rolls",
    "author": "gaz",
    "code": "float de ( vec3 p ) {\n  float s,e;\n  vec3 q=p*2.;\n  s=3.;\n  for(int j=0;j++<8;s*=e)\n    p=sign(p)*(1.-abs(abs(p-2.)-1.)),\n    p=p*(e=6./min(dot(p,p)+.3,3.))+q-vec3(3,1,12);\n  return length(p)/s;\n}\n"
  },
  {
    "id": "warpedKlein",
    "author": "catzpaw",
    "code": "float de ( vec3 p ) {\n  float l, e, v;\n  l=1.;\n  for(int j=0;j++<8;l*=v)\n    p=2.*clamp(p,-.8,.9)-p,\n    p*=v=max(.9/dot(p,p),.7),\n    p+=.13;\n  return e=.1*p.y/l;\n}\n"
  },
  {
    "id": "sinugoid",
    "author": "catzpaw",
    "code": "float de ( vec3 p ) {\n  #define F d=max(d,(1.2-length(sin(p*s)))/s);p+=s*=1.3\n  float l=.1,d=l,s,i;\n  d=0.;\n  s=1.;\n  F;\n  F;\n  l+=F;\n  F*5.;\n  F;\n  #undef F\n  return d;\n}\n"
  },
  {
    "id": "heartcube",
    "author": "gaz",
    "code": "float de ( vec3 p ) {\n  float e,s;\n  e=s=2.;\n  for(int i=0;i++<5;s*=1.8,p*=1.8)\n    p=abs(p)-.2,\n    p=p.x<p.y?p.zxy:p.zyx,\n    e=min(e,(length(vec2(length(p.xy)-.4,p.z))-.1)/s);\n  return e;\n}\n\n"
  },
  {
    "id": "manscaped",
    "author": "yonatan",
    "code": "float de ( vec3 p ) {\n  float e,s;\n  p.y-=p.z*.6;\n  e=p.y-tanh(abs(p.x+sin(p.z)*.5));\n  for(s=2.;s<1e3;s+=s)\n    p.xz*=rotate2D(s),\n    e+=abs(dot(sin(p.xz*s),vec2(1.0)/s/4.));\n  e=min(e,p.y)-1.3;\n  return e;\n}\n"
  },
  {
    "id": "chorse",
    "author": "yonatan",
    "code": "float de ( vec3 p ) {\n  float e=0.7;\n  float s=5.0;\n  float u;\n  float t = 65.0; // time varying adjustment term\n  for(int j=0;j++<12;p.xz=mod(p.xz-1.,2.)-1.)\n    s/=u=dot(p,p),\n    p/=-u,\n    p.x=sin(t)*.25-p.x,\n    p.z=cos(t)*.25-p.z,\n    p.y+=1.75,\n    e=min(e,p.y/s);\n  return e;\n}\n"
  },
  {
    "id": "gripple",
    "author": "gaz",
    "code": "float de ( vec3 p ) {\n  float t = 1.0; // time based adjustment\n  p.xz+=vec2(cos(p.z*5.+t*2.),sin(p.x*8.));\n  p.xz*=rotate2D(.5-atan(p.x,p.z));\n  return .1*(p.z-p.y*p.y-.3);\n}\n"
  },
  {
    "id": "getwork",
    "author": "yonatan",
    "code": "float de ( vec3 p ) {\n  p++;\n  float s=3.;\n  float e=0.;\n  for(int j=0;j++<12;p/=e)\n    p=mod(p-1.,2.)-1.,\n    p.xz*=rotate2D(PI/4.),\n    e=dot(p,p)*.5,\n    s/=max(e,0.001);\n  return length(p.y)/max(s,0.001)-.7/max(s,0.001);\n}\n\n"
  },
  {
    "id": "flor",
    "author": "catzpaw",
    "code": "float de ( vec3 p ) {\n  float e=4.,s;\n  for(int j=0;++j<7;p=abs(p)-.9,e/=s=min(dot(p,p),.9),p/=s);\n  return length(p.xz)/e;\n}\n"
  },
  {
    "id": "mipple",
    "author": "catzpaw",
    "code": "float de ( vec3 p ) {\n  float e=2.,s;\n  vec3 c=vec3(4,.1,1.5);\n  p.y+=1.4;\n  for(int j=0;++j<7;p=abs(p)-1.5,e/=s=min(dot(p,p),.4),p/=s);\n  return (p.x+p.z)/e;\n}\n"
  },
  {
    "id": "prisnm",
    "author": "gaz",
    "code": "float de ( vec3 p ) {\n#define R(p,a,t) mix(a*dot(p,a),p,cos(t))+sin(t)*cross(p,a)\n#define H(h) (cos((h)*6.3+vec3(0,23,21))*.5+.5)\n  \n  float i=0., s, e, g=0.0;\n  float t = time;\n  vec4 pp=vec4(p,.07);\n  pp.z-=0.5;\n  pp.xyz=R(pp.xyz,normalize(H(t*.1)),t*.2);\n  s=2.0;\n  for(int j=0;j++<6;)\n    pp=.02-abs(pp-.1),\n    s*=e=max(1./dot(pp,pp),1.3),\n    pp=abs(pp.x<pp.y?pp.wzxy:pp.wzyx)*e-1.3;\n    g+=e=abs(length(pp.xz*pp.wy)-.02)/s+1e-4;\n  return g;\n#undef R\n#undef H\n}\n\n"
  },
  {
    "id": "braind",
    "author": "i_dianov",
    "code": "float de ( vec3 p ) {\n  vec3 I=p;\n  float e=9.0;\n  float d=0.0;\n  vec2 uv = p.xy / 2.0;\n  for(float j=0;j<PI;j+=PI/3.)\n    p=I,\n    p.x+=j*4.,\n    p.y+=sin(p.x*.5),\n    p.z+=sin(p.x)*.5,\n    e=min(e,(length(p.yz)-length(uv)/4.)*.8);\n    d+=e;\n  return d;\n}\n"
  },
  {
    "id": "tokamak",
    "author": "i_dianov",
    "code": "mat2 rot( float r ){\n  return mat2(cos(r), sin(r), -sin(r), cos(r));\n}\nfloat de ( vec3 p ) {\n  p.z+=.6;\n  p.xz*=rot(3.141*2.*time/(19.));\n  p*=3.;\n  p=vec3(atan(p.x,p.z)*3.025,p.y,length(p.xz)-4.);\n  p.yx*=rot(3.141/2.);\n  p=vec3(atan(p.x,p.z)*3.025,p.y,length(p.xz)-5.);\n  p.z+=2.;\n  p.xy = mod(p.xy,1.)-.5;\n  return .2*(length(p)-1.);\n}\n\n"
  },
  {
    "id": "gweave",
    "author": "gaz",
    "code": "float de ( vec3 p ) {\n  float s=2., e, g, l;\n  p=abs(mod(p-1.,2.)-1.)-1.;\n  for(int j=0;j<8;j++)\n    p=1.-abs(p-1.),\n    p=p*(l=-1./dot(p,p))-vec3(.1,.3,.1),\n    s*=abs(l);\n    g+=e=length(p.xz)/s;\n  return e;\n}\n\n"
  },
  {
    "id": "rincut",
    "author": "illus0r",
    "code": "#define PI 3.14159265\n#define IVORY 1.\n#define BLUE 2.\nmat2 Rot(float a) {\n    float s = sin(a), c = cos(a);\n  return mat2(c, -s, s, c);\n}\nfloat sdBox( vec3 p, vec3 b ) { vec3 q = abs(p) - b; return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0); }\nfloat sdTorus(vec3 p, float smallRadius, float largeRadius) {\n  return length(vec2(length(p.xz) - largeRadius, p.y)) - smallRadius;\n}\nfloat de(vec3 p) {\n  float t = time;\n  vec2 plane = vec2(p.y+0.5, IVORY);\n  p.y -= 1.5;\n  p.xz *= Rot(t / 4.);\n  vec3 pBox = p;\n  pBox.xz /= 100.;\n  p.y += sin(t);\n  float box = sdBox(pBox, vec3(0.05));\n  float scale = 0.7;\n  vec2 torus = vec2(sdTorus(p, .4, 1.5), BLUE);\n  for (int i = 0; i < 9; i++) {\n    p.xz = abs(p.xz);\n    p.xz -= 1.;\n    p /= scale;\n    p.yz *= Rot(PI / 2.);\n    p.xy *= Rot(PI / 4.);\n    vec2 newTorus = vec2(sdTorus(p, .4, 1.5) * pow(scale, float(i+1)), BLUE);\n    torus = torus.x < newTorus.x? torus : newTorus;\n  }\n  torus = box < torus.x ? torus : vec2(box, 0);\n  return  torus.x < plane.x? torus.x : plane.x;\n}\n\n"
  },
  {
    "id": "torii",
    "author": "illus0r",
    "code": "// modification of above\n#define PI 3.14159265\nmat2 Rot(float a) {\n  float s = sin(a), c = cos(a);\n  return mat2(c, -s, s, c);\n}\nfloat sdTorus(vec3 p, float smallRadius, float largeRadius) {\n  return length(vec2(length(p.xz) - largeRadius, p.y)) - smallRadius;\n}\nfloat de(vec3 p) {\n  float t = time;\n  p.y -= 1.5;\n  float scale = 0.7;\n  float torus = sdTorus(p, .4, 1.5);\n  for (int i = 0; i < 9; i++) {\n    p.xz = abs(p.xz);\n    p.xz -= 1.;\n    p /= scale;\n    p.yz *= Rot(PI / 2.);\n    p.xy *= Rot(PI / 4.);\n    float newTorus = sdTorus(p, .4, 1.5) * pow(scale, float(i+1));\n    torus = min( torus, newTorus );\n  }\n  return torus;\n}\n\n"
  },
  {
    "id": "bali",
    "author": "illus0r",
    "code": "float de( vec3 p ) {\n  p.y+=-1.43;\n  p.x+=-.1245;\n  vec3 pos = p;\n  p.y -=1.5;\n  float sc=0.0,d=0.0,s=0.0,e=1.0;\n  p.z = mod(p.z,2.)-1.;\n  p.x = mod(p.x,2.)-1.;\n  float DEfactor=1.;\n  for (float j=0.; j<9.; j++){\n    p=abs(p);\n    p-=vec3(.5,2.,.5);\n    float dist = dot(p,p);\n    sc=2./clamp(dist,.1,1.);\n    p*=sc;\n    DEfactor*=sc;\n    p-=vec3(0.,5.,0.);\n  }\n  float dd=(length(p)/DEfactor-.001);\n  d+=e=dd*.3;\n  return d;\n}\n\n"
  },
  {
    "id": "kalib",
    "author": "illus0r (modified)",
    "code": "float de(vec3 p) {\n  p *= 0.1;\n  float sc,s,j;\n  float z=p.z;\n  p.x=mod(p.x+.06,.12)-.06;\n  p.z=mod(p.z,.12)-.06-.5;\n  p.y+=.613+.175;\n  p.x-=.5;\n  sc=1.;\n  for(j=0.;j++<9.;){\n    p=abs(p);\n    p-=vec2(.5,.3).xyx;\n    float dist = dot(p,p);\n    s=2./clamp(dist,.1,1.);\n    p*=s;\n    sc*=s;\n    p-=vec3(0.,5.-pow(1.0,5.)*.08,0.);\n  }\n  return ((length(p)-4.)/sc)/0.1;\n}\n"
  },
  {
    "id": "schwarz",
    "author": "Schwarz P",
    "code": "float sdBox(vec3 p, vec3 s) {\n    p = abs(p)-s;\n  return length(max(p, 0.))+min(max(p.x, max(p.y, p.z)), 0.);\n}\nfloat de(vec3 p) {\n    float t = time;\n    float box = sdBox(p, vec3(1));\n    float scale = 5.5;\n    float surf = cos(p.x * scale) + cos(p.y * scale) + cos(p.z * scale) + 2. * sin(t);\n    surf = abs(surf) - 0.01;\n    surf *= 0.1;\n    return max(box, surf);\n}\n"
  },
  {
    "id": "munger",
    "author": "i_dianov",
    "code": "float de(vec3 p) {\n  float ss=1.;\n  for(float j=0.;j++<4.;){\n    float scale = 1.0/dot(p,p);\n    float r1=.77, r2=1.;\n    scale = clamp(scale, 1./(r2*r2), 1./(r1*r1));\n    p *= scale;\n    ss *= scale;\n    p *= 3.;\n    ss *= 3.;\n    p=p-(1.6)*clamp(p,-1.,1.);\n  }\n  float si=.9;\n  p-=clamp(p,-si,si);\n  return abs(length(p)-.001)/ss;\n}\n\n"
  },
  {
    "id": "viking",
    "author": "i_dianov",
    "code": "#define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n#define decartToPolar(d) vec2(atan(d.x,d.y),length(d))\n#define PI (atan(1.)*4.)\n#define LOOPS 16.\n#define LOOP_ANGLE_SPAN (PI/LOOPS)\n#define THREAD_R .035\n#define LOOP_R .2\n#define COHESION (LOOP_R*.6)\n#define TUBE_R 1.\nfloat spiral(vec3 p) {\n  p.z+=atan(p.y,p.x)/PI*LOOP_ANGLE_SPAN;\n  p.z=mod(p.z,LOOP_ANGLE_SPAN*2.)-LOOP_ANGLE_SPAN;\n  return length(vec2(length(p.xy)-LOOP_R,p.z))-THREAD_R;\n}\nfloat de(vec3 p){\n  vec3 pp = p;\n  p.y = mod(p.y, 4.*LOOP_R-2.*COHESION)-2.*LOOP_R+COHESION;\n  p.xz = decartToPolar(p.xz);\n  p.z -= TUBE_R;\n  p.xz*=rot(PI/2.);\n  float s1 = spiral(p + vec3(0, 0, LOOP_ANGLE_SPAN));\n  float s2 = spiral(p + vec3(0, +2.*LOOP_R-COHESION, 0));\n  float s3 = spiral(p + vec3(0, -2.*LOOP_R+COHESION, 0));\n  return min(s1, min(s2, s3));\n}\n\n"
  },
  {
    "id": "knitt",
    "author": "i_dianov",
    "code": "#define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n#define PI (atan(1.)*4.)\n#define THREAD_R .035\n#define LOOP_R .1\nfloat coilSlice(vec3 p) {\n  p.xy+=vec2(LOOP_R,0)*rot(p.z);\n  p.x = mod(p.x, 2.*LOOP_R)-LOOP_R;\n  return length(p.xy);\n}\nfloat de(vec3 p){\n  p.z*=10.;\n  float tissue = min(\n    coilSlice(vec3(p.xy,p.z)),\n    coilSlice(vec3(p.xy+vec2(LOOP_R, 0.),p.z+PI))\n  )-THREAD_R;\n  return tissue*.9;\n}\n"
  },
  {
    "id": "knittt",
    "author": "gaz",
    "code": "#define _(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n#define q(p) length(vec2(mod(p.x,.4)-.2,p.y+sin(t)))\n#define R(x) vec2(.3,0)*_((p.z+t)*9.+x)\nfloat de(vec3 p){\n  float t=time;\n  return min(q((p.xy+R(0.))),q((p.xy+R(3.14))))*.2;\n}\n\n"
  },
  {
    "id": "chiral",
    "author": "illus0r",
    "code": "#define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n#define tn (time/(120.*.017))\n#define PI 3.1415\n#define STEP PI/8.\nvec2 decartToPolar(vec2 decart) {\n    float alpha = atan(decart.x, decart.y);\n    float R = length(decart);\n    return vec2(alpha, R);\n}\nfloat c=3.1415/16.;\nfloat r=.1;\n#define cohesion r*.2 \nfloat de(vec3 p){\n  float i, s=1.;\n  vec2 pol;\n  p.xy*=rot(PI*.5);\n  for(int j=0;j<3;j++){\n    p.zx*=rot(time*.05*s*s*s);\n    p*=2.5;\n    s*=2.5;\n    pol = decartToPolar(p.xz);\n    i = mod(p.y - pol.x*STEP/PI, STEP*2.)-STEP*1.;\n    p.xyz = vec3(i, pol.x, pol.y-.5);\n  }\n  return (length(p.xz)-.3)/s/3.;\n}\n"
  },
  {
    "id": "rifs",
    "author": "illus0r",
    "code": "#define PI (atan(1.)*4.)\n#define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\nfloat de(vec3 p){\n  p.yz *= rot(-time);\n  p.xz *= rot(-time);\n  float s = 1.;\n  float d, dPrev, dPrePrev;\n  for(int i = 0; i++ < 5;) {\n    dPrePrev = dPrev;\n    dPrev = d;\n    p.xz *= rot(time-3.14/6. + float(i));\n    p.yz *= rot(time+3.14/6. + float(i));\n    p = abs(p);\n    p -= .4;\n    p *= 2.;\n    s *= 2.;\n    d = (length(vec2(length(p)-.9, p.z))-.4)/s;\n  }\n  return (length(vec2(d, dPrePrev))-.01)*.5;\n}\n\n"
  },
  {
    "id": "swizz",
    "author": "illus0r",
    "code": "float de(vec3 p){\n  float s = 1.;\n  p.z += time;\n  float c = length(mod(p, 1.)-.5)-.4;\n  for(int i = 0; i < 10; i++) {\n    p*=1.2;\n    s*=1.2;\n    c = max(c, -(length(mod(p, 1.)-.5)-.4)/s);\n  }\n  return c;\n}\n\n"
  },
  {
    "id": "swizz2",
    "author": "illus0r",
    "code": "#define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\nfloat de(vec3 p){\n  float t = time;\n  float s = 1.;\n  p.z += t * .1;\n  p+=.5;\n  float c = length(mod(p, 1.)-.5)-.7;\n  for(int i = 0; i < 12; i++) {\n    p.xy*=rot(time * .01);\n    p*=1.3;\n    s*=1.3;\n    c = max(c, -(length(mod(p, 1.)-.5)-.4)/s);\n  }\n  return c;\n}\n\n"
  },
  {
    "id": "kalic",
    "author": "illus0r",
    "code": "#define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\nfloat de(vec3 p){\n  float t = time, sc;\n  p.xy*=rot(p.z*3.14/3.);\n  vec3 pos = p;\n  p.y -=1.5-sin(p.z+t)*.5;\n  p.z = mod(p.z,2.)-1.;\n  p.x = mod(p.x,2.)-1.;\n  float DEfactor=1.;\n  for (float j=0.; j<7.; j++){\n    p=abs(p);\n    p-=vec3(.5,2.,.5);\n    float dist = dot(p,p);\n    sc=2./clamp(dist,.1,1.);\n    p*=sc;\n    DEfactor*=sc;\n    p-=vec3(0.,5.,0.);\n  }\n  float dd=(length(p)/DEfactor-.005);\n  return dd*.5;\n}\n"
  },
  {
    "id": "gonuts",
    "author": "gaz",
    "code": "#define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n#define Q(p) p*=rot(round(atan(p.y,p.x)/a)*a),\nfloat de(vec3 p){\n  float a = PI/8.0;\n  for(int i=0;i++<5;)\n    Q(p.yx)p.y-=1.,\n    Q(p.zy)p.z-=1.;\n  return.5*abs(length(p+p.zxy)-.05)+1e-3;\n}\n\n"
  },
  {
    "id": "amoeba",
    "author": "gaz",
    "code": "#define rot(a) mat2(cos(a),sin(a),-sin(a),cos(a))\n#define Q(p) p*=rotate2D(round(atan(p.y,p.x)/a)*a),\nfloat de(vec3 p){\n  float a=PI/8.0;\n  for(int i=0;i++<3;)\n    Q(p.yx)p.y-=.8,\n    Q(p.zy)p.z-=.8;\n  return .5*abs(length(vec2(length(p.xy)-.1,p.z))-.1)+1e-3;\n}\n\n"
  },
  {
    "id": "twiggy",
    "author": "tk87",
    "code": "mat2 rotate2D ( float r ) {\n  return mat2(cos(r), sin(r), -sin(r), cos(r));\n}\nfloat de ( vec3 p ) {\n  float d = 0;\n  p.z+=3.;\n  for(int i=0;++i<10;)\n    p.y-=clamp(p.y,.0,.3),\n    p.xz-=.05,\n    p=abs(p),\n    p.yx*=rotate2D(.6),\n    p.zx*=rotate2D(1.4),\n    p*=1.1;\n    d=length(p)-.05;\n    d*=.39;\n  return d;\n}\n\n"
  },
  {
    "id": "twiggy2",
    "author": "tk87",
    "code": "float de ( vec3 p ) {\n  float d = 0;\n  p.z+=.8;\n  for(int i=0;++i<10;)\n    p.y-=clamp(p.y,.0,.1),\n    p=abs(p),\n    p*=rotate3D(.4,vec3(1,.2,-1)),\n    p*=1.1;\n  d=length(p)-.02;\n  d*=.39;\n  return d;\n}\n"
  },
  {
    "id": "spicy",
    "author": "leon",
    "code": "float gyroid (vec3 seed) { return dot(sin(seed),cos(seed.yzx)); }\nfloat fbm (vec3 seed) {\n  float result = 0.;\n  float a = .5;\n  for (int i = 0; i < 5; ++i) {\n    result += gyroid(seed/a+result/a)*a;\n    a /= 2.;\n  }\n  return result;\n}\nfloat de(vec3 p){\n  // spicy fbm cyclic gyroid noise\n  float details = sin(time*.2-fbm(p)+length(p));\n  return max(abs(details*.05), p.z+2.);\n}\n\n"
  },
  {
    "id": "blocktree",
    "author": "Jeyko",
    "code": "float r11 ( float t ) { \n  return fract( sin( t * 414.125 ) * 114.12521 );\n}\nfloat valN ( float t ) {\n  return mix( r11( floor( t ) ), r11( floor( t ) + 1.0 ), pow( fract( t ), 2.0 ) );\n}\nvec3 nois ( float t ) {\n  t /= 2.0;\n  return vec3( valN( t + 200.0 ), valN( t + 10.0 ), valN( t + 50.0 ) );\n}\nfloat sdBox ( vec3 p, vec3 s ) {\n  p = abs( p ) - s;\n  return max( p.x, max( p.y, p.z ) );\n}\n#define rot(j) mat2(cos(j),-sin(j),sin(j),cos(j))\nfloat de ( vec3 p ) {\n  vec3 n = nois( time );\n  float d = 10e7;\n  vec3 sz = vec3( 1.0, 0.5, 0.5 ) / 2.0;\n  for( int i = 0; i < 8; i++ ){\n    float b = sdBox( p, sz );\n    sz *= vec3( 0.74, 0.5, 0.74 );\n    d = min( b, d );\n    p = abs( p );\n    p.xy *= rot( -0.9 + n.x );\n    p.yz *= rot( 0.6 - n.y * 0.3 );\n    p.xz *= rot( -0.2 + n.y * 0.1 );\n    p.xy -= sz.xy * 2.0;\n  }\n  return d;\n}\n"
  },
  {
    "id": "threddy",
    "author": "gaz",
    "code": "float de ( vec3 p ) {\n  float e = 1., g=0;\n  for ( int i=0;i++<7;p=abs(p)-vec3(2,1,.2))\n    p = 0.22-abs(abs(p)-.06),\n    p = p.x>p.y?p.zxy:p.zyx,\n    p *= 2.,\n    e *= 2.,\n    p.xz *= rotate2D(-.6);\n    p /= e;\n    g += e = length(p.xy);\n  return e;\n}\n"
  },
  {
    "id": "Lewpen_snowflake",
    "author": "Lewpen",
    "code": "//  Snowflake by Lewpen (fractals.com)\nfloat de( in vec3 pos ) {\n  //  PARAM: Offset distance for each iteration of spheres\n  float Distance = 1.1428;\n  //  PARAM: Scale factor for each iteration of spheres\n  float Scale = 0.3868138;\n  float r = length( pos ) - 1.0;\n  float e = 1.0;\n  float oScale = 1.0 / Scale;\n  for ( int i = 0; i < 20; i++ ) {\n    vec3 v;\n    if ( abs( pos.x ) > abs( pos.y ) ) {\n      if ( abs( pos.x ) > abs( pos.z ) ) {\n        v = vec3( 1.0, 0.0, 0.0 );\n      } else {\n        v = vec3( 0.0, 0.0, 1.0 );\n      }\n    } else {\n      if ( abs( pos.y ) > abs( pos.z ) ) {\n        v = vec3( 0.0, 1.0, 0.0 );\n      } else {\n        v = vec3( 0.0, 0.0, 1.0 );\n      }\n    }\n    pos = abs( abs( pos ) - Distance * v );\n    pos *= oScale;\n    e *= Scale;\n    r = min( r, e * ( length( pos ) - 1.0 ) );\n  }\n  return r;\n}\n\n"
  },
  {
    "id": "OriginFlowers",
    "author": "Lewpen",
    "code": "//  Origin Flowers by Lewpen (fractals.com)\nfloat de( in vec3 pos ) {\n  float fd = 1.0;\n  vec3 cs = vec3( -0.7, 0.0, 0.4 );\n  float fs = 1.0;\n  vec3 fc = vec3( 0.0 );\n  vec3 p = pos;\n  float dEfactor = 4.0;\n  for ( int i=0; i < 24; i++ ) {\n    p = 2.0 * clamp( p, -cs, cs ) - p;  //  box folding\n    float k = max( 0.58 * fs / dot( p, p ), 1.0 );  //  inversion\n    p *= k;\n    dEfactor *= k;\n    p += fc;  //  julia seed\n  }\n  return ( abs( length( p.xz * p.z * p.xz ) - 0.5125 ) * 1.0 ) / abs( dEfactor );\n}\n"
  },
  {
    "id": "Converge",
    "author": "Lewpen",
    "code": "//  Converge by Lewpen (fractals.com)\nfloat de( in vec3 pos ) {\n  float fd = 1.0;\n  vec3 cs = vec3( -0.1, 0.3, 0.4 );\n  float fs = 1.0;\n  vec3 fc = vec3( -0.2, -0.3, -1.1 ) ; \n  vec3 p = pos;\n  float dEfactor = 2.0;\n  for ( int i = 0; i < 38; i++ ) {\n    p = 1.9 * clamp( p, -cs, cs ) - p;\n    float k = max( 0.58 * fs / dot( p, p ), 1.0 );\n    p *= k;\n    dEfactor *= k;\n    p += fc;\n  }\n  return ( abs( length( p.xyz ) - 1.0 ) * 1.0 ) / abs( dEfactor );\n}\n"
  },
  {
    "id": "mrange_apollo1",
    "author": "mrange",
    "code": "void r45 ( inout vec2 p) {\n  p = ( p + vec2( p.y, -p.x ) ) * sqrt( 0.5 );\n}\nfloat de ( vec3 p ) {\n  int layer = 0;\n  const float s = 1.9;\n  float scale = 1.0;\n  float r = 0.2;\n  vec3 o = vec3( 0.22, 0.0, 0.0 );\n  float d = 0.0;\n  for ( int i = 0; i < 11; ++i ) {\n    p = ( -1.00 + 2.0 * fract( 0.5 * p + 0.5 ) );\n    r45( p.xz );\n    float r2 = dot( p, p ) + 0.0;\n    float k = s / r2;\n    float ss = pow( ( 1.0 + float( i ) ), -0.15 );\n    p *= pow( k, ss );\n    scale *= pow( k, -ss * ss );\n    d = 0.25 * abs( p.y ) * scale;\n    layer = i;\n    if( abs( d ) < 0.00048 ) break;\n  }\n  return d;\n}\n"
  },
  {
    "id": "mrange_apollo2",
    "author": "mrange",
    "code": "void rotT ( inout vec2 p, float a ) {\n  float c = cos( a );\n  float s = sin( a );\n  p = vec2( c * p.x + s * p.y, -s * p.x + c * p.y );\n}\nvoid r45 ( inout vec2 p) {\n  p = ( p + vec2( p.y, -p.x ) ) * sqrt( 0.5 );\n}\nfloat de ( vec3 p ) {\n  int layer = 0;\n  const float s = 1.9;\n  float scale = 1.0;\n  float r = 0.2;\n  vec3 o = vec3( 0.22, 0.0, 0.0 );\n  float d = 0.0;\n  for ( int i = 0; i < 11; ++i ) {\n    p = ( -1.00 + 2.0 * fract( 0.5 * p + 0.5 ) );\n    rotT(p.xz, -float(i)*PI/4.0);\n    r45( p.xz );\n    float r2 = dot( p, p ) + 0.0;\n    float k = s / r2;\n    float ss = pow( ( 1.0 + float( i ) ), -0.15 );\n    p *= pow( k, ss );\n    scale *= pow( k, -ss * ss );\n    d = 0.25 * abs( p.y ) * scale;\n    layer = i;\n    if( abs( d ) < 0.00048 ) break;\n  }\n  return d;\n}\n"
  },
  {
    "id": "mrange_tree1",
    "author": "mrange",
    "code": "void rotT ( inout vec2 p, float a ) {\n  float c = cos( a );\n  float s = sin( a );\n  p = vec2( c * p.x + s * p.y, -s * p.x + c * p.y );\n}\nfloat box ( vec3 p, vec3 b ) {\n  vec3 q = abs( p ) - b;\n  return length( max( q, 0.0 ) ) + min( max( q.x, max( q.y, q.z ) ), 0.0 );\n}\nfloat mod1 ( inout float p, float size ) {\n  float halfsize = size * 0.5;\n  float c = floor( ( p + halfsize ) / size );\n  p = mod( p + halfsize, size ) - halfsize;\n  return c;\n}\nvec2 modMirror2 ( inout vec2 p, vec2 size ) {\n  vec2 halfsize = size * 0.5;\n  vec2 c = floor( ( p + halfsize ) / size );\n  p = mod( p + halfsize, size ) - halfsize;\n  p *= mod( c, vec2( 2 ) ) * 2.0 - vec2( 1.0 );\n  return c;\n}\nfloat de ( vec3 p ) {\n  vec3 op = p;\n  float s = 1.3 + smoothstep( 0.15, 1.5, p.y ) * 0.95;\n  float scale = 1.0;\n  float r = 0.2;\n  vec3 o = vec3( 0.22, 0.0, 0.0 );\n  float d = 10000.0;\n  const int rep = 7;\n  for ( int i = 0; i < rep; i++ ) {\n    mod1( p.y, 2.0 );\n    modMirror2( p.xz, vec2( 2.0 ) );\n    rotT( p.xz, PI / 5.5 );\n    float r2 = dot( p, p ) + 0.0;\n    float k = s / r2;\n    float r = 0.5;\n    p *= k;\n    scale *= k;\n  }\n  d = box( p - 0.1, 1.0 * vec3( 1.0, 2.0, 1.0 ) ) - 0.5;\n  d = abs( d ) - 0.01;\n  float d1 = 0.25 * d / scale;\n  float db = box( op - vec3( 0.0, 0.5, 0.0 ), vec3( 0.75, 1.0, 0.75 ) ) - 0.5;\n  float dp = op.y;\n  return min( dp, max( d1, db ) );\n}\n\n"
  },
  {
    "id": "mrange_tree2",
    "author": "mrange",
    "code": "void rotT ( inout vec2 p, float a ) {\n  float c = cos( a );\n  float s = sin( a );\n  p = vec2( c * p.x + s * p.y, -s * p.x + c * p.y );\n}\nfloat box ( vec3 p, vec3 b ) {\n  vec3 q = abs( p ) - b;\n  return length( max( q, 0.0 ) ) + min( max( q.x, max( q.y, q.z ) ), 0.0 );\n}\nfloat mod1 ( inout float p, float size ) {\n  float halfsize = size * 0.5;\n  float c = floor( ( p + halfsize ) / size );\n  p = mod( p + halfsize, size ) - halfsize;\n  return c;\n}\nvec2 modMirror2 ( inout vec2 p, vec2 size ) {\n  vec2 halfsize = size * 0.5;\n  vec2 c = floor( ( p + halfsize ) / size );\n  p = mod( p + halfsize, size ) - halfsize;\n  p *= mod( c, vec2( 2 ) ) * 2.0 - vec2( 1.0 );\n  return c;\n}\nfloat de ( vec3 p ) {\n  vec3 op = p;\n  float s = 1.3 + min( pow( max( p.y - 0.25, 0.0 ), 1.0 ) * 0.75, 1.5 );\n  float scale = 1.0;\n  float r = 0.2;\n  vec3 o = vec3( 0.22, 0.0, 0.0 );\n  float d = 10000.0;\n  const int rep = 7;\n  for ( int i = 0; i < rep; i++ ) {\n    mod1( p.y, 2.0 );\n    modMirror2( p.xz, vec2( 2.0 ) );\n    rotT( p.xz, PI / 5.5 );\n    float r2 = dot( p, p ) + 0.0;\n    float k = s / r2;\n    float r = 0.5;\n    p *= k;\n    scale *= k;\n  }\n  d = box( p - 0.1, 1.0 * vec3( 1.0, 2.0, 1.0 ) ) - 0.5;\n  d = abs( d ) - 0.01;\n  float d1 = 0.25 * d / scale;\n  float db = box( op - vec3( 0.0, 0.5, 0.0 ), vec3( 0.75, 1.0, 0.75 ) ) - 0.5;\n  float dp = op.y;\n  return min( dp, max( d1, db ) );\n}\n\n"
  },
  {
    "id": "mrange_mandelbox",
    "author": "mrange",
    "code": "vec3 pmin ( vec3 a, vec3 b, vec3 k ) {\n  vec3 h = clamp( 0.5 + 0.5 * ( b - a ) / k, 0.0, 1.0 );\n  return mix( b, a, h ) - k * h * ( 1.0 - h );\n}\nvoid sphere_fold ( inout vec3 z, inout float dz ) {\n  const float fixed_radius2 = 1.9;\n  const float min_radius2 = 0.5;\n  float r2 = dot( z, z );\n  if ( r2 < min_radius2 ) {\n    float temp = ( fixed_radius2 / min_radius2 );\n    z *= temp;\n    dz *= temp;\n  } else if ( r2 < fixed_radius2 ) {\n    float temp = ( fixed_radius2 / r2 );\n    z *= temp;\n    dz *= temp;\n  }\n}\nvoid box_fold(float k, inout vec3 z, inout float dz) {\n  vec3 zz = sign( z ) * pmin( abs( z ), vec3( 1.0 ), vec3( k ) );\n  z = zz * 2.0 - z;\n}\nfloat sphere ( vec3 p, float t ) {\n  return length( p ) - t;\n}\nfloat boxf ( vec3 p, vec3 b, float e ) {\n  p = abs( p ) - b;\n  vec3 q = abs( p + e ) - e;\n  return min( min(\n    length( max( vec3( p.x, q.y, q.z ), 0.0 ) ) + min( max( p.x, max( q.y, q.z ) ), 0.0 ),\n    length( max( vec3( q.x, p.y, q.z ), 0.0 ) ) + min( max( q.x, max( p.y, q.z ) ), 0.0 ) ),\n    length( max( vec3( q.x, q.y, p.z ), 0.0 ) ) + min( max( q.x, max( q.y, p.z ) ), 0.0 ) );\n}\nfloat de ( vec3 z ) {\n  const float scale = -2.8;\n  vec3 offset = z;\n  float dr = 1.0;\n  float fd = 0.0;\n  const float k = 0.05;\n  for ( int n = 0; n < 5; ++n ) {\n    box_fold( k / dr, z, dr );\n    sphere_fold( z, dr );\n    z = scale * z + offset;\n    dr = dr * abs( scale ) + 1.0;\n    float r1 = sphere( z, 5.0 );\n    float r2 = boxf( z, vec3( 5.0 ), 0.5 );\n    float r = n < 4 ? r2 : r1;\n    float dd = r / abs( dr );\n    if ( n < 3 || dd < fd ) {\n      fd = dd;\n    }\n  }\n  return fd;\n}\n\n"
  },
  {
    "id": "PhilosopherStoned",
    "author": "stb",
    "code": "// \"Philosopher Stoned\" by stb\nfloat s, c;\n#define rotate(p, a) mat2(c=cos(a), s=-sin(a), -s, c) * p\nvoid rotateXY( inout vec3 p, vec2 axy ) {\n  p.yz = rotate( p.yz, axy.y );\n  p.xz = rotate( p.xz, axy.x );\n}\nvec3 fold ( in vec3 p, in vec3 n ) {\n  n = normalize( n );\n  p -= n * max( 0., 2. * dot( p, n ) );\n  return p;\n}\nfloat de ( in vec3 p ) {\n  float f;\n  float t = time;\n  const float I = 64.;\n  for ( float i = 0.; i < I; i++ ) {\n    rotateXY( p, vec2( 10. - .024273 * t, .0045 * t ) );\n    //p = abs( p );\n    p = fold( p, vec3(  1., -1., 0. ) );\n    p = fold( p, vec3( -1., 0., -1. ) );\n    p -= .125 * .025 / ( ( i + 1. ) / I );\n  }\n  f = length( p )-.007;\n  return f;\n}\n\n"
  },
  {
    "id": "ballFlake",
    "author": "natchinoyuchi ( modified )",
    "code": "float de ( vec3 p ) {\n  p += vec3( 3.0, 3.0, -17.0 );\n  float i, d = 3.0, e = 0.0, g, a = 3.0, t = time;\n  p += a;\n  for( int j = 0; j++ < 7; p *= e )\n    p = abs( p - a ) - a,\n    a = a * ( -sin( t ) * 0.6 + 0.61 ),\n    d *= e = a * a * 2.0 / dot( p, p );\n  return min( 0.3, ( p.y + length( p.xz ) ) / d );\n}\n\n"
  },
  {
    "id": "greenDragon",
    "author": "guil",
    "code": "vec2 cmul( vec2 a, vec2 b ) { return vec2( a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x ); }\nvec2 csqr( vec2 a ) { return vec2( a.x * a.x - a.y * a.y, 2.0 * a.x * a.y ); }\nvec2 conj( vec2 z ) { return vec2( z.x, -z.y ); }\nvec4 dmul( vec4 a, vec4 b ) {\n  float r = length( a );\n  b.xy = cmul( normalize( a.xy ), b.xy );\n  b.xz = cmul( normalize( a.xz ), b.xz );\n  b.zw = cmul( normalize( a.zw ), b.zw );\n  return r * b;\n}\n\n// Green Dragon\nfloat de ( vec3 p) {\n  float dr = 1.0;\n  p *= dr;\n  float r2;\n  vec4 z = vec4( -p.yzx, 0.2 );\n  dr = dr / length( z );\n  if ( z.z > -0.5 )\n    z.x += 0.5 * cos( time ) * abs( z.y ) * ( z.z + 0.5 );\n  dr = dr * length( z );\n  vec4 c = z;\n  for ( int i = 0; i < 16; i++ ) {\n    r2 = dot( z, z );\n    if( r2 > 100.0 )\n      continue;\n    dr = 2.0 * sqrt( r2 ) * dr + 1.0;\n    z = dmul( z, z ) + c;\n  }\n  return 0.5 * length( z ) * log( length( z ) ) / dr;\n}\n\n"
  },
  {
    "id": "feeingers",
    "author": "stduhpf",
    "code": "float de ( vec3 p ) {\n  float scale = 1.0;\n  float orb = 10000.0; // orbit term 1\n  for ( int i = 0; i < 6; i++ ) {\n    p = -1.0 + 2.0 * fract( 0.5 * p + 0.5 );\n    p -= sign( p ) * 0.1;\n    float a = float( i ) * acos( -1.0 ) / 4.0;\n    p.xz *= mat2( cos( a ), sin( a ), -sin( a ), cos( a ) );\n    float r2 = dot( p, p );\n    float k = 0.95 / r2;\n    p *= k;\n    scale *= k;\n    orb = min( orb, r2 );\n  }\n  float d1 = sqrt( min( min( dot( p.xy, p.xy ), dot( p.yz, p.yz ) ), dot( p.zx, p.zx ) ) ) - 0.02;\n  float d2 = abs( p.y );\n  float dmi = d2;\n  float adr = 0.7 * floor( ( 0.5 * p.y + 0.5 ) * 8.0 ); // orbit term 2\n  if ( d1 < d2 ) {\n    dmi = d1;\n    adr = 0.0;\n  }\n  return 0.5 * dmi / scale;\n}\n\n"
  },
  {
    "id": "hexx",
    "author": "krakel",
    "code": "vec3 triangles ( vec3 p ) {\n  const float sqrt3 = sqrt( 3.0 );\n  float zm = 1.;\n  p.x = p.x-sqrt3*(p.y+.5)/3.;\n  p = vec3( mod( p.x + sqrt3 / 2.0, sqrt3 ) - sqrt3 / 2.0, mod( p.y + 0.5, 1.5 ) - 0.5, mod( p.z + 0.5 * zm, zm ) - 0.5 * zm );\n  p = vec3( p.x / sqrt3, ( p.y + 0.5 ) * 2.0 / 3.0 - 0.5, p.z );\n  p = p.y > -p.x ? vec3( -p.y, -p.x , p.z ) : p;\n  p = vec3( p.x * sqrt3, ( p.y + 0.5 ) * 3.0 / 2.0 - 0.5, p.z );\n  return vec3( p.x + sqrt3 * ( p.y + 0.5 ) / 3.0, p.y , p.z );\n}\nfloat de ( vec3 p ) {\n  float scale = 1.0;\n  float s = 1.0 / 3.0;\n  for ( int i = 0; i < 10; i++ ) {\n    p = triangles( p );\n    float r2 = dot( p, p );\n    float k = s / r2;\n    p = p * k;\n    scale=scale * k;\n  }\n  return 0.3 * length( p ) / scale - 0.001 / sqrt( scale );\n}\n\n"
  },
  {
    "id": "abbox",
    "author": "zackpudil",
    "code": "float box ( vec3 p, vec3 b ) {\n  vec3 d = abs( p ) - b;\n  return min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) );\n}\nfloat de ( vec3 p ) {\n  vec4 q = vec4( p, 1.0 );\n  q.y = mod( q.y + 1.0, 2.0 ) - 1.0;\n  q.xyz -= 1.0;\n  for ( int i = 0; i < 3; i++ ) {\n    q.xyz = abs( q.xyz + 1.0 ) - 1.0;\n    q = 1.2 * q / clamp( dot( q.xyz, q.xyz ), 0.25, 1.0 );\n  }\n  float f = box( q.xyz, vec3( 1.0 ) ) / q.w;\n  f = min( f, p.y + 2.0 );\n  f = min( f, min( p.x + 3.0, -p.x + 3.0 ) );\n  f = min( f, min( p.z + 3.0, -p.z + 3.0 ) );\n  return f;\n}\n\n"
  },
  {
    "id": "sonolith",
    "author": "zackpudil",
    "code": "float de ( vec3 p ) {\n  p.xy = mod( p.xy + 1.0, 2.0 ) - 1.0;\n  p.z = abs( p.z ) - 0.75;\n  vec4 q = vec4( p, 1.0 );\n  for ( int i = 0; i < 15; i++ ) {\n    q.xyz = abs( q.xyz ) - vec3( 0.3, 1.0, -0.0 );\n    q = 2.0 * q / clamp( dot( q.xyz, q.xyz ), 0.5, 1.0 ) - vec4( 1.0, 0.0, 0.3, 0.0 );\n  }\n  return abs(q.x + q.y + q.z)/q.w;\n}\n\n"
  },
  {
    "id": "blobelisk",
    "author": "zackpudil",
    "code": "float de ( vec3 p ) {\n  vec4 q = vec4( p, 1 );\n  q.xz = mod(q.xz + 1.0, 2.0) - 1.0;\n  for ( int i = 0; i < 15; i++ ) {\n    q.xyz = abs( q.xyz );\n    q /= clamp( dot( q.xyz, q.xyz ), 0.4, 1.0 );\n    q = 1.7 * q - vec4( 0.5, 1.0, 0.4, 0.0 );\n  }\n  return min( length( q.xyz ) / q.w, min( p.y + 1.0, -p.y + 1.0 ) );\n}\n\n"
  },
  {
    "id": "ringoo",
    "author": "yonatan",
    "code": "float de ( vec3 p ) {\n  float i = 0.0f;\n  float u = 0.0f;\n  float S = 6.0f;\n  p--;\n  for ( int j = 0; j++ < 8; p = abs( ++p ) - 1.0f )\n    p.z =- p.z,\n    u = dot( p, p ) * 0.6f,\n    S /= u + 0.001f, // prevent divide-by-zero\n    p /= u + 0.001f;\n  return ( length( p.xz ) + p.y ) / S;\n}\n\n"
  },
  {
    "id": "shreddissimo",
    "author": "yonatan",
    "code": "float de ( vec3 p ){\n  float S = 1.0f;\n  float R, e;\n  p.y += p.z;\n  p = vec3( log( R = length( p ) ) - time, asin( -p.z / R ), atan( p.x, p.y ) + time );\n  for( e = p.y - 1.5f; S < 6e2; S += S )\n    e += sqrt( abs( dot( sin( p.zxy * S ), cos( p * S ) ) ) ) / S;\n  return e * R * 0.1f;\n}\n"
  },
  {
    "id": "gnollum",
    "author": "Kamoshika",
    "code": "float de( vec3 p ){\n  vec3 Q, U = vec3( 1.0f );\n  float d=1.0, a=1.0f;\n  d = min( length( fract( p.xz) -0.5f ) - 0.2f, 0.3f - abs( p.y - 0.2f ) );\n  for( int j = 0; j++ < 9; a += a )\n    Q = p * a * 9.0f,\n    Q.yz *= rotate2D( a ),\n    d += abs( dot( sin( Q ), U ) ) / a * 0.02f;\n  return d * 0.6f;\n}\n"
  },
  {
    "id": "cage",
    "author": "aiekick",
    "code": "float de ( vec3 p ) {\n  float d = 0.0f;\n  float t = 0.3f;\n  float s = 1.0f;\n  vec4 r = vec4( 0.0f );\n  vec4 q = vec4( p, 0.0f );\n  for ( int j = 0; j < 4 ; j++ )\n    r = max( r *= r *= r = mod( q * s + 1.0f, 2.0f ) - 1.0f, r.yzxw ),\n    d = max( d, ( 0.27f - length( r ) * 0.3f ) / s ),\n    s *= 3.1f;\n  return d;\n}\n\n"
  },
  {
    "id": "stairs",
    "author": "Kamoshika",
    "code": "float de ( vec3 P ) {\n  vec3 Q;\n  float a, d = min( ( P.y - abs( fract( P.z ) - 0.5f ) ) * 0.7f, 1.5f - abs( P.x ) );\n  for( a = 2.0f; a < 6e2f; a += a )\n    Q = P * a,\n    Q.xz *= rotate2D( a ),\n    d += abs( dot( sin( Q ), Q - Q + 1.0f ) ) / a / 7.0f;\n  return d;\n}\n\n"
  },
  {
    "id": "jumpthecrater",
    "author": "michael0884",
    "code": "vec3 orbitColor;\nfloat de( vec3 p ) {\n// Jump the crater\n  float scale = 1.8f;\n  float angle1 = -0.12f;\n  float angle2 = 0.5f;\n  vec3 shift = vec3( -2.12f, -2.75f, 0.49f );\n  vec3 color = vec3( 0.42f, 0.38f, 0.19f );\n  vec2 a1 = vec2(sin(angle1), cos(angle1));\n  vec2 a2 = vec2(sin(angle2), cos(angle2));\n  mat2 rmZ = mat2(a1.y, a1.x, -a1.x, a1.y);\n  mat2 rmX = mat2(a2.y, a2.x, -a2.x, a2.y);\n  float s = 1.0;\n  orbitColor = vec3( 0.0f );\n  for (int i = 0; i <11; ++i) {\n    p.xyz = abs(p.xyz);\n    p.xy *= rmZ;\n    p.xy += min( p.x - p.y, 0.0 ) * vec2( -1., 1. );\n    p.xz += min( p.x - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz += min( p.y - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz *= rmX;\n    p *= scale;\n    s *= scale;\n    p.xyz += shift;\n    orbitColor = max( orbitColor, p.xyz * color);\n  }\n  vec3 d = abs( p ) - vec3( 6.0f );\n  return ( min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) ) ) / s;\n}\n"
  },
  {
    "id": "toomanytrees",
    "author": "michael0884",
    "code": "vec3 orbitColor;\nfloat de( vec3 p ) {\n  //Too many trees\n  float scale = 1.9073f;\n  float angle1 = -9.83f;\n  float angle2 = -1.16f;\n  vec3 shift = vec3( -3.508f, -3.593f, 3.295f );\n  vec3 color = vec3( -0.34, 0.12f, -0.08f );\n  vec2 a1 = vec2(sin(angle1), cos(angle1));\n  vec2 a2 = vec2(sin(angle2), cos(angle2));\n  mat2 rmZ = mat2(a1.y, a1.x, -a1.x, a1.y);\n  mat2 rmX = mat2(a2.y, a2.x, -a2.x, a2.y);\n  float s = 1.0;\n  orbitColor = vec3( 0.0f );\n  for (int i = 0; i <11; ++i) {\n    p.xyz = abs(p.xyz);\n    p.xy *= rmZ;\n    p.xy += min( p.x - p.y, 0.0 ) * vec2( -1., 1. );\n    p.xz += min( p.x - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz += min( p.y - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz *= rmX;\n    p *= scale;\n    s *= scale;\n    p.xyz += shift;\n    orbitColor = max( orbitColor, p.xyz * color);\n  }\n  vec3 d = abs( p ) - vec3( 6.0f );\n  return ( min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) ) ) / s;\n}\n\n"
  },
  {
    "id": "holeinone",
    "author": "michael0884",
    "code": "vec3 orbitColor;\nfloat de( vec3 p ) {\n  //Hole in one\n  float scale = 2.02f;\n  float angle1 = -1.57f;\n  float angle2 = 1.62f;\n  vec3 shift = vec3( -3.31f, 6.19f, 1.53f );\n  vec3 color = vec3( 0.12f, -0.09f, -0.09f );\n  vec2 a1 = vec2(sin(angle1), cos(angle1));\n  vec2 a2 = vec2(sin(angle2), cos(angle2));\n  mat2 rmZ = mat2(a1.y, a1.x, -a1.x, a1.y);\n  mat2 rmX = mat2(a2.y, a2.x, -a2.x, a2.y);\n  float s = 1.0;\n  orbitColor = vec3( 0.0f );\n  for (int i = 0; i <11; ++i) {\n    p.xyz = abs(p.xyz);\n    p.xy *= rmZ;\n    p.xy += min( p.x - p.y, 0.0 ) * vec2( -1., 1. );\n    p.xz += min( p.x - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz += min( p.y - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz *= rmX;\n    p *= scale;\n    s *= scale;\n    p.xyz += shift;\n    orbitColor = max( orbitColor, p.xyz * color);\n  }\n  vec3 d = abs( p ) - vec3( 6.0f );\n  return ( min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) ) ) / s;\n}\n\n"
  },
  {
    "id": "aroundtheworld",
    "author": "michael0884",
    "code": "vec3 orbitColor;\nfloat de( vec3 p ) {\n  //Around the world\n  float scale = 1.65f;\n  float angle1 = 0.37f;\n  float angle2 = 5.26f;\n  vec3 shift = vec3( -1.41f, -0.22f, -0.77f );\n  vec3 color = vec3( 0.14f, -1.71f, 0.31f );\n  vec2 a1 = vec2(sin(angle1), cos(angle1));\n  vec2 a2 = vec2(sin(angle2), cos(angle2));\n  mat2 rmZ = mat2(a1.y, a1.x, -a1.x, a1.y);\n  mat2 rmX = mat2(a2.y, a2.x, -a2.x, a2.y);\n  float s = 1.0;\n  orbitColor = vec3( 0.0f );\n  for (int i = 0; i <11; ++i) {\n    p.xyz = abs(p.xyz);\n    p.xy *= rmZ;\n    p.xy += min( p.x - p.y, 0.0 ) * vec2( -1., 1. );\n    p.xz += min( p.x - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz += min( p.y - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz *= rmX;\n    p *= scale;\n    s *= scale;\n    p.xyz += shift;\n    orbitColor = max( orbitColor, p.xyz * color);\n  }\n  vec3 d = abs( p ) - vec3( 6.0f );\n  return ( min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) ) ) / s;\n}\n\n"
  },
  {
    "id": "bewareofbumps",
    "author": "michael0884",
    "code": "vec3 orbitColor;\nfloat de( vec3 p ) {\n  //Beware Of Bumps\n  float scale = 1.66f;\n  float angle1 = 1.52f;\n  float angle2 = 0.19f;\n  vec3 shift = vec3( -3.83f, -1.94f, -1.09f );\n  vec3 color = vec3( 0.42f, 0.38f, 0.19f );\n  vec2 a1 = vec2(sin(angle1), cos(angle1));\n  vec2 a2 = vec2(sin(angle2), cos(angle2));\n  mat2 rmZ = mat2(a1.y, a1.x, -a1.x, a1.y);\n  mat2 rmX = mat2(a2.y, a2.x, -a2.x, a2.y);\n  float s = 1.0;\n  orbitColor = vec3( 0.0f );\n  for (int i = 0; i <11; ++i) {\n    p.xyz = abs(p.xyz);\n    p.xy *= rmZ;\n    p.xy += min( p.x - p.y, 0.0 ) * vec2( -1., 1. );\n    p.xz += min( p.x - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz += min( p.y - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz *= rmX;\n    p *= scale;\n    s *= scale;\n    p.xyz += shift;\n    orbitColor = max( orbitColor, p.xyz * color);\n  }\n  vec3 d = abs( p ) - vec3( 6.0f );\n  return ( min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) ) ) / s;\n}\n\n"
  },
  {
    "id": "mountainclimbing",
    "author": "michael0884",
    "code": "vec3 orbitColor;\nfloat de( vec3 p ) {\n  //Mountain Climbing\n  float scale = 1.58f;\n  float angle1 = -1.45f;\n  float angle2 = 3.95f;\n  vec3 shift = vec3( -1.55f, -0.13f, -2.52f );\n  vec3 color = vec3( -1.17f, -0.4f, -1.0f );\n  vec2 a1 = vec2(sin(angle1), cos(angle1));\n  vec2 a2 = vec2(sin(angle2), cos(angle2));\n  mat2 rmZ = mat2(a1.y, a1.x, -a1.x, a1.y);\n  mat2 rmX = mat2(a2.y, a2.x, -a2.x, a2.y);\n  float s = 1.0;\n  orbitColor = vec3( 0.0f );\n  for (int i = 0; i <11; ++i) {\n    p.xyz = abs(p.xyz);\n    p.xy *= rmZ;\n    p.xy += min( p.x - p.y, 0.0 ) * vec2( -1., 1. );\n    p.xz += min( p.x - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz += min( p.y - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz *= rmX;\n    p *= scale;\n    s *= scale;\n    p.xyz += shift;\n    orbitColor = max( orbitColor, p.xyz * color);\n  }\n  vec3 d = abs( p ) - vec3( 6.0f );\n  return ( min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) ) ) / s;\n}\n"
  },
  {
    "id": "mindthegap",
    "author": "michael0884",
    "code": "vec3 orbitColor;\nfloat de( vec3 p ) {\n  //Mind the gap\n  float scale = 1.81f;\n  float angle1 = -4.84f;\n  float angle2 = -2.99f;\n  vec3 shift = vec3( -2.905f, 0.765f, -4.165f );\n  vec3 color = vec3( 0.251f, 0.337f, 0.161f );\n  vec2 a1 = vec2(sin(angle1), cos(angle1));\n  vec2 a2 = vec2(sin(angle2), cos(angle2));\n  mat2 rmZ = mat2(a1.y, a1.x, -a1.x, a1.y);\n  mat2 rmX = mat2(a2.y, a2.x, -a2.x, a2.y);\n  float s = 1.0;\n  orbitColor = vec3( 0.0f );\n  for (int i = 0; i <11; ++i) {\n    p.xyz = abs(p.xyz);\n    p.xy *= rmZ;\n    p.xy += min( p.x - p.y, 0.0 ) * vec2( -1., 1. );\n    p.xz += min( p.x - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz += min( p.y - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz *= rmX;\n    p *= scale;\n    s *= scale;\n    p.xyz += shift;\n    orbitColor = max( orbitColor, p.xyz * color);\n  }\n  vec3 d = abs( p ) - vec3( 6.0f );\n  return ( min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) ) ) / s;\n}\n"
  },
  {
    "id": "thesponge",
    "author": "michael0884",
    "code": "vec3 orbitColor;\nfloat de( vec3 p ) {\n  //The Sponge\n  float scale = 1.88f;\n  float angle1 = 1.52f;\n  float angle2 = 4.91f;\n  vec3 shift = vec3( -4.54f, -1.26f, 0.1f );\n  vec3 color = vec3( -1.0f, 0.3f, -0.43f );\n  vec2 a1 = vec2(sin(angle1), cos(angle1));\n  vec2 a2 = vec2(sin(angle2), cos(angle2));\n  mat2 rmZ = mat2(a1.y, a1.x, -a1.x, a1.y);\n  mat2 rmX = mat2(a2.y, a2.x, -a2.x, a2.y);\n  float s = 1.0;\n  orbitColor = vec3( 0.0f );\n  for (int i = 0; i <11; ++i) {\n    p.xyz = abs(p.xyz);\n    p.xy *= rmZ;\n    p.xy += min( p.x - p.y, 0.0 ) * vec2( -1., 1. );\n    p.xz += min( p.x - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz += min( p.y - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz *= rmX;\n    p *= scale;\n    s *= scale;\n    p.xyz += shift;\n    orbitColor = max( orbitColor, p.xyz * color);\n  }\n  vec3 d = abs( p ) - vec3( 6.0f );\n  return ( min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) ) ) / s;\n}\n"
  },
  {
    "id": "aroundthecitadel",
    "author": "michael0884",
    "code": "vec3 orbitColor;\nfloat de( vec3 p ) {\n  //Around The Citadel\n  float scale = 2.0773f;\n  float angle1 = -9.66f;\n  float angle2 = -1.34f;\n  vec3 shift = vec3( -1.238f, -1.533f, 1.085f );\n  vec3 color = vec3( 0.42f, 0.38f, 0.19f );\n  vec2 a1 = vec2(sin(angle1), cos(angle1));\n  vec2 a2 = vec2(sin(angle2), cos(angle2));\n  mat2 rmZ = mat2(a1.y, a1.x, -a1.x, a1.y);\n  mat2 rmX = mat2(a2.y, a2.x, -a2.x, a2.y);\n  float s = 1.0;\n  orbitColor = vec3( 0.0f );\n  for (int i = 0; i <11; ++i) {\n    p.xyz = abs(p.xyz);\n    p.xy *= rmZ;\n    p.xy += min( p.x - p.y, 0.0 ) * vec2( -1., 1. );\n    p.xz += min( p.x - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz += min( p.y - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz *= rmX;\n    p *= scale;\n    s *= scale;\n    p.xyz += shift;\n    orbitColor = max( orbitColor, p.xyz * color);\n  }\n  vec3 d = abs( p ) - vec3( 6.0f );\n  return ( min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) ) ) / s;\n}\n"
  },
  {
    "id": "megacitadel",
    "author": "michael0884",
    "code": "vec3 orbitColor;\nfloat de( vec3 p ) {\n  //Mega Citadel\n  float scale = 1.4731f;\n  float angle1 = 0.0f;\n  float angle2 = 0.0f;\n  vec3 shift = vec3( -10.27f, 3.28f, -1.90f );\n  vec3 color = vec3( 1.17f, 0.07f, 1.27f );\n  vec2 a1 = vec2(sin(angle1), cos(angle1));\n  vec2 a2 = vec2(sin(angle2), cos(angle2));\n  mat2 rmZ = mat2(a1.y, a1.x, -a1.x, a1.y);\n  mat2 rmX = mat2(a2.y, a2.x, -a2.x, a2.y);\n  float s = 1.0;\n  orbitColor = vec3( 0.0f );\n  for (int i = 0; i <11; ++i) {\n    p.xyz = abs(p.xyz);\n    p.xy *= rmZ;\n    p.xy += min( p.x - p.y, 0.0 ) * vec2( -1., 1. );\n    p.xz += min( p.x - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz += min( p.y - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz *= rmX;\n    p *= scale;\n    s *= scale;\n    p.xyz += shift;\n    orbitColor = max( orbitColor, p.xyz * color);\n  }\n  vec3 d = abs( p ) - vec3( 6.0f );\n  return ( min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) ) ) / s;\n}\n"
  },
  {
    "id": "buildupspeed",
    "author": "michael0884",
    "code": "vec3 orbitColor;\nfloat de( vec3 p ) {\n  //Build Up Speed\n  float scale = 2.08f;\n  float angle1 = -4.79f;\n  float angle2 = 3.16f;\n  vec3 shift = vec3( -7.43f, 5.96f, -6.23f );\n  vec3 color = vec3( 0.16f, 0.38f, 0.15f );\n  vec2 a1 = vec2(sin(angle1), cos(angle1));\n  vec2 a2 = vec2(sin(angle2), cos(angle2));\n  mat2 rmZ = mat2(a1.y, a1.x, -a1.x, a1.y);\n  mat2 rmX = mat2(a2.y, a2.x, -a2.x, a2.y);\n  float s = 1.0;\n  orbitColor = vec3( 0.0f );\n  for (int i = 0; i <11; ++i) {\n    p.xyz = abs(p.xyz);\n    p.xy *= rmZ;\n    p.xy += min( p.x - p.y, 0.0 ) * vec2( -1., 1. );\n    p.xz += min( p.x - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz += min( p.y - p.z, 0.0 ) * vec2( -1., 1. );\n    p.yz *= rmX;\n    p *= scale;\n    s *= scale;\n    p.xyz += shift;\n    orbitColor = max( orbitColor, p.xyz * color);\n  }\n  vec3 d = abs( p ) - vec3( 6.0f );\n  return ( min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) ) ) / s;\n}\n\n"
  },
  {
    "id": "ripplecube",
    "author": "leon",
    "code": "mat2 rot (float a) { float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }\nfloat gyroid (vec3 p) { return dot(cos(p),sin(p.yzx)); }\nfloat fbm( vec3 p ) {\n  float result = 0.;\n  float a = .5;\n  for (float i = 0.; i < 3.; ++i)\n  {\n    p += result;\n    p.z += time*.2;\n    result += abs(gyroid(p/a)*a);\n    a /= 2.;\n  }\n  return result;\n}\n\nfloat de( vec3 p ) {\n  float dist = 100.0f;\n  p.xz *= rot(time * .2);\n  p.xy *= rot(time * .1);\n  vec3 q = p;\n  \n  p = abs(p)-1.3;\n  dist = max(p.x, max(p.y, p.z));\n  dist -= fbm(q)*.2;\n  dist = abs(dist)-.03;\n  \n  return dist * .5;\n}\n\n"
  },
  {
    "id": "kaleidomecha",
    "author": "leon",
    "code": "mat2 rot( float a ) {\n    float c = cos( a ),s = sin( a );\n    return mat2( c, -s, s, c );\n}\n\nfloat de( vec3 p ) {\n    float dist = 100.;\n\n    float t = 196. + time;\n    float a = 1.;\n\n    for (float i = 0.; i < 8.; ++i) {\n        vec3 e = vec3(.2+.2*sin(i+time),.0,0);\n        p.xz = abs(p.xz)-.5*a;\n        p.xz *= rot(t*a);\n        p.yz *= rot(t*a);\n        p = p - clamp(p, -e, e);\n        dist = min(dist, length(p)-.01);\n        a /= 1.8;\n    }\n\n    return dist;\n}\n\n"
  },
  {
    "id": "tree4",
    "author": "yonatan",
    "code": "float de( vec3 p ){\n  vec3 q = vec3(-.1,.65,-.6);\n  float j,i,e,v,u;\n  for(j=e=v=7.;j++<21.;e=min(e,max(length(p.xz=abs(p.xz*rotate2D(j+sin(1./u)/v))-.53)-.02/u,p.y=1.8-p.y)/v))\n    v/=u=dot(p,p),p/=u+.01;\n  return e;\n}\n"
  },
  {
    "id": "trail",
    "author": "scaprendering",
    "code": "vec3 Rotate(vec3 z,float AngPFXY,float AngPFYZ,float AngPFXZ) {\n        float sPFXY = sin(radians(AngPFXY)); float cPFXY = cos(radians(AngPFXY));\n        float sPFYZ = sin(radians(AngPFYZ)); float cPFYZ = cos(radians(AngPFYZ));\n        float sPFXZ = sin(radians(AngPFXZ)); float cPFXZ = cos(radians(AngPFXZ));\n\n        float zx = z.x; float zy = z.y; float zz = z.z; float t;\n\n        // rotate BACK\n        t = zx; // XY\n        zx = cPFXY * t - sPFXY * zy; zy = sPFXY * t + cPFXY * zy;\n        t = zx; // XZ\n        zx = cPFXZ * t + sPFXZ * zz; zz = -sPFXZ * t + cPFXZ * zz;\n        t = zy; // YZ\n        zy = cPFYZ * t - sPFYZ * zz; zz = sPFYZ * t + cPFYZ * zz;\n        return vec3(zx,zy,zz);\n}\n\n\nfloat de( vec3 p ) {\n    float Scale = 1.34f;\n    float FoldY = 1.025709f;\n    float FoldX = 1.025709f;\n    float FoldZ = 0.035271f;\n    float JuliaX = -1.763517f;\n    float JuliaY = 0.392486f;\n    float JuliaZ = -1.734913f;\n    float AngX = -51.080209f;\n    float AngY = 0.0f;\n    float AngZ = -29.096322f;\n    float Offset = -3.036726f;\n    int EnableOffset = 1;\n    int Iterations = 80;\n    float Precision = 1.0f;\n    // output _sdf c = _SDFDEF)\n\n    vec4 OrbitTrap = vec4(1,1,1,1);\n    float u2 = 1;\n    float v2 = 1;\n    if(EnableOffset)p = Offset+abs(vec3(p.x,p.y,p.z));\n\n    vec3 p0 = vec3(JuliaX,JuliaY,JuliaZ);\n    float l = 0.0;\n    int i=0;\n    for (i=0; i<Iterations; i++) {\n        p = Rotate(p,AngX,AngY,AngZ);\n        p.x=abs(p.x+FoldX)-FoldX;\n        p.y=abs(p.y+FoldY)-FoldY;\n        p.z=abs(p.z+FoldZ)-FoldZ;\n        p=p*Scale+p0;\n        l=length(p);\n        float rr = dot(p,p);\n    }\n    return Precision*(l)*pow(Scale, -float(i));\n}\n"
  }
];

/** Pick a random fractal from the collection */
export function randomDECFractal(): DECFractal {
  return DEC_FRACTALS[Math.floor(Math.random() * DEC_FRACTALS.length)];
}

/** Pick N random fractals without replacement */
export function randomDECFractals(n: number): DECFractal[] {
  const shuffled = [...DEC_FRACTALS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}
