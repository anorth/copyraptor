var CLIENT_SRC = exports.CLIENT_SRC = __dirname + '/../client/';
var CLIENT_FILES = exports.CLIENT_FILES = [
    'util.js',
    'focus-rect.js',
    'editor.js',
    'app.js',
    'injector.js'
  ];

var fs = require('fs');

// Not called on server side, converted to string for client side.
var importFunc = function(m) {
  for (var k in m) {
    module[k] = m[k];
  }
};


/**
 * Processes an individual JS file (wrapping it in 
 # module code, etc).
 */
function processJs(content) {

  return (
      '(function(window, document, copyraptor) { ' +
      'var module = {' +
      'import:' + importFunc.toString().replace(/\n/g, ' ') +
      '}; ' +
      // need a nested function for inner functions to work, otherwise their scope
      // gets bound outside the with statement.
      'with (module) { (function() {' + 
      content + '\n' +
      '})(); } \n' +
      '})(window, document, window.copyraptor);'
    );
}

var INIT_MODULE = 'window.copyraptor = {};';

/**
 * Returns all js processed and bundled into one string.
 */
function bundleJs() {
  var dir = CLIENT_SRC;
  var files = CLIENT_FILES;
  return INIT_MODULE + buildBundle(dir, files, processJs);
}

/**
 * Bootstrap js for dev mode, returning code that pulls in
 * all the unbundled but processed js files.
 */
function bootstrapJs() {
  var dir = CLIENT_SRC;
  var files = CLIENT_FILES;

  var result = INIT_MODULE + '\n';
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!f.match(/[.]js$/)) continue;

    var src = '/copyraptor/js/' + f;

    result += 'document.write("<script type=\\"text/javascript\\" src=\\"' + 
        src + '\\"></script>");\n';

  }

  return result;
}

/**
 * Bundles all css files together.
 */
function buildCss() {
  var dir = CLIENT_SRC;
  var files = ['copyraptor.css'];

  return buildBundle(dir, files, function(content) {
    return content;
  });
}

/**
 * Bundles & processes files of a type inside a dir
 */
function buildBundle(dir, files, process) {
  var result = '';
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    result += process(fs.readFileSync(dir + '/' + f));
  }

  return result;
}


exports.bundleJs = bundleJs;
exports.buildCss = buildCss;
exports.processJs = processJs;
exports.bootstrapJs = bootstrapJs;
