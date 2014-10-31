var util = require('./apputil');

module.exports = function CopyraptorService(apiBase) {

  this.save = function(payload, sitekey) {
    return util.http("POST", apiBase + '/upload-url', {
        headers: {'Content-Type': 'application/json'},
        withCredentials: true
    })
    .send(JSON.stringify({
      sitekey: sitekey,
      contentType: 'application/javascript'
    })).then(function(resp) {
      console.log("Saving", payload);
      
      var putUrl = JSON.parse(resp.responseText).putUrl;
      return util.http("PUT", putUrl, {
        headers: {'Content-Type': 'application/javascript'}
      }).send(payload);
    });
  }

  this.doAuth = function(username, password) {
    return util.http("POST", apiBase + '/login', {
        headers: {'Content-Type': 'application/json'},
        withCredentials: true
    })
    .send(JSON.stringify({
      username: username,
      password: password
    }))
  }
}
