const path = require('path')
const glob = require('glob')
const TerserPlugin = require('terser-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  entry: glob.sync('./background/**/*.js').reduce((entries, file) => {
    const entryName = path.relative('./background', file).replace(/\.js$/, '')
    entries[entryName] = file
    return entries
  }, {}),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          mangle: true,
          compress: {
            drop_console: false
          }
        }
      })
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: './manifest.json', to: 'manifest.json' },
        { from: './guildswarm_128.png', to: 'guildswarm_128.png' }
      ]
    })
  ]
}
