precision mediump float;

uniform vec4 uClipPlane;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform vec3 uEyeCoord;
uniform vec3 uLightDirection;
uniform mat4 uReflectionViewMatrix;
uniform sampler2D uReflectionTexture;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uResolution;

varying vec3 vWorldSpaceCoord;
varying vec3 vWorldSpaceNormal;
varying vec2 vVertexTextureCoord;

mat2 m2 = mat2(1.6,-1.2,1.2,1.6);

// Description : Array and textureless GLSL 2D/3D/4D simplex noise
//               functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
// 
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                    0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                   -0.577350269189626,  // -1.0 + 2.0 * C.x
                    0.024390243902439); // 1.0 / 41.0
  // First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

  // Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  // Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

  // Gradients: 41 points uniformly over a line, mapped onto a diamond.
  // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  // Normalise gradients implicitly by scaling m
  // Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

  // Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
     return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
  { 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = mod289(i); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}


// random/hash function              
float hash( float n )
{
    return fract(cos(n)*41415.92653);
}

// 3d random/hash noise function
// src Oceanic by frankenburgh: https://www.shadertoy.com/view/4sXGRM
float noise( vec3 x )
{
  vec3 p  = floor(x);
  vec3 f  = smoothstep(0.0, 1.0, fract(x));
  float n = p.x + p.y*57.0 + 113.0*p.z;

    return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
      mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
      mix(mix( hash(n+113.0), hash(n+114.0),f.x),
      mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
}

float rockHeight(vec3 p) {
	float n = 0.0;
  p.y *= 0.0;
	n += (snoise(1.5*p)+1.0)*0.8;
  n += (snoise(3.0*p)+1.0)*0.4;
  n += (snoise(6.0*p)+1.0)*0.2;
  n += (snoise(12.0*p)+1.0)*0.1;
	return n;
}

vec3 rockColor(vec3 p) {
  vec3 rockColor1 = vec3(112.0/255.0, 110.0/255.0, 107.0/255.0);
  vec3 rockColor2 = vec3(84.0/255.0, 76.0/255.0, 71.0/255.0);

  float n = 0.0;
  for(float i = 1.0; i < 3.0; i += 1.0) {
    n += (1.0/pow(2.0,i*0.5))*(snoise(0.2*p*pow(2.0,i))+1.0);
  }

  vec3 color = mix(rockColor1, rockColor2, smoothstep(0.8, 1.5,n));
  // Darker color near the water surface
  color -= 0.8*(smoothstep(0.0,0.2, 0.07*(1.0-abs(vWorldSpaceCoord.y))));
  return color;
}

float waterHeight( vec2 p )
{
  float smallWaveGain = 0.8;
  float height = 0.0;

  vec2 shift1 = -0.001*vec2( uTime*160.0*2.0, uTime*120.0*2.0 );
  vec2 shift2 = -0.0015*vec2( uTime*190.0*2.0, uTime*130.0*2.0 );

  float wave = 0.0;

  wave += sin(p.x*0.02+p.y*0.002+shift2.x*3.4)*5.0;
  wave += sin(p.x*0.03+p.y*0.01+shift2.x*4.2)*2.5 ;
  wave *= 0.05;

  wave += (snoise(vec2(p*0.004 + shift1))-.5)*smallWaveGain*0.5;
  wave += (snoise(vec2(p*0.010 + shift1*1.3))-.5)*smallWaveGain*0.15;

  float amp = smallWaveGain;
  float smoothamp = 1.0;

  for (float i=0.0; i<5.0; i+=1.0) {
    float n = (sin(noise(vec3(p*0.01+shift1, uTime*0.2))-.5))*amp*1.0;

    // smoothed abs value. Less grainy and smoother waves than abs(n)
    float mu = 0.03*smoothamp;
    abs(n) < mu ? n = n*n/(2.0*mu): n = abs(n)-mu*0.5;
    //n = abs(n); 
    wave -= n;
    amp *= 0.5;
    shift1 *= 1.8;
    p *= m2*0.9;
    smoothamp *= 0.65;
  }

  height += wave;
  return height;
}

vec3 lightPosition() {
  //return normalize(vec3(0.0, 1.0, 0.5));
  return normalize(vec3(0.0, sin(-uTime*uSpeed), cos(-uTime*uSpeed)));
}

vec3 lightColor(vec3 lightPos) {
   return vec3( (1.0 - lightPos.y)*0.8 + 1.0, // red
                (1.0 - lightPos.y)*0.2 + 1.0, // green
                -(1.0 - lightPos.y)*0.3 + 1.0); //blue
}

vec3 skyColor(vec3 lightPos, vec3 surfaceNormal, vec3 viewDirection) {
  vec3 sky = (abs(lightPos.y)*vec3(130.0/255.0, 200.0/255.0, 230.0/255.0) + (1.0 - abs(lightPos.y))*lightColor(lightPos));
  vec3 sun = normalize(vec3( (1.0 - lightPos.y)*smoothstep(0.4, 1.6, (1.0 - lightPos.y))*3.0 + 1.0, // red
                (1.0 - lightPos.y)*smoothstep(0.4, 1.6, (1.0 - lightPos.y))*1.0 + 1.0, // green
                1.0)); //blue

  float diff = dot(surfaceNormal, lightPos);
  diff = max(0.6, diff);
  sky *= diff;

  vec3 specularReflection;
  dot(surfaceNormal, lightPos) < 0.0 ? specularReflection = vec3(0.0) 
    : specularReflection = 5.0 * sun * pow(max(0.0, dot(reflect(-lightPos, surfaceNormal), viewDirection)), 70.0);
    
  return sky + specularReflection;
}

void main() {
  vec3 lightPos = lightPosition();
	float clipPos = dot (vWorldSpaceCoord, uClipPlane.xyz) + uClipPlane.w;
  if(clipPos < 0.0)
  	discard;

  // ROCK STUFF
	float delta = 1.0/50.0;
	vec3 xDiff = vec3(1.0, 0.0, 0.0)*delta;
	vec3 yDiff = vec3(0.0, 0.0, 1.0)*delta;

  vec3 finalRockColor = rockColor(vWorldSpaceCoord);
  vec3 surfaceNormal;
  float diff;

  // no need to do bump mapping where the water will be fully opaque
  if( vWorldSpaceCoord.y > -3.0) {
  	surfaceNormal = normalize(vec3(rockHeight(vWorldSpaceCoord-xDiff) - rockHeight(vWorldSpaceCoord+xDiff), 1.0, rockHeight(vWorldSpaceCoord-yDiff) - rockHeight(vWorldSpaceCoord+yDiff)));

    vec3 objectNormal = vWorldSpaceNormal;
    vec3 tangent = normalize(cross(objectNormal, vec3(0.0,1.0,0.0)));
    vec3 bitangent = cross (objectNormal, tangent);
    vec3 v;
    v.x = dot (lightPos, tangent);
    v.z = dot (lightPos, bitangent);
    v.y = dot (lightPos, objectNormal);
    // Change lightpos instead of adjusting the surfacenormal to the objects normal
    vec3 adjustedLightPos = normalize (v);

    // diffuse light
  	diff = dot(normalize(adjustedLightPos), surfaceNormal);
  	diff = max(0.05, diff);
  	finalRockColor *= lightColor(lightPos)*diff;
  }

  // WATER STUFF
  vec3 opaqueColor = vec3(0.03, 0.09, 0.13); // dark blue

  // parameters in schlicks approximation
  float minOpacity = 0.15;
  float opaqueDepth = 3.0; // depth of the water when it becomes fully opaque
  float minReflectivity = 0.1; // 0.02 for air->water 

  vec3 eye = uEyeCoord;
  //vec3 viewDirection = normalize (eye - vWorldSpaceCoord.xyz);
  vec3 surfaceVertex = vWorldSpaceCoord.xyz;
  surfaceVertex.y = 0.0;
  vec3 viewDirection = normalize (eye - surfaceVertex);

  float scale = 40.0;
  delta = scale/200.0;
  vec2 xDiff2 = vec2(1.0, 0.0)*delta;
  vec2 yDiff2 = vec2(0.0, 1.0)*delta;

  surfaceNormal = normalize(vec3(waterHeight(scale*vWorldSpaceCoord.xz-xDiff2) - waterHeight(scale*vWorldSpaceCoord.xz+xDiff2), 1.0/scale, waterHeight(scale*vWorldSpaceCoord.xz-yDiff2) - waterHeight(scale*vWorldSpaceCoord.xz+yDiff2)));
  float cosT1 = abs(dot(viewDirection, surfaceNormal));
  // Reflectance
  float c = 1.0 - cosT1;
  float R = minReflectivity + (1.0 - minReflectivity) * c * c * c * c * c; //Schlick's approximation
  // Water density
  float depth = -vWorldSpaceCoord.y;
  float thickness = depth / max (cosT1, 0.01);
  float dWater = minOpacity + (1.0 - minOpacity) * sqrt (min (thickness / opaqueDepth, 1.0));

  vec3 waterCol = opaqueColor * dWater;
  diff = dot(normalize(lightPos), surfaceNormal);
  diff = max(0.2, diff);
  waterCol *= diff;

  // Just a bad approximation. Some kind of raytracing is needed in order 
  // to know what really is reflected in the surface
  vec2 textureOffset = 20.0*normalize(surfaceNormal.xz)*(1.0 - dot(surfaceNormal,vec3(0.0,1.0,0.0)));
  vec3 blah = vWorldSpaceCoord.xyz;
  blah.y = 0.0;
  blah.xz += textureOffset;
  vec4 vClipReflection = uPMatrix * uReflectionViewMatrix * uMMatrix * vec4(blah, 1.0);
  vec2 vDeviceReflection = vClipReflection.st / vClipReflection.q;
  vec2 vTextureReflection = vec2(0.5, 0.5) + 0.5 * vDeviceReflection;
  vec4 reflectionTextureColor = texture2D (uReflectionTexture, vTextureReflection);

  // Mix sky with reflection from objects
  vec3 skyCol = skyColor(lightPosition(), surfaceNormal, viewDirection);
  reflectionTextureColor = vec4((reflectionTextureColor.xyz*reflectionTextureColor.a + skyCol*(1.0 - reflectionTextureColor.a)), 1.0);

  // Mix reflection with water color
  vec3 color = (1.0 - R) * waterCol + R * reflectionTextureColor.rgb;
  float alpha = R + (1.0 - R) * dWater;

  depth > 0.0 ? color = mix(finalRockColor, color, alpha)
    : color = finalRockColor;

	gl_FragColor = vec4(color, 1.0);
}