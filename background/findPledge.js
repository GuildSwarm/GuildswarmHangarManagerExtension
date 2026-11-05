import ky from 'ky'
import * as cheerio from 'cheerio'
import { baseUrlRsi, categories, hash, retryLimit, statusCodesRetry } from './shared.js'

// Buscar un artículo del hangar de RSI por su identidad, no por su posición.
//
// SC Tools solo conoce el `id` del fichero exportado, que es el SHA-256 del pledge id de RSI (ver hash() en shared.js).
// Se recorre el hangar con la sesión del usuario, filtrando por el product-type del artículo si se conoce, y se compara
// el hash de cada pledge id con el buscado. No se guarda nada: solo se dice dónde está o que no está.
//
// Todas las URLs llevan page, pagesize y product-type explícitos para no depender de los filtros que RSI recuerde, y
// al terminar se deja la vista normal del hangar (resetHangarView).

export const PAGE_SIZE = 10
// Un hangar de 3000 artículos sin filtro; más allá se da por no encontrado
const MAX_PAGES = 300
const PLEDGE_HASH = /^[0-9a-f]{64}$/
const PRODUCT_TYPES = new Set(categories.map((category) => category.id))

export const isPledgeHash = (value) => typeof value === 'string' && PLEDGE_HASH.test(value)
export const isProductType = (value) => typeof value === 'string' && PRODUCT_TYPES.has(value)

export const pledgesUrl = ({ page, productType = null }) => {
  const params = new URLSearchParams({ page: String(page), pagesize: String(PAGE_SIZE) })
  if (productType) params.set('product-type', productType)
  return `${baseUrlRsi}/en/account/pledges?${params}`
}

const fetchPage = async (url) => {
  const response = await ky.get(url, {
    retry: {
      limit: retryLimit,
      methods: ['get'],
      statusCodes: statusCodesRetry
    }
  })
  return response.text()
}

// Devuelve { page, productType, url } de la página donde está el artículo, o null si no está en el hangar
export const findPledge = async (pledgeHash, productType = null) => {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = pledgesUrl({ page, productType })
    const $ = cheerio.load(await fetchPage(url))
    const pledgeIds = $('ul.list-items li input.js-pledge-id').toArray().map((element) => $(element).val())
    if (pledgeIds.some((pledgeId) => pledgeId && hash(pledgeId) === pledgeHash)) {
      return { page, productType, url }
    }
    const hasNextPage = $('div.pager div.right a.gt').length > 0
    if (pledgeIds.length === 0 || !hasNextPage) return null
  }
  return null
}

// La vista normal del hangar: primera página, 10 por página, sin filtro de tipo. Si RSI recuerda en la sesión la
// última vista pedida, esta petición hace que la próxima visita del usuario vuelva a ser la normal.
export const resetHangarView = async () => {
  await fetchPage(pledgesUrl({ page: 1 }))
}
