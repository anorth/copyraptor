// Utilities for Express requests and responses

module.exports = {
  promiseHandler: function(handler) {
    return function(req, res) {
      handler(req, res).catch(function(err) {
        if (err.httpcode) {
          res.status(err.httpcode).send(err);
        } else {
          console.log(err);
          res.status(500).send({message: 'Internal error'});
        }
        next(err);
      });
    }
  }
};
