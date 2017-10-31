const debug = require('debug')('sysbeat:network');
const fs = require('fs');

const info = {
	'bytes': true,
	'packets': true,
	'errs': true,
}

function network(app, options) {
	var self = this;
	this.app = app;
	this.options = {
		timer: options.timer || 1000
	}

	function rotate() {
		fs.readFile('/proc/net/dev', { encoding: 'utf8' }, function(err, data) {
			if(err)
				return cb(err);

			var lines = data.split('\n');

			lines[1] = lines[1].replace(/^\s+/, '').split(/[^a-z0-9]+/gi);
			for(var i = 2 ; i < lines.length ; i++)
				lines[i] = lines[i].replace(/^\s+/, '').split(/[\s:]+/gi);

			var tags = lines[1];

			for(var i = 2 ; i < lines.length ; i++) {
				var line = lines[i];
				var itf = line[0];

				if(line.length <= 1)
					continue;

				var now = new Date().getTime();
				for(var j = 1 ; j < line.length ; j++) {
					var column = tags[j];
					if(!info.hasOwnProperty(column))
						continue;
					if(j <= (line.length - 1) / 2)
						column = 'in-' + column;
					else
						column = 'out-' + column;

					self.app.insert('network', {'interface': itf, key: column }, {value: line[j]}, now);
				}
			}

			setTimeout(rotate, self.options.timer);
		});

	}
	setTimeout(rotate, self.options.timer);
}

network.prototype.getInfo = function() {
	return("Network usage statistics");
}


module.exports = network;
