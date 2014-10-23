(function() {
  var changes = [
    { match: {id: "text"}, text: "Copy written by awesome marketing mofo" },
    { match: {id: "yamum"}, text: "Copy Raptor FTW" },
    { match: {id: "p-1"}, text: "Copy updated in dynamic content" },
    { match: {id: "p-2"}, text: "Done again, how good are we" },
    { match: {id: "p-3"}, text: "Even a third time, but this is the last..." }
  ];
  
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
  };

  function watchDom() {
    var observer = new MutationObserver(function(mutations) {
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
    // TEMP TEST SCAFFOLDING

    //TODO(jeeva): just do this on load, in a button for testing
    var firstTime = true;
    function setupInjector() {
      if (firstTime) {
        changes.forEach(function(spec) {
          var elt = getElt(spec.match);
          if (!elt) {
            console.log("No matching elt", spec);
            return;
          }

          injectContent(elt, spec);
        });
        watchDom();
        firstTime = false;
      }
    }
    // Uncomment to setup injector onload
    setupInjector();

    document.querySelector("#button1").addEventListener("click", function() {
      setupInjector();
    });

    var nextId = 1;
    document.querySelector("#button2").addEventListener("click", function() {
      var node = document.querySelector("#yamum");
      var newP = document.createElement('p');
      newP.innerHTML = "dynamically created placeholder content";
      newP.setAttribute("id", "p-" + nextId);
      nextId++;
      document.querySelector("#content").appendChild(newP);
    });
  });
})();

//window.onload = function() {
//  var text = document.querySelector("#text");
//
//  var button1 = document.querySelector("#button");
//  var button2 = document.querySelector("#button");
//
//  var observer = new MutationObserver(function(mutations) {
//      mutations.forEach(function(mutation) {
//        //var entry = {
//        //  mutation: mutation,
//        //  el: mutation.target,
//        //  value: mutation.target.textContent,
//        //  oldValue: mutation.oldValue
//        //};
//        if (mutation.target.textContent != newVal) {
//          mutation.target.textContent = newVal;
//        }
//      });
//    });
//
//  observer.observe(text, {
//      attributes: true,
//      childList: true,
//      characterData: true,
//      characterDataOldValue: true,
//      subtree: true
//  });
//};
