module.exports = {
  entry: '../client/injector.js',
  output: {
    path: __dirname + '/build',
    filename: 'copyraptor.js',
    publicPath: '/build/',

    sourceMapFilename: '[file].map',

  }
};
