// Un hangar de RSI falso, solo para probar en local la guía para cerrar una escalera (prototipo 2026-11-27). No es RSI ni lo imita: tiene las
// piezas que lee la extensión (la lista ul.list-items con sus input.js-pledge-*, el paginador y el botón .js-apply-upgrade) y una ventana
// «Apply Upgrade» hecha a mano con lo que se sabe de la de RSI: chooseUpgradeTarget devuelve filas con un botón de opción por pledge (su valor
// es el pledge id, su nombre con "(#id)") y applyUpgrade pide la contraseña. Al aplicar, el CCU desaparece y el pledge pasa a la nave de destino.
//
//   node devtools/fake-rsi/server.mjs [puerto]     (5320 por defecto; GET /__reset vuelve al hangar inicial, GET /__state lo enseña)
//
// Con `pnpm build:fakersi` la extensión toma http://localhost:5320 como RSI.
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const PORT = Number(process.argv[2] ?? 5320)
// El hangar como lo exportaría la extensión, para meterlo en su Auto Sync al probar: fuera del repo, para que nunca se suba
const EXPORT_FILE = path.join(tmpdir(), 'guildswarm-fake-rsi-hangar.json')

// El hangar de prueba: un Avenger Titan con LTI (la base de la escalera), otro Avenger Titan en un paquete (para que la ventana de RSI ofrezca
// dos pledges), la escalera Titan → Cutlass Black → Freelancer MAX → Corsair, dos CCU trampa que salen de las mismas naves hacia otro
// destino, y relleno para que haya varias páginas.
const initial = () => [
  { id: 30101, kind: 'ship', productType: 'standalone_ship', name: 'Standalone Ship - Avenger Titan', ship: 'Avenger Titan', value: 60, lti: true, date: 'March 02, 2024' },
  { id: 30102, kind: 'ship', productType: 'game_package', name: 'Package - Avenger Titan Starter Pack', ship: 'Avenger Titan', value: 75, lti: false, date: 'May 18, 2023' },
  { id: 40201, kind: 'ccu', name: 'Upgrade - Avenger Titan to Cutlass Black', from: 'Avenger Titan', to: 'Cutlass Black', value: 30, date: 'November 21, 2026' },
  { id: 40202, kind: 'ccu', name: 'Upgrade - Avenger Titan to Cutlass Red', from: 'Avenger Titan', to: 'Cutlass Red', value: 45, date: 'November 20, 2026' },
  { id: 40203, kind: 'ccu', name: 'Upgrade - Aurora MR to Mustang Alpha', from: 'Aurora MR', to: 'Mustang Alpha', value: 5, date: 'November 19, 2026' },
  { id: 40204, kind: 'ccu', name: 'Upgrade - Mustang Alpha to Avenger Titan', from: 'Mustang Alpha', to: 'Avenger Titan', value: 25, date: 'November 18, 2026' },
  { id: 40205, kind: 'ccu', name: 'Upgrade - Cutlass Black to C1 Spirit', from: 'Cutlass Black', to: 'C1 Spirit', value: 10, date: 'November 17, 2026' },
  { id: 40206, kind: 'ccu', name: 'Upgrade - Cutlass Black to Freelancer MAX', from: 'Cutlass Black', to: 'Freelancer MAX', value: 25, date: 'November 16, 2026' },
  { id: 40207, kind: 'ccu', name: 'Upgrade - Aurora MR to Avenger Titan', from: 'Aurora MR', to: 'Avenger Titan', value: 30, date: 'November 15, 2026' },
  { id: 40208, kind: 'ccu', name: 'Upgrade - Mustang Alpha to Cutlass Black', from: 'Mustang Alpha', to: 'Cutlass Black', value: 60, date: 'November 14, 2026' },
  { id: 40209, kind: 'ccu', name: 'Upgrade - Aurora MR to C1 Spirit', from: 'Aurora MR', to: 'C1 Spirit', value: 80, date: 'November 13, 2026' },
  { id: 40210, kind: 'ccu', name: 'Upgrade - Mustang Alpha to Freelancer MAX', from: 'Mustang Alpha', to: 'Freelancer MAX', value: 100, date: 'November 12, 2026' },
  { id: 40211, kind: 'ccu', name: 'Upgrade - Freelancer MAX to Corsair', from: 'Freelancer MAX', to: 'Corsair', value: 60, date: 'November 11, 2026' },
  ...Array.from({ length: 8 }, (_, i) => ({ id: 50300 + i, kind: 'flair', productType: 'hangar_decoration', name: `Hangar decoration ${i + 1}`, value: 5 + i, date: 'January 10, 2025' }))
]
let pledges = initial()

