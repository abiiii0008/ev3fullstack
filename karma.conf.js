// karma.conf.js - configuration for Jasmine + Karma + coverage
module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: [
      'src/**/*.spec.js',
      'src/**/*.test.js'
    ],
    preprocessors: {
      'src/**/*.js': ['webpack', 'sourcemap']
    },
    webpack: {
      // simple webpack config for tests
      mode: 'development',
      module: {
        rules: [
          {
            test: /\.jsx?$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: ['@babel/preset-env', '@babel/preset-react']
              }
            }
          }
        ]
      },
      resolve: {
        extensions: ['.js', '.jsx']
      },
      devtool: 'inline-source-map'
    },
    reporters: ['progress', 'coverage'],
    coverageReporter: {
      type: 'html',
      dir: 'coverage/'
    },
    browsers: ['ChromeHeadless'],
    singleRun: true,
    concurrency: Infinity
  });
};
