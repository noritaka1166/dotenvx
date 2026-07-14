const t = require('tap')
const sinon = require('sinon')

const httpPath = require.resolve('../../../src/lib/helpers/http')
const buildApiErrorPath = require.resolve('../../../src/lib/helpers/buildApiError')
const packageJsonPath = require.resolve('../../../src/lib/helpers/packageJson')
const postArmorDecryptPath = require.resolve('../../../src/lib/api/postArmorDecrypt')

function loadPostArmorDecryptWithStubs ({ httpStub, buildApiErrorStub, packageJsonStub }) {
  const originalHttpModule = require(httpPath)
  const originalBuildApiError = require(buildApiErrorPath)
  const originalPackageJson = require(packageJsonPath)

  require.cache[httpPath].exports = { http: httpStub }
  require.cache[buildApiErrorPath].exports = buildApiErrorStub
  require.cache[packageJsonPath].exports = packageJsonStub
  delete require.cache[postArmorDecryptPath]

  const PostArmorDecrypt = require(postArmorDecryptPath)

  return {
    PostArmorDecrypt,
    restore: () => {
      require.cache[httpPath].exports = originalHttpModule
      require.cache[buildApiErrorPath].exports = originalBuildApiError
      require.cache[packageJsonPath].exports = originalPackageJson
      delete require.cache[postArmorDecryptPath]
    }
  }
}

t.test('PostArmorDecrypt.run sends encrypted src for server-side decryption', async (ct) => {
  const sandbox = sinon.createSandbox()

  const httpStub = sandbox.stub().callsFake(async (url, opts) => {
    ct.equal(url, 'https://armor.dotenvx.com/api/armor/decrypt', 'posts to armor decrypt endpoint')
    ct.equal(opts.method, 'POST', 'uses POST')
    ct.equal(opts.headers.Authorization, 'Bearer token-123', 'sends bearer token')
    ct.same(JSON.parse(opts.body), {
      device_public_key: 'device-public-key',
      cli_version: '0.0.0-test',
      public_key: 'public-key',
      src: 'HELLO=encrypted:ciphertext\n'
    }, 'sends encrypted src and key details')

    return {
      statusCode: 200,
      body: {
        json: async () => ({ src: 'HELLO=World\n' })
      }
    }
  })

  const buildApiErrorStub = sandbox.stub()
  const packageJsonStub = { version: '0.0.0-test' }
  const { PostArmorDecrypt, restore } = loadPostArmorDecryptWithStubs({ httpStub, buildApiErrorStub, packageJsonStub })

  const result = await new PostArmorDecrypt('https://armor.dotenvx.com', 'token-123', 'device-public-key', 'public-key', 'HELLO=encrypted:ciphertext\n').run()

  ct.same(result, { src: 'HELLO=World\n' }, 'returns decrypted src')
  ct.equal(buildApiErrorStub.callCount, 0, 'does not build api error for success')

  restore()
  sandbox.restore()
})

t.test('PostArmorDecrypt.run includes grant token when supplied', async (ct) => {
  const sandbox = sinon.createSandbox()
  const httpStub = sandbox.stub().callsFake(async (url, opts) => {
    ct.equal(JSON.parse(opts.body).grant_token, 'grant-token-123', 'sends grant token')

    return {
      statusCode: 200,
      body: {
        json: async () => ({ src: 'HELLO=World\n' })
      }
    }
  })
  const buildApiErrorStub = sandbox.stub()
  const packageJsonStub = { version: '0.0.0-test' }
  const { PostArmorDecrypt, restore } = loadPostArmorDecryptWithStubs({ httpStub, buildApiErrorStub, packageJsonStub })

  await new PostArmorDecrypt('https://armor.dotenvx.com', 'token-123', 'device-public-key', 'public-key', 'HELLO=encrypted:ciphertext\n', 'grant-token-123').run()

  restore()
  sandbox.restore()
})

t.test('PostArmorDecrypt.run throws buildApiError output on non-2xx status', async (ct) => {
  const sandbox = sinon.createSandbox()
  const json = { error: { code: 'DECRYPTION_FAILED', message: 'decryption failed' } }
  const expectedError = new Error('[DECRYPTION_FAILED] decryption failed')
  const httpStub = sandbox.stub().resolves({
    statusCode: 400,
    body: {
      json: async () => json
    }
  })
  const buildApiErrorStub = sandbox.stub().returns(expectedError)
  const packageJsonStub = { version: '0.0.0-test' }
  const { PostArmorDecrypt, restore } = loadPostArmorDecryptWithStubs({ httpStub, buildApiErrorStub, packageJsonStub })

  await ct.rejects(new PostArmorDecrypt('https://armor.dotenvx.com', 'token-123', 'device-public-key', 'public-key', 'HELLO=encrypted:invalid\n').run(), expectedError)
  ct.equal(buildApiErrorStub.callCount, 1, 'builds api error once')
  ct.same(buildApiErrorStub.firstCall.args, [400, json], 'passes status code and json to buildApiError')

  restore()
  sandbox.restore()
})
