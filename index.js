"use strict";

const debug = require('debug')('sysbeat');
const fs = require('fs');
const http = require('http');
const URL = require('url');
const schedule = require('node-schedule');

function sysbeat(options) {
	var self = this;

	debug("Initializing Sysbeat");

	// initialize libs
	this.lib = {
		system: new (require('./lib/system'))(this)
	}

	if(!options)
		options = {};
	this.plugins = {};

	this.options = {
		path: options.path || process.cwd(),
		influxDB: options.influxDB || null,
		logFile: options.logFile || true,
		statHandle: options.statHandle || true,
		statRouter: options.statRouter || true,
		serverName: options.serverName || "root",
		plugins: options.plugins
	}

	// initialize influxdb
	this.influxInit();

	// iterate list of plugins
	for(var name in options.plugins)
		this.loadPlugin(name, options.plugins[name]);
}

sysbeat.prototype.loadPlugin = function(name, options) {
	debug('Loading plugin '+name);

	// load function object	
	var func;
	try {
		func = require(__dirname+'/plugins/'+name+'.js');
	} catch(e) {
		console.log('Problem loading '+name+' plugin: '+e.message);
		process.exit(-1);
	}

	// create internal instance
	var object = new func(this, options);

	// get info
	if(!object.getInfo) {
		console.log('Problem loading '+name+' plugin: FATAL not .getInfo() method');
		process.exit(-1);
	}

	// scheduler
	if(object.getSchedule) {
		// tick
		if(!object.getSchedule) {
			console.log('Problem loading '+name+' plugin: FATAL not .tick() method');
			process.exit(-1);
		}

		// plant object
		this.plugins[name] = object;
	
		// plant schedule
		schedule.scheduleJob(object.getSchedule(), object.tick.bind(object));
	}

	debug("Loading of "+object.getInfo()+' completed');
}

sysbeat.prototype.insert = function(zone, tags, values, date) {
	var self = this;
	var conf = this.options.influxDB;

	// push on stack
	this.influxStack.push(arguments);

	// main bg rotation
	function rotate() {
		var payload = '';
		var counter = 0;
		do {
			var el = self.influxStack.shift();
			if(!el)
				break;
			var tmp = el[0]+',server='+self.options.serverName;
			
			// build tags
			for(var a in el[1])
				tmp += ','+a+'='+el[1][a];
			tmp += ' ';

			// build values
			var sep = false;
			for(var a in el[2]) {
				if(sep)
					tmp += ',';
				tmp += a+'='+el[2][a];
				sep = true;
			}
			tmp += ' '+el[3];

			debug(tmp);

			payload += tmp+'\n';
			counter++;
		} while(counter < conf.concurrent);

		if(payload.length == 0) {
			self.influxTimer = null;
			return;
		}

		// post payload 
		self.influxPostData(payload, () => {
			self.influxTimer = setTimeout(rotate, 1000);
		});		
	}

	// async write to influx
	if(!this.influxTimer)
		this.influxTimer = setTimeout(rotate, 1000);

}

sysbeat.prototype.influxInit = function() {
	var self = this;
	this.influxStack = [];
	var opt = this.options.influxDB;

	if(!opt) {
		console.log("No influxDB connector found");
		process.exit(-1);
	}

	opt.concurrent = opt.concurrent || 1000;
	opt.parsedURL = URL.parse(opt.url);
	opt.writeURL = '/write?db='+opt.db+'&precision=ms';
	
	debug("Initializing connection to "+opt.url+' with '+opt.concurrent+' concurrent data points');
}

sysbeat.prototype.influxPostData = function(lines, done) {
	var conf = this.options.influxDB;

	// An object of options to indicate where to post to
	var postOptions = {
		protocol: conf.parsedURL.protocol,
		host: conf.parsedURL.hostname,
		port: conf.parsedURL.port,
		path: conf.writeURL,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(lines)
		}
	};

	// Set up the request
	var postReq = http.request(postOptions, function(res) {
		res.setEncoding('utf8');
		debug('InfluxDB got response with status code '+res.statusCode);
		res.on('data', () => {});
		res.on('end', () => {
			process.nextTick(done);
		});
	});

	// post the data
	postReq.write(lines);
	postReq.end();
}

module.exports = sysbeat;


