var fs = require('fs');
var build = require('./build');
fs.writeFileSync('build/copyraptor.js', build.bundleJs());