const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c])
const productTypeOf = (p) => (p.kind === 'ccu' ? 'upgrade' : p.productType)
const contentsOf = (p) => (p.kind === 'ccu' ? [p.name] : p.kind === 'ship' ? [p.ship, ...(p.lti ? ['Lifetime Insurance'] : ['6 Months Insurance']), ...(p.productType === 'game_package' ? ['Star Citizen Digital Download'] : [])] : [p.name])

const item = (p) => {
  const upgrade = p.kind === 'ccu' ? `<input type="hidden" class="js-upgrade-data" value="${escape(JSON.stringify({ match_items: [{ name: p.from }], target_items: [{ name: p.to }] }))}">` : ''
  const contents = contentsOf(p)
  return `<li class="pledge">
    <input type="hidden" class="js-pledge-id" value="${p.id}">
    <input type="hidden" class="js-pledge-name" value="${escape(p.name)}">
    <input type="hidden" class="js-pledge-value" value="$${p.value}.00 USD">
    ${upgrade}
    <div class="item-image-wrapper"><div class="image" style="background-image:url('/media/none.jpg')"></div></div>
    <div class="title-col"><h3>${escape(p.name)}</h3><span class="pid">#${p.id}${p.upgraded ? ' · upgraded' : ''}</span></div>
    <div class="date-col">Created: <br>${p.date}</div>
    <div class="items-col">Contains: ${escape(contents.join(', '))}</div>
    <div class="items">${contents.map((c) => `<div class="item"><div class="title">${escape(c)}</div><div class="kind">${p.kind === 'ccu' ? 'Upgrade' : c.includes('Insurance') ? 'Insurance' : 'Ship'}</div></div>`).join('')}</div>
    <div class="value-col">$${p.value}.00 USD</div>
    <div class="actions">${p.kind === 'ccu' ? '<a href="#" class="shadow-button js-apply-upgrade">Apply Upgrade</a>' : ''}<a href="#" class="shadow-button gift">Gift</a></div>
  </li>`
}

