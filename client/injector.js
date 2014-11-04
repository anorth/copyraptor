module.exports = function createInjector(document, MutationObserver) {
  'use strict';
  var util = require('./common');
  var copyraptorkey = 'copyraptorkey';
  var assert = util.assert;
  var foreach = util.foreach;
  var log = util.log;
  var warn = util.warn;

  var injectedContent = emptyContent();
  var nextEditKey = 1;
  var originalContent = {}; // Content before overwriting

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
      var elt = findElement(spec.match);
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
      var match = matcherForElt(elt);
      if (contentAreEquivalent(content, originalContent[key])) {
        log("Element for " + key + " is in original state");
        delete injectedContent.changes[key];
      } else {
        log("Storing new spec for key " + key, match, content);
        injectedContent.changes[key] = {match: match, content: content};
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
      var elt = findElement(spec.match);
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

  function matcherForElt(eltToMatch) {
    var path = []; // Bottom up order
    var ancestor = eltToMatch;
    while (ancestor !== document.body && ancestor !== undefined) {
      var siblingIndex = 0, sib = ancestor;
      while ((sib = sib.previousSibling) !== null) {
        if (sib.children /* Elements only */ !== undefined) { siblingIndex++; }
      }

      path.push({
        "name": ancestor.nodeName,
        "index": siblingIndex,
        "id": ancestor.id || undefined,
        "class": normalizeClass(ancestor.className)
      });
      // TODO(alex): include signature of existing content

      ancestor = ancestor.parentElement;
    }
    return path;
  }

  function findElement(match) {
    var found = traverseMatchFromTop(match, document.body);
    // TODO(alex): Fall back to heuristics based on match path properties if not found.
    return found;
  }

  // Traces a match from a top node, seeking matching leaf.
  // Returns an element, or null.
  function traverseMatchFromTop(match, top) {
    var pathFromTop = match.slice();
    pathFromTop.reverse();
    var el = top, matchPart;
    for (var level in pathFromTop) {
      matchPart = pathFromTop[level];
      if (el.children.length <= matchPart.index) { log("Index OOB", matchPart, el); el = null; break; }
      var child = el.children[matchPart.index];
      if (child.nodeName !== matchPart.name) { log("Mismatched name", matchPart, child); el = null; break; }
      if (!!matchPart.id && child.id !== matchPart.id) { log("Mismatched id", matchPart, child); el = null; break; }
      if (!!matchPart.class && normalizeClass(child.className) !== matchPart.class) { log("Mismatched id", matchPart, child); el = null; break; }
      el = child;
    }
    return el;
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
          var elt = findElement(spec.match);
          if (!!addedNodeSet[elt]) {
            injectContent(elt, key, spec.content);
          }
        });
      });
      observe();
    });

    observe();
  }

  function normalizeClass(className) {
    if (!!className) {
      var parts = className.split(" ");
      parts.sort();
      return parts.join(" ");
    } else {
      return undefined;
    }
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
