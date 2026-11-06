const path = require('path')
const glob = require('glob')
const TerserPlugin = require('terser-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

// Builds de desarrollo: `npm run build:local` añade el servidor de SC Tools (Vite, :5173) y `npm run build:dev` el entorno
// de dev. El manifest de la store solo lleva producción.
const LOCAL_MATCH = 'http://localhost:5173/*'
const DEV_MATCH = 'https://sctools.dev.guildswarm.org/*'
const withHosts = (content, hosts) => {
  const manifest = JSON.parse(content.toString())
  const bridge = manifest.content_scripts.find((script) => script.js.includes('content/sctoolsBridge.js'))
  bridge.matches.push(...hosts)
  manifest.host_permissions.push(...hosts)
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
        { from: './manifest.json', to: 'manifest.json', transform: (content) => withHosts(content, [...(env.local ? [LOCAL_MATCH] : []), ...(env.dev ? [DEV_MATCH] : [])]) },
        { from: './content/styles.css', to: './content/styles.css' },
        { from: './guildswarm_*.png', to: '[name][ext]' },
        { from: './_locales', to: '_locales' },
        { from: './assets', to: 'assets' }
      ]
    })
  ]
})
