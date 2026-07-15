const t = require('tap')
const { PassThrough } = require('stream')

const { redactOutput, createRedactedStreamWriter } = require('../../../src/lib/helpers/redactOutput')

t.test('redactOutput replaces sensitive values in strings, arrays, and plain objects', ct => {
  const sensitiveValues = ['super-secret', 'secret']

  ct.equal(redactOutput('value=super-secret', sensitiveValues), 'value=[REDACTED]')
  ct.same(redactOutput(['secret', { nested: 'super-secret' }], sensitiveValues), ['[REDACTED]', { nested: '[REDACTED]' }])
  ct.equal(redactOutput('public-value', sensitiveValues), 'public-value')

  ct.end()
})

t.test('createRedactedStreamWriter redacts values split across chunks', ct => {
  const output = new PassThrough()
  let written = ''
  output.on('data', chunk => {
    written += chunk.toString()
  })

  const writer = createRedactedStreamWriter(output, ['super-secret'])
  writer.write('value=super-')
  writer.write('secret\n')
  writer.flush()

  ct.equal(written, 'value=[REDACTED]\n')
  ct.end()
})

t.test('createRedactedStreamWriter does not flush a partial secret while waiting for another chunk', async ct => {
  const output = new PassThrough()
  let written = ''
  output.on('data', chunk => {
    written += chunk.toString()
  })

  const writer = createRedactedStreamWriter(output, ['super-secret'])
  writer.write('value=super-')

  await new Promise(resolve => setTimeout(resolve, 150))
  ct.equal(written, 'value=')

  writer.write('secret\n')
  writer.flush()

  ct.equal(written, 'value=[REDACTED]\n')
})

t.test('createRedactedStreamWriter redacts a unicode value split inside a character', ct => {
  const output = new PassThrough()
  let written = ''
  output.on('data', chunk => {
    written += chunk.toString()
  })

  const writer = createRedactedStreamWriter(output, ['key-🔑-secret'])
  const value = Buffer.from('value=key-🔑-secret\n')
  const splitAt = Buffer.from('value=key-').length + 2

  writer.write(value.subarray(0, splitAt))
  writer.write(value.subarray(splitAt))
  writer.flush()

  ct.equal(written, 'value=[REDACTED]\n')
  ct.end()
})

t.test('createRedactedStreamWriter pauses and resumes for backpressure', ct => {
  const output = new PassThrough({ highWaterMark: 1 })
  let pauseCount = 0
  let resumeCount = 0
  const source = {
    pause: () => { pauseCount += 1 },
    resume: () => { resumeCount += 1 }
  }

  const writer = createRedactedStreamWriter(output, ['super-secret'], source)
  writer.write('enough unrelated output to exceed the high water mark')

  ct.equal(pauseCount, 1)
  output.emit('drain')
  ct.equal(resumeCount, 1)
  writer.flush()
  ct.end()
})

t.test('createRedactedStreamWriter passes through unrelated output immediately', ct => {
  const output = new PassThrough()
  let written = ''
  output.on('data', chunk => {
    written += chunk.toString()
  })

  const writer = createRedactedStreamWriter(output, ['super-secret'])
  writer.write('prompt> ')

  ct.equal(written, 'prompt> ')
  writer.flush()
  ct.end()
})
