
var express = require('express');
var crypto = require('crypto');
var Q = require('q');
var bodyParser = require('body-parser');
var AWS = require('aws-sdk');

var requests = require('./requests');


var HEADERS = {
  AUTH: 'X-Copyraptor-Auth'
};
var AUTH_LIFETIME_MS = 14 * (24 * 60 * 60 * 1000);


module.exports = function createApi(config, store) {
  var api = express();
  api.use(bodyParser.json());

  api.options(/\/.*/, requests.promiseHandler(function(req, res) {
    setCorsHeaders(req, res);
    res.send();
    return Q.resolve();
  }));


  api.post('/login', requests.promiseHandler(function (req, res) {
    setCorsHeaders(req, res);
    var siteKey = encodeURIComponent(req.body.username);
    var password = req.body.password;

    return store.checkLogin(siteKey, password)
        .then(function(success) {
          if (success) {
            console.log("Logged in " + siteKey);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
              token: authToken(siteKey),
              expires: Date.now() + AUTH_LIFETIME_MS
            }));
          } else {
            console.log("Login failed for " + siteKey);
            res.sendStatus(403)
          }
        })
        .catch(function(err) {
          console.log("Error checking login: " + err);
          res.status(500).send("Internal error checking login");
        });
  }));


  api.post('/upload-url', requests.promiseHandler(function(req, res) {
    setCorsHeaders(req, res);
    var sitekey = encodeURIComponent(req.body.sitekey);
    var version = req.body.version;

    if (!sitekey || !version) {
      throw {httpcode:400, message:'sitekey and version required'};
    } else if (version !== 'live' && version !== 'draft') {
      throw {httpcode:400, message:'invalid sitekey, must be draft or live'};
    }

    var s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID, // TODO: dep inject
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: config.AWS.region,
      bucket: config.AWS.bucket
    });
    var bucketKey = sitekey + '/' + version;

    // FIXME: can only log in to one site at a time this way
    var qAuthorized = (authToken(sitekey) === req.header(HEADERS.AUTH)) ? Q.resolve(true) :
        store.getSite(sitekey).then(function(site) {
          // an existing site needs authentication, non-existing are world-writable
          return site == null;
        });

    return qAuthorized.then(function(authorized) {
      if (!authorized) {
        console.log("Unauthorized for requested site", sitekey, "token:", req.header(HEADERS.AUTH));
        res.status(401).send();
        return Q.resolve();
      } else {
        return Q.ninvoke(s3, 'headObject', {
          Bucket: config.AWS.bucket,
          Key: bucketKey
        }).catch(function() {
          // object doesn't exist, create it
          console.log("No object for " + bucketKey + ", creating it.");
          return Q.ninvoke(s3, 'putObject', {
            Bucket: config.AWS.bucket,
            Key: bucketKey,
            ACL: 'public-read',
            Body: '(function(){})()'
          });
        }).then(function() {
          return Q.ninvoke(s3, 'getSignedUrl', 'putObject', {
            Bucket: config.AWS.bucket,
            Key: bucketKey,
            ContentType: req.body.contentType,
            CacheControl: req.body.cacheControl,
            Expires: 60 * 5, // 5 minutes,
            ACL: 'public-read'
          });
        }).then(function(url) {
          console.log(bucketKey + " -> " + url);
          res.send({putUrl: url});
        });
      }
    });
  }));

  function authToken(data) {
    var hmac = crypto.createHmac('sha1', config.APP_SECRET);
    hmac.update(data);
    return hmac.digest('base64');
  }

  return api;
};


function setCorsHeaders(req, res) {
  var origin = req.get('Origin');
  if (origin) {
    requestHeaders = req.get('Access-Control-Request-Headers');
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET, POST');

    if (requestHeaders) {
      res.set('Access-Control-Allow-Headers', requestHeaders);
    }
  }
}

