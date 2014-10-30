var express = require('express');
var app = express();
var Q = require('q');
var config = require('./config');
var bodyParser = require('body-parser')
var session = require('cookie-session')

app.set('config', config);

function requestHandler(handler) {
  return function(req, res) {
    handler(req, res).catch(function(err) {
      if (err.httpcode) {
        res.status(err.httpcode).send(err);
      } else {
        console.log(err);
        res.status(500).send({message: 'Internal error'});
      }
      next(err);
    });
  }
}

app.use(session({
  secret: config.SECRET
}));
app.use(bodyParser.json());

function setCorsHeaders(req, res) {
  var origin = req.get('Origin');
  if (origin) {
    requestHeaders = req.get('Access-Control-Request-Headers');
    res.set('Access-Control-Allow-Origin', req.get('Origin'));
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET, POST');

    if (requestHeaders) {
      res.set('Access-Control-Allow-Headers', requestHeaders);
    }
  }
}

app.options(/\/api\/.*/, requestHandler(function(req, res) {
  setCorsHeaders(req, res);
  res.send();
  return Q.resolve();
}));

app.post('/api/login', requestHandler(function(req, res) {
  setCorsHeaders(req, res);
  return Q.resolve().then(function() {
    var user = config.USERS[req.body.username];
    if (!user) {
      return res.sendStatus(400);
    }

    if (user.password != req.body.password) {
      return res.sendStatus(400);
    }

    req.session.user = user;
    res.send();
  });
}));


app.post('/api/upload-url', requestHandler(function(req, res) {
  return Q.resolve().then(function() {
    setCorsHeaders(req, res);

    // TODO(jeeva): factor into a general auth decorator
    if (!req.session.user) {
      return res.sendStatus(401);
    }

    // Testing hack to reset sessions
    //req.session = null;

    var bucket = req.session.user.bucket;
    var bucket = 'devstore.copyraptor.com.s3.amazonaws.com';

    // TODO(jeeva): generate and send a signed URL
    res.send({putUrl: 'http://' + bucket + '/' + req.body.sitekey});
  });
}));

app.listen(3000);
