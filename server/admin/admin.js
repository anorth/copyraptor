
var express = require('express');
var Q = require('q');
var bodyParser = require('body-parser');

var requests = require('../requests');


module.exports = function createAdmin(store) {
  var admin = express();
  admin.use(express.static(__dirname + '/static'));
  admin.use(bodyParser.json());

  admin.post('/signup', requests.promiseHandler(function(req, res) {
    return Q.resolve().then(function() {
      var name = req.body.name || undefined;
      var email = req.body.email || undefined;
      var siteKey = req.body.siteKey || undefined;
      var password = generatePassword();

      if (name === undefined) {
        return res.status(500).send("Name required");
      } else if (email === undefined) {
        return res.status(500).send("Email required");
      } else if (siteKey === undefined) {
        return res.status(500).send("Site key required");
      }

      return store.putSite(siteKey, password, email, name)
          .then(function(success) {
            if (success) {
              console.log("Sign up processed " + siteKey + ', ' + email);
              res.send({
                name: name,
                email: email,
                siteKey: siteKey,
                password: password
              });
            } else {
              console.log("Sign up failed for " + siteKey);
              res.sendStatus(403)
            }
          })
          .catch(function(err) {
            console.log("Error signing up: " + err);
            res.status(500).send("Internal error signing up: " + err);
          });
    });
  }));


  return admin;
};

function generatePassword() {
  var length = 10,
      charset = "abcdefghjknpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789",
      pass = "";
  for (var i = 0, n = charset.length; i < length; ++i) {
    pass += charset.charAt(Math.floor(Math.random() * n));
  }
  return pass;
}
