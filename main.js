// For debugging. Renders the reflection texture in the bottom left corner.
var debugReflection = false;

// size of plane
var size = 50.0;

var gl;
var z = 0;
var rot = new Matrix4x3();
var camera = new Matrix4x3();
var reflectionCamera = new Matrix4x3();
var reflectionPlane = [0, 1, 0, 0];
var eyePosition = [-14.0, 10.0, -20.0];
var angle = 35;
var lightDirection = [-0.2,1,-0.4]
var lightSpeed = 0.1;
var speed = 0.2;

var water = new Mesh();
var cat = new Mesh();

// FPS counter
var elapsedTime = 0;
var frameCount = 0;
var lastTime = new Date().getTime();

function initWebGL() {
	var c = document.getElementById('c');
	gl = c.getContext('experimental-webgl',  { alpha: false });
	gl.viewportWidth = c.width;
	gl.viewportHeight = c.height;
	gl.enable(gl.DEPTH_TEST);

	// enable transparency
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.enable(gl.BLEND);

	document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
}

var currentlyPressedKeys = {};

function handleKeyDown(event) {
	currentlyPressedKeys[event.keyCode] = true;

	if (String.fromCharCode(event.keyCode) == "F") {
		filter += 1;
		if (filter == 3) {
			filter = 0;
		}
	}
}

function handleKeyUp(event) {
	currentlyPressedKeys[event.keyCode] = false;
}

function handleKeys() {
    if (currentlyPressedKeys[65]) { // a
		eyePosition[0] -= speed;
    }
    if (currentlyPressedKeys[68]) { // d		
		eyePosition[0] += speed;
    }
	if (currentlyPressedKeys[87]) { // w		
		eyePosition[2] -= speed;	
	}
    if (currentlyPressedKeys[83]) { // s		
		eyePosition[2] += speed;
	}

	updateCamera();
}

function updateCamera() {
	camera.d[12] = eyePosition[0];
	camera.d[13] = eyePosition[1];
	camera.d[14] = eyePosition[2];

	Mesh.prototype.eyePos = eyePosition;
}

var rttFramebuffer;
var rttTexture;
var vertBuffer;
var textureProg;

function makePlane(size, segments, callback) {
	var mesh = {};
	mesh.materials = [ {"vertexshader" : "shaders/vs-terrain.glsl", "fragmentshader" : "shaders/fs-terrain.glsl", "numindices" : segments*segments*6 } ];
	
	mesh.vertexPositions = [];
	mesh.vertexNormals = [];
	for( var i = 0; i <= segments; i++) {
		for( var j = 0; j <= segments; j++) {
			mesh.vertexPositions.push(size*(j/segments - 0.5));
			mesh.vertexPositions.push(0.0); 
			mesh.vertexPositions.push(size*(i/segments - 0.5));

			mesh.vertexNormals.push(0);
			mesh.vertexNormals.push(1); 
			mesh.vertexNormals.push(0);
		}
	}

	mesh.indices = [];
	for( var i = 0; i < segments; i++) {
		for( var j = 0; j < segments; j++) {
			// first triangle
			//	you are here->	1--3
			// 					| /
			// 					|/
			// 					2
			mesh.indices.push(i*(segments + 1) + j);
			mesh.indices.push((i+1)*(segments + 1) + j);
			mesh.indices.push(i*(segments + 1) + j + 1);

			// second triangle
			//    1
			//   /|
			//  / |
			// 2--3
			mesh.indices.push(i*(segments + 1) + j + 1);
			mesh.indices.push((i+1)*(segments + 1) + j);
			mesh.indices.push((i+1)*(segments + 1) + j + 1);
		}
	}

	//console.log(JSON.stringify(mesh));

	//this.init(mesh);	
	callback(mesh);

};

// returns height of the terrain of a certain position
function terrainHeight(xPos, yPos) {
	var h = (noise.simplex2(xPos * 0.05 , yPos * 0.05));
	h += (noise.simplex2(xPos * 0.1 , yPos * 0.1)*0.5);
	h += (noise.simplex2(xPos * 0.2 , yPos * 0.2)*0.25);
	h += (noise.simplex2(xPos * 0.4 , yPos * 0.4)*0.125);
	return h;
}

function crossProduct(v1, v2) {
	var vecResult = [];

  	vecResult[0] =  ((v1[1] * v2[2]) - (v1[2] * v2[1]));
  	vecResult[1] = -((v1[0] * v2[2]) - (v1[2] * v2[0]));
  	vecResult[2] =  ((v1[0] * v2[1]) - (v1[1] * v2[0]));

  	return vecResult;
}

function normalize(v1) {
	var vecResult = [];

	var fMag = Math.sqrt( Math.pow(v1[0], 2) +
	                    Math.pow(v1[1], 2) +
	                    Math.pow(v1[2], 2)
	                  );

	vecResult[0] = v1[0] / fMag;
	vecResult[1] = v1[1] / fMag;
	vecResult[2] = v1[2] / fMag;

  return vecResult;
}

