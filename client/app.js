var util = require('./apputil');
var log=util.log, warn=util.warn, error=util.error, assert=util.assert;
var CopyraptorService = require('./service.js');

// TODO(alex): More from http://www.quackit.com/html/tags/ or http://www.w3.org/TR/html51/
//var NON_EDITABLE_TAGS = ['IMG'];
//var EDITABLE_DISPLAY_VALUES = ['block', 'inline-block', 'list-item', 'table-cell', 'table-caption'];

var SAVESTATE = {
  UNSAVED: 'UNSAVED',
  SAVING: 'SAVING',
  SAVED: 'SAVED'
};

var VIEWSTATE = {
  BASE: 'BASE',
  PUBLISHED: 'PUBLISHED',
  DRAFT: 'DRAFT'
};

var Q = require('q');
Q.longStackSupport = true;

var Editor = require('./editor');
var FocusRect = require('./focus-rect');

module.exports = EditorApp;
function EditorApp(injector, env, delegate) {
  assert(injector);
  assert(env);

  var apiBase = env.apiPath();

  var service = new CopyraptorService(apiBase, env.params().site, env.contentSrc);
  var me = this;
  var editable = false;

  var focusRect = new FocusRect();
  var viewState, saveState;

  var statusMessage = util.divc('message', '');
  var spinner = util.divc('spinner');

  var draftState = null;
  var publishedState = null;
  // Re-load content just in case the CDN had an out of date version, then fetch draft state and initialise editor.
  service.load('live').then(function(liveContent) {
    publishedState = liveContent || injector.getContent();
    if (liveContent != null) { setViewState(VIEWSTATE.PUBLISHED); }
  }).then(function() {
    return service.load('draft');
  }).then(function(draftContent) {
    draftState = draftContent || util.cloneJson(publishedState);
    if (!viewState) { setViewState(VIEWSTATE.DRAFT); } // Straight to draft mode for first-time use
    util.removeNode(loadingMsg);
    init();
  }).catch(error);

  function setViewState(state) {
    assert(VIEWSTATE[state]);
    viewState = state;
    editor.detach();

    if (state == VIEWSTATE.PUBLISHED) {
      injector.applyContent(publishedState, env.params()['auto'], true);
      publishedButton.className = 'active';
      draftButton.className = '';
      hide(editorTools);
      show(editNowButton);
      editable = false;
      statusMessage.innerText = '';
    } else {
      assert(draftState, "No draft state");
      injector.applyContent(draftState, env.params()['auto'], true);
      draftButton.className = 'active';
      publishedButton.className = '';
      show(editorTools);
      hide(editNowButton);
      editable = true;
      if (!env.params()['auto']) {
        statusMessage.innerText = 'Auto-mode disabled, only marked-up elements are editable.';
      }
    }
  }

  setSaveState(SAVESTATE.SAVED);
  function setSaveState(newState) {
    assert(SAVESTATE[newState]);
    if (newState == SAVESTATE.SAVED) {
      // don't clobber unsaved state if pending edits while saving.
      assert(saveState != SAVESTATE.UNSAVED);
    }

    if (saveState != null) {
      if (newState === SAVESTATE.SAVED) {
        statusMessage.innerText = 'Draft saved';
        hide(spinner);
      } else {
        statusMessage.innerText = 'Saving...';
        show('inline-block', spinner);
      }
    }

    saveState = newState;
  }

  var editableCheckbox = util.checkBox('Enable editing', editable, function(isEditable) {
    editable = isEditable;
    if (!editable) {
      editor.detach();
      focusRect.hide();
    }
  });

  var revertToPublishedButton = util.a({className: 'revert'}, 'Revert to published', {
    onclick: function () {
      assert(editable, "Can't revert from published view");
      editor.detach();
      draftState = util.cloneJson(publishedState);
      injector.applyContent(draftState, env.params()['auto']);
      autoSave();
    }
  });

  var revertToBaseButton = util.a({className: 'revert'}, 'Revert all changes', {
    onclick: function () {
      assert(editable, "Can't revert from published view");
      editor.detach();
      draftState = injector.revertContent();
      autoSave();
    }
  });

  var publishButton = util.promiseButton('Publish this copy', {className: "publish"}, function () {
    editor.detach();
    var content = injector.getContent();
    statusMessage.innerText = "Publishing...";
    statusMessage.classList.remove('flash');
    show('inline-block', spinner);
    // Could use Q.all, but perhaps best to save in order so draft always > live.
    return save('live').then(function () {
      publishedState = util.cloneJson(content);
      delegate.published();
      statusMessage.innerText = "Rawr! Your changes are now published.";
      statusMessage.classList.add('flash');
      hide(spinner);
    });
  });

  var editorTools = util.divc('editing',
      publishButton,
      util.divc('revert',
          revertToPublishedButton,
          revertToBaseButton
      )
      //editableCheckbox
  );

  var loadingMsg = util.divc('loading', 'Loading raptor teeth...');

  var editNowButton = util.a({className: 'editnow'}, 'Make changes', {
    onclick: function () {
      setViewState(VIEWSTATE.DRAFT);
    }
  });

  var publishedButton = util.button('Published copy', {className: 'published'}, function() {
    setViewState(VIEWSTATE.PUBLISHED);
  });

  var draftButton = util.button('Draft copy', {className: 'draft'}, function() {
    setViewState(VIEWSTATE.DRAFT);
  });

  var closeButton = util.button('×', {className: 'close'}, function() {
    me.hideToolbar();
  });

  function init() {
    hide(spinner);
    show(controls);
    document.body.addEventListener('mouseover', contentHandler(enterElem));
    document.body.addEventListener('mouseout',  contentHandler(leaveElem));
    document.body.addEventListener('mousedown', contentHandler(mousedownElem), true);
    document.body.addEventListener('click', contentHandler(clickElem), true);
  }

  var editor = new Editor({
    onChange: function() {
      // Content size may have changed, 
      // reset the focus rect around the element.
      focusRect.wrap(editor.currentElem());

      saveElem(editor.currentElem());
    },
    onAttached: function(elem) {
      util.addClass(me.elem, 'editing');
      focusRect.wrap(editor.currentElem());
      injector.trackElement(elem);
    },
    onDetached: function() {
      util.removeClass(me.elem, 'editing');
      focusRect.hide();
      // saveElem(elem);
    }
  });

  function saveElem(elem) {
    injector.updateElement(elem);
    setSaveState(SAVESTATE.UNSAVED);
    autoSave();
  }

  // TODO(dan): Rate limit on save promise as well.
  // TODO(alex): Confirm won't race with switching view and overwrite draft with published
  var autoSave = util.rateLimited(2000, function() {
    setSaveState(SAVESTATE.SAVING);
    save('draft').then(function() {
      if (saveState == SAVESTATE.SAVING) {
        setSaveState(SAVESTATE.SAVED);
      } else {
        autoSave();
      }
    }).catch(function () {
      setSaveState(SAVESTATE.UNSAVED);
    });
  });

  var loginDiv = util.divc('login-form',
      util.E('p', 'Please sign in to save changes'),
      util.E('form', {onsubmit: function() {
        try {
          var me = this;
          util.addClass(loginDiv, 'loading');
          service.doAuth(me.elements.user.value, me.elements.password.value)
            .then(function() {
                log("Sign in successful");
                util.removeClass(loginDiv, 'visible');
                autoSave();
            })
            .catch(function(e) {
                log("Sign in failed", e);
                util.addClass(loginDiv, 'error');
            })
            .finally(function() {
                util.removeClass(loginDiv, 'loading');
            });
        } catch(err) {
          log(err);
        }
        return false;
      }},
        util.E('input', {type:'text', name: 'user', 'placeholder': 'username', value: env.params().site}),
        util.E('input', {type:'password', name: 'password', 'placeholder': 'password'}),
        util.E('button', 'Sign in '),
        util.E('p', {'className': 'error'}, "Couldn't sign in with those values, please try again.")
      )
  );

  function save(version) {
    return service.save(injector.getContent(), version)
      .catch(function(resp) {
        if (resp.status == 401) { // unauthorised
          util.addClass(loginDiv, 'visible');
        }
        throw resp;
      });
  }

  var controls;

  me.elem = util.divc('main-panel',
      util.h1('Copyraptor'),
      loadingMsg,
      controls = util.divc('controls', {style: {display: 'none'}}, // initially hidden
          util.divc('viewstate',
              util.label('', 'Showing:'),
              publishedButton,
              draftButton
          ),
          editorTools,

          editNowButton,
          closeButton
      ),
      util.divc('status',
          statusMessage,
          spinner
      ),
      loginDiv,
      focusRect
  );

  me.displayToolbar = function() {
    if (me.elem.parentNode) {
      me.elem.style.display = 'block';
      return;
    }

    document.body.appendChild(
        util.divc('copyraptor-app', me));
  };

  me.hideToolbar = function() {
    me.elem.style.display = 'none';
    delegate.hidden();
  };

  function hide(/*elms...*/) {
    for (var i = 0; i < arguments.length; ++i) {
      arguments[i].style.display = "none";
    }
  }

  function show(displayType /*,elms...*/) {
    var i = 0, display = "";
    if (typeof displayType === 'string') {
      display = displayType;
      i = 1;
    }
    for (; i < arguments.length; ++i) {
      arguments[i].style.display = display;
    }
  }

  function enterElem(ev) {
    var elem = ev.target;

    if (editor.attached()) {
      return;
    }

    tryFocusElem(elem, env.params()['auto']);
  }

  function tryFocusElem(target, usePath) {
    var ancestors = [];
    var elem = target;

    // Construct ancestor list while looking for for class="cr-tag"
    while (elem != null) {
      if (injector.hasMatchTag(elem)) {
        focusRect.wrap(elem);
        return
      }
      ancestors.push(elem);
      elem = elem.parentNode;
    }

    if (usePath) {
      // Top down
      ancestors.reverse();
      for (var i = 0; i < ancestors.length; ++i) {
        if (hasNonWhiteTextNodes(ancestors[i])) {
          focusRect.wrap(ancestors[i]);
          return;
        }
      }

      // Bottom up (old way)
      //while (elem != null) {
      //  if (isSuitableForEditing(elem)) {
      //    focusRect.wrap(elem);
      //    return;
      //  }
      //
      //  elem = elem.parentNode;
      //}
    }
  }

  function leaveElem() {
    //var elem = ev.target;
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
    var editing = false;

    if (editor.attached()) {
      if (!util.isOrHasChild(editor.currentElem(), elem)) {
        editor.detach();
        editing = tryEdit(elem);
      }
    } else {
      editing = tryEdit(elem);
    }
    if (editing) { ev.stopPropagation(); }
  }

  function clickElem(ev) {
    var elem = ev.target;
    if (editor.attached() && util.isOrHasChild(editor.currentElem(), elem)) {
      ev.stopPropagation();
      ev.preventDefault();
    }
  }

  function tryEdit(elem) {
    tryFocusElem(elem, env.params()['auto']);
    if (util.isOrHasChild(focusRect.wrapped, elem)) {
      editor.attach(focusRect.wrapped);
      return true;
    }
  }

  //function isSuitableForEditing(elem) {
  //  var isCandidate = isIntrinsicallySuitable(elem);
  //  var containsCandidate = util.descendantMatches(elem, isIntrinsicallySuitable);
  //
  //  return isCandidate && !containsCandidate;
  //}
  //
  //function isIntrinsicallySuitable(node) {
  //  if (node.nodeType !== 1) { // ELEMENT_NODE
  //    return;
  //  }
  //
  //  var displayIsSuitable = EDITABLE_DISPLAY_VALUES.indexOf(util.displayType(node)) != -1;
  //  var tagNameIsSuitable = NON_EDITABLE_TAGS.indexOf(node.tagName) == -1;
  //
  //  return displayIsSuitable && tagNameIsSuitable;
  //}

  function hasNonWhiteTextNodes(elem) {
    var child = elem.firstChild;
    var nonWhitespace = /[^\s]+/;
    while (child != null) {
      if (child.nodeType == 3 && nonWhitespace.test(child.nodeValue)) {
        return true;
      }
      child = child.nextSibling;
    }
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
    util.isOrHasChild(me.elem, elem) ||
    util.isOrHasChild(focusRect, elem)
    );
  }
}
