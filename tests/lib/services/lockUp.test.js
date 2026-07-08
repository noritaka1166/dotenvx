const t = require('tap')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { keypair } = require('@dotenvx/primitives')

const LockUp = require('../../../src/lib/services/lockUp')

function fakeLockPrivateKey (privateKey, publicKey) {
  return `locked:${publicKey}:${privateKey}`
}

t.test('#lock up reverse matches public key and replaces private key with locked value', ct => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenvx-lock-up-'))
  const oldCwd = process.cwd()

  try {
    process.chdir(tmpDir)
    const kp = keypair()
    fs.writeFileSync('.env.production', `DOTENV_PUBLIC_KEY_PRODUCTION=${kp.publicKey}\n`, 'utf8')
    fs.writeFileSync('.env.keys', `DOTENV_PRIVATE_KEY_PRODUCTION=${kp.privateKey}\n`, 'utf8')

    const result = new LockUp('.env.production', '.env.keys').run(fakeLockPrivateKey)
    const keysSrc = fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8')

    ct.equal(result.changed, true)
    ct.equal(result.results.length, 1)
    ct.equal(result.results[0].privateKeyName, 'DOTENV_PRIVATE_KEY_PRODUCTION')
    ct.equal(result.results[0].privateKeyValue, kp.privateKey)
    ct.equal(result.results[0].lockedPrivateKeyValue, `locked:${kp.publicKey}:${kp.privateKey}`)
    ct.equal(result.results[0].publicKeyValue, kp.publicKey)
    ct.equal(keysSrc, `DOTENV_PRIVATE_KEY_PRODUCTION=locked:${kp.publicKey}:${kp.privateKey}\n`)
  } finally {
    process.chdir(oldCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  ct.end()
})

t.test('#lock up reverse lookup does not rely on private key name', ct => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenvx-lock-up-'))
  const oldCwd = process.cwd()

  try {
    process.chdir(tmpDir)
    const kp = keypair()
    fs.writeFileSync('.env.production', `DOTENV_PUBLIC_KEY_PRODUCTION=${kp.publicKey}\n`, 'utf8')
    fs.writeFileSync('.env.keys', `DOTENV_PRIVATE_KEY=${kp.privateKey}\n`, 'utf8')

    const result = new LockUp('.env.production', '.env.keys').run(fakeLockPrivateKey)
    const keysSrc = fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8')

    ct.equal(result.changed, true)
    ct.equal(result.results.length, 1)
    ct.equal(result.results[0].privateKeyName, 'DOTENV_PRIVATE_KEY')
    ct.equal(result.results[0].privateKeyValue, kp.privateKey)
    ct.equal(result.results[0].lockedPrivateKeyValue, `locked:${kp.publicKey}:${kp.privateKey}`)
    ct.equal(result.results[0].publicKeyValue, kp.publicKey)
    ct.equal(keysSrc, `DOTENV_PRIVATE_KEY=locked:${kp.publicKey}:${kp.privateKey}\n`)
  } finally {
    process.chdir(oldCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  ct.end()
})

t.test('#lock up locks each private key matching public keys from env file', ct => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenvx-lock-up-'))
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
        `DOTENV_PRIVATE_KEY=${first.privateKey}`,
        `DOTENV_PRIVATE_KEY_PRODUCTION=${second.privateKey}`,
        `DOTENV_PRIVATE_KEY_OTHER=${other.privateKey}`,
        ''
      ].join('\n'),
      'utf8'
    )

    const result = new LockUp('.env', '.env.keys').run(fakeLockPrivateKey)
    const keysSrc = fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8')

    ct.equal(result.changed, true)
    ct.equal(result.results.length, 2)
    ct.equal(keysSrc, [
      `DOTENV_PRIVATE_KEY=locked:${first.publicKey}:${first.privateKey}`,
      `DOTENV_PRIVATE_KEY_PRODUCTION=locked:${second.publicKey}:${second.privateKey}`,
      `DOTENV_PRIVATE_KEY_OTHER=${other.privateKey}`,
      ''
    ].join('\n'))
  } finally {
    process.chdir(oldCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  ct.end()
})

t.test('#lock up reports already locked values matching public keys from env file', ct => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenvx-lock-up-'))
  const oldCwd = process.cwd()

  try {
    process.chdir(tmpDir)
    const kp = keypair()
    fs.writeFileSync('.env', `DOTENV_PUBLIC_KEY=${kp.publicKey}\n`, 'utf8')
    fs.writeFileSync('.env.keys', `DOTENV_PRIVATE_KEY=locked:${kp.publicKey}:ciphertext\n`, 'utf8')

    const result = new LockUp('.env', '.env.keys').run(fakeLockPrivateKey)

    ct.equal(result.changed, false)
    ct.equal(result.results.length, 1)
    ct.equal(result.results[0].privateKeyName, 'DOTENV_PRIVATE_KEY')
    ct.equal(result.results[0].privateKeyValue, undefined)
    ct.equal(result.results[0].lockedPrivateKeyValue, `locked:${kp.publicKey}:ciphertext`)
    ct.equal(result.results[0].publicKeyValue, kp.publicKey)
    ct.equal(result.results[0].alreadyLocked, true)
    ct.equal(fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8'), `DOTENV_PRIVATE_KEY=locked:${kp.publicKey}:ciphertext\n`)
  } finally {
    process.chdir(oldCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  ct.end()
})

t.test('#lock up does not match already locked placeholder values', ct => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenvx-lock-up-'))
  const oldCwd = process.cwd()

  try {
    process.chdir(tmpDir)
    const kp = keypair()
    fs.writeFileSync('.env', `DOTENV_PUBLIC_KEY=${kp.publicKey}\n`, 'utf8')
    fs.writeFileSync('.env.keys', 'DOTENV_PRIVATE_KEY=locked:TBD\n', 'utf8')

    const lockUp = new LockUp('.env', '.env.keys')

    ct.throws(() => lockUp.matches(), { code: 'MISSING_KEY' })
    ct.throws(() => lockUp.run(fakeLockPrivateKey), { code: 'MISSING_KEY' })
    ct.equal(fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8'), 'DOTENV_PRIVATE_KEY=locked:TBD\n')
  } finally {
    process.chdir(oldCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  ct.end()
})
