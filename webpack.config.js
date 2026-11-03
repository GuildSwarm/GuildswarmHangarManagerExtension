const path = require('path')
const glob = require('glob')
const TerserPlugin = require('terser-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

// Build local (`npm run build:local`): el puente también se inyecta en el servidor de desarrollo de SC Tools
// (Vite, :5173), y tiene permiso de host para inyectarlo. El manifest de producción no lleva localhost.
const LOCAL_MATCH = 'http://localhost:5173/*'
const withLocalhost = (content) => {
  const manifest = JSON.parse(content.toString())
  const bridge = manifest.content_scripts.find((script) => script.js.includes('content/sctoolsBridge.js'))
  bridge.matches.push(LOCAL_MATCH)
  manifest.host_permissions.push(LOCAL_MATCH)
  return JSON.stringify(manifest, null, 4)
}

module.exports = (env = {}) => ({
  entry: {
    ...glob.sync('./background/**/*.js').reduce((entries, file) => {
      const entryName = path.relative('./background', file).replace(/\.js$/, '')
      entries[`background/${entryName}`] = file
      return entries
    }, {}),
    ...glob.sync('./content/**/*.js').reduce((entries, file) => {
      const entryName = path.relative('./content', file).replace(/\.js$/, '')
      entries[`content/${entryName}`] = file
      return entries
    }, {})
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  optimization: {
    minimize: false,
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
        { from: './manifest.json', to: 'manifest.json', transform: (content) => (env.local ? withLocalhost(content) : content) },
        { from: './content/styles.css', to: './content/styles.css' },
        { from: './guildswarm_*.png', to: '[name][ext]' },
        { from: './_locales', to: '_locales' },
        { from: './assets', to: 'assets' }
      ]
    })
  ]
})
