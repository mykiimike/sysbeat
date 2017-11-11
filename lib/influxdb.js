"use strict";

const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const os = require('os');
const URL = require('url');
const debug = require('debug')('sysbeat:lib:influxdb');

var influxdb = function(root) {
	this.root = root;
	var self = this;
	this.influxStack = [];

	var opt = root.options.influxDB;

	opt.concurrent = opt.concurrent || 1000;
	opt.parsedURL = URL.parse(opt.url);
	opt.writeURL = '/write?db='+opt.db+'&precision=ms';

	// background insertion
	function rotate() {
		var payload = '';
		var counter = 0;
		do {
			var el = self.influxStack.shift();
			if(!el)
				break;
			var tmp = el[0]+',server='+self.root.options.serverName;

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
		} while(counter < opt.concurrent);

		if(payload.length == 0) {
			self.influxTimer = null;
			return;
		}

		// post payload
		self.postData(payload, () => {
			self.influxTimer = setTimeout(rotate, 1000);
		});
	}

	// prepare influxdb inserter
	root.on('dataPoint', (zone, tags, values, date) => {
		// push on stack
		self.influxStack.push([zone, tags, values, date]);

		// async write to influx
		if(!self.influxTimer)
			self.influxTimer = setTimeout(rotate, 1000);
	})

	debug("Initializing connection to "+opt.url+' with '+opt.concurrent+' concurrent data points');
};

influxdb.prototype.postData = function(lines, done) {
	var conf = this.root.options.influxDB;

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

module.exports = influxdb;
