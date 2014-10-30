
var express = require('express');
var fs = require('fs');
var path = require('path');

var app = express();

var build = require('./build');
var CLIENT_SRC = build.CLIENT_SRC;
var CLIENT_FILES = build.CLIENT_FILES;


app.use("/", express.static(__dirname));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/test1.html');
});

app.get('/assets/:filename', function(req, res) {
  res.sendFile(path.resolve(__dirname + '/../client/assets/' + req.params.filename));
});

app.get('/copyraptor-bundled.js', function(req, res) {
  var content = build.bundleJs();
  res.set({
    'Content-Type': 'application/javascript'
  });
  res.status(200);
  res.send(content);
});

app.get('/copyraptor.js', function(req, res) {
  var content = build.bootstrapJs();
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
  var content = build.buildCss();
  res.set({
    'Content-Type': 'text/css'
  });
  res.status(200);
  res.send(content);
});

var port = 5544;
console.log('http://localhost:' + port + '/');
app.listen(port);
