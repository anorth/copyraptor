(function(window, document) {
  'use strict';

  var blobHost = 'https://devstore.copyraptor.com.s3.amazonaws.com';

  var sitekey = undefined;
  var changes = undefined;
  var domContentHasLoaded = false;
  var initialChangesApplied = false;

  // Exported functions
  function init(site) {
    sitekey = site;

    // TODO: load and inject
    load(site, function(data) {
      console.log("Remote content loaded");
      changes = data;
      applyInitialChanges();
    }, function(err) {
      console.log(err);
    });
  }

  function put(matcher, value) {

  }


  // Private functions
  function save(site, data, success, failure) {
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', blobHost + '/' + site, true);
    xhr.onload = function (e) {
      if (this.status == 200) {
        success(this.responseText);
      } else {
        failure(e);
      }
    };

    xhr.send(JSON.stringify(data));
  }

  function load(site, success, failure) {
    if (site === 'injectordemo') {
      success({
        "text": {text: "Copy written by awesome marketing mofo"},
        "yamum": {text: "Copy Raptor FTW"},
        "p-1": {text: "Copy updated in dynamic content"},
        "p-2": {text: "Done again, how good are we"},
        "p-3": {text: "Even a third time, but this is the last..."}
      });
      return;
    }


    var xhr = new XMLHttpRequest();
    xhr.open('GET', blobHost + '/' + site, true);
    xhr.responseType = "json";
    xhr.onload = function (e) {
      if (this.status == 200) {
        success(this.response);
      } else {
        failure(e);
      }
    };

    xhr.send();
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
  });

  window.copyraptor = {
    init: init
  };

})(window, document);