const page = (url) => {
  const pageNumber = Math.max(1, Number(url.searchParams.get('page') ?? 1))
  const size = Math.max(1, Math.min(50, Number(url.searchParams.get('pagesize') ?? 10)))
  const type = url.searchParams.get('product-type')
  const list = pledges.filter((p) => !type || productTypeOf(p) === type)
  const pages = Math.max(1, Math.ceil(list.length / size))
  const shown = list.slice((pageNumber - 1) * size, pageNumber * size)
  const link = (n) => { const u = new URL(url); u.searchParams.set('page', String(n)); u.searchParams.set('pagesize', String(size)); return `${u.pathname}${u.search}` }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fake RSI hangar (local test)</title>
<style>
  body { margin: 0; background: #0b1117; color: #c8d3dd; font: 15px/1.4 system-ui, sans-serif; }
  .banner { padding: 8px 16px; background: #5a3d00; color: #ffe2a8; font-size: 13px; }
  main { max-width: 1100px; margin: 0 auto; padding: 24px; }
  h2.title { color: #fff; font-size: 26px; text-transform: uppercase; letter-spacing: 2px; }
  .filters a { color: #7fc4ff; margin-right: 14px; }
  ul.list-items { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px; }
  li.pledge { display: grid; grid-template-columns: 70px 2fr 1fr 2fr 90px auto; gap: 14px; align-items: center; padding: 14px; background: #121c26; border: 1px solid #1f2d3a; border-radius: 4px; }
  li.pledge h3 { margin: 0; color: #fff; font-size: 16px; }
  .pid { color: #7a8a99; font-size: 12px; }
  .image { width: 64px; height: 40px; background: #1d2b38; }
  .items { display: none; }
  .shadow-button { display: inline-block; margin: 2px; padding: 6px 12px; border: 1px solid #3b6c95; color: #bfe3ff; text-decoration: none; font-size: 13px; text-transform: uppercase; }
  div.pager { display: flex; justify-content: space-between; margin-top: 16px; }
  div.pager a { color: #7fc4ff; }
  .modal-bg { position: fixed; inset: 0; background: rgb(0 0 0 / .7); display: grid; place-items: center; z-index: 100; }
  .modal { width: min(560px, 92vw); background: #0f1821; border: 1px solid #2c4357; padding: 24px; color: #dbe6ef; }
  .modal h2 { margin-top: 0; color: #fff; text-transform: uppercase; font-size: 18px; }
  .modal .row { padding: 8px; border-bottom: 1px solid #1d2b38; }
  .modal input[type=password] { width: 100%; margin: 16px 0 8px; padding: 8px; background: #08111a; color: #fff; border: 1px solid #2c4357; }
  .modal .buttons { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
  .modal button { padding: 8px 16px; background: #1f4a6e; color: #fff; border: 0; cursor: pointer; }
  .modal .error { color: #ff9b8e; min-height: 20px; }
</style></head><body>
<div class="banner">Hangar de pruebas en local (devtools/fake-rsi). Nada de esto es RSI.</div>
<main>
  <h2 class="title">My hangar</h2>
  <p class="filters"><a href="?page=1&pagesize=10">All</a><a href="?page=1&pagesize=10&product-type=upgrade">Upgrades</a><a href="?page=1&pagesize=10&product-type=standalone_ship">Standalone ships</a></p>
  <ul class="list-items">${shown.map(item).join('')}</ul>
  <div class="pager"><div class="left">${pageNumber > 1 ? `<a class="lt" href="${link(pageNumber - 1)}">‹ Prev</a>` : ''}</div><span>Page ${pageNumber} of ${pages}</span><div class="right">${pageNumber < pages ? `<a class="gt" href="${link(pageNumber + 1)}">Next ›</a>` : ''}</div></div>
</main>
<script>
  // La ventana «Apply Upgrade», hecha a mano: pide a qué pledges va el CCU, los enseña con un botón de opción cada uno y aplica con contraseña
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.js-apply-upgrade')
    if (!button) return
    event.preventDefault()
    const upgradeId = button.closest('li').querySelector('.js-pledge-id').value
    const reply = await (await fetch('/api/account/chooseUpgradeTarget', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ upgrade_id: upgradeId }) })).json()
    const bg = document.createElement('div')
    bg.className = 'modal-bg'
    bg.innerHTML = '<div class="modal" role="dialog" aria-label="Apply upgrade"><h2>Apply upgrade</h2><p>Select the pledge you want to apply this upgrade to.</p><form><div class="targets"></div><input type="password" name="current_password" placeholder="Current password" autocomplete="off"><p class="error"></p><div class="buttons"><button type="button" class="cancel">Cancel</button><button type="submit">Apply upgrade</button></div></form></div>'
    bg.querySelector('.targets').innerHTML = reply.success ? reply.data.rendered : '<p>' + (reply.msg || 'Error') + '</p>'
    document.body.append(bg)
    bg.querySelector('.cancel').onclick = () => bg.remove()
    bg.querySelector('form').onsubmit = async (e) => {
      e.preventDefault()
      const form = e.target
      const pledgeId = form.querySelector('input[type=radio]:checked')?.value
      const answer = await (await fetch('/api/account/applyUpgrade', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ upgrade_id: upgradeId, pledge_id: pledgeId, current_password: form.current_password.value }) })).json()
      if (!answer.success) { form.querySelector('.error').textContent = answer.msg; return }
      form.innerHTML = '<p>Your upgrade has been applied.</p>'
      setTimeout(() => location.reload(), 900)
    }
  })
</script>
</body></html>`
}

const json = (res, body) => { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)) }
const readBody = (req) => new Promise((resolve) => { let data = ''; req.on('data', (c) => { data += c }); req.on('end', () => { try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) } }) })
const shipOf = (p) => p.ship

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (url.pathname === '/__reset') { pledges = initial(); json(res, { reset: true }); return }
  if (url.pathname === '/__state') { json(res, pledges); return }
  if (req.method === 'GET' && /^\/[a-z]{2}\/account\/pledges$/.test(url.pathname)) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'set-cookie': 'Rsi-Token=fake-local-token; Path=/' })
    res.end(page(url))
    return
  }
  if (req.method === 'POST' && url.pathname === '/api/account/chooseUpgradeTarget') {
    const { upgrade_id: upgradeId } = await readBody(req)
    const ccu = pledges.find((p) => p.kind === 'ccu' && String(p.id) === String(upgradeId))
    if (!ccu) { json(res, { success: 0, code: 'ErrInvalidObject', msg: 'Invalid object' }); return }
    const targets = pledges.filter((p) => p.kind === 'ship' && shipOf(p) === ccu.from)
    json(res, { success: 1, data: { rendered: targets.map((p) => `<div class="row"><input type="radio" name="pledge_id" id="target-${p.id}" value="${p.id}"><label for="target-${p.id}"><span>${escape(p.name)} (#${p.id})</span></label></div>`).join('') } })
    return
  }
  if (req.method === 'POST' && url.pathname === '/api/account/applyUpgrade') {
    const body = await readBody(req)
    const ccu = pledges.find((p) => p.kind === 'ccu' && String(p.id) === String(body.upgrade_id))
    const target = pledges.find((p) => p.kind === 'ship' && String(p.id) === String(body.pledge_id))
    if (!body.current_password) { json(res, { success: 0, msg: 'Please enter your password.' }); return }
    if (!ccu || !target || target.ship !== ccu.from) { json(res, { success: 0, msg: 'This upgrade cannot be applied to that pledge.' }); return }
    target.ship = ccu.to
    target.upgraded = true
    target.value += ccu.value
    pledges = pledges.filter((p) => p !== ccu)
    json(res, { success: 1 })
    return
  }
  res.writeHead(404, { 'content-type': 'text/plain' })
  res.end('not found')
})

// (con los ids ya en SHA-256, como el `id` del fichero que exporta la extensión)
const exportFile = () => ({
  version: '1.4',
  myHangar: initial().map((p) => ({
    id: createHash('sha256').update(String(p.id)).digest('hex'),
    name: p.name,
    value: p.value,
    createdDate: p.date,
    containsInfo: contentsOf(p).join(', '),
    image: null,
    itemsData: contentsOf(p).map((c) => ({ image: null, title: c, kind: p.kind === 'ccu' ? 'Upgrade' : c.includes('Insurance') ? 'Insurance' : c.includes('Download') ? 'Game' : p.kind === 'ship' ? 'Ship' : 'Decoration' })),
    upgradeData: p.kind === 'ccu' ? { matchItems: [{ name: p.from }], targetItems: [{ name: p.to }] } : undefined,
    gifteable: true,
    exchangeable: true,
    category: productTypeOf(p),
    urlHangar: 'https://robertsspaceindustries.com/en/account/pledges?page=1&pagesize=1',
    upgradesApplied: undefined
  })),
  myBuyBack: []
})
writeFileSync(EXPORT_FILE, JSON.stringify(exportFile(), null, 2))

server.listen(PORT, () => console.log(`Hangar de RSI falso en http://localhost:${PORT}/en/account/pledges (export en ${EXPORT_FILE})`))
