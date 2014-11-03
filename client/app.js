var util = require('./apputil');
var CopyraptorService = require('./service.js');

// TODO(dan): Kill this with() block.
with(util) { (function() {

var Q = require('q');
Q.longStackSupport = true;

var Editor = require('./editor');
var FocusRect = require('./focus-rect');

module.exports = EditorApp;
function EditorApp(injector, env, editable) {
  assert(injector);
  assert(env);
  assert(typeof editable == 'boolean');
  editable = !!editable;

  var staticPath = env.staticPath();
  var apiBase = env.apiPath();

  var service = new CopyraptorService(apiBase,
      env.params().site, env.contentSrc);

  var me = this;

  var focusRect = new FocusRect();
  var statusText = divc('status-text');
  var saveState;

  updateStatus('saved');
  function updateStatus(state) {
    assert(state == 'unsaved' || state == 'saving' || state == 'saved');
    if (state == 'saved') {
      // don't clobber unsaved state if pending edits while saving.
      assert(saveState != 'unsaved');
    }

    saveState = state;
    statusText.innerText = '(' + saveState + ')';
  }

  var liveState = injector.getContent();

  service.load('draft').then(function(content) {
    if (content) {
      injector.setContent(content);
    }

    removeNode(loadingMsg);

    init();
  }).catch(function(err) {
    console.error(err);
  });

  function init() {
    controls.style.display = '';
    document.body.addEventListener('mouseover', contentHandler(enterElem));
    document.body.addEventListener('mouseout',  contentHandler(leaveElem));
    document.body.addEventListener('mousedown', contentHandler(mousedownElem));
  }

  var editor = new Editor({
    onChange: function() {
      // Content size may have changed, 
      // reset the focus rect around the element.
      focusRect.wrap(editor.currentElem());

      saveElem(editor.currentElem());
    },
    onAttached: function(elem) {
      addClass(me.elem, 'editing');
      focusRect.wrap(editor.currentElem());
      this.current = injector.getPayload();
      injector.trackElement(elem);
    },
    onDetached: function(elem) {
      removeClass(me.elem, 'editing');
      focusRect.hide();
      // saveElem(elem);
    }
  });

  function saveElem(elem) {
    injector.updateElement(elem);
    updateStatus('unsaved');
    autoSave();
  }

  // TODO(dan): Rate limit on save promise as well.
  var autoSave = util.rateLimited(2000, function() {
    updateStatus('saving');
    save('draft').then(function() {
      if (saveState == 'saving') {
        updateStatus('saved');
      } else {
        autoSave();
      }
    });
  });

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
        E('button', 'login ')
      )
  );

  function save(version) {
    return service.save(injector.getPayload(), version)
      .then(function() {
        noUnsavedChanges();
      })
      .catch(function(resp) {
        if (resp.status == 401) { // unauthorised
          util.addClass(login, 'visible');
          return;
        }
      });
  }

  var controls;
  var loadingMsg;


  // Quick hack toggle button for now.
  var currentVersion = 'draft';
  var draftState = null;
  var switchViewButton = button('View Live', function() {
    if (currentVersion == 'draft') {
      currentVersion = 'live';
      draftState = injector.getContent();
      injector.setContent(liveState);
      switchViewButton.innerText = 'View Draft';
      editable = false;
    } else {
      currentVersion = 'draft';
      assert(draftState);
      injector.setContent(draftState);
      switchViewButton.innerText = 'View Live';
      editable = true;
    }
  });

  me.elem = divc('main-panel', 
      h1('Copyraptor'),
      loadingMsg = divc('controls', 'Loading...'),
      controls = divc('controls',  {style:{display:'none'}}, // initially hidden
        checkBox('Editable', editable, function(isEditable) {
          editable = isEditable;
          if (!editable) {
            editor.detach();
            focusRect.hide();
          }
        }),
        promiseButton('Publish', function() {
          var content = injector.getContent();

          // Could use Q.all, but perhaps best to save in order so draft always > live.
          return save('live').then(function() {
            liveState = content;
          });
        }),
        ' | ',
        switchViewButton,
        E('a', 'Clear all Copyraptor Changes', { onclick: function() {
          if (!editable) {
            alert("Goto draft first (TODO better ux)");
            return;
          }

          editor.detach();
          injector.clear();
        }}),
        statusText,
        login
      ),
      focusRect
    );

  me.show = function() {
    if (me.elem.parentNode) {
      return;
    }

    document.body.appendChild(
        divc('copyraptor-app', me));
  };

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
