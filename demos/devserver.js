var CLIENT_FILES = [
    'util.js',
    'focus-rect.js',
    'editor.js',
    'app.js',
    'injector.js'
  ];


var express = require('express');
var fs = require('fs');

var app = express();

var build = require('./build');

app.use("/", express.static(__dirname));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/test1.html');
});

var CLIENT_SRC = __dirname + '/../client/';

app.get('/copyraptor.js', function(req, res) {
  var content = build.bootstrapJs(CLIENT_SRC, CLIENT_FILES);
  res.set({
    'Content-Type': 'application/javascript'
  });
  res.status(200);
  res.send(content);
});
app.get('/copyraptor/js/:script', function(req, res) {
  var content = build.processJs(fs.readFileSync(CLIENT_SRC + req.params.script));
  res.set({
    'Content-Type': 'application/javascript'
  });
  res.status(200);
  res.send(content);
});

app.get('/copyraptor.css', function(req, res) {
  var content = build.buildCss(__dirname + '/../client');
  res.set({
    'Content-Type': 'text/css'
  });
  res.status(200);
  res.send(content);
});




var port = 5544;
console.log('http://localhost:' + port + '/');
app.listen(port);
