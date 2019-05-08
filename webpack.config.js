const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd'
  },
  externals: {
    ajv: 'ajv'
  },
  plugins: [
    new BundleAnalyzerPlugin()
  ],
};