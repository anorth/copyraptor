/**
 * Calculates and applies matchers specifying DOM elements.
 */
'use strict';

var util = require('./common');
var assert = util.assert;
var foreach = util.foreach;
var log = util.log;
var warn = util.warn;

module.exports = function Matcher(bodyElt) {
  var me = this;

  /**
   * Builds a matcher specifying the path from an element up to the body. The result is an array of
   * objects describing each level, bottom-up.
   */
  me.matcherForElt = function(eltToMatch) {
    var path = []; // Bottom up order
    var ancestor = eltToMatch;
    while (ancestor !== bodyElt && ancestor !== undefined) {
      var siblingIndex = 0, sib = ancestor;
      while ((sib = sib.previousSibling) !== null) {
        if (sib.children /* Elements only */ !== undefined) {
          siblingIndex++;
        }
      }

      path.push({
        "name": ancestor.nodeName,
        "index": siblingIndex,
        "id": ancestor.id || undefined,
        "class": normalizeClass(ancestor.className)
      });
      // TODO(alex): include signature of existing content

      ancestor = ancestor.parentElement;
    }
    return path;
  };

  /**
   * Finds the element matching a path built by matcherForElt under the body.
   */
  me.findElement = function(match) {
    // TODO(alex): Fall back to heuristics based on match path properties if not found.
    return traverseMatchFromTop(match, bodyElt);
  };
};

///// Implementation /////

// Traces a match from a top node, seeking matching leaf.
// Returns an element, or null.
function traverseMatchFromTop(match, top) {
  var pathFromTop = match.slice();
  pathFromTop.reverse();
  var el = top, matchPart;
  for (var level in pathFromTop) {
    matchPart = pathFromTop[level];
    if (el.children.length <= matchPart.index) {
      log("Index OOB", matchPart, el);
      el = null;
      break;
    }
    var child = el.children[matchPart.index];
    if (child.nodeName !== matchPart.name) {
      log("Mismatched name", matchPart, child);
      el = null;
      break;
    }
    if ((matchPart.id || child.id) && child.id !== matchPart.id) {
      log("Mismatched id", matchPart, child);
      el = null;
      break;
    }
    if ((matchPart.class || child.className) && normalizeClass(child.className) !== matchPart.class) {
      log("Mismatched id", matchPart, child);
      el = null;
      break;
    }
    el = child;
  }
  return el;
}

function normalizeClass(className) {
  if (!!className) {
    var parts = className.split(" ");
    parts.sort();
    return parts.join(" ");
  } else {
    return undefined;
  }
}
