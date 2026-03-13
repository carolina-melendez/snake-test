const nodeCrypto = require('node:crypto')

if (typeof nodeCrypto.getRandomValues !== 'function' && nodeCrypto.webcrypto?.getRandomValues) {
  nodeCrypto.getRandomValues = nodeCrypto.webcrypto.getRandomValues.bind(nodeCrypto.webcrypto)
}

if (!globalThis.crypto && nodeCrypto.webcrypto) {
  globalThis.crypto = nodeCrypto.webcrypto
}
