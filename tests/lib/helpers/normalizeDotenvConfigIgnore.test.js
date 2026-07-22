const t = require('tap')

const normalizeDotenvConfigIgnore = require('../../../src/lib/helpers/normalizeDotenvConfigIgnore')

t.beforeEach(() => {
  delete process.env.DOTENV_CONFIG_IGNORE
})

t.afterEach(() => {
  delete process.env.DOTENV_CONFIG_IGNORE
})

t.test('returns options unchanged when DOTENV_CONFIG_IGNORE is unset', t => {
  const options = { ignore: ['MISSING_KEY'] }

  t.equal(normalizeDotenvConfigIgnore(options), options)
  t.same(options.ignore, ['MISSING_KEY'])
  t.end()
})

t.test('parses, trims, and filters comma-separated error codes', t => {
  process.env.DOTENV_CONFIG_IGNORE = ' MISSING_ENV_FILE, MISSING_KEY, '

  const result = normalizeDotenvConfigIgnore({})

  t.same(result.ignore, ['MISSING_ENV_FILE', 'MISSING_KEY'])
  t.end()
})

t.test('merges without mutating explicit ignore options', t => {
  process.env.DOTENV_CONFIG_IGNORE = 'MISSING_ENV_FILE'
  const options = { ignore: ['MISSING_KEY'] }

  const result = normalizeDotenvConfigIgnore(options)

  t.same(result.ignore, ['MISSING_KEY', 'MISSING_ENV_FILE'])
  t.same(options.ignore, ['MISSING_KEY'])
  t.not(result, options)
  t.end()
})
