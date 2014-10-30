module.exports = {
  entry: './injector.js',
  output: {
    path: __dirname + '/build',
    filename: 'copyraptor.js',
    publicPath: 'http://localhost:5544/build/',

    sourceMapFilename: '[file].map'
  }
};
