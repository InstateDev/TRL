/* global artifacts  */
const config = require('../config')
const Standard20TokenContract = artifacts.require('Standard20TokenMock')
const keccak256 = require('js-sha3').keccak256
const OwnedRegistryFactoryContract = artifacts.require('@frontier-token-research/role-registries/contracts/OwnedRegistryFactory')
const OwnedRegistryContract = artifacts.require('@frontier-token-research/role-registries/contracts/OwnedRegistry')
const PeriodContract = artifacts.require('Daily')

module.exports = (deployer) => {
  deployer.then(async () => {
    if (config.proxyMigration) {
      const RegistryFactory = await OwnedRegistryFactoryContract.deployed()
      await RegistryFactory.newRegistry(keccak256('voter'))
      await RegistryFactory.newRegistry(keccak256('candidate'))
      const candidateAddress = await RegistryFactory.getRegistry(keccak256('candidate'))
      const voterAddress = await RegistryFactory.getRegistry(keccak256('voter'))

      let periodAddress = await PeriodContract.deployed()
      periodAddress = periodAddress.address

      const candidateInstance = OwnedRegistryContract.at(candidateAddress)
      const voterInstance = OwnedRegistryContract.at(voterAddress)

      await candidateInstance.init(5, 5, periodAddress)
	  await voterInstance.init(5, 5, periodAddress)
    }
  })
}