function makeTerrain(size, segments, callback) {
	var planeCreated = function(mesh) {
		var surfacePositions = [];
		// height displacement
		for(var i = 0; i < mesh.vertexPositions.length; i += 3) {
			// calculate height
			var amp = 4.0;
			var elevation = -1.5;
			var height = terrainHeight(mesh.vertexPositions[i], mesh.vertexPositions[i + 2]);
			height *= amp;
			height += elevation;

			mesh.vertexPositions[i + 1] += height;

			// calculate normals with central differences
			var offset = (size/segments)/2;
			var heightX1 = amp*terrainHeight(mesh.vertexPositions[i] + offset, mesh.vertexPositions[i + 2]) + elevation;
			var heightX2 = amp*terrainHeight(mesh.vertexPositions[i] - offset, mesh.vertexPositions[i + 2]) + elevation;
			var heightY1 = amp*terrainHeight(mesh.vertexPositions[i], mesh.vertexPositions[i + 2] + offset) + elevation;
			var heightY2 = amp*terrainHeight(mesh.vertexPositions[i], mesh.vertexPositions[i + 2] - offset) + elevation;

			var v1 = [];
			v1[0] = offset;
			v1[1] = heightX1 - height;
			v1[2] = 0;

			var v2 = [];
			v2[0] = 0;
			v2[1] = heightY1 - height;
			v2[2] = offset;

			var normal1 = normalize(crossProduct(v2, v1));

			v1[0] = -offset;
			v1[1] = heightX2 - height;
			v1[2] = 0;

			v2[0] = 0;
			v2[1] = heightY2 - height;
			v2[2] = -offset;

			var normal2 = normalize(crossProduct(v2, v1));
			var finalNormal = normalize([normal1[0] + normal2[0],normal1[1] + normal2[1],normal1[2] + normal2[2]]);

			mesh.vertexNormals[i] = finalNormal[0];
			mesh.vertexNormals[i + 1] = finalNormal[1];
			mesh.vertexNormals[i + 2] = finalNormal[2];
		}

		console.log("terrain created");
		callback(mesh);
	}

	this.makePlane(size, segments, planeCreated);
};

function textureFromPixelArray(dataArray, type, width, height) {
    var dataTypedArray = new Uint8Array(dataArray); // Don't need to do this if the data is already in a typed array
    //console.log("dataTypedArray: " + JSON.stringify(dataTypedArray));
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, type, width, height, 0, type, gl.UNSIGNED_BYTE, dataTypedArray);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    return texture;
};

function initTextureFramebuffer() {
	var verts = [
	      1,  1,
	     -1,  1,
	     -1, -1,
	      1,  1,
	     -1, -1,
	      1, -1,
	];

	textureProg = loadProgram("shaders/vs-texture.glsl", "shaders/fs-texture.glsl", function() {});
	textureProg.vertexPositionAttribute = gl.getAttribLocation(textureProg, 'aPosition');
	//textureProg.samplerUniform = gl.getUniformLocation(textureProg, "uSampler");

	// create a frame buffer
    rttFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
    rttFramebuffer.width = 512;
    rttFramebuffer.height = 512;

    rttTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    //gl.generateMipmap(gl.TEXTURE_2D);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFramebuffer.width, rttFramebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    var renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, rttFramebuffer.width, rttFramebuffer.height);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rttTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    vertBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(textureProg.vertexPositionAttribute);
}

function initScene() {
	Mesh.prototype.lightDirection = lightDirection;
	Mesh.prototype.speed = lightSpeed;
	Mesh.prototype.resolution = [gl.viewportWidth, gl.viewportHeight];
	updateCamera();
	camera.multiply(rot.makeRotate(-3.14*angle/180.0, 1,0,0));

	initTextureFramebuffer();

	var stuffToLoad = 2;
	var thingLoaded = function() {
		stuffToLoad--;
		console.log("stuffToLoad: " + stuffToLoad);
		// All things loaded. Start tick loop
		if(stuffToLoad == 0)
			tick();
	};

	cat.load('meshes/cat.json', size/8, thingLoaded);

	// Generate terrain
	noise.seed(2);

	this.terrain = new Mesh();
	this.terrain.callback = thingLoaded;

	var terrainGenerated = function(mesh) {
		this.terrain.init(mesh);
	}

	makeTerrain(size, 80, terrainGenerated);
}

function drawReflectionToBuffer() {
	gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);

	reflectionCamera.makeReflection(0, 1, 0, 0);
	reflectionCamera.multiply(camera);
	viewMatrix().makeInverse(reflectionCamera);

	gl.viewport(0, 0, rttFramebuffer.width, rttFramebuffer.height);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	cat.draw(reflectionPlane);
	terrain.draw(reflectionPlane);

	gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function drawScene() {
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clearColor(0.2, 0.2, 0.2, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

	viewMatrix().makeInverse(camera);
	cat.draw();
	terrain.drawReflection(rttTexture, reflectionCamera.makeInverse(reflectionCamera));	

	// Draw the reflection to a square in the corner for debugging
	if(debugReflection) {
		gl.useProgram(textureProg);
		gl.bindTexture(gl.TEXTURE_2D, rttTexture);
		gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
		gl.vertexAttribPointer(textureProg.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
		gl.viewport(0, 0, 200, 200);
		//gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
}

function tick() {
	requestAnimationFrame(tick, c);
	handleKeys();
	drawReflectionToBuffer(); // Draw reflection to texture
	drawScene(); // Draw scene normally

	// Fps counter
	var now = new Date().getTime();
	frameCount++;
	elapsedTime += (now - lastTime);
	lastTime = now;
	if(elapsedTime >= 1000) {
	   fps = frameCount;
	   frameCount = 0;
	   elapsedTime -= 1000;
	   document.getElementById('fps').innerHTML = "FPS: " + fps;
	}

	// rotation
	z += 0.02;
}

initWebGL();
initScene();