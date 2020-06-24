const { resolve } = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const dev = process.env.NODE_ENV === 'development';
const INCLUDE = resolve(__dirname, 'src');

const config = {
  mode: dev ? 'development' : 'production',

  target: 'node',

  devtool: 'inline-source-map',

  watch: dev,

  entry: './src/index.ts',

  output: {
    filename: 'index.js',
    path: __dirname + '/build',
    libraryTarget: 'umd',
    library: 'qusly-core',
  },

  module: {
    rules: [
      {
        test: /\.tsx|ts$/,
        include: INCLUDE,
        use: [
          {
            loader: 'ts-loader',
            options: {
              // transpileOnly: dev,
            },
          },
        ],
      },
    ],
  },

  // plugins: [new ForkTsCheckerWebpackPlugin()],

  resolve: {
    modules: ['node_modules'],
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '~': INCLUDE,
    },
  },

  devServer: {
    writeToDisk: true,
  },
};

module.exports = config;
