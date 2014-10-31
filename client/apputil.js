/* 
 * Utils to be loaded within app only.
 * Re-exports ./common, so no need to use both.
 */

// Re-export common
common = require('./common');
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

exports.checkBox = function(label, initial, listener) {
  var chk;

  function onchange() {
    listener(chk.checked);
  }
  return E('span', chk = E('input', {
      type:'checkbox', checked:initial, onchange:onchange }), label);
};

exports.button = function(label, listener) {
  return E('button', {onclick: listener}, label);
};

exports.E = function(tagName /*, props/children list intermingled */) {
  var elem = document.createElement(tagName);

  var args = args2array(arguments).slice(1); 
  applyItems(elem, args);


  return elem;
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
      assert(item instanceof Element);
    }

    elem.appendChild(item);
  }
};

exports.isBlock = function(elem) {
  return computedStyle(elem).display === 'block';
};

exports.computedStyle = function(elem) {
  return elem.currentStyle || window.getComputedStyle(elem, ""); 
};

exports.TRANSPARENT = rgba(0, 0, 0, 0);

exports.http = function(method, url, config) {
  var Q = copyraptor.Q;
  var defer = Q.defer();
  config = config || {};

  var xhr = new XMLHttpRequest();
  xhr.open(method, url, true);
  if (config.headers) {
    for (k in config.headers) {
      xhr.setRequestHeader(k, config.headers[k]);
    }
  }
  xhr.withCredentials = !!config.withCredentials;
  xhr.onload = function (e) {
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
}

exports.loadCss = function(module) {
  document.head.appendChild(E('style', module.toString()));
};


})(); }
