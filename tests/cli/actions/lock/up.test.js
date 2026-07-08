const t = require('tap')
const crypto = require('crypto')

const { lockedValue } = require('../../../../src/cli/actions/lock/up')

function unlockValue (locked, passphrase) {
  const parts = locked.split(':')
  const payload = Buffer.from(parts.slice(2).join(':'), 'base64url')
  const version = payload.subarray(0, 1)[0]
  const salt = payload.subarray(1, 17)
  const iv = payload.subarray(17, 29)
  const tag = payload.subarray(29, 45)
  const ciphertext = payload.subarray(45)
  const key = crypto.scryptSync(passphrase, salt, 32)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)

  decipher.setAuthTag(tag)

  return {
    publicKey: parts[1],
    version,
    value: Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]).toString('utf8')
  }
}

t.test('#lockedValue encrypts private key with passphrase', ct => {
  const privateKey = 'abc123'
  const publicKey = 'pub123'
  const passphrase = 'correct horse battery staple'
  const locked = lockedValue(privateKey, passphrase, publicKey)
  const unlocked = unlockValue(locked, passphrase)

  ct.match(locked, /^locked:pub123:/)
  ct.not(locked, `locked:${publicKey}:${privateKey}`)
  ct.equal(unlocked.publicKey, publicKey)
  ct.equal(unlocked.version, 1)
  ct.equal(unlocked.value, privateKey)
  ct.throws(() => unlockValue(locked, 'wrong passphrase'))

  ct.end()
})
