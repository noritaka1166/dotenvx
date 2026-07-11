const t = require('tap')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform')

function setPlatform (value) {
  Object.defineProperty(process, 'platform', {
    value
  })
}

t.afterEach(() => {
  sinon.restore()
  Object.defineProperty(process, 'platform', platformDescriptor)
})

t.test('native provider is disabled outside supported platforms', ct => {
  const execFileSync = sinon.stub()
  const findGenericPassword = sinon.stub()
  const provider = proxyquire('../../../src/lib/providers/native', {
    child_process: { execFileSync },
    '../../helpers/windowsCredentialManager': { findGenericPassword }
  })

  setPlatform('linux')

  ct.same(provider('public-key'), {})
  ct.equal(execFileSync.callCount, 0)
  ct.equal(findGenericPassword.callCount, 0)
  ct.end()
})

t.test('native provider reads macOS Keychain on darwin', ct => {
  const execFileSync = sinon.stub().returns('private-key\n')
  const provider = proxyquire('../../../src/lib/providers/native', {
    child_process: { execFileSync }
  })

  setPlatform('darwin')

  ct.same(provider('public-key'), { 'public-key': 'private-key' })
  ct.same(execFileSync.firstCall.args, ['/usr/bin/security', ['find-generic-password', '-s', 'dotenvx', '-a', 'public-key', '-w'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }])
  ct.end()
})

t.test('native provider reads Windows Credential Manager on win32', ct => {
  const findGenericPassword = sinon.stub().returns('private-key')
  const provider = proxyquire('../../../src/lib/providers/native', {
    '../../helpers/windowsCredentialManager': { findGenericPassword }
  })

  setPlatform('win32')

  ct.same(provider('public-key'), { 'public-key': 'private-key' })
  ct.same(findGenericPassword.firstCall.args, ['public-key'])
  ct.end()
})
