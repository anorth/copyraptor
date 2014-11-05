var jsdom = require('jsdom');
var fs = require('fs');
var util = require('./testutil');
var createInjector = require('./injector');

var testFile1 = fs.readFileSync('testdata/test1.html', 'utf8');


describe('injector', function() {
  it('should inject something', util.promised(function() {
    return util.dom(testFile1, function(wnd) {
      var body = wnd.document.body;

      injector = createInjector(wnd.document, util.FakeMutationObserver);
      injector.setContent({
          "api":1,
          "changes":{
            "1":{
              "match":[{"name":"P","index":1}],
              "content":{"text":"Replaced Content Yay"}
            }
          }
        });

      expect(body.innerHTML).toMatch(/<p>My initial content<\/p>/);
      injector.applyContentAndWatchDom();
      expect(body.innerHTML).toMatch(/<p>Replaced Content Yay<\/p>/);

    })
  }));
});
