var express = require('express');
var app = express();
var Q = require('q');
var config = require((!!process.env.ENV) ? './config-' + process.env.ENV : './config');
var bodyParser = require('body-parser');
var session = require('cookie-session');
var AWS = require('aws-sdk'); 

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

app.get('/', function(req, res) { res.send("Hello"); });

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
  setCorsHeaders(req, res);
  // an existing site needs authentication
  var siteKey = req.body.sitekey;
  var siteUser = config.USERS[siteKey];
  if (siteUser && !req.session.user) {
    res.status(401).send();
    return Q.resolve();
  }

  var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: config.AWS.region,
    bucket: config.AWS.bucket
  });

  return Q.ninvoke(s3, 'headObject', {
     Bucket: config.AWS.bucket, 
     Key: siteKey
  }).catch(function() {
    // object doesn't exist, create it
    console.log("No object for " + siteKey + ", creating it.");
    return Q.ninvoke(s3, 'putObject', {
       Bucket: config.AWS.bucket, 
       Key: siteKey,
       ACL: 'public-read',
       Body: '(function(){})()'
    });
  }).then(function() {
    return Q.ninvoke(s3, 'getSignedUrl', 'putObject', {
     Bucket: config.AWS.bucket, 
     Key: siteKey,
     Expires: 60 * 5, // 5 minutes,
     ContentType: req.body.contentType,
     ACL: 'public-read'
    });
  }).then(function(url) {
    console.log(siteKey + " -> " + url);
    res.send({putUrl: url});
  });
}));

console.log("Listening on " + process.env.PORT);
app.listen(process.env.PORT);
