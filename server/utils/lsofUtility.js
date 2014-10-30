
var sys = require('sys');
var Q = require('q');
var exec = Q.nfbind(require('child_process').exec);
var _ = require('lodash');

var START_PORT = 10000;
var MAX_PORT = 40000;
var NUM_ITER = 2;

function LsofUtility() {
  if (!(this instanceof LsofUtility)) {
    return new LsofUtility();
  }

  var self = this;
  self.usedPorts = {};
  self.promise = Q.resolve();
}

/**
 * Synchronises the list of ports in use with the list of new ports
 **/
LsofUtility.prototype.syncPorts = function(newPorts) {
  var self = this,
      usedPorts = Object.keys(self.usedPorts);  

  var removePorts = _.difference(usedPorts, newPorts);

  _.each(removePorts, function(value) {
    if (self.usedPorts[value] === 0) {
      delete self.usedPorts[value];
    } else {
      self.usedPorts[value]--;
    }
  });

  _.each(newPorts, function(value) {
    self.usedPorts[value] = NUM_ITER;
  });
}

/**
 *  Returns the next available port
 **/
LsofUtility.prototype.getFreePort = function() {
  var self = this;

  return self.promise.then(function() {
    for (var i = START_PORT; i <= MAX_PORT; i++) {
      if (!self.usedPorts[i]) {
        self.usedPorts[i] = NUM_ITER;
        return i;
      }
    }
    throw new Exception("Unable to allocate port.");
  });
}

/**
 * Returns the current port mapping for port to domain.
 **/
LsofUtility.prototype.getUsedPorts = function() {
  var self = this;
  return self.promise.then(function() {
    return self.usedPorts;
  });
}

/**
 * Runs the lsof command to update the list of ports
 */
LsofUtility.prototype.run = function() {
  var self = this,
      parsePorts = function(res) {
        if (res == "") {
          self.syncPorts([]);
        } else {
          self.syncPorts(res.trim().split('\n'));
        }
      }

  self.promise = exec("lsof -i :10000-40000 -P | egrep 'LISTEN' | awk '{ print $9 }' | cut -d ':' -f2")
    .spread(parsePorts);
}

exports = module.exports = LsofUtility;
