const t = require('tap')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { keypair } = require('@dotenvx/primitives')

const LockDown = require('../../../src/lib/services/lockDown')

function fakeLockPrivateKey (privateKey, publicKey) {
  return `locked:${publicKey}:${privateKey}`
}

function fakeUnlockPrivateKey (lockedPrivateKey) {
  return lockedPrivateKey.split(':').slice(2).join(':')
}

t.test('#lock down reverse matches public key and replaces locked value with private key', ct => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenvx-lock-down-'))
  const oldCwd = process.cwd()

  try {
    process.chdir(tmpDir)
    const kp = keypair()
    fs.writeFileSync('.env.production', `DOTENV_PUBLIC_KEY_PRODUCTION=${kp.publicKey}\n`, 'utf8')
    fs.writeFileSync('.env.keys', `DOTENV_PRIVATE_KEY_PRODUCTION=${fakeLockPrivateKey(kp.privateKey, kp.publicKey)}\n`, 'utf8')

    const result = new LockDown('.env.production', '.env.keys').run(fakeUnlockPrivateKey)
    const keysSrc = fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8')

    ct.equal(result.changed, true)
    ct.equal(result.results.length, 1)
    ct.equal(result.results[0].privateKeyName, 'DOTENV_PRIVATE_KEY_PRODUCTION')
    ct.equal(result.results[0].privateKeyValue, kp.privateKey)
    ct.equal(result.results[0].lockedPrivateKeyValue, `locked:${kp.publicKey}:${kp.privateKey}`)
    ct.equal(result.results[0].publicKeyValue, kp.publicKey)
    ct.equal(keysSrc, `DOTENV_PRIVATE_KEY_PRODUCTION=${kp.privateKey}\n`)
  } finally {
    process.chdir(oldCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  ct.end()
})

t.test('#lock down reverse lookup does not rely on private key name', ct => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenvx-lock-down-'))
  const oldCwd = process.cwd()

  try {
    process.chdir(tmpDir)
    const kp = keypair()
    fs.writeFileSync('.env.production', `DOTENV_PUBLIC_KEY_PRODUCTION=${kp.publicKey}\n`, 'utf8')
    fs.writeFileSync('.env.keys', `DOTENV_PRIVATE_KEY=${fakeLockPrivateKey(kp.privateKey, kp.publicKey)}\n`, 'utf8')

    const result = new LockDown('.env.production', '.env.keys').run(fakeUnlockPrivateKey)
    const keysSrc = fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8')

    ct.equal(result.changed, true)
    ct.equal(result.results.length, 1)
    ct.equal(result.results[0].privateKeyName, 'DOTENV_PRIVATE_KEY')
    ct.equal(result.results[0].privateKeyValue, kp.privateKey)
    ct.equal(result.results[0].lockedPrivateKeyValue, `locked:${kp.publicKey}:${kp.privateKey}`)
    ct.equal(result.results[0].publicKeyValue, kp.publicKey)
    ct.equal(keysSrc, `DOTENV_PRIVATE_KEY=${kp.privateKey}\n`)
  } finally {
    process.chdir(oldCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  ct.end()
})

t.test('#lock down unlocks each locked private key matching public keys from env file', ct => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenvx-lock-down-'))
  const oldCwd = process.cwd()

  try {
    process.chdir(tmpDir)
    const first = keypair()
    const second = keypair()
    const other = keypair()
    fs.writeFileSync(
      '.env',
      [
        `DOTENV_PUBLIC_KEY=${first.publicKey}`,
        `DOTENV_PUBLIC_KEY_PRODUCTION=${second.publicKey}`,
        ''
      ].join('\n'),
      'utf8'
    )
    fs.writeFileSync(
      '.env.keys',
      [
        `DOTENV_PRIVATE_KEY=${fakeLockPrivateKey(first.privateKey, first.publicKey)}`,
        `DOTENV_PRIVATE_KEY_PRODUCTION=${fakeLockPrivateKey(second.privateKey, second.publicKey)}`,
        `DOTENV_PRIVATE_KEY_OTHER=${fakeLockPrivateKey(other.privateKey, other.publicKey)}`,
        ''
      ].join('\n'),
      'utf8'
    )

    const result = new LockDown('.env', '.env.keys').run(fakeUnlockPrivateKey)
    const keysSrc = fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8')

    ct.equal(result.changed, true)
    ct.equal(result.results.length, 2)
    ct.equal(keysSrc, [
      `DOTENV_PRIVATE_KEY=${first.privateKey}`,
      `DOTENV_PRIVATE_KEY_PRODUCTION=${second.privateKey}`,
      `DOTENV_PRIVATE_KEY_OTHER=locked:${other.publicKey}:${other.privateKey}`,
      ''
    ].join('\n'))
  } finally {
    process.chdir(oldCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  ct.end()
})

t.test('#lock down does not trust locked public key metadata', ct => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenvx-lock-down-'))
  const oldCwd = process.cwd()

  try {
    process.chdir(tmpDir)
    const kp = keypair()
    const other = keypair()
    fs.writeFileSync('.env', `DOTENV_PUBLIC_KEY=${kp.publicKey}\n`, 'utf8')
    fs.writeFileSync('.env.keys', `DOTENV_PRIVATE_KEY=locked:${kp.publicKey}:${other.privateKey}\n`, 'utf8')

    const lockDown = new LockDown('.env', '.env.keys')

    ct.throws(() => lockDown.run(fakeUnlockPrivateKey), { code: 'MISSING_KEY' })
    ct.equal(fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8'), `DOTENV_PRIVATE_KEY=locked:${kp.publicKey}:${other.privateKey}\n`)
  } finally {
    process.chdir(oldCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  ct.end()
})

t.test('#lock down wraps passphrase failures', ct => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenvx-lock-down-'))
  const oldCwd = process.cwd()

  try {
    process.chdir(tmpDir)
    const kp = keypair()
    fs.writeFileSync('.env', `DOTENV_PUBLIC_KEY=${kp.publicKey}\n`, 'utf8')
    fs.writeFileSync('.env.keys', `DOTENV_PRIVATE_KEY=locked:${kp.publicKey}:ciphertext\n`, 'utf8')

    const lockDown = new LockDown('.env', '.env.keys')
    const error = new Error('Unsupported state or unable to authenticate data')
    const expectedError = new Error('[INVALID_PASSPHRASE] could not unlock DOTENV_PRIVATE_KEY using passphrase')
    expectedError.code = 'INVALID_PASSPHRASE'

    ct.throws(() => lockDown.run(() => { throw error }), expectedError)
  } finally {
    process.chdir(oldCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  ct.end()
})

t.test('#lock down returns no change for already unlocked private key values', ct => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenvx-lock-down-'))
  const oldCwd = process.cwd()

  try {
    process.chdir(tmpDir)
    const kp = keypair()
    fs.writeFileSync('.env', `DOTENV_PUBLIC_KEY=${kp.publicKey}\n`, 'utf8')
    fs.writeFileSync('.env.keys', `DOTENV_PRIVATE_KEY=${kp.privateKey}\n`, 'utf8')

    const lockDown = new LockDown('.env', '.env.keys')
    const result = lockDown.run(fakeUnlockPrivateKey)

    ct.throws(() => lockDown.lockedCandidates(), { code: 'MISSING_KEY' })
    ct.equal(result.changed, false)
    ct.equal(result.results.length, 1)
    ct.equal(result.results[0].privateKeyName, 'DOTENV_PRIVATE_KEY')
    ct.equal(result.results[0].privateKeyValue, kp.privateKey)
    ct.equal(result.results[0].lockedPrivateKeyValue, undefined)
    ct.equal(result.results[0].publicKeyValue, kp.publicKey)
    ct.equal(fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8'), `DOTENV_PRIVATE_KEY=${kp.privateKey}\n`)
  } finally {
    process.chdir(oldCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  ct.end()
})
