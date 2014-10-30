with (require('./util')) {
  'use strict';

  var blobHost = 'http://devstore.copyraptor.com.s3.amazonaws.com';

  var sitekey;
  var injectedContent = emptyContent(); // Overwritten by initialContent
  var nextEditKey = 1;
  var originalContent = {}; // Content before overwriting
  var initialChangesApplied = false;

  ///// Exported functions /////

  function initialContent(content) {
    log("Initialising content", content);
    injectedContent = content;
    for (var keyString in content.changes) {
      var k = parseInt(keyString);
      if (k >= nextEditKey) { nextEditKey = k+1 }
    }
    log("Initial content received, next edit key: " + nextEditKey);
  }

  function beginEditingElement(elt) {
    var key = elt.copyraptorkey = elt.copyraptorkey || nextEditKey++;
    if (originalContent[key] === undefined) {
      var content = extractContent(elt);
      log("Remembering " + key, content);
      originalContent[key] = content;
    }
  }

  function endEditingElement(elt) {
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
      if (!!elt) {
        injectContent(elt, key, originalContent[key]);
      } else {
        warn("Can't find elt for original content for " + key + ", match " + spec.match);
      }
    });
    injectedContent = emptyContent();
  }

  function queryParam(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    var results = regex.exec(location.search);
    return results === null ? undefined : decodeURIComponent(results[1].replace(/\+/g, " "));
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

  function foreach(obj, fn) {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        fn(key, obj[key]);
      }
    }
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
    if (initialChangesApplied || injectedContent == undefined) { return; }
    log("Applying initial changes");
    initialChangesApplied = true;
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

    watchDom();
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

  function log() {
    console.log.apply(console, logargs(arguments));
  }
  function warn(msg) {
    console.warn.apply(console, logargs(arguments));
  }
  function logargs(args) {
    var newArgs = Array.prototype.slice.call(args, 0);
    if (newArgs.length) {
      newArgs[0] = "[Copyraptor] " + newArgs[0];
    }
    return newArgs;
  }

  // Hook into document
  var showEditor = !!queryParam("copyraptor");

  var scriptPath;

  // Find the script element that loaded this script to extract the site id
  var tags = document.head.querySelectorAll("script");
  for (var i = 0; i < tags.length; ++i) {
    var tag = tags[i];

    // TODO(alex): Fallback to site from domain name
    sitekey = tag.getAttribute("data-copyraptor-site");
    if (sitekey !== undefined) {
      scriptPath = tag.src.split(/[\w_-]+.js/)[0];
      break;
    }
  }

  var injector = module.exports = window.copyraptor = {
    initialContent: initialContent,
    beginEditingElement: beginEditingElement,
    endEditingElement: endEditingElement,
    resetElement: resetElement,
    clear: clear,

    getPayload: function() {
      if (injectedContent === undefined) {
        throw new Exception("initialContent is undefined, should never be the case");
      }
      return "(function() {window.copyraptor.initialContent(" + JSON.stringify(injectedContent) + ");})()";
    },

    getSiteKey: function() {
      return sitekey;
    }
  };
  
  
  window.copyraptor.initialContent = initialContent;

  document.addEventListener("DOMContentLoaded", function() {
    log("DOMContentLoaded");
    applyInitialChanges();

    if (showEditor) {
      require.ensure(['./editor'], function(require) {
        var EditorApp = require('./app');

        var editing = !!queryParam("e");
        var editorApp = new EditorApp(injector, editing);
        editorApp.show();
      });
    }
  });


  // Insert a script element after this to load the content synchronously
  if (sitekey != undefined) {
    // NOTE(alex): appendChild-style DOM manipulation does not execute the script synchronously.
    var contentSrc = blobHost + "/" + sitekey;
    document.write('<script type="text/javascript" src="' + contentSrc + '"></script>');
  }

}
