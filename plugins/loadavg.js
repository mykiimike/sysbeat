const debug = require('debug')('sysbeat:loadavg');
const fs = require('fs');

function loadavg(app, options) {
	var self = this;
	this.app = app;
	this.options = {
		timer: options.timer || 60000
	}

	function rotate() {
		fs.readFile('/proc/loadavg', { encoding: 'utf8' }, function(err, data) {
			if(err)
				return cb(err);

			var load = data.trim().split(' ').slice(0, 3);
			var now = new Date().getTime();
			self.app.insert('loadavg', {key: '1m'}, {value: load[0]}, now);
			self.app.insert('loadavg', {key: '5m'}, {value: load[1]}, now);
			self.app.insert('loadavg', {key: '15m'}, {value: load[2]}, now);
			
			setTimeout(rotate, self.options.timer);
		});
	}
	setTimeout(rotate, self.options.timer);
}

loadavg.prototype.getInfo = function() {
	return("Load average statistics");
}


module.exports = loadavg;
