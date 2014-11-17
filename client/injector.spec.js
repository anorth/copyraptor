var jsdom = require('jsdom');
var util = require('./testutil');
var createInjector = require('./injector');

describe('Injection tests', function() {

  var dom;
  var document, body, injector, matcher;

  beforeEach(function () {
    //this.addMatchers(customMatchers);
    dom = util.dom('<body></body>')
        .then(function(window) {
          document = window.document;
          body = document.body;
          injector = createInjector(document, util.FakeMutationObserver);
          matcher = injector.matcher();
          return window;
        });
  });

  afterEach(function () {
    dom = null;
  });

  it('should no-op apply and revert', util.promised(function() {
    return dom.then(function(window) {
      body.innerHTML = '<p>Initial</p>';
      expect(body.innerHTML).toEqual('<p>Initial</p>');

      injector.applyContent();
      expect(body.innerHTML).toEqual('<p>Initial</p>');
      injector.revertContent();
      expect(body.innerHTML).toEqual('<p>Initial</p>');
    })
  }));

  it('should inject single text content', util.promised(function() {
    return dom.then(function(window) {
      body.innerHTML = '<p>Initial</p>';

      injector.applyContent(changeSpec().withText(body.children[0], "Replaced"));
      expect(body.innerHTML).toEqual('<p>Replaced</p>');
    })
  }));

  it('should revert single element', util.promised(function() {
    return dom.then(function(window) {
      body.innerHTML = '<p>Initial</p>';

      injector.applyContent(changeSpec().withText(body.children[0], "Replaced"));
      injector.revertElement(body.children[0]);

      expect(body.innerHTML).toEqual('<p>Initial</p>');
    })
  }));

  it('should inject many text contents with distinct matchers', util.promised(function() {
    return dom.then(function(window) {
      body.innerHTML = '<p>A</p><p>B</p>';

      injector.applyContent(changeSpec().withText(body.children[0], "Replaced")
          .withText(body.children[1], "Also replaced"));
      expect(body.innerHTML).toEqual('<p>Replaced</p><p>Also replaced</p>');
    })
  }));

  it('should inject many text contents with same class matcher', util.promised(function() {
    return dom.then(function(window) {
      body.innerHTML = '<p class="cr-tag">A</p><p class="cr-tag someclass">B</p>';

      injector.applyContent(changeSpec().withText(body.children[0], "Replaced"));
      expect(body.innerHTML).toEqual('<p class="cr-tag">Replaced</p><p class="cr-tag someclass">Replaced</p>');
    })
  }));

  it('should revert many elements', util.promised(function() {
    return dom.then(function(window) {
      body.innerHTML = '<p>A</p><p>B</p>';

      injector.applyContent(changeSpec().withText(body.children[0], "Replaced")
          .withText(body.children[1], "Also replaced"));
      injector.revertContent();

      expect(body.innerHTML).toEqual('<p>A</p><p>B</p>');
    })
  }));


  // Helpers

  function changeSpec() {
    var nextEditKey = 1;
    var spec = {
      "api": 1,
      "changes": {}
    };

    spec.withText = function(elt, replacement) {
      this.changes[nextEditKey++] = {
        "match": matcher.matcherForElt(elt),
        "content": {"text": replacement}
      };
      return this;
    };

    spec.withHtml = function(elt, replacement) {
      this.changes[nextEditKey++] = {
        "match": matcher.matcherForElt(elt),
        "content": {"html": replacement}
      };
      return this;
    };

    return spec;
  }
});

