var jsdom = require('jsdom');
var Q = require('q');
var fs = require('fs');
var createInjector = require('./injector');

var testFile1 = fs.readFileSync('testdata/test1.html', 'utf8');

// TODO: Either flesh this out, or find an implementation
// Unfortunately jsdom doesn't support it - could use phantomjs, if not too bulky.
function FakeMutationObserver() {
  this.disconnect = function(){};
  this.observe = function(){};
};

describe('injector', function() {
  it('should inject something', promised(function() {
    return dom(testFile1, function(wnd) {
      var body = wnd.document.body;

      injector = createInjector(wnd.document, FakeMutationObserver);
      injector.initialContent({
          "api":1,
          "changes":{
            "1":{
              "match":[{"name":"P","index":1}],
              "content":{"text":"Replaced Content Yay"}
            }
          }
        });

      expect(body.innerHTML).toMatch(/<p>My initial content<\/p>/);
      injector.applyInitialChanges();
      expect(body.innerHTML).toMatch(/<p>Replaced Content Yay<\/p>/);

    })
  }));

});

function expectBefore(point1, point2) {
  expect(point1.compare(point2)).toBeLessThan(0);
}
function expectAfter(point1, point2) {
  expect(point1.compare(point2)).toBeGreaterThan(0);
}
function expectEquivalent(point1, point2) {
  expect(point1.compare(point2)).toBe(0);
}

function dom(html, func) {
  var deferred = Q.defer();

  jsdom.env({
      html: html, 
      done: function(err, wnd) { 
        if (err) {
          deferred.reject(err);
          return;
        }

        deferred.resolve(wnd);
      }
  });

  return func ? deferred.promise.then(func) : deferred.promise;
}

function promised(func) {
  return function(done) {
    (func() || Q.resolve())
    .then(done)
    .catch(function(err) {
      done(err);
    })
  };
}

