var util = require('./apputil');

var assert = util.assert;

// TODO: refactor parts of injector vs this service
module.exports = function CopyraptorService(apiBase, sitekey, contentSrc) {
  assert(apiBase);
  assert(sitekey);
  assert(contentSrc instanceof Function);

  function makePayload(content) {
    assert(content, "Undefined content for payload");
    return "copyraptor.setContent(" + JSON.stringify(content) + ");";
  }

  function extractPayload(str) {
    var extracted = null;
    var copyraptor = {
      setContent: function(content) {
        extracted = content;
      }
    };
    try {
      eval(str);
    } catch (e) {
      console.error("Failed to extract payload", e);
    }
    if (!extracted) {
      console.error('Nothing extracted from ' + str);
      extracted = null;
    }

    return extracted;
  }

  this.save = function(content, version) {
    var payload = makePayload(content);

    // Could maybe do per-user or whatever fancy versions later.
    assert(version === 'draft' || version === 'live');

    return util.http("POST", apiBase + '/upload-url', {
        headers: {'Content-Type': 'application/json'},
        withCredentials: true
    })
    .send(JSON.stringify({
      sitekey: sitekey,
      version: version,
      contentType: 'application/javascript'
    })).then(function(resp) {
      console.log("Saving", payload);
      
      var putUrl = JSON.parse(resp.responseText).putUrl;
      return util.http("PUT", putUrl, {
        headers: {'Content-Type': 'application/javascript'}
      }).send(payload);
    });
  };

  this.load = function(version) {
    assert(version === 'draft' || version === 'live');
    var src = contentSrc(version, 'cachebust');

    return util.http('GET', src).send().then(function(resp) {
      return extractPayload(resp.responseText);
    })
    .catch(function(err) {
      console.error(err);

      // just transform to null.
      return null;
    });
  };

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
};
