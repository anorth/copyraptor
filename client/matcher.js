/**
 * Calculates and applies matchers specifying DOM elements.
 */
'use strict';

var util = require('./common');
var assert = util.assert;
var foreach = util.foreach;
var log = util.log;
var warn = util.warn;

var NAME = "nm", INDEX = "ix", ID = "id", CLASS="cs", CONTENT_HASH="ch", CONTENT="ct", TAG="tg";
var tagClassPattern = /\b(cr-[\w_-]+)\b/;

module.exports = function Matcher(bodyElt) {
  'use strict';
  var me = this;


  /**
   * Builds a matcher specifying the path from an element up to the body. The result is an array of
   * objects describing each level, bottom-up. If the element is tagged with a copyraptor class name,
   * of the form class="copyraptor cr-tag" the array will be of length one with an entry specifying that class.
   *
   * May return null if an element is tagged incorrectly.
   */
  me.matcherForElt = function(eltToMatch, origContent) {
    assert(eltToMatch != bodyElt);
    if (tagClassPattern.test(eltToMatch.className)) {
      return classMatcherForElt(eltToMatch, origContent);
    } else {
      return pathMatcherForElt(eltToMatch, origContent, bodyElt);
    }
  };

  /**
   * Finds the elements matching a path built by matcherForElt under the body.
   *
   * If the matcher specifies a class tag, all element with that tag are returned (whether or not they also
   * have class "copyraptor").
   */
  me.findElements = function(match, allowMismatchedContent) {
    try {
      if (match[0][TAG]) {
        return findClassMatches(match, bodyElt);
      } else {
        return traverseMatchFromTop(match, bodyElt, allowMismatchedContent);
      }
    } catch (e) {
      log("Exception executing match", match, e);
      return null;
    }
  };
};

///// Implementation /////

function pathMatcherForElt(eltToMatch, origContent, bodyElt) {
  var path = []; // Bottom up order
  var ancestor = eltToMatch;
  while (ancestor !== bodyElt && ancestor !== undefined) {
    var siblingIndex = 0, sib = ancestor;
    while ((sib = sib.previousSibling) !== null) {
      if (sib.children /* Elements only */ !== undefined) {
        siblingIndex++;
      }
    }

    var step = {};
    step[NAME] = ancestor.nodeName;
    step[INDEX] = siblingIndex;
    step[ID] = ancestor.id || undefined;
    step[CLASS] = normalizeClass(ancestor.className);
    path.push(step);

    ancestor = ancestor.parentElement;
  }

  path[0][CONTENT_HASH] = hashHtml(origContent || eltToMatch.innerHTML);
  path[0][CONTENT] = origContent || eltToMatch.innerHTML; // Debug only
  return path;
}

function classMatcherForElt(eltToMatch, origContent) {
  var match = tagClassPattern.exec(eltToMatch.className);
  if (match != null) {
    var tag = match[1].substr(3); // Just use the first tag class
    var step = {};
    step[TAG] = tag;
    return [step];
  }
  log("Elt tagged incorrectly, must have exactly one cr-[tag] class", eltToMatch);
  return null;
}

// Traces a match from a top node, seeking matching leaf.
// Returns an array with a single element, or null.
function traverseMatchFromTop(match, top, allowMismatchedContent) {
  var pathFromTop = match.slice();
  pathFromTop.reverse();
  var el = top, matchPart;
  for (var level = 0; level < pathFromTop.length; ++level) {
    matchPart = pathFromTop[level];
    if (el.children.length <= matchPart[INDEX]) {
      //log("Index OOB", matchPart, el);
      el = null;
      break;
    }
    var child = el.children[matchPart[INDEX]];
    if (child.nodeName !== matchPart[NAME]) {
      //log("Mismatched name", matchPart, child);
      el = null;
      break;
    }
    if ((matchPart[ID] || child.id) && child.id !== matchPart[ID]) {
      //log("Mismatched id", matchPart, child);
      el = null;
      break;
    }
    // NOTE(alex): Filtering on classes isn't appropriate as dynamic pages often change them, e.g. tab.active.
    //if ((matchPart.class || child.className) && normalizeClass(child.className) !== matchPart.class) {
    //  //log("Mismatched class", matchPart, child);
    //  el = null;
    //  break;
    //}
    el = child;
  }
  if (!allowMismatchedContent && el && matchPart[CONTENT_HASH] && (hashHtml(el.innerHTML) != matchPart[CONTENT_HASH])) {
    log("Mismatched content hash, expected " + /*matchPart[CONTENT] + ", " +*/ matchPart[CONTENT_HASH] +
      " but was " + hashHtml(el.innerHTML)/* + ", " + el.innerHTML*/);
    el = null;
  }
  return (el != null) ? [el] : null;
}

function findClassMatches(match, top) {
  var className = 'cr-' + match[0][TAG];
  var collection = top.getElementsByClassName(className);
  var results = [];
  for (var i = 0; i < collection.length; ++i) {
    results.push(collection[i]);
  }
  return results;
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

function hashHtml(htmlStr) {
  htmlStr = htmlStr.replace(/\s+/gm, '');
  return hashString(htmlStr.toLowerCase());
}

/**
 * Produces a non-cryptographic hash of a string. This is the same algorithm as Java's String::hashCode().
 *
 * For better distribution, similar performance, but at cost of more code, consider
 * https://github.com/garycourt/murmurhash-js
 */
function hashString(str) {
  var hash = 0, i, chr, len;
  if (str.length == 0) return hash;
  for (i = 0, len = str.length; i < len; i++) {
    chr   = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
