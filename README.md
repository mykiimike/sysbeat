# Sysbeat
> Fullstack machine informations collector running in Standalone or In-App and supporting influxDB

## Standalone usage

```bash
npm install -g sysbeat forever
```

Add a small configuration
```json
{
	"influxDB": {
		"url": "http://localhost:8086",
		"db": "monitor"
	},
	"plugins": {
		"heartbeat": {},
		"memory": {},
		"diskio": {},
		"disks": {},
		"network": {},
		"openfiles": {},
		"loadavg": {},
		"userload": {},
		"cpu": {}
	}
}
```

And run:
```bash
forever start -a --uid "sysbeat" /usr/lib/node_modules/sysbeat/bin/sysbeat.js /etc/sysbeat.json
```

## Supported Plugins

* **cpu**: CPU stats
* **diskio**: Disks I/O
* **disks**: Disks usage
* **heartbeat**: Sysbeat's Heartbeat
* **loadavg**: Machine Load average
* **memory**: Memory usage
* **network**: Network Usage
* **openfiles**: Open files/system
* **userload**: User and kernel land load for each user

## Grafana integration


## In-App usage

### Basic usage

The following example will simply load **sysbeat** instance using a JSON based configuration file.

```javascript
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

var sb = new sysbeat(config);
```

### Send data points

If you embed sysbeat in your application then you don't need to make your own plugin as explained below. Bacause your application is considered as the plugin.

Then, if you sysbeat instance is correctly configured, you can send data though the API:

```javascript
const now = new Date().getTime();
sb.dataPoint('test', {"country": "switzerland", "canton": "vaud"}, {value: 1}, now);
```

## Plugin development

You can use **.tick()** (and the internal scheduler) if you want but it's not necessary. You can also define a setTimeout() or a .setInterval() in the plugin constructor. Sometime it's easier to use this way.

Your functions MUST NOT block.

Here is an example of the [heartbeat](./plugins/heartbeat.js) plugin

```javascript
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
```

## API

### Sysbeat()
#### .dataPoint(zone, tags, values, date)
