const debug = require('debug')('sysbeat:cpu');
const fs = require('fs');

const coresFields = [
	'tag', 'user', 'nice', 'system', 'idle', 'iowait', 'irq', 'softirq', 'steal', 'guest', 'guest_nice',
];

function cpu(app, options) {
	var self = this;
	this.app = app;
	this.options = {
		timer: options.timer || 10000
	}

	function rotate() {
		fs.readFile('/proc/stat', { encoding: 'utf8' }, function(err, data) {
			if(err) {
				setTimeout(rotate, self.options.timer*2);
				debug('Error reading /proc/stat: '+err);
				return;
			}

			var lines = data.split('\n');
			var now = new Date().getTime();

			for(var i = 0 ; i < lines.length ; i++) {
				var line = lines[i].split(/\s+/);
				if(line[0] == 'intr') //Too big for now?
					continue;

				if(line.length == 2)
					cpu[line[0]] = line[1];
				else if(line[0].match(/^cpu[0-9]*$/)) {
					var tag = line[0];

					if(tag == 'cpu')
						for(var j = 1 ; j < line.length ; j++) {
							var field = coresFields[j];
							self.app.dataPoint('cpu', {cpu: tag, key: field}, {value: line[j]}, now);
						}
					else {
						for(var j = 1 ; j < line.length ; j++) {
							var field = coresFields[j];
							self.app.dataPoint('cpu', {cpu: tag.substr(0,3)+'.'+tag.substr(3), key: field}, {value: line[j]}, now);
						}
					}

				}
			}

			setTimeout(rotate, self.options.timer);
		});

	}
	setTimeout(rotate, self.options.timer);
}

cpu.prototype.getInfo = function() {
	return("CPU statistics");
}

const trapCpu = {
	'vendor_id': true,
	'model_name': true,
	'cache_size': true,
	'flags': true,
	'address_sizes': true,
}

cpu.prototype.trap = function() {
	var ret = {};
	var self = this;

	debug('Acquiring informations from /proc/cpuinfo');
	fs.readFile('/proc/cpuinfo', { encoding: 'utf8' }, function(err, data) {
		if(err) {
			debug('Error reading /proc/cpuinfo: '+err);
			return;
		}

		var lines = data.split('\n');
		var now = new Date().getTime();

		for(var i = 0 ; i < lines.length ; i++) {
			var line = lines[i].split(':');
			if(line.length == 2) {
				var k = line[0].trim().replace(' ', '_');
				if(trapCpu[k] === true) {
					var v = line[1].trim();
					ret['cpu.'+k] = v;
				}
			}
		}

		self.app.dataTrap(ret);
	});

}

module.exports = cpu;
