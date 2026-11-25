// Lo que comparten el puente (content/sctoolsBridge.js) y el background (background/cart.js) para meter CCU en la cesta de RSI.
// Va por un puerto y no por un mensaje suelto: cada CCU son tres llamadas a RSI y la página va marcando los que entran.
export const CART_PORT = 'gs-add-to-cart'
// Una escalera no pasa de unas decenas de saltos; más que esto no es una escalera
export const MAX_CART_ITEMS = 50
