(function() {
window.addEventListener('load', appmain);

var editor;

function appmain() {

  var main = new MainPanel();

  document.body.appendChild(E('link', {
    href: 'editor.css',
    rel: 'stylesheet',
    type: 'text/css'
  }));
  document.body.appendChild(
      divc('copyraptor-app', main));
}

function MainPanel() {
  var me = this;

  var focusRect = new FocusRect();

  var editable = true;

  editor = new Editor({
    onChange: function() {
      // Content size may have changed, 
      // reset the focus rect around the element.
      focusRect.wrap(editor.currentElem());
    },
    onAttached: function() {
      addClass(me.elem, 'editing');
      focusRect.wrap(editor.currentElem());
    },
    onDetached: function() {
      removeClass(me.elem, 'editing');
      focusRect.hide();
    }
  });

  me.elem = divc('main-panel', 
      h1('Content Raptor'),
      divc('controls', 
        checkBox('Editable', editable, function(isEditable) {
          editable = isEditable;
          if (!editable) {
            editor.detach();
            focusRect.hide();
          }
        })
      ),
      focusRect
    );

  document.body.addEventListener('mouseover', contentHandler(enterElem));
  document.body.addEventListener('mouseout',  contentHandler(leaveElem));
  document.body.addEventListener('mousedown', contentHandler(mousedownElem));

  function enterElem(ev) {
    var elem = ev.target;

    if (editor.attached()) {
      return;
    }

    if (!isSuitableForEditing(elem)) {
      return;
    }

    focusRect.wrap(elem);
  }

  function leaveElem(ev) {
    var elem = ev.target;

    //if (elem != focusRect.wrapped) {
    //  return;
    //}

    //if (editor.attached()) {
    //  return;
    //}
    //focusRect.hide();
  }

  function mousedownElem(ev) {
    var elem = ev.target;

    if (editor.attached()) {
      if (!isOrHasChild(editor.currentElem(), elem)) {
        editor.detach();
      }
    } else {
      if (isOrHasChild(focusRect.wrapped, elem)) {
        editor.attach(focusRect.wrapped);
      }
    }

  }

  function isSuitableForEditing(elem) {
    return isBlock(elem);
  }

  /**
   * Wraps an event handler to ensure it only applies to events on
   * the page content, not on our own ui.
   */
  function contentHandler(func) {
    return function(ev) {
      var elem = ev.target;

      if (isOurUi(elem) || !editable) {
        return;
      }

      return func(ev);
    }
  }

  function isOurUi(elem) {
    return (
      isOrHasChild(me.elem, elem) ||
      isOrHasChild(focusRect, elem)
      );
  }
}


function Editor(listener) {
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

    listener.onAttached();
  };

  me.detach = function() {
    if (!currentElem) {
      return;
    }

    for (var type in handlers) {
      currentElem.removeEventListener(type, handlers[type]);
    }

    currentElem.contentEditable = false;
    currentElem = null;

    listener.onDetached();
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

function FocusRect() {
  var me = this;

  var thickness = me.thickness = 24;
  var offset = me.offset = 0;

  var color = rgba(0, 0, 0, 0.5);

  me.elem = divc('focus-rect',
      absolute({
        height: 0,
        width: 0
      }),


      me.left = divc('left focus-rect-segment',
        absolute({
          top: px(-2*offset - 0.5*thickness),
          right: px(offset),
          width: px(thickness)
        })
      ),
    
      me.right = divc('right focus-rect-segment',
        absolute({
          top: px(-2*offset - 0.5*thickness),
          width: px(thickness)
        })
      ),

      me.top = divc('top focus-rect-segment',
        absolute({
          bottom: px(offset),
          left: px(-0.5*thickness - 2*offset),
          height: px(thickness)
        })
      ),

      me.bottom = divc('bottom focus-rect-segment',
        absolute({
          left: px(-0.5*thickness - 2*offset),
          height: px(thickness),
        })
      )
    );

  me.hide();
}

FocusRect.prototype.hide = function() {
  var me = this;
  me.elem.style.display = 'none';
  me.wrapped = null;
};

FocusRect.prototype.wrap = function(elem)  {
  var me = this;

  me.wrapped = elem;

  var rect = elem.getBoundingClientRect();

  me.move(rect.left, rect.top, rect.width, rect.height);
};

FocusRect.prototype.move = function(x, y, width, height) {
  var me = this;
  me.elem.style.display = '';

  me.elem.style.left = px(x - 2);
  me.elem.style.top = px(y - 2);

  me.left.style.height = px(height + 2*me.thickness +1);

  me.right.style.height = px(height + 2 * me.thickness +1);
  me.right.style.left = px(width);

  me.top.style.width = px(width + 2 * me.thickness +1);

  me.bottom.style.width = px(width + 2 * me.thickness);
  me.bottom.style.top = px(height + me.offset);

};


function detectEditableElem(leafNode) {



}

function gradient(direction, col1, col2) {
  return css({
    background: 'linear-gradient(to ' + direction + ', ' + col1 + ', ' + col2 + ')'
  });
}


function rgba(r, g, b, a) {
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
}

function css(props) {
  return {style: props};
}

function absolute(props) {
  props.position = 'absolute';

  return css(props);
}

function px(num) {
  return num + 'px';
}


function h1() {
  return E('h1', args2array(arguments));
}
function div() {
  return E('div', args2array(arguments));
}
function divc(klass /*, args */) {
  var args = args2array(arguments).slice(1); 
  return E('div', {className:klass}, args);
}

function checkBox(label, initial, listener) {
  var chk;

  function onchange() {
    listener(chk.checked);
  }
  return E('span', chk = E('input', {
      type:'checkbox', checked:initial, onchange:onchange }), label);
}


function E(tagName /*, props/children list intermingled */) {
  var elem = document.createElement(tagName);

  var args = args2array(arguments).slice(1); 
  applyItems(elem, args);


  return elem;
}

function copyElemProps(elem, props) {
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

function applyItems(elem, items) {
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

function isVanillaObj(x) {
  return typeof x === 'object' && x.constructor == Object;
}

function args2array(x) {
  return Array.prototype.slice.call(x);
}

function assert(truth, msg) {
  if (!truth) {
    throw new Error('Assertion failed' + (msg ? ': ' + msg : '!'));
  }
}

function isOrHasChild(elem, maybeChild) {
  while (maybeChild) {
    if (maybeChild === elem) {
      return true;
    }

    maybeChild = maybeChild.parentNode;
  }

  return false;
}

function addClass(elem, klass) {
  elem.className += ' ' + klass;
}
function removeClass(elem, klass) {
  elem.className = elem.className.replace(new RegExp(' *' + klass + ' *'), ' ');
}

function isBlock(elem) {
  return computedStyle(elem).display === 'block';
}

function computedStyle(elem) {
  return elem.currentStyle || window.getComputedStyle(elem, ""); 
}

var TRANSPARENT = rgba(0, 0, 0, 0);

})();
