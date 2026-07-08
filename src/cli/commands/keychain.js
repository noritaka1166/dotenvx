function configureKeychainCommand (keychain) {
  keychain
    .description('store private keys in macOS Keychain')
    .action(function () {
      this.help()
    })

  const upAction = require('./../actions/keychain/up')
  keychain
    .command('up')
    .description('store key in macOS Keychain')
    .option('-f, --env-file <path>', 'path to your env file')
    .option('-fk, --env-keys-file <path>', 'path to your .env.keys file', '.env.keys')
    .action(upAction)

  const downAction = require('./../actions/keychain/down')
  keychain
    .command('down')
    .description('move key from macOS Keychain to .env.keys')
    .option('-f, --env-file <path>', 'path to your env file')
    .option('-fk, --env-keys-file <path>', 'path to your .env.keys file', '.env.keys')
    .action(downAction)

  const pushAction = require('./../actions/keychain/push')
  keychain
    .command('push')
    .description('push key to macOS Keychain from .env.keys')
    .option('-f, --env-file <path>', 'path to your env file')
    .option('-fk, --env-keys-file <path>', 'path to your .env.keys file', '.env.keys')
    .action(pushAction)

  const pullAction = require('./../actions/keychain/pull')
  keychain
    .command('pull')
    .description('pull key from macOS Keychain into .env.keys')
    .option('-f, --env-file <path>', 'path to your env file')
    .option('-fk, --env-keys-file <path>', 'path to your .env.keys file', '.env.keys')
    .action(pullAction)

  return keychain
}

module.exports = configureKeychainCommand
