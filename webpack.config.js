const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background/index.ts',
    content: './src/content/index.ts',
    popup: './src/popup/index.ts',
    dashboard: './src/dashboard/index.ts',
    onboarding: './src/onboarding/index.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '../dist' },
        { from: 'popup.html', to: '../dist' },
        { from: 'dashboard.html', to: '../dist' },
        { from: 'onboarding.html', to: '../dist' },
        { from: 'uninstall.html', to: '../dist' },
        { from: 'icons', to: '../dist/icons' }
      ]
    })
  ],
  devtool: 'source-map'
};
