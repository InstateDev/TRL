/* global artifacts contract web3 before beforeEach it assert describe */
const config = require('../../config')
const Standard20TokenMock = artifacts.require('Standard20TokenMock')
const TRLContract = artifacts.require('TRL')
const PeriodContract = artifacts.require('PeriodMock')
const VaultContract = artifacts.require('Vault')
const OwnedRegistryContract = artifacts.require('OwnedRegistryMock')

// Payments
const BankContract = artifacts.require('Bank')
const AllowanceContract = artifacts.require('Allowance')
const BasicSalaryEntityContract = artifacts.require('BasicSalaryEntity')

contract('BasicSalary', function (accounts) {
  // Accounts
  const adminAccount = web3.eth.accounts[0]
  const voterAccounts = web3.eth.accounts.slice(1, 4)
  const candidateAccounts = web3.eth.accounts.slice(5, 8)
  const owner = web3.eth.accounts[0]

  // Contracts
  let TRLInstance
  let FrontierTokenInstance
  let CandidateRegistryInstance
  let VoterRegistryInstance
  let Vault
  let PeriodInstance
  let basicSalaryInstance
  let Allowance
  let Balance

  // vars
  const totalTokenIssuance = 100
  const percentageResolution = config.percentageResolution
  const entityPercentage = 100
  const entityPercentageMultiplied = entityPercentage * percentageResolution

  let period = 0

  before('Deploying required contracts', async () => {
    PeriodInstance = await PeriodContract.new()
    CandidateRegistryInstance = await OwnedRegistryContract.new(candidateAccounts, PeriodInstance.address, {from: adminAccount})
    VoterRegistryInstance = await OwnedRegistryContract.new(voterAccounts, PeriodInstance.address, {from: adminAccount})
  })
  beforeEach(async () => {
    FrontierTokenInstance = await Standard20TokenMock.new(voterAccounts, config.totalTokens, {from: adminAccount})
    Vault = await VaultContract.new({from: adminAccount})
    TRLInstance = await TRLContract.new({from: adminAccount})
    await TRLInstance.setToken(FrontierTokenInstance.address)
    await TRLInstance.setCandidateRegistry(CandidateRegistryInstance.address)
    await TRLInstance.setVoterRegistry(VoterRegistryInstance.address)
    await TRLInstance.setVault(Vault.address)
    // Approving trasfer to fund Vault
    await FrontierTokenInstance.approve(Vault.address, totalTokenIssuance, {
      from: voterAccounts[0]
    })

    // Funding Vault
    await Vault.deposit(
      0,
      FrontierTokenInstance.address,
      voterAccounts[0],
      totalTokenIssuance,
      { from: voterAccounts[0] })

    await Vault.close(0, FrontierTokenInstance.address)
    Allowance = await AllowanceContract.new()
    Balance = await BankContract.new(
      Allowance.address,
      Vault.address
      )
    basicSalaryInstance = await BasicSalaryEntityContract.new(
      Vault.address,
      Balance.address
      )
    await Allowance.addEntity(
      basicSalaryInstance.address,
      'Helena-fee',
      entityPercentageMultiplied,
      period
      )

    for (let candidate of candidateAccounts) {
      await basicSalaryInstance.addAllowedReceiver(candidate, FrontierTokenInstance.address, { from: owner })
    }

    await basicSalaryInstance.setCandidateRegistry(CandidateRegistryInstance.address)
    await Balance.setBalancesForEntities([basicSalaryInstance.address], FrontierTokenInstance.address, period)
    await Vault.setBankContractAddress(Balance.address, { from: owner })
  })

  describe('Should pass', async () => {
    it('Should make the payment to the Receiver', async () => {
      let receiverBalance = -1
      const numberOfCandidates = candidateAccounts.length
      const expectedBalance = Math.floor(totalTokenIssuance / numberOfCandidates)
      for (let candidate of candidateAccounts) {
        await basicSalaryInstance.collectPayment(
          candidate,
          FrontierTokenInstance.address,
          period
          )
        receiverBalance = await FrontierTokenInstance.balanceOf(candidate)
        assert.equal(receiverBalance, expectedBalance)
      }
    })
  })
})
