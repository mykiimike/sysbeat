"use strict";

const debug = require('debug')('sysbeat');
const fs = require('fs');
const http = require('http');
const URL = require('url');
const EventEmitter = require('events');
const util = require('util');
const schedule = require('node-schedule');

function sysbeat(options) {
	var self = this;

	debug("Initializing Sysbeat");

	// initialize event
	EventEmitter.call(this);

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

	// initialize libs
	this.lib = {
		system: new (require('./lib/system'))(this),
		influxdb: new (require('./lib/influxdb'))(this),
	}

	// iterate list of plugins
	for(var name in options.plugins)
		this.loadPlugin(name, options.plugins[name]);
}
// copy prototypes
util.inherits(sysbeat, EventEmitter);

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

	// plant object
	this.plugins[name] = object;

	// scheduler
	if(object.getSchedule) {
		// tick
		if(!object.getSchedule) {
			console.log('Problem loading '+name+' plugin: FATAL not .tick() method');
			process.exit(-1);
		}

		// plant schedule
		schedule.scheduleJob(object.getSchedule(), object.tick.bind(object));
	}

	debug("Loading "+object.getInfo()+' completed');
}

sysbeat.prototype.dataPoint = function(zone, tags, values, date) {
	this.emit("dataPoint", zone, tags, values, date);
}

sysbeat.prototype.dataTrap = function(trap) {
	console.log(trap);
	this.emit("dataTrap", trap);
}

module.exports = sysbeat;
