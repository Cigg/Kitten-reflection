precision mediump float;
uniform sampler2D uSampler;
uniform vec3 uEyeCoord;
uniform vec3 uLightDirection;
uniform vec4 uClipPlane;
uniform float uTime;
uniform float uSpeed;

varying vec2 vVertexTextureCoord;
varying vec4 vWorldSpaceCoord;
varying vec4 vWorldSpaceNormal;

vec3 lightPosition() {
  //return normalize(vec3(0.0, 1.0, 0.5));
  return normalize(vec3(0.0, sin(-uTime*uSpeed), cos(-uTime*uSpeed)));
}

vec3 lightColor(vec3 lightPos) {
   return vec3( (1.0 - lightPos.y)*0.8 + 1.0, // red
                (1.0 - lightPos.y)*0.2 + 1.0, // green
                -(1.0 - lightPos.y)*0.3 + 1.0); //blue
}

void main() {
	float clipPos = dot (vWorldSpaceCoord.xyz, uClipPlane.xyz) + uClipPlane.w;
    if(clipPos < 0.0)
    	discard;

  vec3 col = texture2D(uSampler, vVertexTextureCoord).xyz*1.5*normalize(lightColor(lightPosition()));
	float diff = max(0.1, dot(lightPosition(), normalize(vec3(0.0,1.0,1.0))));
	col *= diff;

  gl_FragColor = vec4(col, 1.0);
}