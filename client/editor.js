
var util = require('./util');

util.loadCss(require('css!./copyraptor.css'));

module.exports = function Editor(listener) {
  var me = this;

  var currentElem = null;
  
  me.attach = function(elem) {
    me.detach();

    currentElem = elem;
    elem.contentEditable = true;
    elem.style.outline = 'none';

    for (var type in handlers) {
      elem.addEventListener(type, handlers[type]);
    }

    listener.onAttached(currentElem);
  };

  me.detach = function() {
    if (!currentElem) {
      return;
    }

    for (var type in handlers) {
      currentElem.removeEventListener(type, handlers[type]);
    }

    currentElem.contentEditable = 'inherit';
    listener.onDetached(currentElem);

    currentElem = null;
  };

  me.attached = function() {
    return currentElem !== null;
  };

  me.currentElem = function() {
    return currentElem;
  };

  function onkeydown() {
  }
  function onkeypress() {
  }
  function oninput() {
    listener.onChange();
  }

  var handlers = {
    'keydown': onkeydown,
    'keypress': onkeypress,
    'input': oninput
  };
}



