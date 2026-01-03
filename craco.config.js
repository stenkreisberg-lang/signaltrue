const path = require('path');

module.exports = {
  style: {
    postcss: {
      mode: 'extends',
      loaderOptions: {
        postcssOptions: {
          ident: 'postcss',
          config: path.resolve(__dirname, 'postcss.config.js'),
        },
      },
    },
  },
};
