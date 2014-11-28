var datastore = require('../datastore');
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
      return store.testConnection()
          .then(function(ok) {
            expect(ok).toBeTruthy();
          });
    });
  }));

  it('should add a new site', promised(function () {
    return store.then(function(store) {
      return store.putSite('site', 'password', 'email@example.com', 'User Name')
          .then(function(ok) {
            expect(ok).toBeTruthy();
          }).then(function() {
            return store.getSite('site');
          }).then(function(site) {
            expect(site.sitekey).toEqual('site');
            expect(site.password).toBeTruthy();
            expect(site.owner).toBeTruthy();
          });
    });
  }));

  it('should reject duplicate site key', promised(function () {
    return store.then(function(store) {
      return store.putSite('site', 'password', 'email@example.com', 'User Name')
          .then(function(ok) {
            expect(ok).toBeTruthy();
            return store.putSite('site', 'pass', 'some@exmple.com', 'Who')
          }).then(function(ok) {
            fail();
          }).catch(function(err) {
            expect(err.code).toEqual("23505");
          });
          // TODO(alex): check no user account created, i.e. transactional
    });
  }));


  it('should check site password', promised(function () {
    return store.then(function(store) {
      return store.putSite('site', 'password', 'email@example.com', 'User Name')
          .then(function(ok) {
            expect(ok).toBeTruthy();
          }).then(function() {
            return store.checkLogin('site', 'xxx');
          }).then(function(ok) {
            expect(ok).toBe(false);
          }).then(function() {
            return store.checkLogin('site', 'password')
          }).then(function(ok) {
            expect(ok).toBe(true);
          });
    });
  }));
});

function fail() {
  expect(false).toBeTruthy();
}


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
