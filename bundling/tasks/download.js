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
			console.info('dirs ok');
		});
	}
	
	function extract_version(repo, body) {
		var matches, 
			matchVersionInfos = [], selectedVersionInfo, 
			regEx = new RegExp('href="/' + owner + '/' + repo + '/archive/(\\d{1,2}\\.\\d{1,2}\\.\\d{1,2}\-beta\\.)?(\\d{1,2})(\\.\\d{1,2})?(\\.\\d{1,2})?.zip"', 'ig');
			//npe 2015-11-23 : add beta prefix : "x.y.z-beta."
		var	builtVer, prefix, verFull, mod, i0, i1, versionInfo;
		var numVersions, numVersion;
		
		while (matches = regEx.exec(body)) {
			//console.log('len:' + matches.length);
			//matches[0] : ignore
			//matches[1] : beta prefix
			prefix = matches[1] || '';
			//console.log('prefix:' + prefix);
			//matches[2..n] : version 
			builtVer = matches.splice(2).join("");
			//console.log('ver:' + builtVer);
			matchVersionInfos.push( { prefix: prefix, ver: builtVer} );
		} 
		
		
		if (matchVersionInfos.length === 1 || matchVersionInfos.length === 0) {
			versionInfo = {name: repo, prefix: matchVersionInfos[0].prefix, version: (matchVersionInfos[0].ver || '')};
		}
		else  {
			matchVersionInfos.forEach(function(item) {
				var verStr;
				verStr = item.ver.split('.');
				numVersion = parseInt(verStr[0], 10)*1000000 +
					(verStr[1] ? parseInt(verStr[1], 10)*1000  : 0) +
					(verStr[2] ? parseInt(verStr[2], 10) : 0);
				item.numVersion = numVersion;
			});
			
		 	numVersions = matchVersionInfos.map(function(item){
				return  item.numVersion;
			}).sort(function(x, y) {
				return x < y ? x : y ; 
			});
			numVersion = numVersions[numVersions.length -1];
			//console.log('selected numVersion:' + numVersion);
			selectedVersionInfo  = matchVersionInfos.filter(function(it) {
				return it.numVersion === numVersion;
			})[0];
			//console.log('selectedVersionInfo:' + selectedVersionInfo);
			
			mod = numVersion % 1000000;
			i0 = (numVersion - mod) / 1000000;

			numVersion = mod;
			mod = numVersion % 1000;
			i1 = (numVersion - mod) / 1000;
			
			verFull = i0 + "." + i1 + "." + mod;
			//console.log('selected ver (full):' + verFull);
				
			versionInfo = { name: repo, versionPrefix: selectedVersionInfo.prefix , version: selectedVersionInfo.ver};
		}
		return versionInfo;
	}
	
	function get_repo_release(repo, callback) {
		console.info('request version for ' + repo + ' ...');
		
		var url = protocol + '://' + host + '/' + owner + '/' + repo + '/tags';
		
		request.get(url, function(error, response, body) {
		  if (!error && response.statusCode == 200) {
			var versionInfo = extract_version(repo, body);
			console.info('selected version:' + versionInfo.versionPrefix + (versionInfo.version || 'none'));
			callback(null, versionInfo);
		  }
		  else {
			callback(error || ('Request for [' + url + '] ended with status code: ' + response.statusCode + '.'));
		  }
		});
	}
	
	function download_repo_release(repo, callback) {
		var url = protocol + '://' + host + '/' +owner+ '/' +repo.name+ '/archive/' + repo.versionPrefix + repo.version + ".zip",
			dest = (repo.version === 'master' ? options.zipsMaster : options.zips) + '/' + repo.name + '.zip';
			
		console.log('download url:' + url);
		console.info('downloading ... ' + repo.name +' (' + repo.versionPrefix + repo.version + ')');
		
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
			console.error('ko' + e);
			fs.unlink(dest); // Delete the file async. (But we don't check the result)
			callback(e, null);
		});
	}
	
	function unzip_repo(repo, callback) {
		console.info('unziping ... ' + repo.dest);
		fs.createReadStream(repo.dest)
			.pipe(unzip.Extract({ path: (repo.version==='master' ? options.unZipMaster : options.unZip) + '/' }))
			.on('close', function () {
				console.info('ok');
				callback(null, repo);
			})
			.on('error', callback);
	}
	
	function renameFiles(location, repoItems) {
		var dirs = fs.readdirSync(location), dir, newDir, repoItem;
		for(var i in dirs) {
			dir = dirs[i];
			console.log('dir:' + dir);
			repoItem = repoItems.filter(function (it) {
				var builtDir = it.name + '-' + it.versionPrefix + it.version;
				//console.log('builtDir:' + builtDir);
				return builtDir === dir;
			})[0];
			newDir = repoItem.name ;//dir.substr(0, dir.lastIndexOf('-'));
			if (newDir) {
				fs.renameSync(location + '/' + dir, location + '/' + newDir);
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
			buffer.push(download_repo_release.bind(null, { name:repos[i].name, versionPrefix:'', version:'master'}));
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
				var repoItems = repos.filter(function(item) {
					return item.version !== 'master';
				});
				renameFiles(options.unZip, repoItems);
				
				var repoMasterItems = repos.filter(function(item) {
					return item.version === 'master';
				});
				renameFiles(options.unZipMaster, repoMasterItems);

				var versionHeader = [], repoItem, dte = new Date();
				versionHeader.push("/*");
				versionHeader.push(" * Aurelia`s modules version at " + dte.toISOString());
				for(var i in repoItems) {
					repoItem = repoItems[i];
					versionHeader.push(" * " + repoItem.name +'@'+ repoItem.versionPrefix + repoItem.version);
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
	
	// //main task
	// async.series([
	// 	function(callback){
	// 		// do some stuff ... 
	// 		ensureDirectories(null, 'dirs');
	// 	},
	// 	function(callback){
	// 		// do some more stuff ... 
	// 		callback(null, 'two');
	// 	}
	// ],
	// // optional callback 
	// function(err, results){
	// 	// results is now equal to ['one', 'two'] 
	// });

	return ps;	
}