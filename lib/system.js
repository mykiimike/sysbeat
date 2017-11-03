const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const debug = require('debug')('sysbeat:lib:system');

var system = function() {
	var self = this;

	function parseDoubleDot(name, ids, filename) {
		var lines = fs.readFileSync(filename).toString().split("\n");
		for(var a in lines) {
			var t = lines[a].split(':');
			if(t.length > 1) {
				name[t[0]] = t;
				ids[t[2]] = t;
			}
		}
	}

	this.usersByName = {}
	this.usersById = {}
	this.groupsByName = {}
	this.groupsById = {}
	this.hosts = {};

	parseDoubleDot(this.usersByName, this.usersById, '/etc/passwd');
	parseDoubleDot(this.groupsByName, this.groupsById, '/etc/group');

	/*  load some OS / hard informations */
	var osC = os.cpus();
	this.cpu = osC[0].model;
	this.cores = osC.length;
	this.platform = os.platform();
	this.release = os.release();

	/* Update local /etc/hosts */
	function updateHosts() {
		var data = fs.readFile('/etc/hosts', function(err, data) {
			if(err) {
				console.log("Can not read /etc/hosts: "+err);
				setTimeout(updateHosts, 1000*60);
				return;
			}

			data = data.toString('utf8');

			var newHosts = {};

			var lines = data.split('\n');
			for(var id in lines) {
				var line = lines[id].trim();
				if(line[0] != '#') {
						var sep = line.split(' ')
						if(sep.length >= 2) {
							var ip = sep[0];
							for(var a=1; a<sep.length; a++) {
								var dom = sep[a];
								if(dom.length > 0)
									newHosts[dom] = ip;
							}
						}
				}
			}

			/* switch hosts */
			self.hosts = newHosts;

			setTimeout(updateHosts, 1000*60);
		});
	}


	
	updateHosts();

	debug("Initialized");
};

system.prototype.getUserName = function(name) {
	if(this.usersByName[name])
		return(this.usersByName[name]);
	return(null);
}

system.prototype.getUserId = function(id) {
	if(this.usersById[id])
		return(this.usersById[id]);
	return(null);
}

system.prototype.getGroup = function(name) {
	if(this.groupsByName[name])
		return(this.groupsByName[name]);
	return(null);
}


module.exports = system;
