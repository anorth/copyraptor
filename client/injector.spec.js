var jsdom = require('jsdom');
var Q = require('q');
var fs = require('fs');
var util = require('./testutil');
var createInjector = require('./injector');

var testFile1 = fs.readFileSync('testdata/test1.html', 'utf8');

// TODO: Either flesh this out, or find an implementation
// Unfortunately jsdom doesn't support it - could use phantomjs, if not too bulky.
function FakeMutationObserver() {
  this.disconnect = function(){};
  this.observe = function(){};
}

describe('injector', function() {
  it('should inject something', util.promised(function() {
    return util.dom(testFile1, function(wnd) {
      var body = wnd.document.body;

      injector = createInjector(wnd.document, FakeMutationObserver);
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
