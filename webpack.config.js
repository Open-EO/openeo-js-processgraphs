const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const UnminifiedWebpackPlugin = require('unminified-webpack-plugin');

module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'main.min.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd'
  },
  externals: {
    ajv: 'Ajv'
  },
  plugins: [
    new UnminifiedWebpackPlugin(),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static'
    })
  ],
};