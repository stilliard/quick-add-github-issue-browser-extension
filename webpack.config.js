const path = require('path');

module.exports = {
  entry: './popup/app.js',
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'popup/dist'),
  },
};
