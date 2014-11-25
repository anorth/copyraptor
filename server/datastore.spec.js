var datastore = require('./datastore');
var Q = require('q');

describe('Datastore tests', function () {

  var store;

  beforeEach(function () {
    this.addMatchers(customMatchers);
    var ds = new datastore.Datastore('postgres://copyraptor:copyraptor@localhost/copyraptor_test');
    store = ds.forTesting.dropData()
        .then(function() {return ds});
  });

  afterEach(function () {
    store = null;
  });

  it('should connect successfully', promised(function () {
    return store.then(function(store) {
      store.testConnection()
          .then(function(ok) {
            expect(ok).toBeTruthy();
          });
    });
  }));
});


function promised(func) {
  return function (done) {
    (func() || Q.resolve())
        .then(done)
        .catch(function (err) {
          done(err);
        })
  };
}

var customMatchers = {};
