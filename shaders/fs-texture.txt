precision mediump float;
uniform sampler2D uSampler;

varying vec2 vVertexTextureCoord;

void main() {
	vec4 col = texture2D(uSampler, vVertexTextureCoord);
    gl_FragColor = vec4(col);
}