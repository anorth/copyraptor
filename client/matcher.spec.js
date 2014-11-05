var jsdom = require('jsdom');
var util = require('./testutil');
var Matcher = require('./matcher');


describe('matcher', function() {
  it('should make a match', util.promised(function() {
    return util.dom('<div/>', function(wnd) {
      var body = wnd.document.body;
      var matcher = new Matcher(body);
      var m = matcher.matcherForElt(body.children[0]);

      expect(m).toBeTruthy();
    })
  }));
});
