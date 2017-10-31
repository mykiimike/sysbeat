You can use .tick() (and the internal scheduler) if you want but it's not necessary. You can also define a setTimeout() or a .setInterval() in the plugin constructor. Sometime it's easier to use this way.

You functions MUST NOT block.
