/// <reference path="../typings/tsd.d.ts" />
'use strict';

module.exports = function download(options) {
	
	var async = require("async"),
		unzip = require("unzip"),
		fs = require("fs"),
		path = require('path'),
		mkdirp = require('mkdirp'),
		Promise = require('promise'),
		endOfLine = require('os').EOL,
		ps = require("event-stream").pause(),
		request = require("request");
		
	var host = options.host || 'github.com',
		owner = options.owner,
		protocol = options.protocol || 'https';
	
	function ensureDirectories() {
		console.info('create directories structure ...');
		// https://github.com/smhanov/node-promise-sequence
		var dirs = [options.zips, options.zipsMaster, options.unZip, options.unZipMaster];
	
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
	
		function __dir(dir) {
			return new Promise(function (resolve, reject) {
				rmdir(dir, function(e, result) {
					if (e && e.code != 'ENOENT') {
						reject(e);
					} 
					else {
						//mkdir multi-level
						mkdirp(dir, function(e, result){
							if (e) {
								reject(e);
							}
							else 
								resolve();
						});
					}
				});
			});
		}

		for (var i in dirs) {
			dirs[i] = __dir(dirs[i]);
		}

		return Promise.all(dirs).then(function() {
			console.info('ok');
		});
	}
	
	function extract_version(repo, body) {
		var matches, 
			versions = [], 
			regEx = new RegExp('href="/' + owner + '/' + repo + '/archive/(\\d{1,2}\\.\\d{1,2}\\.\\d{1,2}).zip"', 'ig'),
			ver, mod, i0, i1, versionInfo;
			
		while (matches = regEx.exec(body))
			versions.push(matches[1]);
		
		if (versions.length === 1 || versions.length === 0) {
			versionInfo = {name: repo, version: (versions[0] || '')};
		}
		else {
			versions = versions.map(function(item){
				item = item.split('.');
				return parseInt(item[0], 10)*1000000 +
					parseInt(item[1], 10)*1000 +
					parseInt(item[2], 10);
			}).sort(function(x, y) {
				return x < y ? x : y ; 
			});
			
			//console.info('Versions:' + versions.join(', '));
			
			ver = versions[versions.length -1]
			mod = ver % 1000000;
			i0 = (ver - mod) / 1000000;

			ver = mod;
			mod = ver % 1000;

			i1 = (ver - mod) / 1000;

			versionInfo = {name: repo, version: (i0 + "." + i1 + "." + mod)};
		}
		return versionInfo;
	}
	
	function get_repo_release(repo, callback) {
		console.info('request version for ' + repo + ' ...');
		
		var url = protocol + '://' + host + '/' +owner+ '/' +repo+ '/tags';
		
		request.get(url, function(error, response, body) {
		  if (!error && response.statusCode == 200) {
			var versionInfo = extract_version(repo, body);
			console.info(versionInfo.version || 'none');
			callback(null, versionInfo);
		  }
		  else {
			callback(error || ('Request for [' +url+ '] ended with status code: '+response.statusCode+'.'));
		  }
		});
	}
	
	function download_repo_release(repo, callback) {
		var url = protocol + '://' + host + '/' +owner+ '/' +repo.name+ '/archive/' + repo.version + ".zip",
			dest = (repo.version === 'master' ? options.zipsMaster : options.zips) + '/' + repo.name + '.zip';
		
		console.info('downloading ... ' + repo.name +' ('+ repo.version + ')');
		
		var file = fs.createWriteStream(dest);
		
		request(url).pipe(file);
			
		file.on('finish', function () {
			console.info('ok');
			file.close(function() {
				repo.dest = dest;
				callback(null, repo);
			}); // close() is async, call callback after close completes.
		});
		
		file.on('error', function (e) {
			fs.unlink(dest); // Delete the file async. (But we don't check the result)
			callback(e, null);
		});
	}
	
	function unzip_repo(repo, callback) {
		console.info('unziping ... ' + repo.dest);
		fs.createReadStream(repo.dest)
			.pipe(unzip.Extract({ path: (repo.version==='master'?options.unZipMaster:options.unZip) + '/' }))
			.on('close', function () {
				console.info('ok');
				callback(null, repo);
			})
			.on('error', callback);
	}
	
	function renameFiles(location) {
		var dirs = fs.readdirSync(location), dir;
		for(var i in dirs) {
			dir = dirs[i];
			dir = dir.substr(0, dir.lastIndexOf('-'));
			if (dir) {
				fs.renameSync(location + '/' + dirs[i], location + '/' + dir);
			}
		}
	}
	
	function queueRequestForVersions() {
		var buffer = [];
		for(var i in options.repos) {
			buffer.push(get_repo_release.bind(null, options.repos[i]));
		}
		
		async.series(buffer, function (error, result) {
			if (error) {
				ps.emit('error', error);
			}
			else {
				queueDownloadFiles(result);
			}
		});
	}
	
	function queueDownloadFiles(repos) {
		var buffer = [];
		for(var i in repos) {
			buffer.push(download_repo_release.bind(null, repos[i]));
			buffer.push(download_repo_release.bind(null, {name:repos[i].name,version:'master'}));
		}
		
		async.series(buffer, function (error, result) {
			if (error) {
				ps.emit('error', error);
			}
			else {
				queueUnZip(result);
			}
		});		
	}
	
	function queueUnZip(repos) {
		var buffer = [];
		for(var i in repos) {
			buffer.push(unzip_repo.bind(null, repos[i]));
		}
		
		async.series(buffer, function (error, result) {
			if (error) {
				ps.emit('error', error);
			}
			else {
				queueWriteVersions(result);
			}
		});		
	}
	
	function queueWriteVersions(repos) {
		async.series([function (callback) {
			console.info('rename directories & save versions ...')
			try {
				renameFiles(options.unZip);
				renameFiles(options.unZipMaster);

				var items = repos.filter(function(item) {
					return item.version !== 'master';
				});
				
				var versionHeader = [], repo, dte = new Date();
				versionHeader.push("/*");
				versionHeader.push(" * Aurelia`s modules version at " + dte.toISOString());
				for(var i in items) {
					repo = items[i];
					versionHeader.push(" * " + repo.name +'@'+ repo.version);
				}
				versionHeader.push(" */");
				
				fs.appendFileSync(options.unZip + '/versions.txt', versionHeader.join(endOfLine));
				fs.appendFileSync(options.unZipMaster + '/versions.txt', "// Aurelia`s modules latest version at " + dte.toISOString());
				
				callback();
			}
			catch(e) {
				callback(e);
			}
		}], function (error, result) {
			if (error) {
				ps.emit('error', error);
			}
			else {
				console.info('done.');
				ps.emit('end');
			}
		});		
	}
	
	//main task
	
	ensureDirectories()
		.then(queueRequestForVersions, function(error) {
			ps.emit('error', error);
		});

	return ps;	
}