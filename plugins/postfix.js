const debug = require('debug')('sysbeat:postfix');
const fs = require('fs');
const { spawn } = require('child_process');

function postfix(app, options) {
	var self = this;
	this.app = app;
	this.options = {
		timer: options.timer || 10000
	}

	function rotate() {
		const cmd = spawn('postqueue', ['-j']);
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
				var line = lines[a];
				if(line.length <= 0)
					break;
				try {
					var json = JSON.parse(line);
				} catch(e) {
					debug("Error parsing postqueue json: "+e.message);
					setTimeout(rotate, self.options.timer);
					return;
				}
			}

			self.app.insert('postfix', {key: 'queue' }, {value: lines.length}, now);
			setTimeout(rotate, self.options.timer);
		});

	}
	setTimeout(rotate, self.options.timer);
}

postfix.prototype.getInfo = function() {
	return("postfix usage statistics");
}


module.exports = postfix;
