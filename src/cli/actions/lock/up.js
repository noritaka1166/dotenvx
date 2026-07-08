const { logger } = require('../../../shared/logger')
const LockUp = require('./../../../lib/services/lockUp')
const armoredKeyDisplay = require('../../../lib/helpers/armoredKeyDisplay')

function up () {
  const options = this.opts()
  logger.debug(`options: ${JSON.stringify(options)}`)

  try {
    const { results } = new LockUp(options.envFile, options.envKeysFile).run()

    for (const result of results) {
      const keyDisplay = armoredKeyDisplay(result.publicKeyValue) || result.privateKeyName

      if (result.changed) {
        logger.success(`⛨ locked (${keyDisplay})`)
      } else {
        logger.info(`○ no change (${keyDisplay})`)
      }
    }
  } catch (error) {
    logger.error(error.message)
    process.exit(1)
  }
}

module.exports = up
