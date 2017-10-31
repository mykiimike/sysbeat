const debug = require('debug')('sysbeat:diskIO');
const fs = require('fs');

const fields = [
	'major-number',
	'minor-number',
	'device-name',
	'read-ok',
	'read-merges',
	'read-sectors',
	'read-duration',
	'write-ok',
	'write-merges',
	'write-sectors',
	'write-duration',
	'io-count',
	'io-duration',
	'io-weighted-duration',
];

function diskIO(app, options) {
	var self = this;
	this.app = app;
	this.options = {
		timer: options.timer || 10000
	}

	function rotate() {
		fs.readFile('/proc/diskstats', { encoding: 'utf8' }, function(err, data) {
			if(err) {
				setTimeout(rotate, self.options.timer*2);
				debug('Error reading /proc/diskstats: '+err);
				return;
			}

			var lines = data.split('\n');

			for(var i = 0 ; i < lines.length ; i++) {
				var line = lines[i].trim().split(/\s+/);
				if(line.length < fields.length)
					continue;

				var device = line[2];
				if(!device.match(/^dm-\d+|md\d+|[hsv]d[a-z]+\d+$/))
					continue;

				var now = new Date().getTime();
				for(var j = 3 ; j < line.length ; j++) {
					var field = fields[j];
					self.app.insert('diskio', {device: device, key: field}, {value: line[j]}, now);
				}
			}

			setTimeout(rotate, self.options.timer);
		});
		
	}
	setTimeout(rotate, self.options.timer);
}

diskIO.prototype.getInfo = function() {
	return("Disk IO statistics");
}


module.exports = diskIO;
