(function(window, document) {
  'use strict';

  var blobHost = 'https://devstore.copyraptor.com.s3.amazonaws.com';

  var sitekey = undefined;
  var changes = undefined;
  var domContentHasLoaded = false;
  var initialChangesApplied = false;

  // Exported functions
  function init(site, content) {
    sitekey = site;
    changes = content;
  }

  function put(match, spec) {
    content[match] = spec;
  }

  // Private functions
  function save(success, failure) {
    var content = JSON.stringify(changes);
    var payload = "(function() {window.copyraptor.init('" + sitekey + "', " + content + ");})()";

    var xhr = new XMLHttpRequest();
    xhr.open('PUT', blobHost + '/' + sitekey, true);
    xhr.setRequestHeader('Content-Type', 'application/javascript');
    xhr.onload = function (e) {
      if (this.status == 200) {
        console.log("PUT succeeded");
        if (success !== undefined) success(this.responseText);
      } else {
        console.log("PUT failed", e);
        if (failure !== undefined) failure(e);
      }
    };

    xhr.send(payload);
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

  function forEachChange(fn) {
    for (var match in changes) {
      if (changes.hasOwnProperty(match)) {
        fn(match, changes[match]);
      }
    }
  }

  function injectContent(elt, spec) {
    //TODO(jeeva): other replace methods
    if (spec.text)  {
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
      forEachChange(function(match, spec) {
        var elt = findElement(match);
        if (!elt) {
          console.log("No elt (yet) for match", match, spec);
          return;
        }

        injectContent(elt, spec);
      });

      watchDom();
    }
  }

  function watchDom() {
    var observer = new MutationObserver(function(mutations) {
      console.log("Mutation");
      mutations.forEach(function(mutation) {
        //var entry = {
        //  mutation: mutation,
        //  el: mutation.target,
        //  value: mutation.target.textContent,
        //  oldValue: mutation.oldValue
        //};
        for (var i in mutation.addedNodes) {
          forEachChange(function(match, spec) {
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

  document.addEventListener("DOMContentLoaded", function() {
    console.log("DOMContentLoaded");
    domContentHasLoaded = true;
    applyInitialChanges();
    save();
  });

  window.copyraptor = {
    init: init
  };

})(window, document);
