// Injects Copyraptor script tag into the current page, taking site key from location host.

(function() {
  chrome.storage.local.get({
    host: 'prod'
  }, function (items) {
    var host = items.host || 'prod';
    var protocol = (document.location.protocol === 'https:') ? 'https:' : 'http:';

    var src = (host === 'prod') ? protocol + "//code.copyraptor.com/copyraptor.js" : "http://localhost:5544/build/copyraptor.js";
    var el = document.createElement("script");
    el.setAttribute("type", "text/javascript");
    el.setAttribute("src", src);
    el.setAttribute("data-copyraptor-site", document.location.host);
    el.setAttribute("data-copyraptor-edit", "");
    el.setAttribute("data-copyraptor-auto", "");
    el.setAttribute("data-copyraptor-cachebust", "");
    document.head.appendChild(el);
    el.onload = function() {
      console.log("Copyraptor loaded")
    };
  });
})();
