// Injects Copyraptor script tag into the current page, taking site key from location host.

(function() {
  var protocol = (document.location.protocol === 'https:') ? 'https:' : 'http:';
  var el = document.createElement("script");
  el.setAttribute("type", "text/javascript");
  el.setAttribute("src", protocol + "//code.copyraptor.com/copyraptor.js");
  //el.setAttribute("src", "http://localhost:5544/build/copyraptor.js");
  el.setAttribute("data-copyraptor-site", document.location.host);
  el.setAttribute("data-copyraptor-edit", "");
  document.head.appendChild(el);
  el.onload = function() {
    console.log("Copyraptor loaded")
  };
})();
