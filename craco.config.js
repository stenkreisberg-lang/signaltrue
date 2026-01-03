const path = require('path');

module.exports = {
  style: {
    postcssOptions: {
      plugins: [
        require('tailwindcss')(path.resolve(__dirname, 'tailwind.config.cjs')),
        require('autoprefixer'),
      ],
    },
  },
};
