
var express = require('express');
var bodyParser = require('body-parser');
var Q = require('q');

var requests = require('./requests');


module.exports = function createSite(mandrill) {
  var site = express();
  site.use(express.static(__dirname + '/static'));
  site.use(bodyParser.urlencoded({extended: false}));

  site.post('/signup', requests.promiseHandler(function(req, res) {
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
        "subject": "Copyraptor signup for " + signupSite,
        "text": messageContent,
        "from_email": "website@copyraptor.com",
        "from_name": "Copyraptor",
        "to": [{
          "email": "signup@copyraptor.com",
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

  return site;
};
