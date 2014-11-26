var pg = require('pg');
var Q = require('q');

pg.defaults.poolSize = 16; // Heroku hobby limit is 20, leave a few for admin.

/**
 * All methods return promises.
 */
exports.Datastore = function Datastore(url) {
  var me = this;

  /** Returns true if a simple query succeeds. */
  me.testConnection = function() {
    return oneshot('SELECT COUNT(*) FROM site')
        .then(function(result) {
          return true;
        });
  };

  /** Inserts a site owned by a new user. */
  me.putSite = function(sitekey, password, email, username) {
    var tx = transaction();
    return tx.begin().then(function() {
      return tx.query('INSERT INTO account (email, name) VALUES ($1, $2) RETURNING id', [email, username]);
    }).then(function(result) {
      var id = result.rows[0]['id'];
      //console.log('Account created with id ' + id);
      return tx.query('INSERT INTO site (sitekey, password, owner) VALUES ($1, crypt($2, gen_salt(\'bf\')), $3)',
          [sitekey, password, id]);
    }).then(function(result) {
      console.log("New site", sitekey, email);
      return tx.commit();
    });
  };

  /** Fetches a site by key. */
  me.getSite = function(sitekey) {
    return oneshot('SELECT * FROM site WHERE sitekey = $1', [sitekey])
        .then(function(result) {
          if (result.rowCount > 0) {
            return result.rows[0];
          } else {
            return null;
          }
        });
  };

  /** Checks login against a site password. */
  me.checkLogin = function(site, password) {
    return oneshot('SELECT * FROM site_with_owner WHERE sitekey = $1 AND password = crypt($2, password)', [site, password])
        .then(function(result) {
          return result.rowCount > 0;
        });
  };

  me.forTesting = {
    dropData: function() {
      return oneshot('DELETE FROM site; DELETE FROM account;')
          .then(function(result) {
            return true;
          });
    }
  };

  /** Returns a promise with [client, done]. Use Q.spread to unpack args. */
  function connect() {
    return Q.Promise(function (resolve, reject) {
      pg.connect(url, function (err, client, done) {
        if (!err) {
          resolve([client, done]);
        } else {
          console.log("Postgres connection failed: " + err);
          done();
          reject(err);
        }
      });
    });
  }

  /** Executes a non-transactional parameterized query with a pooled connection. */
  function oneshot(query, params) {
    return connect()
        .spread(function(client, done) {
          return Q.Promise(function(resolve, reject) {
            client.query(query, params, function(err, result) {
              done();
              if (!err) {
                resolve(result);
              } else {
                reject(err);
              }
            });
          });
        });
  }

  function transaction() {
    var qConnect;

    function begin(client, done) {
      return Q.promise(function(resolve, reject) {
        client.query('BEGIN', function(err) {
          if (!err) {
            resolve();
          } else {
            done(err);
            reject(err);
          }
        });
      });
    }

    function rollback(client, done) {
      return Q.promise(function(resolve, reject) {
        client.query('ROLLBACK', function(err) {
          done(err);
          if (!err) resolve(); else reject(err);
        });
      });
    }

    function commit(client, done) {
      return Q.promise(function(resolve, reject) {
        client.query('COMMIT', function(err) {
          done(err);
          if (!err) resolve(true); else reject(err);
        });
      });
    }

    var tx = {};

    // Returns a promise satisfied when connected.
    tx.begin = function() {
      qConnect = connect();
      return qConnect.spread(function(client, done) {
            return begin(client, done);
          });
    };

    tx.query = function(query, params) {
      return qConnect.spread(function(client, done) {
        return Q.promise(function(resolve, reject) {
          client.query(query, params, function(err, result) {
            if (!err) {
              resolve(result);
            } else {
              reject(err);
            }
          });
        })
      });
    };

    tx.commit = function() {
      return qConnect.spread(commit);
    };

    tx.rollback = function() {
      return qConnect.spread(rollback);
    };

    return tx;
  }
};

