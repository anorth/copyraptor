/* Shared utils between injector and app */

exports.CONTENT_CACHE_TIME_MS = 60 * 60 * 1000;

with(exports) {
var assert = exports.assert = function(truth, msg) {
  if (!truth) {
    var info = Array.prototype.slice.call(arguments, 1);
    throw new Error('Assertion failed' + (info.length > 0 ? ': ' + info.join(' ') : '!'));
  }
  return truth;
};

exports.isVanillaObj = function(x) {
  return typeof x === 'object' && x.constructor == Object;
};

exports.args2array = function(x) {
  return Array.prototype.slice.call(x);
};

exports.isOrHasChild = function(elem, maybeChild) {
  while (maybeChild) {
    if (maybeChild === elem) {
      return true;
    }

    maybeChild = maybeChild.parentNode;
  }

  return false;
};

exports.addClass = function(elem, klass) {
  elem.className += ' ' + klass;
};
exports.removeClass = function(elem, klass) {
  elem.className = elem.className.replace(new RegExp(' *' + klass + ' *', 'g'), ' ');
};

exports.loadCss = function(module) {
  document.head.appendChild(E('style', module.toString()));
};

}
exports.queryParam = function(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(location.search);
  return results === null ? undefined : decodeURIComponent(results[1].replace(/\+/g, " "));
};

exports.queryParams = function() {
  var query = location.search.substr(1);
  if (!query && location.href.indexOf("#") != -1) {
    var pos = location.href.indexOf("?");
    if(pos != -1) {
      query = location.href.substr(pos+1);
    }
  }
  var result = {};
  query.split("&").forEach(function(part) {
    if(!part) return;
    var item = part.split("=");
    var key = item[0];
    result[key] = item.length == 2 ? decodeURIComponent(item[1]) : true;
   });
  return result;
};

exports.foreach = function(obj, fn) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      fn(key, obj[key]);
    }
  }
};

exports.cloneJson = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

/** Traverses DOM depth-first. Doesn't descend if fn returns truthy. */
exports.traverseDom = function traverseDom(node, fn) {
  var stop = fn(node);
  if (!stop) {
    node = node.firstChild;
    while (node) {
      traverseDom(node, fn);
      node = node.nextSibling;
    }
  }
};

exports.log = function() {
  console.log.apply(console, logargs(arguments));
};
exports.warn = function() {
  console.warn.apply(console, logargs(arguments));
};
exports.error = function() {
  console.error.apply(console, logargs(arguments));
};

function logargs(args) {
  var newArgs = Array.prototype.slice.call(args, 0);
  if (newArgs.length) {
    newArgs[0] = "[Copyraptor] " + newArgs[0];
  }
  return newArgs;
}

