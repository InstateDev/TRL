// ttl, active time and claimtime were increased in order to pass integration tests.

module.exports = {
  // ttl: 10,
  proxyMigration: true,
  ttl: 1000000000000, // Aproximately 1 Week
  activeTime: 1000000000000,
  claimTime: 0,
  candidateLength: 100,
  voterLength: 100,
  initialBalance: 10000000,
  totalTokens: 1000,
  tokenAddress: '0x3a1f6b0992b1a3f2a15f52099cf172e9bea930de',
  ownerAccount: '0x00B8FBD65D61b7DFe34b9A3Bb6C81908d7fFD541',
  voterAccounts: [
    '0x9b2828ef19b39de73d5f81a688df35939ac5fdc0'
  ],
  candidateAccounts: [
    '0x00b8fbd65d61b7dfe34b9a3bb6c81908d7ffd541'
  ],
  reputationWindowSize: 5,
  reputationWeights: [400000000, 300000000, 200000000, 100000000, 0]
}
