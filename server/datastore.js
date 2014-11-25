var pg = require('pg');
var Q = require('q');

pg.defaults.poolSize = 16; // Heroku hobby limit is 20, leave a few for admin.

exports.Datastore = function Datastore(url) {
  var me = this;

  me.testConnection = function() {
    return oneshot('SELECT COUNT(*) FROM site')
        .then(function(result) {
          return true;
        });
  };

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

  /** Returns a promise of a boolean indicating login success. */
  me.checkLogin = function(site, password) {
    return oneshot('SELECT * FROM site_with_owner WHERE sitekey = $1 AND password = crypt($2, password)', [site, password])
        .then(function(result) {
          return result.rowCount > 0;
        });
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
};

