const { logger } = require('./../../shared/logger')
const Errors = require('./errors')

function catchAndLog (error) {
  if (error.code === 'EACCES' || error.code === 'EPERM') {
    error = new Errors({ filepath: error.path }).fileNotWritable()
  }

  const msg = error.messageWithHelp || error.message
  if (msg) {
    logger.error(msg)
  }
  if (error.debug) {
    logger.debug(error.debug)
  }
  if (error.code) {
    logger.debug(`ERROR_CODE: ${error.code}`)
  }
}

module.exports = catchAndLog
