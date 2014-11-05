var common = require('./common');
var jsdom = require('jsdom');
var util = require('./testutil');
var Matcher = require('./matcher');


describe('Matcher tests', function () {

  var dom;
  var document, body, matcher;

  beforeEach(function () {
    this.addMatchers(customMatchers);
    dom = util.dom('<body></body>')
        .then(function(window) {
          document = window.document;
          body = document.body;
          matcher = new Matcher(body);
          return window;
        });
  });

  afterEach(function () {
    dom = null;
  });

  it('should match a single level path', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div></div>';
      var el = body.children[0];
      var m = matcher.matcherForElt(el);

      expect(m).toHavePath('DIV', 0);
      expect(matcher.findElement(m)).toBe(el);
    });
  }));

  it('should match a nth child', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div></div><div></div><div></div>';
      var el, em;
      for (var i = 0; i < 3; ++i) {
        el = body.children[i];
        m = matcher.matcherForElt(el);
        expect(m).toHavePath('DIV', i);
        expect(matcher.findElement(m)).toBe(el);
      }
    });
  }));

  it('should match deeply', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div><p><span></span></p></div>';
      var p = body.children[0].children[0];
      var span = p.children[0];

      var m = matcher.matcherForElt(p);
      expect(m).toHavePath('P', 0, 'DIV', 0);
      expect(matcher.findElement(m)).toBe(p);

      m = matcher.matcherForElt(span);
      expect(m).toHavePath('SPAN', 0, 'P', 0, 'DIV', 0);
      expect(matcher.findElement(m)).toBe(span);
    });
  }));

  it('should record elements ids', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div id="a"></div>';
      var el = body.children[0];
      var m = matcher.matcherForElt(el);

      expect(m[0]).toContainValues({'id': 'a'});
      expect(matcher.findElement(m)).toBe(el);
    });
  }));

  it('should record elements classes', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div class="a b"><div class="b a"/></div>';
      var el = body.children[0].children[0];
      var m = matcher.matcherForElt(el);

      expect(m[0]).toContainValues({'class': 'a b'});
      expect(m[1]).toContainValues({'class': 'a b'});
      expect(matcher.findElement(m)).toBe(el);
    });
  }));


  it('should reject missing, unexpected and mismatched ids', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div id="1"></div><div></div>';

      var el1 = body.children[0];
      var m1 = matcher.matcherForElt(el1);
      el1.id = ''; expect(matcher.findElement(m1)).toBeNull();
      el1.id = 'b'; expect(matcher.findElement(m1)).toBeNull();
      el1.id = '1'; expect(matcher.findElement(m1)).toBe(el1);

      var el2 = body.children[1];
      var m2 = matcher.matcherForElt(el2);
      el2.id = 'a'; expect(matcher.findElement(m2)).toBeNull();
      el2.id = ''; expect(matcher.findElement(m2)).toBe(el2);
    });
  }));

  it('should reject missing, unexpected and mismatched classes', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<body><div class="a"></div><div class="b c"></div><div></div></body>';

      var el1 = body.children[0];
      var m1 = matcher.matcherForElt(el1);
      el1.className = ''; expect(matcher.findElement(m1)).toBeNull();
      el1.className = 'b'; expect(matcher.findElement(m1)).toBeNull();
      el1.className = 'b c'; expect(matcher.findElement(m1)).toBeNull();
      el1.className = 'a'; expect(matcher.findElement(m1)).toBe(el1);

      var el2 = body.children[1];
      var m2 = matcher.matcherForElt(el2);
      el2.className = 'b'; expect(matcher.findElement(m2)).toBeNull();
      el2.className = 'c'; expect(matcher.findElement(m2)).toBeNull();
      el2.className = 'c b'; expect(matcher.findElement(m2)).toBe(el2);

      var el3 = body.children[2];
      var m3 = matcher.matcherForElt(el3);
      el3.className = 'a'; expect(matcher.findElement(m3)).toBeNull();
      el3.className = ''; expect(matcher.findElement(m3)).toBe(el3);
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


