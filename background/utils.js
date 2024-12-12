import CryptoJS from 'crypto-js'

export const hash = (string) => {
  return CryptoJS.SHA256(string).toString(CryptoJS.enc.Hex)
}
