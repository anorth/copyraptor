var common = require('./common');
var jsdom = require('jsdom');
var util = require('./testutil');
var Matcher = require('./matcher');


describe('Matcher tests', function () {

  beforeEach(function () {
    this.addMatchers(customMatchers);
  });

  afterEach(function () {
  });

  it('should match a single level path', util.promised(function () {
    return util.dom('<body><div></div></body>').then(function (wnd) {
      var body = wnd.document.body;
      var matcher = new Matcher(body);
      var m = matcher.matcherForElt(body.children[0]);

      expect(m).toHavePath('DIV', 0);
    });
  }));

  it('should match a second child', util.promised(function () {
    return util.dom('<body><div></div><div></div></body>').then(function (wnd) {
      var body = wnd.document.body;
      var matcher = new Matcher(body);
      var m = matcher.matcherForElt(body.children[1]);

      expect(m).toHavePath('DIV', 1);
    });
  }));

  it('should match deeply', util.promised(function () {
    return util.dom('<body><div><p><span></span></p></div></body>').then(function (wnd) {
      var body = wnd.document.body;
      var matcher = new Matcher(body);
      var m = matcher.matcherForElt(body.children[0].children[0].children[0]);

      expect(m).toHavePath('SPAN', 0, 'P', 0, 'DIV', 0);
    });
  }));

  it('should record elements ids', util.promised(function () {
    return util.dom('<body><div id="a"></div></body>').then(function (wnd) {
      var body = wnd.document.body;
      var matcher = new Matcher(body);
      var m = matcher.matcherForElt(body.children[0]);

      expect(m[0]).toContainValues({'id': 'a'});
    });
  }));

  it('should record elements classes', util.promised(function () {
    return util.dom('<body><div class="a b"><div class="b a"></div></body>').then(function (wnd) {
      var body = wnd.document.body;
      var matcher = new Matcher(body);
      var m = matcher.matcherForElt(body.children[0].children[0]);

      expect(m[0]).toContainValues({'class': 'a b'});
      expect(m[1]).toContainValues({'class': 'a b'});
    });
  }));
});

var customMatchers = {
  toBeArray: function (expected) {
    var pass = this.actual.constructor === Array;
    if (expected !== undefined) {
      pass = pass && (this.actual.length === expected);
    }
    return pass;
  },

  toHavePath: function() {
    var actual = this.actual;

    if (arguments.length !== actual.length * 2) {
      this.message = function() { return "Expected matcher to have length " + arguments.length/2; };
      return false;
    }

    var level = 0;
    for (var i = 0; i < arguments.length; i += 2) {
      if (actual[level].name !== arguments[i]) {
        this.message = function() { return "Expected matcher[" + level + "] to be for " + arguments[i] + " but was " + actual[level].name; };
        return false;
      }
      if (actual[level].index !== arguments[i+1]) {
        this.message = function() { return "Expected matcher[" + level + "] to have index " + arguments[i+1]; };
        return false;
      }
      level++;
    }

    return true;
  },

  toContainValues: function(values) {
    var jas = this;
    var actual = this.actual;
    var pass = true;
    common.foreach(values, function(k, v) {
      pass = pass && actual[k] === v;
      if (!pass) { jas.message = function() { return "Expected " + k + ': ' + v; }; }
    });
    return pass;
  }
};


