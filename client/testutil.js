var jsdom = require('jsdom');
var Q = require('q');

module.exports = {
  dom: function (pathOrHtml, func) {
    var deferred = Q.defer();
    jsdom.env({
      html: pathOrHtml,
      done: function (err, wnd) {
        if (err) {
          deferred.reject(err);
          return;
        }

        deferred.resolve(wnd);
      }
    });

    return func ? deferred.promise.then(func) : deferred.promise;
  },

  promised: function (func) {
    return function (done) {
      (func() || Q.resolve())
          .then(done)
          .catch(function (err) {
            done(err);
          })
    };
  },

  // TODO: Either flesh this out, or find an implementation
  // Unfortunately jsdom doesn't support it - could use phantomjs, if not too bulky.
  FakeMutationObserver: function () {
    this.disconnect = function () {};
    this.observe = function () {};
  }
};
