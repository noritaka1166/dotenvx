const { execFileSync } = require('child_process')

const SECURITY_BIN = '/usr/bin/security'
const SERVICE = 'dotenvx'

function index (publicKeyHex) {
  try {
    const stdout = execFileSync(SECURITY_BIN, ['find-generic-password', '-s', SERVICE, '-a', publicKeyHex, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    const privateKeyHex = stdout.trim()
    if (!privateKeyHex) return {}

    return { [publicKeyHex]: privateKeyHex }
  } catch {
    return {}
  }
}

module.exports = index
