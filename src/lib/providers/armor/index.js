const Session = require('../../../db/session')
const ArmorKeyring = require('../../services/armorKeyring')
const armoredKeyDisplay = require('../../helpers/armoredKeyDisplay')
const isNetworkError = require('../../helpers/isNetworkError')

async function index (publicKeyHex, options = {}) {
  const sesh = new Session()

  const hostname = sesh.hostname()
  const token = sesh.token()
  const devicePublicKey = sesh.devicePublicKey()

  const keyring = new ArmorKeyring(
    hostname,
    token,
    devicePublicKey,
    publicKeyHex
  )
  if (options.onStatus) {
    keyring.onApprovalRequired = ({ approvalUri, code }) => {
      const keyDisplay = armoredKeyDisplay(publicKeyHex)
      const keySuffix = keyDisplay ? ` (${keyDisplay})` : ''
      options.onStatus(`[${code}] visit [${approvalUri}] and approve${keySuffix}`)
    }
  }

  try {
    return await keyring.run() // { "publicKey": "privateKey" }
  } catch (error) {
    if (isNetworkError(error)) {
      return {}
    }

    throw error
  }
}

module.exports = index
