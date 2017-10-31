#!/usr/bin/env node

const fs = require('fs');
const sysbeat = require('../index.js');


var filename = process.argv[2];
var config;

try {
	config = fs.readFileSync(filename).toString();
} catch(e) {
	console.log('Can not open '+filename+': '+e.message);
	process.exit(-1);
}

try {
	config = JSON.parse(config);
} catch(e) {
	console.log('Can not parse JSON '+filename+': '+e.message);
	process.exit(-1);
}

new sysbeat(config);
