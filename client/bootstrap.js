var util = require('./common');
var assert = util.assert;
var log = util.log;
var warn = util.warn;
var createInjector = require('./injector');

var urlScheme = (document.location.protocol === 'https:') ? 'https://' : 'http://';
var params = {site: undefined}, staticPath, serverPath, contentCdnHost, i;

// Find the script element that loaded this script to extract the site id
var tags = document.head.querySelectorAll("script");
for (i = 0; i < tags.length; ++i) {
  var tag = tags[i];

  if (tag.getAttribute("data-copyraptor-site") !== null) {
    staticPath = tag.src.split(/[\w_-]+.js/)[0].replace(/\/$/, '');
    log(staticPath);

    // Process attribute-based settings, e.g. data-copyraptor-edit="1"
    for (i = 0; i < tag.attributes.length; ++i) {
      var attr = tag.attributes[i];
      if (attr.specified && attr.name.slice(0, 16) === 'data-copyraptor-') {
        params[attr.name.slice(16)] = attr.value || true;
      }
    }
    break;
  }
}

// Process query params, overriding tag
util.foreach(util.queryParams(), function(key, value) {
  if (key.indexOf("copyraptor-") == 0) {
    params[key.substring(11)] = value || true;
  }
});

if (params.site === "") {
  params.site = document.location.host;
}

if (staticPath) {
  var m = staticPath.match(new RegExp("http(s)?://([\\w:.]+).*"));
  var staticHost = m[2];
  if (staticHost.slice(0, 9) === 'localhost') {
    serverPath = 'http://localhost:3000';
    contentCdnHost = 'com.copyraptor.content-dev.s3-us-west-2.amazonaws.com';
  } else {
    serverPath = urlScheme + 'www.copyraptor.com';
    contentCdnHost = 'content.copyraptor.com';
  }

  __webpack_require__.p = staticPath + '/';
}

log("Configuration: ", params);

var env = {
  params: function() { return params; },
  staticPath: function() { return staticPath; },
  serverPath: function() { return serverPath; },
  apiPath: function() { return serverPath + "/api"; },
  contentSrc: function(version, cacheBust) {
    assert(version);
    var url = urlScheme + contentCdnHost + '/' + params.site + '/' + version;
    if (cacheBust) {
      url += "?bust=" + Math.round(new Date().getTime() / 1000);
    }
    return url;
  }
};

var injector = createInjector(document, MutationObserver);

var editorDelegate = {
  hidden: function() {
    sessionStorage.removeItem('copyraptor-edit');
  },
  published: function() {
    log("Published!");
    localStorage.setItem('copyraptor-bustuntil', new Date().getTime() + util.CONTENT_CACHE_TIME_MS);
  }
};

var editorApp;
function showEditor() {
  if (!editorApp) {
    require.ensure(['./editor'], function(require) {
      var EditorApp = require('./app');
      editorApp = new EditorApp(injector, env, editorDelegate);
      editorApp.displayToolbar();
    });
  } else {
    log("Editor already loaded");
  }
}

// Export to window
window.copyraptor = {
  setContent: injector.setContent,
  showEditor: showEditor
};

document.addEventListener("DOMContentLoaded", function() {
  log("DOMContentLoaded");
  injector.applyContentAndWatchDom(env.params()['auto']);

  if (env.params()['edit'] || sessionStorage.getItem('copyraptor-edit')) {
    showEditor();
    sessionStorage.setItem('copyraptor-edit', 1);
  }
});

// Insert a script element after this to load the content, synchronously unless too late or requested otherwise
try {
  var bustUntil = new Date(parseInt(localStorage.getItem('copyraptor-bustuntil')) || 0);
  var cachebust = env.params()['cachebust'] || bustUntil.getTime() > Date.now();
  if (cachebust) { log("Busting cache until " + bustUntil) }
} catch (e) {
  error(e);
}
if (env.params().site !== undefined) {
  if (env.params()['async'] || (/loaded|complete|interactive/.test(document.readyState))) {
    var el = document.createElement("script");
    el.setAttribute("type", "text/javascript");
    el.setAttribute("src", env.contentSrc('live', cachebust));
    document.head.appendChild(el);
    el.onload = function() {
      injector.applyContentAndWatchDom(env.params().auto);
    };
    // There is sadly no way to to detect the 404 error if this content does not yet exist, so no trigger
    // to display the editor.
    window.setTimeout(function() {
      showEditor();
    }, 2000);
  } else {
    // appendChild-style DOM manipulation does not execute the script synchronously.
    document.write('<script type="text/javascript" src="' + env.contentSrc('live', cachebust) + '"></script>');
  }
}
