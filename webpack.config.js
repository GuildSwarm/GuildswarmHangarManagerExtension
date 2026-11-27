const path = require('path')
const glob = require('glob')
const TerserPlugin = require('terser-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const { DefinePlugin } = require('webpack')

// Builds de desarrollo: `npm run build:local` añade SC Tools en local y `npm run build:dev` el entorno de dev. El manifest
// de la store solo lleva producción.
// En local vale cualquier puerto (un patrón sin puerto los cubre todos en Chrome): Vite en el 5173 o en el siguiente libre,
// o la imagen Docker de SC Tools en el 8080 para quien no quiere instalar Node (GMVP-633).
const LOCAL_MATCHES = ['http://localhost/*', 'http://127.0.0.1/*']
const DEV_MATCH = 'https://sctools.dev.guildswarm.org/*'
// (Producción incluye la beta pública, beta.sctools.guildswarm.org: sirve el build de staging a los testers, y sin ella en el
// manifest su web no encuentra la extensión y pide instalarla aunque esté.)
const withHosts = (content, hosts) => {
  const manifest = JSON.parse(content.toString())
  const bridge = manifest.content_scripts.find((script) => script.js.includes('content/sctoolsBridge.js'))
  bridge.matches.push(...hosts)
  manifest.host_permissions.push(...hosts)
  return JSON.stringify(manifest, null, 4)
}

// Solo para probar en local (prototipo de cerrar escalera, 2026-11-27): `--env fakeRsi=http://localhost:5320` toma el hangar falso de
// devtools/fake-rsi como RSI. Nunca en la build de la store.
const withFakeRsi = (content, fakeRsi) => {
  if (!fakeRsi) return content
  const manifest = JSON.parse(content.toString())
  manifest.content_scripts[0].matches.push(`${fakeRsi}/*/account/pledges*`)
  manifest.web_accessible_resources[0].matches.push(`${fakeRsi}/*`)
  manifest.host_permissions.push(`${fakeRsi}/*`)
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
    new DefinePlugin({ 'process.env.RSI_BASE': JSON.stringify(env.fakeRsi || '') }),
    new CopyPlugin({
      patterns: [
        { from: './manifest.json', to: 'manifest.json', transform: (content) => withFakeRsi(withHosts(content, [...(env.local ? LOCAL_MATCHES : []), ...(env.dev ? [DEV_MATCH] : [])]), env.fakeRsi) },
        { from: './content/styles.css', to: './content/styles.css' },
        { from: './guildswarm_*.png', to: '[name][ext]' },
        { from: './_locales', to: '_locales' },
        { from: './assets', to: 'assets' }
      ]
    })
  ]
})
