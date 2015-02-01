function Mesh() {

	this.programLoaded = function(program) {
		program.vertexPositionAttribute = gl.getAttribLocation(program, 'aVertexPosition');
		program.vertexNormalAttribute = gl.getAttribLocation(program, 'aVertexNormal');
		program.vertexTextureCoordAttribute = gl.getAttribLocation(program, 'aVertexTextureCoord');
		program.mMatrixUniform = gl.getUniformLocation(program, 'uMMatrix');
		program.pMatrixUniform = gl.getUniformLocation(program, 'uPMatrix');
		program.vMatrixUniform = gl.getUniformLocation(program, 'uVMatrix');
		program.uDiffuseSampler = gl.getUniformLocation(program, 'uDiffuseSampler');
		program.uReflectionClipPlane = gl.getUniformLocation(program, 'uClipPlane');
		program.uLightDirection = gl.getUniformLocation(program, 'uLightDirection');
		program.uTime = gl.getUniformLocation(program, 'uTime');
		program.uSpeed = gl.getUniformLocation(program, 'uSpeed');
		program.uResolution = gl.getUniformLocation(program, 'uResolution');

		// Uniforms for drawReflection
		program.uReflectionSampler = gl.getUniformLocation(program, 'uReflectionTexture');
		program.uEyeCoord = gl.getUniformLocation(program, 'uEyeCoord');
		program.uReflectionProjection = gl.getUniformLocation(program, 'uReflectionViewMatrix');		

		if (--this.materialsToLoad == 0) {
			this.callback();
		}
	};

	this.loadTex = function(filename) {
		var tex = gl.createTexture();
		var img = new Image();
		img.onload = function() {
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.generateMipmap(gl.TEXTURE_2D);
			//gl.bindTexture(gl.TEXTURE0, null);
		};
		img.src = filename;
		return tex;
	};

	this.initJson = function(jsonstring) {
		var mesh = JSON.parse(jsonstring);

		for(var i = 0; i < mesh.vertexPositions.length; i++) {
			mesh.vertexPositions[i] *= this.scale;
		}

		this.init(mesh);
	};

	this.init = function(mesh) {
		var d = new Date();
		this.startTime = d.getTime();

		this.vertexPosBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPosBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertexPositions), gl.STATIC_DRAW);

		this.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);

		if (mesh.vertexNormals) {
			this.vertexNormalBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertexNormals), gl.STATIC_DRAW);
		}

		if (mesh.vertexTextureCoords) {
			this.vertexTextureCoordBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertexTextureCoords), gl.STATIC_DRAW);
		}

		this.materialsToLoad = mesh.materials.length;
		this.programs = [];
		var that = this;
		for (var m in mesh.materials) {
			var material = mesh.materials[m];
			var prog = loadProgram(material.vertexshader, material.fragmentshader, function(prog) { that.programLoaded(prog); });
			prog.numindices = material.numindices;
			if (material.diffuse) {
				prog.diffuseTexture = this.loadTex(material.diffuse);
			}
			this.programs.push(prog);
		}
	}

	this.load = function(file, scale, callback) {
		this.callback = callback;
		this.scale = scale;
		var that = this;
		loadFile(file, function(x) { that.initJson(x); }, false, true);
	};

	this.setMatrixUniforms = function(program) {
		gl.uniformMatrix4fv(program.mMatrixUniform, false, modelMatrix().d);
		gl.uniformMatrix4fv(program.pMatrixUniform, false, projectionMatrix().d);
		gl.uniformMatrix4fv(program.vMatrixUniform, false, viewMatrix().d);
	};

	this.draw = function(reflectionView) {
		var start = 0;
		for (var p in this.programs) {
			var program = this.programs[p];
			gl.useProgram(program);
			gl.enableVertexAttribArray(program.vertexPositionAttribute);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPosBuffer);
			gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
			if (program.vertexNormalAttribute !== -1) {
				gl.enableVertexAttribArray(program.vertexNormalAttribute);
				gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
				gl.vertexAttribPointer(program.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
			}
			if (program.vertexTextureCoordAttribute !== -1) {
				gl.enableVertexAttribArray(program.vertexTextureCoordAttribute);
				gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
				gl.vertexAttribPointer(program.vertexTextureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
			}
			if (program.diffuseTexture) {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, program.diffuseTexture);
				gl.uniform1i(program.uDiffuseSampler, 0);
			}
			if (program.uReflectionClipPlane !== -1) {
				if(reflectionView)
					gl.uniform4fv(program.uReflectionClipPlane, reflectionView);
				else
					gl.uniform4fv(program.uReflectionClipPlane, [0,1,0,0]);
			}
			if(program.uEyeCoord) {
				gl.uniform3fv(program.uEyeCoord, this.eyePos);
			}
			if(program.uLightDirection) {
				gl.uniform3fv(program.uLightDirection, this.lightDirection);
			}
			if(program.uTime) {
				var d = new Date();
				gl.uniform1f(program.uTime, (d.getTime()-this.startTime)/1000.0);
			}
			if(program.uResolution) {
				gl.uniform2fv(program.uResolution, this.resolution);
			}
			if(program.uSpeed) {
				if(this.speed)
					gl.uniform1f(program.uSpeed, this.speed);
				else
					gl.uniform1f(program.uSpeed, 0.1);
			}

			this.setMatrixUniforms(program);
			gl.drawElements(gl.TRIANGLES, program.numindices, gl.UNSIGNED_SHORT, start * 2);
			start += program.numindices;
		}
	};

	this.drawReflection = function(reflectionTexture, reflectionProjection) {
		var start = 0;
		for (var p in this.programs) {
			var program = this.programs[p];
			gl.useProgram(program);
			gl.enableVertexAttribArray(program.vertexPositionAttribute);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPosBuffer);
			gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
			if (program.vertexNormalAttribute !== -1) {
				gl.enableVertexAttribArray(program.vertexNormalAttribute);
				gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
				gl.vertexAttribPointer(program.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);
			}
			if (program.vertexTextureCoordAttribute !== -1) {
				gl.enableVertexAttribArray(program.vertexTextureCoordAttribute);
				gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
				gl.vertexAttribPointer(program.vertexTextureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
			}
			if(program.uReflectionTexture !== -1 && reflectionTexture) {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, reflectionTexture);
				gl.uniform1i(program.uReflectionTexture, 0);
			}
			if(program.uReflectionProjection && reflectionProjection) {
				gl.uniformMatrix4fv(program.uReflectionProjection, false, reflectionProjection.d);
			}
			if(program.uEyeCoord) {
				gl.uniform3fv(program.uEyeCoord, this.eyePos);
			}
			if(program.uLightDirection) {
				gl.uniform3fv(program.uLightDirection, this.lightDirection);
			}
			if(program.uTime) {
				var d = new Date();
				gl.uniform1f(program.uTime, (d.getTime()-this.startTime)/1000.0);
			}
			if(program.uSpeed) {
				if(this.speed)
					gl.uniform1f(program.uSpeed, this.speed);
				else
					gl.uniform1f(program.uSpeed, 0.1);
			}
			if(program.uResolution) {
				gl.uniform2fv(program.uResolution, this.resolution);
			}
			if (program.uReflectionClipPlane !== -1) {
				// "remove" clip plane used in previous render stage
				gl.uniform4fv(program.uReflectionClipPlane, [0,0,0,0]);
			}

			this.setMatrixUniforms(program);
			gl.drawElements(gl.TRIANGLES, program.numindices, gl.UNSIGNED_SHORT, start * 2);
			start += program.numindices;
		}
	};
}