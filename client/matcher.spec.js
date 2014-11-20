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
      expect(matcher.findElements(m, true)[0]).toBe(el);
      // Respect excluding path matchers
      expect(matcher.findElements(m, false).length).toBe(0);
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
        expect(matcher.findElements(m, true)[0]).toBe(el);
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
      expect(matcher.findElements(m, true)[0]).toBe(p);

      m = matcher.matcherForElt(span);
      expect(m).toHavePath('SPAN', 0, 'P', 0, 'DIV', 0);
      expect(matcher.findElements(m, true)[0]).toBe(span);
    });
  }));

  it('should record elements ids', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div id="a"></div>';
      var el = body.children[0];
      var m = matcher.matcherForElt(el);

      expect(m[0]).toContainValues({'id': 'a'});
      expect(matcher.findElements(m, true)[0]).toBe(el);
    });
  }));

  it('should record elements classes', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div class="a b"><div class="b a"/></div>';
      var el = body.children[0].children[0];
      var m = matcher.matcherForElt(el);

      expect(m[0]).toContainValues({'cs': 'a b'});
      expect(m[1]).toContainValues({'cs': 'a b'});
      expect(matcher.findElements(m, true)[0]).toBe(el);
    });
  }));


  it('should reject missing, unexpected and mismatched ids', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div id="1"></div><div></div>';

      var el1 = body.children[0];
      var m1 = matcher.matcherForElt(el1);
      el1.id = ''; expect(matcher.findElements(m1, true).length).toBe(0);
      el1.id = 'b'; expect(matcher.findElements(m1, true).length).toBe(0);
      el1.id = '1'; expect(matcher.findElements(m1, true)[0]).toBe(el1);

      var el2 = body.children[1];
      var m2 = matcher.matcherForElt(el2);
      el2.id = 'a'; expect(matcher.findElements(m2, true).length).toBe(0);
      el2.id = ''; expect(matcher.findElements(m2, true)[0]).toBe(el2);
    });
  }));

  it('should require matching content', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div>Hello</div>';
      var el = body.children[0];
      var m = matcher.matcherForElt(el);

      expect(m[0].ch).toBeDefined();

      el.textContent = "Hi";
      expect(matcher.findElements(m, true).length).toBe(0);

      el.textContent = "   HEL  LO ";
      expect(matcher.findElements(m, true)[0]).toBe(el);
    });
  }));

  it('should allow mismatched content when requested', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div>Hello</div>';
      var el = body.children[0];
      var m = matcher.matcherForElt(el);

      expect(m[0].ch).toBeDefined();

      el.textContent = "Hi";
      expect(matcher.findElements(m, true, true)[0]).toBe(el);
    });
  }));

  it('should match tagged element', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div class="cr-tag class anotherclass">Hello</div>';
      var el = body.children[0];
      var m = matcher.matcherForElt(el);

      expect(m[0].tg).toBeDefined();

      el.textContent = "Hi";
      expect(matcher.findElements(m, false)[0]).toBe(el);
    });
  }));

  it('should match all tagged elements', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div class="cr-tag">Hello</div><div class="cr-tag">World</div>';

      var m = matcher.matcherForElt(body.children[0]);
      expect(m[0].tg).toBeDefined();

      expect(matcher.findElements(m, false)[0]).toBe(body.children[0]);
      expect(matcher.findElements(m, false)[1]).toBe(body.children[1]);
    });
  }));

  it('should match only correctly tagged elements', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div class="cr-a">Hello</div><div class="cr-b">World</div><div class="blah">Again</div>';
      var el = body.children[0];

      var m = matcher.matcherForElt(el);
      expect(m[0].tg).toBeDefined();

      expect(matcher.findElements(m, false).length).toBe(1);
      expect(matcher.findElements(m, false)[0]).toBe(el);
    });
  }));

  it('should match all tagged elements', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div class="cr-a">Hello</div><div class="cr-a">World</div><div class="cr-a">Again</div>';

      var m = matcher.matcherForElt(body.children[0]);
      expect(m[0].tg).toBeDefined();

      expect(matcher.findElements(m, false).length).toBe(3);
      for (var i = 0; i < 3; ++i) {
        expect(matcher.findElements(m, false)[i]).toBe(body.children[i]);
      }
    });
  }));


  it('should match tagged and path elements in one change set', util.promised(function () {
    return dom.then(function(window) {
      body.innerHTML = '<div class="cr-a">Hello</div><div>World</div><div class="blah">Again</div>';
      var elA = body.children[0];
      var elB = body.children[1];

      var mA = matcher.matcherForElt(elA);
      var mB = matcher.matcherForElt(elB);

      expect(matcher.findElements(mA, true)[0]).toBe(elA);
      expect(matcher.findElements(mB, true)[0]).toBe(elB);
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
      if (actual[level].nm !== arguments[i]) {
        this.message = function() { return "Expected matcher[" + level + "] to be for " + arguments[i] + " but was " + actual[level].nm; };
        return false;
      }
      if (actual[level].ix !== arguments[i+1]) {
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


