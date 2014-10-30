with(require('./util')) { (function() {

var Editor = require('./editor');
var FocusRect = require('./focus-rect');

module.exports = EditorApp;
function EditorApp(injector, editable) {
  assert(injector);
  editable = !!editable;

  var me = this;

  var focusRect = new FocusRect();


  var editor = new Editor({
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
      h1('Copyraptor'),
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

})(); }
