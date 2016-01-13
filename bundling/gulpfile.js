'use strict';

var gulp = require('gulp') ;
	


//based on aurelia skeleton navigation app (https://github.com/aurelia/skeleton-navigation/blob/master/config.js), last update date : 2015-09-17 
var aureliaRepos = [
		//begin https://github.com/aurelia/registry/blob/master/core-registry.json
		"binding",
		"bootstrapper",
		"dependency-injection",
		"event-aggregator",
		"framework",
		"history",
		"history-browser",
		"http-client",
		"loader",
		"loader-default",
		"logging",
		"logging-console", 
		"metadata",
		"path",
		"router",
		"route-recognizer",
		"task-queue",
		"pal", //add 2015-10-20
		"pal-browser", //add 2015-10-20
		"templating",
		"templating-binding",
		"templating-resources",
		"templating-router",
		//end https://github.com/aurelia/registry/blob/master/core-registry.json
		 
		"html-template-element", //A polyfill for the HTMLTemplate element extracted and decoupled from Polymer.
		//"html-import-template-loader", //add % skeleton, Use HTMLImport technology to load views.(extract from polylmer HTMLImport)
		
		//plugins--------------
		"animator-css", //An implementation of the abstract Animator interface from templating which enables css-based animations.
		//"validation", //Validation plugin
		
	];

gulp.task('download', function() {
	return require('./tasks/download')({
		host: 'github.com',
		owner: 'aurelia',
		protocol: 'https',
		
		zips: './dwn/zips',
		zipsMaster: './dwn/zips-master',
		unZip: './dwn/unzip',
		unZipMaster: './dwn/unzip-master',
		
		repos: aureliaRepos
	});
});

//########################

var aureliaRjsConfig =  {
	out: './aurelia-bundle', //relative to out
	paths: {
		'aurelia-binding' : 'binding/dist/amd/aurelia-binding',
		'aurelia-bootstrapper': 'bootstrapper/dist/amd/aurelia-bootstrapper',
		'aurelia-dependency-injection': 'dependency-injection/dist/amd/aurelia-dependency-injection',
		'aurelia-event-aggregator': 'event-aggregator/dist/amd/aurelia-event-aggregator',
		'aurelia-framework': 'framework/dist/amd/aurelia-framework',
		'aurelia-history': 'history/dist/amd/aurelia-history',
		'aurelia-history-browser': 'history-browser/dist/amd/aurelia-history-browser',
		'aurelia-http-client': 'http-client/dist/amd/aurelia-http-client',
		'aurelia-loader': 'loader/dist/amd/aurelia-loader',
		'aurelia-loader-default': 'loader-default/dist/amd/aurelia-loader-default',
		'aurelia-logging': 'logging/dist/amd/aurelia-logging',
		'aurelia-logging-console': 'logging-console/dist/amd/aurelia-logging-console',
		'aurelia-metadata': 'metadata/dist/amd/aurelia-metadata',
		'aurelia-path': 'path/dist/amd/aurelia-path',
		'aurelia-router': 'router/dist/amd/aurelia-router',
		'aurelia-route-recognizer': 'route-recognizer/dist/amd/aurelia-route-recognizer',
		'aurelia-task-queue': 'task-queue/dist/amd/aurelia-task-queue',
		'aurelia-pal': 'pal/dist/amd/aurelia-pal', //add 2015-10-20
		'aurelia-pal-browser': 'pal-browser/dist/amd/aurelia-pal-browser', //add 2015-10-20
		'aurelia-templating':  'templating/dist/amd/aurelia-templating',
		'aurelia-templating-binding': 'templating-binding/dist/amd/aurelia-templating-binding',
		
		'aurelia-html-template-element': 'html-template-element/dist/HTMLTemplateElement',
		
		'aurelia-animator-css': 'animator-css/dist/amd/aurelia-animator-css',
		'core-js': 'empty:'
	},
	packages : [
		{
			name: 'aurelia-templating-resources',
			location: 'templating-resources/dist/amd',
			main : 'aurelia-templating-resources'
		},
		{
			name: 'aurelia-templating-router',
			location: 'templating-router/dist/amd',
			main : 'aurelia-templating-router'
		},
		// {
		//  name: 'aurelia-validation',
		//  location: 'validation/dist/amd',
		//  main : 'index'
		// },
	],
	
	include: [
		//begin https://github.com/aurelia/registry/blob/master/core-registry.json
		'aurelia-path',
		'aurelia-loader',
		'aurelia-loader-default',
		'aurelia-task-queue',
		'aurelia-logging',
		'aurelia-logging-console',
		'aurelia-history',
		'aurelia-history-browser',
		'aurelia-event-aggregator',
		'aurelia-framework',
		'aurelia-pal',//add 2015-10-20
		'aurelia-pal-browser',//add 2015-10-20
		'aurelia-metadata',
		'aurelia-binding',
		'aurelia-templating',
		'aurelia-dependency-injection',
		'aurelia-router',
		'aurelia-templating-binding',
		'aurelia-templating-resources',
		'aurelia-templating-router',
		'aurelia-route-recognizer',
		'aurelia-http-client',
		'aurelia-bootstrapper', 
		//end https://github.com/aurelia/registry/blob/master/core-registry.json
		
		'aurelia-html-template-element',
		'aurelia-animator-css'
		//'aurelia-validation',
	],
	wrap: {
		startFile: ["versions.txt"],
		endFile: []
	}
};	

//tasks 
gulp.task('build', function () { 
	return require('./tasks/build-bundle')({
		config : aureliaRjsConfig,
		ext : '.js',
		baseUrl: './dwn/unzip/',
		min : false,
		out : './out/'
	});
});

gulp.task('build-min', function () { 
	return require('./tasks/build-bundle')({
		config : aureliaRjsConfig,
		ext : '.min.js',
		baseUrl: './dwn/unzip/',
		min : true,
		out : './out/'
	});
});

gulp.task('build-latest', function () { 
	return require('./tasks/build-bundle')({
		config : aureliaRjsConfig,
		ext : '-latest.js',
		baseUrl: './dwn/unzip-master/',
		min : false,
		out : './out/'
	});
});

gulp.task('build-latest-min', function () { 
	return require('./tasks/build-bundle')({
		config : aureliaRjsConfig,
		ext : '-latest.min.js',
		baseUrl: './dwn/unzip-master/',
		min : true,
		out : './out/'
	});
});

gulp.task('build-all', ['build', 'build-min', 'build-latest', 'build-latest-min']);


//clean
gulp.task('clean-build', function() {
	return require('./tasks/clean')({
		dirs : ['./out']
	});
});
gulp.task('clean-download', function() {
	return require('./tasks/clean')({
		dirs : ['./out', './dwn']
	});
});

gulp.task('clean-all', ['clean-build', 'clean-download']);

//###############

//default task
gulp.task('default', ['build-all']);
