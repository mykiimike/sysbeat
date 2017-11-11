const debug = require('debug')('sysbeat:memory');
const fs = require('fs');

const allowedTags = {
	MemTotal: true,
	MemFree: true,
	MemAvailable: true,
	Buffers: true,
	Cached: true,
	SwapCached: true,
	Active: true,
	Inactive: true,
	SwapTotal: true,
	SwapFree: true,
	DirectMap4k: true,
	DirectMap2M: true,
	DirectMap1G: true,
};

function memory(app, options) {
	var self = this;
	this.app = app;
	this.options = {
		timer: options.timer || 10000
	}

	function rotate() {
		fs.readFile('/proc/meminfo', { encoding: 'utf8' }, function(err, data) {
			if(err) {
				setTimeout(rotate, self.options.timer*2);
				debug('Error reading /proc/meminfo: '+err);
				return;
			}

			var lines = data.split('\n');
			var now = new Date().getTime();

			for(var i = 0 ; i < lines.length ; i++) {
				var t = lines[i].split(":");
				if(!allowedTags.hasOwnProperty(t[0]))
					continue;
				self.app.dataPoint('memory', {key: t[0].trim()}, {value: t[1].trim().split(" ")[0]}, now);
			}

			setTimeout(rotate, self.options.timer);
		});

	}
	setTimeout(rotate, self.options.timer);
}

memory.prototype.getInfo = function() {
	return("Memory statistics");
}



module.exports = memory;
