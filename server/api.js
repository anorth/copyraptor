
var AWS = require('aws-sdk');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var express = require('express');
var Mixpanel = require('mixpanel');
var Q = require('q');
var _ = require('underscore');

var requests = require('./requests');


var HEADERS = {
  AUTH: 'X-Copyraptor-Auth'
};
var AUTH_LIFETIME_MS = 14 * (24 * 60 * 60 * 1000);


module.exports = function createApi(config, store) {
  var mixpanel = Mixpanel.init(config.mixpanelToken);
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
            track(siteKey, "Sign in succeeded");
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
              token: authToken(siteKey),
              expires: Date.now() + AUTH_LIFETIME_MS
            }));
          } else {
            console.log("Login failed for " + siteKey);
            track(siteKey, "Sign in failed");
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
    var siteKey = encodeURIComponent(req.body.sitekey);
    var version = req.body.version;

    if (!siteKey || !version) {
      throw {httpcode:400, message:'sitekey and version required'};
    } else if (version !== 'live' && version !== 'draft') {
      throw {httpcode:400, message:'invalid sitekey, must be draft or live'};
    }

    var s3 = new AWS.S3({
      accessKeyId: config.awsAccessKey,
      secretAccessKey: config.awsSecretKey,
      region: config.awsRegion,
      bucket: config.awsBucket
    });
    var bucketKey = siteKey + '/' + version;

    // FIXME: can only log in to one site at a time this way
    var isLoggedIn = (authToken(siteKey) === req.header(HEADERS.AUTH));
    var qAuthorized = isLoggedIn ? Q.resolve(true) :
        store.getSite(siteKey).then(function(site) {
          // an existing site needs authentication, non-existing are world-writable
          return site == null;
        });

    return qAuthorized.then(function(authorized) {
      if (!authorized) {
        console.log("Unauthorized for requested site", siteKey, "token:", req.header(HEADERS.AUTH));
        track(siteKey, "Authentication requested");
        res.status(401).send();
        return Q.resolve();
      } else {
        var eventName = (version === 'live') ? 'Publish' : 'Save draft';
        var props = {
          'Logged in': isLoggedIn,
          'Edit count': req.body.editCount
        };
        track(siteKey, eventName, props);
        return Q.ninvoke(s3, 'headObject', {
          Bucket: config.awsBucket,
          Key: bucketKey
        }).catch(function() {
          // object doesn't exist, create it
          console.log("No object for " + bucketKey + ", creating it.");
          return Q.ninvoke(s3, 'putObject', {
            Bucket: config.awsBucket,
            Key: bucketKey,
            ACL: 'public-read',
            Body: '(function(){})()'
          });
        }).then(function() {
          return Q.ninvoke(s3, 'getSignedUrl', 'putObject', {
            Bucket: config.awsBucket,
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
    var hmac = crypto.createHmac('sha1', config.sessionSecret);
    hmac.update(data);
    return hmac.digest('base64');
  }

  function track(siteKey, event, properties) {
    console.log("Track: " + siteKey + " \"" + event + "\" " + JSON.stringify(properties));
    mixpanel.track(event, _.extend({distinct_id: siteKey}, properties));
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

