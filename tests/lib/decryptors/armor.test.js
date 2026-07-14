const t = require('tap')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

t.test('armor decryptor sends src and decryption context to PostArmorDecrypt', async ct => {
  const runStub = sinon.stub().resolves({ src: 'HELLO=World\n' })
  const instances = []

  class SessionStub {
    hostname () {
      return 'https://armor.example.com'
    }

    token () {
      return 'token-1'
    }

    devicePublicKey () {
      return 'device-public-key'
    }
  }

  class PostArmorDecryptStub {
    constructor (hostname, token, devicePublicKey, publicKey, src, grantToken) {
      this.args = { hostname, token, devicePublicKey, publicKey, src, grantToken }
      instances.push(this)
    }

    async run () {
      return runStub()
    }
  }

  const decryptor = proxyquire('../../../src/lib/decryptors/armor/index', {
    '../../../db/session': SessionStub,
    '../../api/postArmorDecrypt': PostArmorDecryptStub
  })

  const result = await decryptor('HELLO=encrypted:ciphertext\n', {
    publicKey: 'public-key',
    grantToken: 'grant-token-1'
  })

  ct.same(instances[0].args, {
    hostname: 'https://armor.example.com',
    token: 'token-1',
    devicePublicKey: 'device-public-key',
    publicKey: 'public-key',
    src: 'HELLO=encrypted:ciphertext\n',
    grantToken: 'grant-token-1'
  })
  ct.same(result, { src: 'HELLO=World\n' })
  ct.equal(runStub.callCount, 1)
  ct.end()
})
