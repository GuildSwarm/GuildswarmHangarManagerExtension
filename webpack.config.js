const TerserPlugin = require('terser-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  entry: './hangarScript.js',
  output: {
    filename: 'hangarScript.js'
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          mangle: true,
          compress: {
            drop_console: true
          }
        }
      })
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: './manifest.json', to: 'manifest.json' },
        { from: './background.js', to: 'background.js' },
        { from: './guildswarm_128.png', to: 'guildswarm_128.png' }
      ]
    })
  ]
}
