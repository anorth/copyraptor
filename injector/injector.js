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
      success([
        { match: {id: "text"}, text: "Copy written by awesome marketing mofo" },
        { match: {id: "yamum"}, text: "Copy Raptor FTW" },
        { match: {id: "p-1"}, text: "Copy updated in dynamic content" },
        { match: {id: "p-2"}, text: "Done again, how good are we" },
        { match: {id: "p-3"}, text: "Even a third time, but this is the last..." }
      ]);
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

  function getElt(expr) {
    //TODO(jeeva): other match types
    if (expr.id) {
      return document.getElementById(expr.id);
    }
  };

  function matches(elt, expr) {
    //TODO(jeeva): other match types
    if (expr.id == elt.id) {
      return true;
    }

    return false;
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
      changes.forEach(function (spec) {
        var elt = getElt(spec.match);
        if (!elt) {
          console.log("No elt (yet) for spec", spec);
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
          var elt = mutation.addedNodes[i];
          changes.forEach(function(spec) {
            if (matches(elt, spec.match)) {
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
