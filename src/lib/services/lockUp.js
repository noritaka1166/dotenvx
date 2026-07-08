const fs = require('fs')
const { derive, publickeys, scan } = require('@dotenvx/primitives')

const Errors = require('../helpers/errors')
const upsertEnvKey = require('../helpers/upsertEnvKey')

const LOCKED_TBD = 'locked:TBD'

function latestValues (parsed) {
  const result = {}

  for (const [key, values] of Object.entries(parsed)) {
    result[key] = values[values.length - 1]
  }

  return result
}

function privateKeyring (keysSrc) {
  const { parsed } = scan(keysSrc)
  const values = latestValues(parsed)
  const keyring = {}

  for (const [privateKeyName, privateKey] of Object.entries(values)) {
    if (!privateKeyName.startsWith('DOTENV_PRIVATE_KEY')) continue

    try {
      const publicKey = derive(privateKey)
      keyring[publicKey] = { privateKeyName, privateKeyValue: privateKey }
    } catch {}
  }

  return keyring
}

class LockUp {
  constructor (envFile = '.env', envKeysFile = '.env.keys') {
    this.envFile = envFile
    this.envKeysFile = envKeysFile
  }

  run () {
    const envFile = this.envFile
    const envKeysFile = this.envKeysFile

    const envSrc = fs.readFileSync(envFile, 'utf8')
    const keysSrc = fs.readFileSync(envKeysFile, 'utf8')
    const ring = privateKeyring(keysSrc)
    const results = []

    for (const publicKey of publickeys(envSrc)) {
      const privateKey = ring[publicKey]
      if (!privateKey) continue

      const result = upsertEnvKey(privateKey.privateKeyName, LOCKED_TBD, envKeysFile)

      results.push({
        changed: result.changed,
        privateKeyName: privateKey.privateKeyName,
        privateKeyValue: privateKey.privateKeyValue,
        lockedPrivateKeyValue: LOCKED_TBD,
        publicKeyValue: publicKey
      })
    }

    if (results.length < 1) {
      throw new Errors({ key: 'DOTENV_PRIVATE_KEY' }).missingKey()
    }

    return {
      changed: results.some(result => result.changed),
      results
    }
  }
}

module.exports = LockUp
module.exports.privateKeyring = privateKeyring
