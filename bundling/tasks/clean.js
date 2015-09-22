'use strict';

module.exports = function clean(options) {		
var fs = require("fs"), 
	path = require('path'),
	Promise = require('promise'),
	ps = require("event-stream").pause();
	
	
	function cleanDirectories() {
		var dirs = options.dirs || [];
		
		console.info('clean directories ' + dirs.join(", ") + ' ...');
		// https://github.com/smhanov/node-promise-sequence

		/**
		 * NOTE: 
		 * 
		 * If there are no error, callback will only be called once.
		 * 
		 * If there are multiple errors, callback will be called 
		 * exactly as many time as errors occur. 
		 * 
		 * Sometimes, this behavior maybe useful, but users 
		 * should be aware of this and handle errors in callback. 
		 * 
		 */
		function rmfile(dir, file, callback){
		  var p = path.join(dir, file)
		  fs.lstat(p, function(err, stat){
			if(err) callback.call(null,err)
			else if(stat.isDirectory()) rmdir(p, callback)
			else fs.unlink(p, callback)
		  })
		}

		function rmdir(dir, callback) {
		  fs.readdir(dir, function(err, files){
			if(err) callback.call(null,err)
			else if( files.length ){
			  var i,j;
			  for(i=j=files.length; i--; ){
				rmfile(dir, files[i], function(err) {
				  if (err) callback.call(null, err)
				  else if(--j === 0) fs.rmdir(dir,callback)
				})
			  }
			}
			else fs.rmdir(dir, callback)
		  })
		}
	
		function __rmdir(dir) {
			return new Promise(function (resolve, reject) {
				rmdir(dir, function(e, result) {
					if (e && e.code != 'ENOENT') {
						reject(e);
					} 
					else {
						resolve();
					}
				});
			});
		}
		
		for (var i in dirs) {
			dirs[i] = __rmdir(dirs[i]);
		}

		return Promise.all(dirs).then(function() {
			console.info('ok');
		});
	}


	//main task
	cleanDirectories()
		.catch(function(error) {
			ps.emit('error', error);
		});

	return ps;	
}