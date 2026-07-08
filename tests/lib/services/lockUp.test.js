const t = require('tap')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { keypair } = require('@dotenvx/primitives')

const LockUp = require('../../../src/lib/services/lockUp')

t.test('#lock up reverse matches public key and replaces private key with locked placeholder', ct => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dotenvx-lock-up-'))
  const oldCwd = process.cwd()

  try {
    process.chdir(tmpDir)
    const kp = keypair()
    fs.writeFileSync('.env.production', `DOTENV_PUBLIC_KEY_PRODUCTION=${kp.publicKey}\n`, 'utf8')
    fs.writeFileSync('.env.keys', `DOTENV_PRIVATE_KEY_PRODUCTION=${kp.privateKey}\n`, 'utf8')

    const result = new LockUp('.env.production', '.env.keys').run()
    const keysSrc = fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8')

    ct.equal(result.changed, true)
    ct.equal(result.results.length, 1)
    ct.equal(result.results[0].privateKeyName, 'DOTENV_PRIVATE_KEY_PRODUCTION')
    ct.equal(result.results[0].privateKeyValue, kp.privateKey)
    ct.equal(result.results[0].lockedPrivateKeyValue, 'locked:TBD')
    ct.equal(result.results[0].publicKeyValue, kp.publicKey)
    ct.equal(keysSrc, 'DOTENV_PRIVATE_KEY_PRODUCTION=locked:TBD\n')
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

    const result = new LockUp('.env.production', '.env.keys').run()
    const keysSrc = fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8')

    ct.equal(result.changed, true)
    ct.equal(result.results.length, 1)
    ct.equal(result.results[0].privateKeyName, 'DOTENV_PRIVATE_KEY')
    ct.equal(result.results[0].privateKeyValue, kp.privateKey)
    ct.equal(result.results[0].lockedPrivateKeyValue, 'locked:TBD')
    ct.equal(result.results[0].publicKeyValue, kp.publicKey)
    ct.equal(keysSrc, 'DOTENV_PRIVATE_KEY=locked:TBD\n')
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

    const result = new LockUp('.env', '.env.keys').run()
    const keysSrc = fs.readFileSync(path.join(tmpDir, '.env.keys'), 'utf8')

    ct.equal(result.changed, true)
    ct.equal(result.results.length, 2)
    ct.equal(keysSrc, [
      'DOTENV_PRIVATE_KEY=locked:TBD',
      'DOTENV_PRIVATE_KEY_PRODUCTION=locked:TBD',
      `DOTENV_PRIVATE_KEY_OTHER=${other.privateKey}`,
      ''
    ].join('\n'))
  } finally {
    process.chdir(oldCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  ct.end()
})
