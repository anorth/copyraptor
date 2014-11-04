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
  }
};
