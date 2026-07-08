const { execFileSync } = require('child_process')

const keynames = require('../conventions/keynames')
const readEnvKey = require('../helpers/readEnvKey')
const upsertEnvKey = require('../helpers/upsertEnvKey')

const SECURITY_BIN = '/usr/bin/security'
const SERVICE = 'dotenvx'

class KeychainDown {
  constructor (envFile = '.env', envKeysFile = '.env.keys') {
    this.envFile = envFile
    this.envKeysFile = envKeysFile
  }

  run () {
    const envFile = this.envFile
    const envKeysFile = this.envKeysFile

    const {
      publicKeyName,
      privateKeyName
    } = keynames(envFile)

    const publicKey = readEnvKey(publicKeyName, envFile, { strict: true, ignore: ['MISSING_PRIVATE_KEY'] })
    let privateKey

    try {
      privateKey = execFileSync(SECURITY_BIN, ['find-generic-password', '-s', SERVICE, '-a', publicKey, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    } catch (error) {
      privateKey = readEnvKey(privateKeyName, envKeysFile, { strict: false })

      if (privateKey) {
        return {
          changed: false,
          privateKeyName,
          privateKeyValue: privateKey,
          publicKeyValue: publicKey
        }
      }

      throw error
    }

    upsertEnvKey(privateKeyName, privateKey, envKeysFile)
    execFileSync(SECURITY_BIN, ['delete-generic-password', '-s', SERVICE, '-a', publicKey], { stdio: 'ignore' })

    return {
      changed: true,
      privateKeyName,
      privateKeyValue: privateKey,
      publicKeyValue: publicKey
    }
  }
}

module.exports = KeychainDown
