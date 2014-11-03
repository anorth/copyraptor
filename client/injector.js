module.exports = function createInjector(document, MutationObserver) {
  'use strict';
  var util = require('./common');
  var assert = util.assert;
  var foreach = util.foreach;
  var log = util.log;
  var warn = util.warn;

  var injectedContent = emptyContent(); // Overwritten by initialContent
  var nextEditKey = 1;
  var originalContent = {}; // Content before overwriting
  var initialChangesApplied = false;

  function initialContent(content) {
    log("Initialising content", content);
    injectedContent = content;
    foreach(content.changes, function(keyString) {
      var k = parseInt(keyString);
      if (k >= nextEditKey) { nextEditKey = k+1 }
    });
    log("Initial content received, next edit key: " + nextEditKey);
  }

  function trackElement(elt) {
    var key = elt.copyraptorkey = elt.copyraptorkey || nextEditKey++;
    if (originalContent[key] === undefined) {
      var content = extractContent(elt);
      log("Remembering " + key, content);
      originalContent[key] = content;
    }
  }

  function updateElement(elt) {
    var key = elt.copyraptorkey;
    if (key !== undefined) {
      var content = extractContent(elt);
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

  function resetElement(elt) {
    var key = elt.copyraptorkey;
    if (key && originalContent[key] !== undefined) {
      log("Resetting elt for " + key);
      injectContent(elt, key, originalContent[key]);
      delete injectedContent.changes[key];
    }
  }

  function clear() {
    log("Clear");
    foreach(injectedContent.changes, function(key, spec) {
      var elt = findElement(spec.match);
      if (!elt) {
        // NOTE(dan): This shouldn't be an error on dynamic pages?
        warn("Can't find elt for original content for " + key + ", match " + spec.match);
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

  ///// Private functions /////

  function emptyContent() {
    return {
      api: 1,
      changes: {} // indexed by key
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

  function extractContent(elt) {
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

    if (elt.contentEditable == 'true') {
      log("Not clobbering content being edited");
      return;
    }

    if (elt.copyraptorkey === undefined) {
      elt.copyraptorkey = key;
    } else if (elt.copyraptorkey !== key) {
      warn("Element already has attached key " + elt.copyraptorkey, elt);
      elt.copyraptorkey = key;
    }

    if (content.html) {
      elt.innerHTML = content.html;
    } else if (content.text) {
      elt.textContent = content.text;
    } else {
      console.error("Unknown content type", content);
    }
  }

  /** Applies changes if both they and the DOM have loaded. */
  function applyInitialChanges() {
    if (initialChangesApplied) { return; }
    log("Applying initial changes");
    initialChangesApplied = true;

    applyContent();
    watchDom();
  }

  function applyContent() {
    foreach(injectedContent.changes, function(key, spec) {
      var elt = findElement(spec.match);
      if (elt) {
        log("Injecting content for key " + key, spec, elt);
        originalContent[key] = extractContent(elt);
        injectContent(elt, key, spec.content);
      } else {
        log("No elt (yet) for key " + key, spec);
      }
    });
  }

  function watchDom() {
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

  function getContent() {
    return injectedContent;
  }

  function setContent(content) {
    clear();
    injectedContent = content;
    applyContent();
  }

  // TODO(dan): Tighten this interface up, it's a bit complicated/ad-hoc
  // and use function ctor class style.
  return {
    initialContent: initialContent,
    applyInitialChanges: applyInitialChanges,
    trackElement: trackElement,
    updateElement: updateElement,
    resetElement: resetElement,
    clear: clear,

    getContent: getContent,
    setContent: setContent,

    getPayload: function() {
      assert(injectedContent, "initialContent is undefined, should never be the case");

      return "copyraptor.initialContent(" + JSON.stringify(getContent()) + ");";
    }
  };
};
