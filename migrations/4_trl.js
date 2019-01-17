const config = require('../config')
const keccak256 = require('js-sha3').keccak256
const OwnedRegistryFactory = artifacts.require('OwnedRegistryFactory')
const OwnedRegistryContract = artifacts.require('OwnedRegistry')
const Standard20TokenContract = artifacts.require('Standard20TokenMock')
const options = {from: config.ownerAccount}
const TRLContract = artifacts.require('TRL')

module.exports = (deployer) => {
  deployer.then(async () => {
    const RegistryFactory = await OwnedRegistryFactory.deployed()
    await RegistryFactory.newRegistry(keccak256('voter'))
    await RegistryFactory.newRegistry(keccak256('candidate'))
    const candidateRegistryAddress = await RegistryFactory.getRegistry.call(keccak256('voter'))
    const voterRegistryAddress = await RegistryFactory.getRegistry.call(keccak256('candidate'))
    const FrontierToken = await Standard20TokenContract.deployed()
    await deployer.deploy(TRLContract, '0x3a1f6b0992b1a3f2a15f52099cf172e9bea930de', '0x39e75964b446dc512578051338f960727e034b01', '0x5226b7904424d2a12055204b74a842558d525b38', 40000, 39999, 1)
  })
}
