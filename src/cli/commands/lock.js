function configureLockCommand (lock) {
  lock
    .description('lock private keys with a local passphrase')
    .action(function () {
      this.help()
    })

  const upAction = require('./../actions/lock/up')
  lock
    .command('up')
    .description('lock key in .env.keys')
    .option('-f, --env-file <path>', 'path to your env file')
    .option('-fk, --env-keys-file <path>', 'path to your .env.keys file', '.env.keys')
    .action(upAction)

  const downAction = require('./../actions/lock/down')
  lock
    .command('down')
    .description('unlock key in .env.keys')
    .option('-f, --env-file <path>', 'path to your env file')
    .option('-fk, --env-keys-file <path>', 'path to your .env.keys file', '.env.keys')
    .action(downAction)

  return lock
}

module.exports = configureLockCommand
