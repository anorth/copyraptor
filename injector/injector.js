(function(window, document) {
  'use strict';

  var blobHost = 'https://devstore.copyraptor.com.s3.amazonaws.com';

  var sitekey;
  var changes = {}; // Overwritten by initialContent
  var originalContent = {}; // Content before overwriting
  var domContentHasLoaded = false;
  var initialChangesApplied = false;

  // Exported functions
  function initialContent(content) {
    log("Initialising content", content);
    changes = content;
  }

  function rememberElement(elt) {
    var match = matcherForElt(elt);
    if (!!match && !originalContent[match]) {
      var content = extractContentSpec(elt);
      log("Remembering " + match, content);
      originalContent[match] = content;
    }
  }

  function specsAreEquivalent(a, b) {
    return a !== undefined && b !== undefined && a.text === b.text;
  }

  function putElement(elt) {
    var content = extractContentSpec(elt);
    var match = matcherForElt(elt);
    if (!!match) {
      if (specsAreEquivalent(content, originalContent[match])) {
        log("Element " + match + " is in original state");
        changes[match] = undefined;
      } else {
        log("Storing new spec for " + match, content);
        changes[match] = content;
      }
    }
  }

  function resetElement(elt) {
    var match = matcherForElt(elt);
    if (!!match && !!originalContent[match]) {
      log("Resetting " + match);
      injectContent(elt, originalContent[match]);
      changes[match] = undefined;
    }
  }

  function clear() {
    log("Clear");
    foreach(originalContent, function(match, spec) {
      var elt = findElement(match);
      if (!!elt) {
        injectContent(elt, spec);
      } else {
        log("Can't find elt for original content for " + match);
      }
    });
    changes = {};
  }

  // Private functions
  function save(success, failure) {
    if (changes === undefined) {
      log("Refusing to save undefined content");
      return;
    }
    log("Saving", changes);
    var content = JSON.stringify(changes);
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

  function matcherForElt(elt) {
    return elt.id;
  }

  function findElement(match) {
    //TODO(jeeva): other match types
    return document.getElementById(match);
  }

  function matches(elt, match) {
    //TODO(jeeva): other match types
    if (match == elt.id) {
      return true;
    }

    return false;
  }

  function foreach(obj, fn) {
    for (var match in  obj) {
      if (obj.hasOwnProperty(match)) {
        fn(match, obj[match]);
      }
    }
  }

  function extractContentSpec(elt) {
    // TODO(alex): More sophisticated content
    return {text: elt.textContent};
  }

  function injectContent(elt, spec) {
    //TODO(jeeva): other replace methods
    if (spec.text) {
      elt.textContent = spec.text;
    } else {
      console.error("Unknown change type", spec);
    }
  }

  /** Applies changes if both they and the DOM have loaded. */
  function applyInitialChanges() {
    if (initialChangesApplied) { return; }
    if (changes !== undefined && domContentHasLoaded) {
      initialChangesApplied = true;
      foreach(changes, function(match, spec) {
        var elt = findElement(match);
        if (!elt) {
          log("No elt (yet) for match", match, spec);
          return;
        }

        originalContent[match] = extractContentSpec(elt);
        injectContent(elt, spec);
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
          foreach(changes, function(match, spec) {
            var elt = mutation.addedNodes[i];
            if (matches(elt, match)) {
              injectContent(elt, spec);
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

  document.addEventListener("DOMContentLoaded", function() {
    log("DOMContentLoaded");
    domContentHasLoaded = true;
    applyInitialChanges();
    //save();
  });

  // Find the script element that loaded this script to extract the site id,
  // then insert a script element after this to load the content
  var tags = document.head.querySelectorAll("script");
  for (var i = 0; i < tags.length; ++i) {
    var tag = tags[i];
    sitekey = tag.getAttribute("data-copyraptor-site");
    if (sitekey !== undefined) { break; }
  }
  // TODO(alex): Fallback to site from domain name

  if (sitekey != undefined) {
    // NOTE(alex): appendChild-style DOM manipulation does not execute the script synchronously.
    var contentSrc = blobHost + "/" + sitekey;
    document.write('<script type="text/javascript" src="' + contentSrc + '"></script>');
  }


  window.copyraptor = {
    initialContent: initialContent,
    rememberElement: rememberElement,
    putElement: putElement,
    resetElement: resetElement,
    clear: clear,
    save: save
  };

})(window, document);
