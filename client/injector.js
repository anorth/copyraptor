  'use strict';

  module.import(copyraptor.util);
  var EditorApp = copyraptor.EditorApp;

  var blobHost = 'http://devstore.copyraptor.com.s3.amazonaws.com';

  var sitekey;
  var injectedContent = emptyContent(); // Overwritten by initialContent
  var nextEditKey = 1;
  var originalContent = {}; // Content before overwriting
  var domContentHasLoaded = false;
  var initialChangesApplied = false;

  ///// Exported functions /////

  function initialContent(content) {
    log("Initialising content", content);
    injectedContent = content;
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
        log("Storing new spec for " + match, content);
        injectedContent.changes[key] = {match: match, content: content};
      }
    }
  }

  function resetElement(elt) {
    var key = elt.copyraptorkey;
    if (key && originalContent[key] !== undefined) {
      log("Resetting elt for " + key);
      injectContent(elt, originalContent[key]);
      delete injectedContent.changes[key];
    }
  }

  function clear() {
    log("Clear");
    foreach(injectedContent.changes, function(key, spec) {
      var elt = findElement(spec.match);
      if (!!elt) {
        injectContent(elt, spec.content);
      } else {
        log("Can't find elt for original content for " + key + ", match " + spec.match);
      }
    });
    injectedContent = emptyContent();
  }

  function save(success, failure) {
    if (injectedContent === undefined) {
      log("Refusing to save undefined content");
      return;
    }
    log("Saving", injectedContent);
    var content = JSON.stringify(injectedContent);
    var payload = "(function() {window.copyraptor.initialContent(" + content + ");})()";

    var xhr = new XMLHttpRequest();
    xhr.open('PUT', blobHost + '/' + sitekey, true);
    xhr.setRequestHeader('Content-Type', 'application/javascript');
    xhr.onload = function (e) {
      if (this.status == 200) {
        log("Save succeeded");
        if (success !== undefined) success(this.responseText);
      } else {
        log("Save failed", e);
        if (failure !== undefined) failure(e);
      }
    };

    xhr.send(payload);
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
    var path = [];
    var ancestor = eltToMatch;
    while (ancestor !== document.body && ancestor !== undefined) {
      var siblingIndex = 0, sib = ancestor;
      // TODO(alex): Consider omitting [empty] text nodes from index
      while ((sib = sib.previousSibling) !== null) { siblingIndex++; }

      var klass = ancestor.className;
      if (!!klass) {
        klass = klass.split(" ");
        klass.sort();
      }
      path.push({
        "name": ancestor.nodeName,
        "index": siblingIndex,
        "id": ancestor.id,
        "class": klass
      });
      // TODO(alex): include signature of existing content

      ancestor = ancestor.parentElement;
    }
    return path;
  }

  function findElement(match) {
    if (typeof match === 'string') { // Deprecated
      return document.getElementById(match);
    }

    var leaf = match[0];
    if (!!leaf.id) {
      return document.getElementById(leaf.id);
    }
  }

  function matches(elt, match) {
    if (typeof match === 'string') { // Deprecated
      return match === elt.id;
    }

    var leaf = match[0];
    if (leaf.id === elt.id) {
      log("Matches", match, elt);
      return true;
    }

    return false;
  }

  function traverseMatchFromElement(match, top) {
    var pathFromTop = match.slice();
    pathFromTop.reverse();
    var el = document.body;
    for (var matchPart in pathFromTop) {
      var child = el.children[matchPart.index];
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
    return {text: elt.textContent};
  }

  function contentAreEquivalent(a, b) {
    return a !== undefined && b !== undefined && a.text === b.text;
  }

  function injectContent(elt, content) {
    //TODO(jeeva): other replace methods
    if (content.text) {
      elt.textContent = content.text;
    } else {
      console.error("Unknown content type", content);
    }
  }

  /** Applies changes if both they and the DOM have loaded. */
  function applyInitialChanges() {
    if (initialChangesApplied) { return; }
    if (injectedContent !== undefined && domContentHasLoaded) {
      initialChangesApplied = true;
      foreach(injectedContent.changes, function(key, spec) {
        var elt = findElement(spec.match);
        if (!elt) {
          log("No elt (yet) for key " + key, spec);
          return;
        }

        originalContent[key] = extractContent(elt);
        injectContent(elt, spec.content);
      });

      watchDom();
    }
  }

  function watchDom() {
    var observer = new MutationObserver(function(mutations) {
      log("Mutation");
      mutations.forEach(function(mutation) {
        //var entry = {
        //  mutation: mutation,
        //  el: mutation.target,
        //  value: mutation.target.textContent,
        //  oldValue: mutation.oldValue
        //};
        for (var i in mutation.addedNodes) {
          foreach(injectedContent.changes, function(key, spec) {
            var elt = mutation.addedNodes[i];
            if (matches(elt, spec.match)) {
              injectContent(elt, spec.content);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
        attributes: true,
        childList: true,
        characterData: true,
        characterDataOldValue: true,
        subtree: true
    });
  }

  function log(msg) {
    var args = Array.prototype.slice.call(arguments, 0);
    if (args.length) {
      args[0] = "[Copyraptor] " + args[0];
    }
    console.log.apply(console, args);
  }

  // Hook into document
  var showEditor = !!queryParam("copyraptor");

  // Find the script element that loaded this script to extract the site id
  var tags = document.head.querySelectorAll("script");
  for (var i = 0; i < tags.length; ++i) {
    var tag = tags[i];

    // TODO(alex): Fallback to site from domain name
    sitekey = tag.getAttribute("data-copyraptor-site");
    if (sitekey !== undefined) {
      break;
    }
  }

  copyraptor.injector = {
    initialContent: initialContent,
    beginEditingElement: beginEditingElement,
    endEditingElement: endEditingElement,
    resetElement: resetElement,
    clear: clear,
    save: save
  };
  
  copyraptor.initialContent = initialContent;

  document.addEventListener("DOMContentLoaded", function() {
    log("DOMContentLoaded");
    domContentHasLoaded = true;
    applyInitialChanges();

    if (showEditor) {
      document.body.appendChild(E('link', {
        href: '/copyraptor.css',
        rel: 'stylesheet',
        type: 'text/css'
      }));

      var editing = !!queryParam("e");
      var editorApp = new EditorApp(copyraptor.injector, editing);
      editorApp.show();
    }
  });


  // Insert a script element after this to load the content synchronously
  if (sitekey != undefined) {
    // NOTE(alex): appendChild-style DOM manipulation does not execute the script synchronously.
    var contentSrc = blobHost + "/" + sitekey;
    document.write('<script type="text/javascript" src="' + contentSrc + '"></script>');
  }

