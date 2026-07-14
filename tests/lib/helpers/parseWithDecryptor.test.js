const t = require('tap')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

function serverSideDecryptionRequired () {
  const error = new Error('[SERVER_SIDE_DECRYPTION_REQUIRED] server-side decryption required')
  error.code = 'SERVER_SIDE_DECRYPTION_REQUIRED'
  error.meta = {
    public_key: 'public-key',
    grant_token: 'grant-token-1'
  }
  return error
}

t.test('parseWithDecryptor delegates server-side decryption and reparses plaintext', async ct => {
  const error = serverSideDecryptionRequired()
  const parse = sinon.stub()
  parse.onFirstCall().rejects(error)
  parse.onSecondCall().resolves({ parsed: { HELLO: 'World' }, errors: [] })
  const decryptor = sinon.stub().resolves({ src: 'HELLO=World\n' })
  const parseWithDecryptor = proxyquire('../../../src/lib/helpers/parseWithDecryptor', {
    '@dotenvx/primitives': { parse, parseSync: sinon.stub() }
  })

  const result = await parseWithDecryptor('HELLO=encrypted:ciphertext\n', {
    provider: sinon.stub(),
    decryptor
  })

  ct.same(result, { parsed: { HELLO: 'World' }, errors: [] })
  ct.same(decryptor.firstCall.args, [
    'HELLO=encrypted:ciphertext\n',
    {
      publicKey: 'public-key',
      grantToken: 'grant-token-1',
      error
    }
  ])
  ct.equal(parse.secondCall.args[0], 'HELLO=World\n')
  ct.equal(parse.secondCall.args[1].provider, null)
  ct.equal(parse.secondCall.args[1].decryptor, null)
  ct.end()
})

t.test('parseWithDecryptor rethrows errors that do not request server-side decryption', async ct => {
  const error = new Error('network failed')
  error.code = 'NETWORK_ERROR'
  const parse = sinon.stub().rejects(error)
  const decryptor = sinon.stub()
  const parseWithDecryptor = proxyquire('../../../src/lib/helpers/parseWithDecryptor', {
    '@dotenvx/primitives': { parse, parseSync: sinon.stub() }
  })

  await ct.rejects(parseWithDecryptor('HELLO=encrypted:ciphertext\n', { decryptor }), error)
  ct.equal(decryptor.callCount, 0)
  ct.end()
})

t.test('parseWithDecryptor falls back to encrypted src when the decryptor is offline', async ct => {
  const requiredError = serverSideDecryptionRequired()
  const networkError = new Error('connect ENETUNREACH armor.dotenvx.com')
  networkError.code = 'ENETUNREACH'
  const parse = sinon.stub()
  parse.onFirstCall().rejects(requiredError)
  parse.onSecondCall().resolves({
    parsed: { HELLO: 'encrypted:ciphertext' },
    errors: [{ code: 'DECRYPTION_FAILED', message: 'could not decrypt HELLO' }]
  })
  const decryptor = sinon.stub().rejects(networkError)
  const parseWithDecryptor = proxyquire('../../../src/lib/helpers/parseWithDecryptor', {
    '@dotenvx/primitives': { parse, parseSync: sinon.stub() }
  })

  const result = await parseWithDecryptor('HELLO=encrypted:ciphertext\n', { decryptor })

  ct.same(result.parsed, { HELLO: 'encrypted:ciphertext' })
  ct.equal(parse.secondCall.args[0], 'HELLO=encrypted:ciphertext\n')
  ct.equal(parse.secondCall.args[1].provider, null)
  ct.end()
})

t.test('parseWithDecryptor.sync delegates through a synchronous decryptor', ct => {
  const error = serverSideDecryptionRequired()
  const parseSync = sinon.stub()
  parseSync.onFirstCall().throws(error)
  parseSync.onSecondCall().returns({ parsed: { HELLO: 'World' }, errors: [] })
  const decryptor = sinon.stub().returns({ src: 'HELLO=World\n' })
  const parseWithDecryptor = proxyquire('../../../src/lib/helpers/parseWithDecryptor', {
    '@dotenvx/primitives': { parse: sinon.stub(), parseSync }
  })

  const result = parseWithDecryptor.sync('HELLO=encrypted:ciphertext\n', { decryptor })

  ct.same(result, { parsed: { HELLO: 'World' }, errors: [] })
  ct.equal(decryptor.callCount, 1)
  ct.equal(parseSync.secondCall.args[1].decryptor, null)
  ct.end()
})
