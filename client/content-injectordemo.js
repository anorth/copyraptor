(function () {
  var content = {
    api: 1,
    changes: {
      1: {match: [{id: "text"}], content: {text: "* Copy written by awesome marketing mofo"}},
      2: {match: [{id: "yamum"}], content: {text: "* Copy Raptor FTW"}},
      3: {match: [{id: "p-1"}], content: {text: "* Copy updated in dynamic content"}},
      4: {match: [{id: "p-2"}], content: {text: "* Done again, how good are we"}},
      5: {match: [{id: "p-3"}], content: {text: "* Even a third time, but this is the last..."}}
    }
  };
  window.copyraptor.initialContent(content);
})();
