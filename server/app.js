var express = require('express');
var app = express();
var datastore = require('./datastore');
var Q = require('q');
var config = require((!!process.env.ENV) ? ('./config-' + process.env.ENV) : './config');
var bodyParser = require('body-parser');
var session = require('cookie-session');
var AWS = require('aws-sdk');
var Mandrill = require('mandrill-api/mandrill');

var store = new datastore.Datastore(process.env.DATABASE_URL);
var mandrill = new Mandrill.Mandrill();

app.set('config', config);

var SESSION = {
  SITE_KEY: 'siteKey'
};

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
  secret: config.APP_SECRET
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(__dirname + '/static'));


///// Web site /////

app.post('/signup', requestHandler(function(req, res) {
  return Q.resolve().then(function() {
    var signupName = req.body.name || "";
    var signupEmail = req.body.email || "";
    var signupSite = req.body.site || "";
    var signupMessage = req.body.message || "";

    var messageContent = "New Copyraptor signup!\n\n" +
        "Name: " + signupName + "\n" +
        "Email: " + signupEmail + "\n" +
        "Site: " + signupSite + "\n\n" +
        "Message:\n" + signupMessage +"\n";

    var message = {
      "subject": "Copyraptor signup: " + signupSite,
      "text": messageContent,
      "from_email": "website@copyraptor.com",
      "from_name": "Copyraptor",
      "to": [{
        "email": "copyraptor@firstorder.com.au",
        "type": "to"
      }],
      "headers": {
        "Reply-To": signupEmail
      },
      //"bcc_address": "message.bcc_address@example.com",
      "important": false
    };

    mandrill.messages.send({"message": message, "async": false}, function(result) {
      console.log("Signup email sent", result);
      return res.redirect("thanks.html");
    }, function(e) {
      console.log("Mandrill error: " + e.name + ", " + e.message);
      return res.redirect("thanks.html");
    });
  });
}));


///// API /////

app.options(/\/api\/.*/, requestHandler(function(req, res) {
  setCorsHeaders(req, res);
  res.send();
  return Q.resolve();
}));


app.post('/api/login', requestHandler(function (req, res) {
  setCorsHeaders(req, res);
  var siteKey = req.body.username;
  var password = req.body.password;

  return store.checkLogin(siteKey, password)
      .then(function(success) {
        if (success) {
          console.log("Logged in " + siteKey);
          req.session[SESSION.SITE_KEY] = siteKey;
          res.send("Ok");
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


app.post('/api/upload-url', requestHandler(function(req, res) {
  setCorsHeaders(req, res);
  var sitekey = req.body.sitekey;
  var version = req.body.version;

  if (!sitekey || !version) {
    throw {httpcode:400, message:'sitekey and version required'};
  }

  var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: config.AWS.region,
    bucket: config.AWS.bucket
  });
  var bucketKey = sitekey + '/' + version;

  // FIXME: can only log in to one site at a time this way
  var qAuthorized = (sitekey === req.session[SESSION.SITE_KEY]) ? Q.resolve(true) :
      store.getSite(sitekey).then(function(site) {
        // an existing site needs authentication, non-existing are world-writable
        return site == null;
      });

  return qAuthorized.then(function(authorized) {
        if (!authorized) {
          console.log("Unauthorized for requested site", sitekey, "session:", req.session[SESSION.SITE_KEY]);
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

///// Bootstrap /////

store.testConnection().then(function () {
  console.log("Datastore connection ok");
}).catch(function(err) {
  console.log("Datastore connection failed");
  throw err;
}).done();

mandrill.users.info(function(info) {
  console.log('Mandrill reputation: ' + info.reputation + ', Hourly Quota: ' + info.hourly_quota);
});

console.log("Listening on " + process.env.PORT);
app.listen(process.env.PORT);
