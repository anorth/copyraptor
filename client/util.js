
module.gradient = function(direction, col1, col2) {
  return css({
    background: 'linear-gradient(to ' + direction + ', ' + col1 + ', ' + col2 + ')'
  });
}


module.rgba = function(r, g, b, a) {
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
}

module.css = function(props) {
  return {style: props};
}

module.absolute = function(props) {
  props.position = 'absolute';

  return css(props);
}

module.px = function(num) {
  return num + 'px';
}


module.h1 = function() {
  return E('h1', args2array(arguments));
}
module.div = function() {
  return E('div', args2array(arguments));
}
module.divc = function(klass /*, args */) {
  var args = args2array(arguments).slice(1); 
  return E('div', {className:klass}, args);
}

module.checkBox = function(label, initial, listener) {
  var chk;

  function onchange() {
    listener(chk.checked);
  }
  return E('span', chk = E('input', {
      type:'checkbox', checked:initial, onchange:onchange }), label);
}

module.button = function(label, listener) {
  return E('button', {onclick: listener}, label);
}

module.E = function(tagName /*, props/children list intermingled */) {
  var elem = document.createElement(tagName);

  var args = args2array(arguments).slice(1); 
  applyItems(elem, args);


  return elem;
}


module.copyElemProps = function(elem, props) {
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
}

module.applyItems = function(elem, items) {
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
}

module.isVanillaObj = function(x) {
  return typeof x === 'object' && x.constructor == Object;
}

module.args2array = function(x) {
  return Array.prototype.slice.call(x);
}

module.assert = function(truth, msg) {
  if (!truth) {
    throw new Error('Assertion failed' + (msg ? ': ' + msg : '!'));
  }
}

module.isOrHasChild = function(elem, maybeChild) {
  while (maybeChild) {
    if (maybeChild === elem) {
      return true;
    }

    maybeChild = maybeChild.parentNode;
  }

  return false;
}

module.addClass = function(elem, klass) {
  elem.className += ' ' + klass;
}
module.removeClass = function(elem, klass) {
  elem.className = elem.className.replace(new RegExp(' *' + klass + ' *'), ' ');
}

module.isBlock = function(elem) {
  return computedStyle(elem).display === 'block';
}

module.computedStyle = function(elem) {
  return elem.currentStyle || window.getComputedStyle(elem, ""); 
}

module.TRANSPARENT = rgba(0, 0, 0, 0);

copyraptor.util = module;

