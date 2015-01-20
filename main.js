// For debugging
var debugReflection = false;

var gl;

var cube = new Mesh();
var water = new Mesh();
var cat = new Mesh();

var z = 0;
var rot = new Matrix4x3();
var camera = new Matrix4x3();
var reflectionCamera = new Matrix4x3();

var spinNode;
var children = [];
var cubes;

var reflectionPlane = [0, 1, 0, 0];
var eyePosition = [0.0, 10.0, 20.0];
var speed = 0.3;

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
    if (currentlyPressedKeys[33]) {
		// Page Up
		
    }
    if (currentlyPressedKeys[34]) {
		// Page Down
		
    }
    if (currentlyPressedKeys[37]) {
		// Left cursor key
		eyePosition[0] -= speed;
    }
    if (currentlyPressedKeys[39]) {
		// Right cursor key
		eyePosition[0] += speed;
    }
	if (currentlyPressedKeys[38]) {
		// Up cursor key
		eyePosition[2] -= speed;	
	}
    if (currentlyPressedKeys[40]) {
		// Down cursor key
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

function DAGNode(ch) {
	this.local = new Matrix4x3();
	this.children = ch ? ch : [];
}

DAGNode.prototype = {
	draw : function(r) {
		pushModelMatrix().multiply(this.local);
		for (var c in this.children) {
			this.children[c].draw(r);
		}
		popModelMatrix();
	}
};

function Geometry(mesh) {
	this.mesh = mesh;
}

Geometry.prototype = {
	draw : function(r) {
		this.mesh.draw(r);
	}
};

Geometry.prototype.prototype = DAGNode.prototype;

var rttFramebuffer;
var rttTexture;
var vertBuffer;
var textureProg;

function initTextureFramebuffer() {
	var verts = [
	      1,  1,
	     -1,  1,
	     -1, -1,
	      1,  1,
	     -1, -1,
	      1, -1,
	];

	textureProg = loadProgram("shaders/vs-texture.txt", "shaders/fs-texture.txt", function() {});
	textureProg.vertexPositionAttribute = gl.getAttribLocation(textureProg, 'aPosition');
	textureProg.samplerUniform = gl.getUniformLocation(textureProg, "uSampler");

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
	initCubes();

	updateCamera();
	camera.multiply(rot.makeRotate(-3.14*0.18, 1,0,0));

	initTextureFramebuffer();

	var stuffToLoad = 4;
	var thingLoaded = function() {
		stuffToLoad--;
		// All things loaded. Start tick loop
		if(stuffToLoad == 0)
			tick();
	};

	cube.load('meshes/cube.json', 1.0, thingLoaded);
	water.load('meshes/water.json', 50.0, thingLoaded);
	cat.load('meshes/cat.json', 5.0, thingLoaded);

	this.plane = new Mesh();
	plane.makePlane(20, 200, thingLoaded);
}

function initCubes() {
	spinNode = new DAGNode([new Geometry(cube)]);
	for (var x = -2; x <= 2; x += 4) {
		for (var y = -2; y <= 2; y += 2) {
			var newNode = new DAGNode([spinNode]);
			newNode.local.d[12] = x*2;
			newNode.local.d[13] = y;
			children[children.length] = newNode;
		}
	}

	cubes = new DAGNode(children);
}

function drawReflectionToBuffer() {
	gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);

	reflectionCamera.makeReflection(0, 1, 0, 0);
	reflectionCamera.multiply(camera);
	viewMatrix().makeInverse(reflectionCamera);

	gl.viewport(0, 0, rttFramebuffer.width, rttFramebuffer.height);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	cubes.draw(reflectionPlane);
	cat.draw(reflectionPlane);

	gl.bindTexture(gl.TEXTURE_2D, rttTexture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function drawScene() {
	spinNode.local.makeRotate(z,1,0,0);
	spinNode.local.multiply(rot.makeRotate(z,0,1,0));
	cubes.local.makeRotate(z,0,1,0);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clearColor(226.0/255.0, 248.0/255.0, 255.0/255.0, 1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

	viewMatrix().makeInverse(camera);
	cubes.draw();
	water.drawReflection(rttTexture, reflectionCamera.makeInverse(reflectionCamera));
	cat.draw();
	plane.draw();

	// Draw the reflection to a square in the corner for debugging
	if(debugReflection) {
		gl.useProgram(textureProg);
		gl.bindTexture(gl.TEXTURE_2D, rttTexture);
		gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
		gl.vertexAttribPointer(textureProg.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
		gl.viewport(0, 0, 300, 300);
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