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
function bundleJs(dir) {
  return INIT_MODULE + buildBundle(dir, 'js', processJs);
}

/**
 * Bootstrap js for dev mode, returning code that pulls in
 * all the unbundled but processed js files.
 */
function bootstrapJs(dir, files) {
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
function buildCss(dir) {
  return buildBundle(dir, 'css', function(name, content) {
    return '\n\n// === ' + name + ' ===\n\n' + content;
  });
}

/**
 * Bundles & processes files of a type inside a dir
 */
function buildBundle(dir, ext, process) {
  var files = fs.readdirSync(dir);
  var result = '';
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!f.match(new RegExp('[.]' + ext + '$'))) continue;

    result += process(f, fs.readFileSync(dir + '/' + f));
  }

  return result;
}


exports.bundleJs = bundleJs;
exports.buildCss = buildCss;
exports.processJs = processJs;
exports.bootstrapJs = bootstrapJs;
