var util = require('./apputil');
var CopyraptorService = require('./service.js');

// TODO(dan): Kill this with() block.
with(util) { (function() {

var Q = require('q');

var Editor = require('./editor');
var FocusRect = require('./focus-rect');

module.exports = EditorApp;
function EditorApp(injector, editable) {
  assert(injector);
  editable = !!editable;

  var env = injector.env;
  var staticPath = env.staticPath();
  var apiBase = env.apiPath();

  var service = new CopyraptorService(apiBase);

  var me = this;

  var focusRect = new FocusRect();
  var unsavedChanges = E('span', {className: 'pending-changes'}, '(unsaved changes)');
  function hasUnsavedChanges() { addClass(unsavedChanges, 'visible'); }
  function noUnsavedChanges() { removeClass(unsavedChanges, 'visible'); }

  var editor = new Editor({
    onChange: function() {
      // Content size may have changed, 
      // reset the focus rect around the element.
      focusRect.wrap(editor.currentElem());
    },
    onAttached: function(elem) {
      addClass(me.elem, 'editing');
      focusRect.wrap(editor.currentElem());
      this.current = injector.getPayload();
      injector.beginEditingElement(elem);
    },
    onDetached: function(elem) {
      removeClass(me.elem, 'editing');
      focusRect.hide();
      injector.endEditingElement(elem);
      if (this.current != injector.getPayload())
        hasUnsavedChanges();
    }
  });

  function loadingGif() {
    return E('img', {className: 'loading-gif', src: staticPath + '/assets/ajax-loader.gif'});
}

  var login = divc('login-form',
      E('p', 'Session expired, please login to save'),
      E('form', {onsubmit: function() {
        try {
          var me = this;
          addClass(login, 'loading');
          service.doAuth(me.elements.user.value, me.elements.pass.value)
            .then(function() {
              removeClass(login, 'visible');
            })
            .catch(function() {
              addClass(login, 'error');
            })
            .finally(function() {
              removeClass(login, 'loading');
            });
        } catch(err) {
          console.log(err);
        }
        return false;
      }},
        E('p', {'className': 'error'}, 'Invalid username or password'),
        E('input', {type:'text', name: 'user', 'placeholder': 'username'}),
        E('input', {type:'password', name: 'pass', 'placeholder': 'password'}),
        E('button', 'login ', loadingGif())
      )
  );

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
      button(['Save ', 
              loadingGif()
             ], function() {
        var me = this;
        addClass(me, 'loading');

        service.save(injector.getPayload(), injector.env.siteKey())
          .then(function() {
            noUnsavedChanges();
          })
          .catch(function(resp) {
            console.log(resp);
            if (resp.status == 401) { // unauthorised
              util.addClass(login, 'visible');
              return;
            }
            console.log(resp);
          }).finally(function() {
            removeClass(me, 'loading');
          });
      }),
      button('Reset all', function() {injector.clear();}),
      unsavedChanges,
      login,
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

    tryFocusElem(elem);
  }

  function tryFocusElem(elem) {
    while (elem != null) {
      if (isSuitableForEditing(elem)) {
        focusRect.wrap(elem);
        return;
      }

      elem = elem.parentNode;
    }
  }

  function leaveElem(ev) {
    var elem = ev.target;

    //if (elem != focusRect.wrapped) {
    //  return;
    //}

    if (editor.attached()) {
      return;
    }
    focusRect.hide();
  }

  function mousedownElem(ev) {
    var elem = ev.target;

    if (editor.attached()) {
      if (!isOrHasChild(editor.currentElem(), elem)) {
        editor.detach();
        tryEdit(elem);
      }
    } else {
      tryEdit(elem);
    }
  }

  function tryEdit(elem) {
    tryFocusElem(elem);
    if (isOrHasChild(focusRect.wrapped, elem)) {
      console.debug("EDIT ELEM", focusRect.wrapped);
      editor.attach(focusRect.wrapped);
    }
  }

  function isSuitableForEditing(elem) {
    var isCandidate = isIntrinsicallySuitable(elem);
    var containsCandidate = util.descendantMatches(elem, isIntrinsicallySuitable);

    return isCandidate && !containsCandidate;
  }

  function isIntrinsicallySuitable(node) {
    if (node.nodeType !== 1) {
      return;
    }

    var display = util.displayType(node);

    return display == 'block' || display == 'inline-block';
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
