var jsdom = require('jsdom');
var util = require('./testutil');
var createInjector = require('./injector');

describe('injector', function() {
  it('should inject something', util.promised(function() {
    return util.dom('<body><h1></h1><p>Initial</p></body>', function(wnd) {
      var body = wnd.document.body;
      injector = createInjector(wnd.document, util.FakeMutationObserver);
      expect(body.innerHTML).toMatch(/<p>Initial<\/p>/);

      injector.applyContent({
        "api": 1,
        "changes": {
          "1": {
            "match": [{"name": "P", "index": 1}],
            "content": {"text": "Replaced"}
          }
        }
      });

      expect(body.innerHTML).toMatch(/<p>Replaced<\/p>/);
    })
  }));
});
