const debug = require('debug')('sysbeat:userload');
const fs = require('fs');

function userload(app, options) {
	var self = this;
	this.app = app;
	this.options = {
		timer: options.timer || 10000
	}

	function rotate() {

		fs.readdir('/proc', function(err, dirs) {
			var rendered = {};

			if(err) {
				setTimeout(rotate, self.options.timer*2);
				debug('Error scanning /proc: '+err);
				return;
			}

			var files = [];
			for(var a in dirs) {
				var dir = dirs[a];
				if(dir.match(/^[0-9]+$/)) {
					files.push('/proc/'+dir);
				}
			}

			function readfile() {
				var file = files.shift();
				if(!file) {
					// insert data
					var now = new Date().getTime();
					for(var service in rendered) {
						var p = rendered[service];
						for(var key in p) {
							self.app.dataPoint('userload', {service: service, key: key}, {value: p[key]}, now);
						}
					}


					renderer = {};
					setTimeout(rotate, self.options.timer);
					return;
				}

				fs.readFile(file+'/status', { encoding: 'utf8' }, function(err, data) {
					if(err) {
						// slow down
						setTimeout(readfile, 1);

						debug('Error reading '+file+'/status: '+err);
						return;
					}

					// parse data
					var parsed = {};
					var lines = data.split("\n");
					for(var a in lines) {
						var line = lines[a];
						var sp = line.split(":");
						if(sp.length != 2)
							continue;
						parsed[sp[0]] = sp[1].split("\t")[1];
					}

					// prepare data
					var service = self.app.lib.system.getUserId(parsed['Uid'])[0];

					fs.readFile(file+'/stat', { encoding: 'utf8' }, function(err, data) {
						if(err) {
							// slow down
							setTimeout(readfile, 1);

							debug('Error reading '+file+'/status: '+err);
							return;
						}


						var stat = data.split(" ");

						if(!rendered[service])
							rendered[service] = {utime:0, stime:0, cutime:0, sutime:0, memPeak:0, memSize:0, memSwap:0};

						var p = rendered[service];

						p.utime += parseInt(stat[13]);
						p.stime += parseInt(stat[14]);
						p.cutime += parseInt(stat[15]);
						p.sutime += parseInt(stat[16]);

						p.memPeak = (parsed['VmPeak'] ? parsed['VmPeak'].trim().split(' ')[0] : 0);
						p.memSize = (parsed['VmSize'] ? parsed['VmSize'].trim().split(' ')[0] : 0);
						p.memSwap = (parsed['VmSwap'] ? parsed['VmSwap'].trim().split(' ')[0] : 0);

						// slow down
						setTimeout(readfile, 1);
					});
				});
			}

			process.nextTick(readfile);
		});

	}
	setTimeout(rotate, self.options.timer);
}

userload.prototype.getInfo = function() {
	return("Open files statistics");
}


module.exports = userload;
