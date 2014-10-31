/* Shared utils between injector and app */
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
  elem.className = elem.className.replace(new RegExp(' *' + klass + ' *'), ' ');
};

exports.loadCss = function(module) {
  document.head.appendChild(E('style', module.toString()));
};

}
