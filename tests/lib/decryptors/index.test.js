const t = require('tap')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

function loadDecryptors ({ noArmor = false, noArmorSync = false, armorDecryptor = sinon.stub(), createSyncFn = sinon.stub() } = {}) {
  class SessionStub {
    async noArmor () {
      return noArmor
    }

    noArmorSync () {
      return noArmorSync
    }
  }

  return proxyquire('../../../src/lib/decryptors', {
    './../../db/session': SessionStub,
    './armor/index': armorDecryptor,
    '@dotenvx/tooling': { createSyncFn }
  })
}

t.test('decryptors returns a custom decryptor unchanged', async ct => {
  const customDecryptor = sinon.stub()
  const decryptors = loadDecryptors()

  ct.equal(await decryptors({ decryptor: customDecryptor }), customDecryptor)
  ct.equal(decryptors.sync({ decryptor: customDecryptor }), customDecryptor)
  ct.end()
})

t.test('decryptors returns null when Armor is unavailable or disabled', async ct => {
  const unavailable = loadDecryptors({ noArmor: true, noArmorSync: true })
  const available = loadDecryptors()

  ct.equal(await unavailable(), null)
  ct.equal(unavailable.sync(), null)
  ct.equal(await available({ noArmor: true }), null)
  ct.equal(available.sync({ armor: false }), null)
  ct.end()
})

t.test('decryptors returns an Armor decryptor', async ct => {
  const armorDecryptor = sinon.stub().resolves({ src: 'HELLO=World\n' })
  const decryptors = loadDecryptors({ armorDecryptor })
  const decryptor = await decryptors({ token: 'token-1', command: 'run' })

  const result = await decryptor('HELLO=encrypted:ciphertext\n', {
    publicKey: 'public-key',
    grantToken: 'grant-token-1'
  })

  ct.same(result, { src: 'HELLO=World\n' })
  ct.same(armorDecryptor.firstCall.args, [
    'HELLO=encrypted:ciphertext\n',
    {
      publicKey: 'public-key',
      grantToken: 'grant-token-1',
      onStatus: undefined,
      token: 'token-1',
      command: 'run'
    }
  ])
  ct.end()
})

t.test('decryptors.sync runs the Armor decryptor through a worker', ct => {
  const runDecryptorSync = sinon.stub().returns({ src: 'HELLO=World\n' })
  const createSyncFn = sinon.stub().returns(runDecryptorSync)
  const decryptors = loadDecryptors({ createSyncFn })
  const decryptor = decryptors.sync({ token: 'token-1', command: 'run' })

  const result = decryptor('HELLO=encrypted:ciphertext\n', {
    publicKey: 'public-key',
    grantToken: 'grant-token-1'
  })

  ct.same(result, { src: 'HELLO=World\n' })
  ct.equal(createSyncFn.callCount, 1)
  ct.match(runDecryptorSync.firstCall.args, [
    'HELLO=encrypted:ciphertext\n',
    {
      publicKey: 'public-key',
      grantToken: 'grant-token-1',
      onStatus: undefined,
      token: 'token-1',
      command: 'run'
    }
  ])
  ct.end()
})
