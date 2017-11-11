function heartbeat(app, options) {
	var self = this;
	this.app = app;
	this.options = {
		timer: options.timer || 1000
	}

	var timer;
	var displace = new Date().getTime();

	function hb() {
		var now = new Date().getTime();
		self.app.dataPoint('heartbeat', {}, {timing: now-displace}, now);
		displace = now;
		timer = setTimeout(hb, self.options.timer);
	}
	timer = setTimeout(hb, self.options.timer);
}

heartbeat.prototype.getInfo = function() {
	return("Machine Hearbeat");
}

module.exports = heartbeat;
