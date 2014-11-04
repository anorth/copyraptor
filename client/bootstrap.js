var util = require('./common');
var assert = util.assert;
var log = util.log;
var warn = util.warn;
var createInjector = require('./injector');

var urlScheme = (document.location.protocol === 'https:') ? 'https://' : 'http://';
var params = {site: undefined}, staticPath, serverPath, contentBlobHost, contentCdnHost, i;

// Find the script element that loaded this script to extract the site id
var tags = document.head.querySelectorAll("script");
for (i = 0; i < tags.length; ++i) {
  var tag = tags[i];

  if (tag.getAttribute("data-copyraptor-site") !== null) {
    staticPath = tag.src.split(/[\w_-]+.js/)[0].replace(/\/$/, '');
    console.log(staticPath);
    for (i = 0; i < tag.attributes.length; ++i) {
      var attr = tag.attributes[i];
      if (attr.specified && attr.name.slice(0, 16) === 'data-copyraptor-') {
        params[attr.name.slice(16)] = attr.value || true;
      }
    }
    break;
  }
}

if (params.site === "") {
  params.site = document.location.host;
}
if (!!util.queryParam("copyraptor")) {
  params.edit = true;
}

if (staticPath) {
  var m = staticPath.match(new RegExp("http(s)?://([\\w:.]+).*"));
  var staticHost = m[2];
  if (staticHost.slice(0, 9) === 'localhost') {
    serverPath = 'http://localhost:3000';
    contentBlobHost = contentCdnHost = 'com.copyraptor.content-dev.s3-us-west-2.amazonaws.com';
  } else {
    serverPath = urlScheme + 'www.copyraptor.com';
    contentBlobHost = 'com.copyraptor.content.s3-us-west-2.amazonaws.com';
    contentCdnHost = 'content.copyraptor.com';
  }

  __webpack_require__.p = staticPath + '/';
}

log("Params: ", params);

// TODO(dan>someone): Tighten this up
var env = {
  params: function() { return params; },
  staticPath: function() { return staticPath; },
  serverPath: function() { return serverPath; },
  apiPath: function() { return serverPath + "/api"; },
  contentBlobHost: function() { return contentBlobHost; },
  contentCdnHost: function() { return contentCdnHost; },
  contentSrc: function(version) {
    assert(version);
    return urlScheme + (params.edit ? contentBlobHost : contentCdnHost) +
        '/' + params.site + '/' + version;
  }
};

var editorApp;
function showEditor() {
  if (!editorApp) {
    require.ensure(['./editor'], function(require) {
      var EditorApp = require('./app');
      editorApp = new EditorApp(injector, env, true);
      editorApp.show();
    });
  } else {
    log("Editor already loaded");
  }
}

var injector = createInjector(document, MutationObserver);

// Export to window
window.copyraptor = {
  setContent: injector.setContent,
  showEditor: showEditor
};

document.addEventListener("DOMContentLoaded", function() {
  log("DOMContentLoaded");
  injector.applyContentAndWatchDom();

  if (env.params().edit) {
    showEditor();
  }
});

// Insert a script element after this to load the content synchronously
if (env.params().site !== undefined) {
  if (env.params().async || (/loaded|complete|interactive/.test(document.readyState))) {
    var el = document.createElement("script");
    el.setAttribute("type", "text/javascript");
    el.setAttribute("src", env.contentSrc('live'));
    document.head.appendChild(el);
    el.onload = function() {
      injector.applyContentAndWatchDom();
    };
    // There is sadly no way to to detect the 404 error if this content does not yet exist, so no trigger
    // to display the editor.
    window.setTimeout(function() {
      showEditor();
    }, 2000);
  } else {
    // appendChild-style DOM manipulation does not execute the script synchronously.
    document.write('<script type="text/javascript" src="' + env.contentSrc('live') + '"></script>');
  }
}
