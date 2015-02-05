precision mediump float;

attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aVertexTextureCoord;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform vec2 uResolution;

varying vec4 vWorldSpaceCoord;
varying vec4 vWorldSpaceNormal;
varying vec2 vVertexTextureCoord;

void main() {
    mat4 scale = mat4 (
       uResolution.y / uResolution.x, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    );

	vWorldSpaceCoord = uMMatrix * vec4(aVertexPosition, 1.0);
	vWorldSpaceNormal = uMMatrix * vec4(aVertexNormal, 0.0);
	vVertexTextureCoord = aVertexTextureCoord;
	gl_Position = uPMatrix * uVMatrix * uMMatrix * scale * vec4(aVertexPosition, 1.0);
}