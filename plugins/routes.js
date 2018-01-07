const debug = require('debug')('sysbeat:routes');
const fs = require('fs');
const { spawn } = require('child_process');
const calc = require('network-calculator');

function routes(app, options) {
	var self = this;
	this.app = app;
	this.options = {
		timer: options.timer || 10000
	}

	function shot() {
		const cmd = spawn('route', ['-n']);
		var data = '';

		cmd.stdout.on('data', (chunk) => {
			data += chunk;
		});

		cmd.stderr.on('data', (chunk) => {
			console.log('Error output: '+chunk);
		});

		cmd.on('close', (code) => {
			var lines = data.split('\n');
			var now = new Date().getTime();

			var ret = {route: []};

			for(var i = 2, c=0 ; i < lines.length ; i++, c++) {
				var line = lines[i].split(/\s+/);
				if(line.length == 8) {
					var net = calc(line[0], line[2]);
					var st = {
						'destination': line[0],
						'mask': line[2],
						'bitmask': net.bitmask,
						'gateway': line[1],
						'metric': parseInt(line[4]),
						'interface': line[7],
					}
					ret.route.push(st);
				}
			}

			self.app.dataTrap(ret);
			setTimeout(shot, self.options.timer);
		});
	}

	shot();
}

routes.prototype.getInfo = function() {
	return("Network Routes");
}



module.exports = routes;
