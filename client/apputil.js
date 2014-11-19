/* 
 * Utils to be loaded within app only.
 * Re-exports ./common, so no need to use both.
 */

var Q = require('q');

// Re-export common
var common = require('./common');
for (var k in common) {
  exports[k] = common[k];
}
with(exports) { (function() {


exports.gradient = function(direction, col1, col2) {
  return css({
    background: 'linear-gradient(to ' + direction + ', ' + col1 + ', ' + col2 + ')'
  });
};


exports.rgba = function(r, g, b, a) {
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
};

exports.css = function(props) {
  return {style: props};
};

exports.absolute = function(props) {
  props.position = 'absolute';

  return css(props);
};

exports.px = function(num) {
  return num + 'px';
};


exports.h1 = function() {
  return E('h1', args2array(arguments));
};
exports.div = function() {
  return E('div', args2array(arguments));
};
exports.divc = function(klass /*, args */) {
  var args = args2array(arguments).slice(1); 
  return E('div', {className:klass}, args);
};

exports.a = function() {
  return E('a', args2array(arguments));
};

exports.label = function(className) {
  return E('label', {className: className}, args2array(arguments));
};

  exports.checkBox = function(label, initial, listener) {
  var chk;

  function onchange() {
    listener(chk.checked);
  }
  return E('span', chk = E('input', {
      type:'checkbox', checked:initial, onchange:onchange }), label);
};

exports.button = function(label, props, listener) {
  props.onclick = listener;
  return E('button', props, label);
};
exports.promiseButton = function(label, props, listener) {
  var elem = button(label, props, function() {
    addClass(elem, 'loading');
    listener().then(function() {
      removeClass(elem, 'loading');
    })
    .catch(function(err) {
      console.error(new Error('stack of catch'));
      console.error(err);
      // TODO: Better UX for this.
      elem.innerText = '(Error!)';
      throw err;
    });
  });

  return elem;
};

exports.E = function(tagName /*, props/children list intermingled */) {
  var elem = document.createElement(tagName);

  var args = args2array(arguments).slice(1); 
  applyItems(elem, args);


  return elem;
};

exports.removeNode = function(node) {
  if (!node || !node.parentNode) {
    return;
  }

  node.parentNode.removeChild(node);
};


exports.copyElemProps = function(elem, props) {
  for (var k in props) {
    if (k === 'style') {
      var style = props[k];
      for (var s in style) {
        elem.style[s] = style[s];
      }
    } else {
      elem[k] = props[k];
    }
  }
};

exports.applyItems = function(elem, items) {
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (!item) {
      continue;
    }

    if (isVanillaObj(item)) {
      copyElemProps(elem, item);
      continue;
    }

    if (item instanceof Array) {
      applyItems(elem, item);
      continue;
    }

    if (typeof item === 'number' || typeof item === 'string' || item instanceof String) {
      item = document.createTextNode(item);
    }

    if (item.elem) {
      item = item.elem;
      assert(item.nodeType === 1);
    }

    elem.appendChild(item);
  }
};

exports.displayType = function(elem) {
  return computedStyle(elem).display;
};

exports.computedStyle = function(elem) {
  return elem.currentStyle || window.getComputedStyle(elem, ""); 
};

exports.TRANSPARENT = rgba(0, 0, 0, 0);

exports.http = function http(method, url, config) {
  var defer = Q.defer();
  config = config || {};

  var xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  if (config.headers) {
    foreach(config.headers, function(k, v) {
      xhr.setRequestHeader(k, v);
    });
  }
  xhr.withCredentials = !!config.withCredentials;
  xhr.onload = function () {
    if (this.status == 200) {
      defer.resolve(this);
    } else {
      defer.reject(this);
    }
  };

  return {
    send: function(payload) {
      xhr.send(payload);
      return defer.promise;
    }
  };
};

exports.loadCss = function(module) {
  document.head.appendChild(E('style', module.toString()));
};

exports.descendantMatches = function(elem, predicate) {

  for (var node = elem.firstChild; node != null; node = node.nextSibling) {
    var matches = predicate(node);
    if (matches) {
      return true;
    }

    if (node.nodeType == 1) {
      matches = descendantMatches(node, predicate);
      if (matches) {
        return true;
      }
    }
  }

  return false;
};

exports.rateLimited = function(intervalMillis, func) {
  if (!intervalMillis || intervalMillis < 0) {
    intervalMillis = 0;
  }

  var scheduled = false;
  var lastScheduled = 0;

  function run() {
    scheduled = false;
    func();
  }

  function schedule() {
    if (scheduled) {
      return;
    }

    scheduled = true;

    var now = Date.now();
    var earliest = lastScheduled + intervalMillis;
    var delay = earliest > now ? earliest - now : 0;

    lastScheduled = now + delay;

    setTimeout(run, delay);
  }

  return schedule;
};

})(); }
