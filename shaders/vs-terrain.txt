precision mediump float;

attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform float uTime;
uniform vec2 uResolution;

varying vec3 vWorldSpaceNormal;
varying vec3 vWorldSpaceCoord;

void main() {
    mat4 scale = mat4 (
       uResolution.y / uResolution.x, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    );

	vec4 worldPos = uMMatrix * scale * vec4(aVertexPosition, 1.0);
	vWorldSpaceCoord = worldPos.xyz;
	vec4 worldNormal = scale * vec4(aVertexNormal, 1.0); // is this right? dunno
	vWorldSpaceNormal = normalize(worldNormal.xyz);

	vec4 pos;
	vWorldSpaceCoord.y < 0.0 ?
		pos = vec4(aVertexPosition.x, 0.1, aVertexPosition.z, 1.0)
		: pos = vec4(aVertexPosition, 1.0);

	pos = uPMatrix * uVMatrix * uMMatrix * scale * pos;
	gl_Position = pos;
}