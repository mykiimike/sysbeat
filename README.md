## Background

```bash
forever start  --uid "sysbeat" /usr/lib/node_modules/sysbeat/bin/sysbeat.js /etc/sysbeat.json
```

## Plugin development

You can use .tick() (and the internal scheduler) if you want but it's not necessary. You can also define a setTimeout() or a .setInterval() in the plugin constructor. Sometime it's easier to use this way.

Your functions MUST NOT block.
