
module.import(copyraptor.util);
console.log('rgba', rgba, module.rgba);

var editor;

copyraptor.EditorApp = EditorApp;
function EditorApp(injector, editable) {
  assert(injector);
  editable = !!editable;

  var me = this;

  var focusRect = new FocusRect();


  editor = new Editor({
    onChange: function() {
      // Content size may have changed, 
      // reset the focus rect around the element.
      focusRect.wrap(editor.currentElem());
    },
    onAttached: function(elem) {
      addClass(me.elem, 'editing');
      focusRect.wrap(editor.currentElem());
      injector.beginEditingElement(elem);
    },
    onDetached: function(elem) {
      removeClass(me.elem, 'editing');
      focusRect.hide();
      injector.endEditingElement(elem);
    }
  });

  me.elem = divc('main-panel', 
      h1('Copyraptor', E('img', {src: "http://fc05.deviantart.net/fs51/i/2009/319/7/6/Raptor_Head_by_Hawt_Shot.png", width:40})),
      divc('controls', 
        checkBox('Editable', editable, function(isEditable) {
          editable = isEditable;
          if (!editable) {
            editor.detach();
            focusRect.hide();
          }
        })
      ),
      button('Save', function() {
        var me = this;
        me.textContent = "Saving...";
        injector.save(
            function () {
              me.textContent = "Save"
            }, function (err) {
              alert("Save failed: " + err);
              me.textContent = "Save"
            });
      }),
      button('Reset all', function() {injector.clear();}),
      focusRect
    );

  me.show = function() {
    if (me.elem.parentNode) {
      return;
    }

    document.body.appendChild(
        divc('copyraptor-app', me));
  };

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

    listener.onAttached(currentElem);
  };

  me.detach = function() {
    if (!currentElem) {
      return;
    }

    for (var type in handlers) {
      currentElem.removeEventListener(type, handlers[type]);
    }

    currentElem.contentEditable = false;
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
          height: px(thickness)
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



