const { execFileSync } = require('child_process')

const windowsCredentialManager = require('../../helpers/windowsCredentialManager')

const SECURITY_BIN = '/usr/bin/security'
const SERVICE = 'dotenvx'

function findMacosPrivateKey (publicKeyHex) {
  return execFileSync(SECURITY_BIN, ['find-generic-password', '-s', SERVICE, '-a', publicKeyHex, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

function index (publicKeyHex) {
  if (process.platform !== 'darwin' && process.platform !== 'win32') return {}

  try {
    const privateKeyHex = process.platform === 'win32'
      ? windowsCredentialManager.findGenericPassword(publicKeyHex)
      : findMacosPrivateKey(publicKeyHex)

    if (!privateKeyHex) return {}

    return { [publicKeyHex]: privateKeyHex }
  } catch {
    return {}
  }
}

module.exports = index
