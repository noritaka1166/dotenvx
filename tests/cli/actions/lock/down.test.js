const t = require('tap')

const { lockedValue } = require('../../../../src/cli/actions/lock/up')
const { unlockedValue } = require('../../../../src/cli/actions/lock/down')

t.test('#unlockedValue decrypts locked private key with passphrase', ct => {
  const privateKey = 'abc123'
  const publicKey = 'pub123'
  const passphrase = 'correct horse battery staple'
  const locked = lockedValue(privateKey, passphrase, publicKey)
  const unlocked = unlockedValue(locked, passphrase)

  ct.equal(unlocked, privateKey)
  ct.throws(() => unlockedValue(locked, 'wrong passphrase'))

  ct.end()
})
