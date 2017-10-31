const debug = require('debug')('sysbeat:disks');
const fs = require('fs');
const { spawn } = require('child_process');

function disks(app, options) {
	var self = this;
	this.app = app;
	this.options = {
		timer: options.timer || 10000
	}

	function rotate() {
		const cmd = spawn('df', ['-P']);
		var data = '';
		cmd.stdout.on('data', (input) => {
			data += input;
		});

		cmd.stderr.on('data', (data) => {
			setTimeout(rotate, self.options.timer*2);
			debug('Error executing df : '+data);
		});

		cmd.on('close', (code) => {
			var lines = data.split('\n');
			var now = new Date().getTime();
			for(var a=1; a<lines.length; a++) {
				var line = lines[a].replace(/\s+/g, ' ').split(' ');
				var percent = 100*line[2]/line[1];

				self.app.insert('disks', {disk: line[0], mount: line[5], key: 'total' }, {value: line[1], percent: 100}, now);
				self.app.insert('disks', {disk: line[0], mount: line[5], key: 'used' }, {value: line[2], percent: percent}, now);
			}

			setTimeout(rotate, self.options.timer);
		});

	}
	setTimeout(rotate, self.options.timer);
}

disks.prototype.getInfo = function() {
	return("Disks usage statistics");
}


module.exports = disks;
