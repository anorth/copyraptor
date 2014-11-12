var util = require('./common');
var Matcher = require('./matcher');

var assert = util.assert;
var foreach = util.foreach;
var log = util.log;
var warn = util.warn;

var CRAPTOR = 'copyraptor';
var CR_KEY = 'editkey';
var CR_ORIG = 'original';


module.exports = function createInjector(document, MutationObserver) {
  'use strict';

  var injectedContent = emptyContent();
  var nextEditKey = 1;

  ///// Injected content state and application /////

  /** Stores (but does not apply) content. */
  function setContent(content) {
    injectedContent = content;
    foreach(content.changes, function(keyString) {
      var k = parseInt(keyString);
      if (k >= nextEditKey) { nextEditKey = k+1 }
    });
    log("Content received, next edit key: " + nextEditKey, content);
  }

  /** Applies content to DOM and installs observer. */
  function applyContentAndWatchDom() {
    doApplyContent();
    watchDom();
  }

  /** Returns the current injected content. */
  function getContent() {
    return injectedContent;
  }

  /** Reverts changes, then applies the argument (or previously set) content. */
  function applyContent(contentOrNull, allowMismatchedContent) {
    var content = contentOrNull || injectedContent;
    revertContent();
    setContent(content);
    doApplyContent(allowMismatchedContent);
  }

  /** Reverts all changes in DOM and sets content to no changes. Returns the new (empty) content. */
  function revertContent() {
    if (!matcher()) { return; } // Not yet applied
    log("Revert");
    util.traverseDom(document.body, function(node) {
      if (node.nodeType == 1 && node[CRAPTOR]) {
        injectContent(node, node[CRAPTOR][CR_KEY], node[CRAPTOR][CR_ORIG]);
        return true;
      }
    });

    injectedContent = emptyContent();
    return injectedContent;
  }

  ///// Editor tracking and updates /////

  function trackElement(elt) {
    if (!elt[CRAPTOR]) {
      elt[CRAPTOR] = {};
      elt[CRAPTOR][CR_KEY] = nextEditKey++;

      var content = extractElementContent(elt);
      log("Remembering " + elt[CRAPTOR][CR_KEY], content);
      elt[CRAPTOR][CR_ORIG] = content;
    }
  }

  function updateElement(elt) {
    var craptor = elt[CRAPTOR];
    assert(craptor, "Update to un-tracked elt");

    var key = craptor[CR_KEY];
    var content = extractElementContent(elt);
    var originalContent = craptor[CR_ORIG];
    var m = matcher().matcherForElt(elt, originalContent.text || originalContent.html);
    if (contentAreEquivalent(content, originalContent)) {
      log("Element for " + key + " is in original state");
      delete injectedContent.changes[key];
    } else {
      log("Storing new spec for key " + key, m, content);
      injectedContent.changes[key] = {match: m, content: content};
      // Re-inject the content we've saved so as to make any inconsistency immediately visible.
      injectContent(elt, key, content);
    }
  }

  function revertElement(elt) {
    var craptor = elt[CRAPTOR];
    if (craptor) {
      var key = craptor[CR_KEY];
      log("Resetting elt for " + key);
      injectContent(elt, key, craptor[CR_ORIG]);
      delete injectedContent.changes[key];
    }
  }

  ///// Private functions /////

  function emptyContent() {
    return {
      api: 1,
      changes: {} // indexed by key
    }
  }

  function doApplyContent(allowMismatchedContent) {
    foreach(injectedContent.changes, function(key, spec) {
      var elt = matcher().findElement(spec.match, allowMismatchedContent);
      if (elt) {
        log("Injecting new content for key " + key, spec /*, elt*/);
        injectContent(elt, key, spec.content);
      } else {
        log("No elt (yet) for key " + key, spec);
      }
    });
  }

  function extractElementContent(elt) {
    // TODO(alex): More sophisticated content
    // TODO(alex): Strip meaningless whitespace from extracted content.
    if (elt.children.length == 0) {
      return { text: elt.textContent };
    } else {
      return { html: elt.innerHTML };
    }
  }

  function contentAreEquivalent(a, b) {
    return a !== undefined && b !== undefined && a.text === b.text && a.html === b.html;
  }

  function injectContent(elt, key, content) {
    assert(elt, 'no elt');
    assert(key, 'no key');
    assert(content, 'no content');

    // BUG: write a test first. If this is in response to a dynamic change, forgetting to remember original content.

    if (elt.contentEditable == 'true') {
      log("Not clobbering content being edited");
      return;
    }

    if (!elt[CRAPTOR]) {
      elt[CRAPTOR] = {};
      elt[CRAPTOR][CR_KEY] = key;
      elt[CRAPTOR][CR_ORIG] = extractElementContent(elt);
    } else if (elt[CRAPTOR][CR_KEY] !== key) {
      warn("Element already has attached key " + elt[CRAPTOR][CR_KEY], elt);
      elt[CRAPTOR][CR_KEY] = key;
    }

    if (content.html != undefined) {
      elt.innerHTML = content.html;
    } else if (content.text !== undefined) {
      elt.textContent = content.text;
    } else {
      console.error("Unknown content type", content);
    }
  }

  var _matcher; // Document not yet ready.
  function matcher() {
    if (!_matcher && document.body) { _matcher = new Matcher(document.body); }
    return _matcher;
  }

  var _isWatching = false;
  function watchDom() {
    if (_isWatching) { return; }
    _isWatching = true;

    var observer;
    function observe() {
      observer.observe(document.body, {
        childList: true,
        characterData: true,
        //characterDataOldValue: true,
        subtree: true
        //attributes: true,
      });
    }

    // TODO(jeeva): Fall back to more widely supported mutation events or timeout
    observer = new MutationObserver(function(mutations) {
      //log("Mutations", mutations);
      observer.disconnect();
      mutations.forEach(function(mutation) {
        //var entry = {
        //  mutation: mutation,
        //  el: mutation.target,
        //  value: mutation.target.textContent,
        //  oldValue: mutation.oldValue
        //};
        var addedNodeSet = {};
        var anyAddedNodes = false;
        for (var i = 0; i < mutation.addedNodes.length; ++i) {
          var addedNode = mutation.addedNodes[i];
          if (addedNode.className && addedNode.className.indexOf("copyraptor-app") != -1) {
            continue;
          }
          addedNodeSet[addedNode] = 1;
          anyAddedNodes = true;
        }
        if (!anyAddedNodes) { return }

        // Re-evaluate each injected change and see if target element is an added element.
        // Potentially more efficient ideas:
        // - Early failure of traversal based on path to candidate element
        // - Traverse injections in parallel to build set of matching elts
        foreach(injectedContent.changes, function(key, spec) {
          // NOTE(alex): This generates "mismatched content" messages when responding to mutations that are
          // CR injecting content.
          var elt = matcher().findElement(spec.match);
          if (!!addedNodeSet[elt]) {
            injectContent(elt, key, spec.content);
          }
        });
      });
      observe();
    });

    observe();
  }

  // TODO(dan): Tighten this interface up, it's a bit complicated/ad-hoc
  // and use function ctor class style.
  return {
    // Bootstrap & content access
    setContent: setContent,
    applyContentAndWatchDom: applyContentAndWatchDom,
    getContent: getContent,
    applyContent: applyContent,

    // Editing
    trackElement: trackElement,
    updateElement: updateElement,
    revertElement: revertElement,
    revertContent: revertContent,

    // Visible for testing
    matcher: matcher
  };
};
