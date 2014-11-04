var util = require('./common');
var Matcher = require('./matcher');

var assert = util.assert;
var foreach = util.foreach;
var log = util.log;
var warn = util.warn;

module.exports = function createInjector(document, MutationObserver) {
  'use strict';

  var copyraptorkey = 'copyraptorkey';

  var injectedContent = emptyContent();
  var nextEditKey = 1;
  var originalContent = {}; // Content before overwriting

  var matcher; // Document not yet ready.

  ///// Injected content state and application /////

  /** Stores (but does not apply) content. */
  function setContent(content) {
    log("Initialising content", content);
    injectedContent = content;
    foreach(content.changes, function(keyString) {
      var k = parseInt(keyString);
      if (k >= nextEditKey) { nextEditKey = k+1 }
    });
    log("Initial content received, next edit key: " + nextEditKey);
  }

  /** Applies content to DOM and installs observer. */
  function applyContentAndWatchDom() {
    matcher = new Matcher(document.body);
    doApplyContent();
    watchDom();
  }

  /** Returns the current injected content. */
  function getContent() {
    return injectedContent;
  }

  /** Reverts changes, then applies the argument (or previously set) content. */
  function applyContent(contentOrNull) {
    var content = contentOrNull || injectContent;
    revertContent();
    setContent(content);
    doApplyContent();
  }

  /** Reverts all changes in DOM and sets content to no changes. */
  function revertContent() {
    log("Clear");
    foreach(injectedContent.changes, function(key, spec) {
      var elt = matcher.findElement(spec.match);
      if (!elt) {
        log("Can't find elt for original content for " + key + ", match " + spec.match);
        return;
      }

      if (!originalContent[key]) {
        warn('No original content saved for key ' + key);
        return;
      }

      injectContent(elt, key, originalContent[key]);
    });
    injectedContent = emptyContent();
  }

  ///// Editor tracking and updates /////

  function trackElement(elt) {
    var key = elt[copyraptorkey] = elt[copyraptorkey] || nextEditKey++;
    if (originalContent[key] === undefined) {
      var content = extractElementContent(elt);
      log("Remembering " + key, content);
      originalContent[key] = content;
    }
  }

  function updateElement(elt) {
    var key = elt[copyraptorkey];
    if (key !== undefined) {
      var content = extractElementContent(elt);
      var m = matcher.matcherForElt(elt);
      if (contentAreEquivalent(content, originalContent[key])) {
        log("Element for " + key + " is in original state");
        delete injectedContent.changes[key];
      } else {
        log("Storing new spec for key " + key, m, content);
        injectedContent.changes[key] = {match: m, content: content};
        // Re-inject the content we've saved so as to make any inconsistency immediately visible.
        injectContent(elt, key, content);
      }
    }
  }

  function revertElement(elt) {
    var key = elt[copyraptorkey];
    if (key && originalContent[key] !== undefined) {
      log("Resetting elt for " + key);
      injectContent(elt, key, originalContent[key]);
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

  function doApplyContent() {
    foreach(injectedContent.changes, function(key, spec) {
      var elt = matcher.findElement(spec.match);
      if (elt) {
        log("Injecting content for key " + key, spec, elt);
        originalContent[key] = extractElementContent(elt);
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

    if (elt[copyraptorkey] === undefined) {
      elt[copyraptorkey] = key;
    } else if (elt[copyraptorkey] !== key) {
      warn("Element already has attached key " + elt[copyraptorkey], elt);
      elt[copyraptorkey] = key;
    }

    if (content.html) {
      elt.innerHTML = content.html;
    } else if (content.text) {
      elt.textContent = content.text;
    } else {
      console.error("Unknown content type", content);
    }
  }

  var isWatching = false;
  function watchDom() {
    if (isWatching) { return; }
    isWatching = true;

    var observer;
    function observe() {
      observer.observe(document.body, {
        attributes: true,
        childList: true,
        characterData: true,
        characterDataOldValue: true,
        subtree: true
      });
    }

    // TODO(jeeva): Fall back to more widely supported mutation events
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
        for (var i in mutation.addedNodes) {
          addedNodeSet[mutation.addedNodes[i]] = 1;
          anyAddedNodes = true;
        }
        if (!anyAddedNodes) { return }

        // Re-evaluate each injected change and see if target element is an added element.
        // Potentially more efficient ideas:
        // - Early failure of traversal based on path to candidate element
        // - Traverse injections in parallel to build set of matching elts
        foreach(injectedContent.changes, function(key, spec) {
          var elt = matcher.findElement(spec.match);
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
    revertContent: revertContent
  };
};
