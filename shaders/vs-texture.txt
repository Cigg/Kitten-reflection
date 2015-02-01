precision mediump float;

attribute vec4 aVertexPosition;
varying vec2 vVertexTextureCoord;

void main() {
	gl_Position = aVertexPosition;
	vVertexTextureCoord = aVertexPosition.xy * 0.5 + 0.5;
}    
