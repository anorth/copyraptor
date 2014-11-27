var util = require('./apputil');

var assert = util.assert, log = util.log;

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
    // Could maybe do per-user or whatever fancy versions later.
    assert(version === 'draft' || version === 'live');

    var payload = makePayload(content);
    var cacheSecs = util.CONTENT_CACHE_TIME_MS / 1000;
    var cacheControl = 'public, max-age=' + cacheSecs + ', s-maxage=' + cacheSecs;

    return util.http("POST", apiBase + '/upload-url', {
        headers: {'Content-Type': 'application/json', 'X-Copyraptor-Auth': loadAuth().token},
        withCredentials: true
    }).send(JSON.stringify({
      sitekey: sitekey,
      version: version,
      cacheControl: cacheControl,
      contentType: 'application/javascript'
    })).then(function(xhr) {
      log("Saving", content);
      var putUrl = JSON.parse(xhr.responseText).putUrl;
      var headers = {
        'Content-Type': 'application/javascript',
        'Cache-Control': cacheControl // needed in headers as well as signed request params
      };
      return util.http("PUT", putUrl, {
        headers: headers
      }).send(payload);
    });
  };

  this.load = function(version) {
    assert(version === 'draft' || version === 'live');
    var src = contentSrc(version, 'cachebust');

    return util.http('GET', src).send().then(function(resp) {
      return extractPayload(resp.responseText);
    })
    .catch(function(resp) {
      if (resp.status != 403 && resp.status != 404) {
        console.error(resp);
      }
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
        .then(function(xhr) {
          console.log(xhr);
          var authData = JSON.parse(xhr.responseText);
          if (!!authData.token) {
            saveAuth(authData);
          }
        });
  };

  function loadAuth() {
    try {
      return JSON.parse(localStorage.getItem('copyraptor-auth') || '{token: null}');
    } catch (e) {
      localStorage.removeItem('copyraptor-auth');
      return {token: null};
    }
  }

  function saveAuth(authData) {
    localStorage.setItem('copyraptor-auth', JSON.stringify(authData));
  }
};
