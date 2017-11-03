const debug = require('debug')('sysbeat:openfiles');
const fs = require('fs');

function openfiles(app, options) {
	var self = this;
	this.app = app;
	this.options = {
		timer: options.timer || 10000
	}

	function rotate() {
		fs.readFile('/proc/sys/fs/file-nr', { encoding: 'utf8' }, function(err, data) {
			if(err) {
				setTimeout(rotate, self.options.timer*2);
				debug('Error reading /proc/sys/fs/file-nr: '+err);
				return;
			}


			data = data.split(/\s+/);	
			var now = new Date().getTime();
			self.app.insert('openfiles', {key: 'allocated'}, {value: data[0]}, now);
			self.app.insert('openfiles', {key: 'unused'}, {value: data[1]}, now);
			self.app.insert('openfiles', {key: 'available'}, {value: data[2]}, now);

			setTimeout(rotate, self.options.timer);
		});

	}
	setTimeout(rotate, self.options.timer);
}

openfiles.prototype.getInfo = function() {
	return("Open files statistics");
}


module.exports = openfiles;
