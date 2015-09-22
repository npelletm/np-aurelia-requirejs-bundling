'use strict';

module.exports = function buildBundle(options) {
			
	var gulp = require('gulp'),
		extend = require('extend');
		
	var outDir = options.out || './out/';
	

	function fixConfig() {
		var config = options.config , 
			ext = options.ext || '.js',
			baseUrl = options.baseUrl || './unzip/';
		
		var cfg = extend(true, {}, config);
		
		cfg.baseUrl = baseUrl;
		cfg.out = cfg.out + ext;
		cfg.wrap.startFile = baseUrl + config.wrap.startFile;
		
		return cfg;
	}	


	function build() {
		var rjs = require('gulp-requirejs'),
			cfg = fixConfig();
			
		rjs(cfg)
			.pipe(gulp.dest(outDir)); // pipe it to the output DIR
	}	
	
	function build_min() {
		var rjs = require('gulp-requirejs'),
			uglify = require('gulp-uglify'),
			sourcemaps = require('gulp-sourcemaps'),
			cfg = fixConfig();
	
		rjs(cfg)
			.pipe(sourcemaps.init())
			.pipe(uglify())
			.pipe(sourcemaps.write('./', {includeContent:false}))
			.pipe(gulp.dest(outDir)); // pipe it to the output DIR
	}
	
	
	if (options.min){
		return build_min();
	}
	else{
		return build();
	}
	
	
}