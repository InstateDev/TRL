/* global artifacts contract web3 before beforeEach it assert */
const config = require('../../config.js')
const Utils = require('../helpers/utils.js')
const advanceToBlock = require('../helpers/advanceToBlock')
const { assertRevert } = require('../helpers/assertRevert')
const Standard20TokenMock = artifacts.require('Standard20TokenMock')
const TRLContract = artifacts.require('TRL')
const PeriodicStageContract = artifacts.require('PeriodicStages')
const PeriodContract = artifacts.require('PeriodMock')
const VaultContract = artifacts.require('Vault')
const OwnedRegistryContract = artifacts.require('OwnedRegistryMock')
const VoteTokenContract = artifacts.require('VoteToken')

// Payments
const BankContract = artifacts.require('Bank')
const AllowanceContract = artifacts.require('Allowance')
const HelenaFeeContract = artifacts.require('helenaAgent')
const MainSalaryEntityContract = artifacts.require('MainSalaryEntity')

// When DEBUG_MODE=true, the logs are printed.
const DEBUG_MODE = false

contract('MainSalaryEntity', function (accounts) {
  // Accounts
  const adminAccount = web3.eth.accounts[0]
  const voterAccounts = web3.eth.accounts.slice(1, 4)
  const candidateAccounts = web3.eth.accounts.slice(5, 8)
  const owner = web3.eth.accounts[0]

  // Contract instances
  let TRLInstance
  let FrontierTokenInstance
  let CandidateRegistryInstance
  let VoterRegistryInstance
  let Vault
  let PeriodInstance
  let VoteTokenInstance
  let Allowance
  let Balance
  let mainSalaryInstance

  // Variables
  const totalTokenIssuance = 100
  const percentageResolution = config.percentageResolution
  const entityPercentage = 100
  const entityPercentageMultiplied = entityPercentage * percentageResolution
  let totalVotesBought = 100
  let period = 0

  before('Deploying required contracts', async () => {

  })
  beforeEach(async () => {
    PeriodInstance = await PeriodContract.new()
    CandidateRegistryInstance = await OwnedRegistryContract.new(candidateAccounts, PeriodInstance.address, {from: adminAccount})
    VoterRegistryInstance = await OwnedRegistryContract.new(voterAccounts, PeriodInstance.address, {from: adminAccount})
    FrontierTokenInstance = await Standard20TokenMock.new(voterAccounts, config.totalTokens, {from: adminAccount})
    Vault = await VaultContract.new({from: adminAccount})
    VoteTokenInstance = await VoteTokenContract.new({from: adminAccount})
    TRLInstance = await TRLContract.new({from: adminAccount})

    await TRLInstance.setVoteToken(VoteTokenInstance.address)
    await TRLInstance.setToken(FrontierTokenInstance.address)
    await VoteTokenInstance.transferOwnership(TRLInstance.address, {from: adminAccount})
    await TRLInstance.setCandidateRegistry(CandidateRegistryInstance.address)
    await TRLInstance.setVoterRegistry(VoterRegistryInstance.address)
    await TRLInstance.setVault(Vault.address)
    await TRLInstance.setPeriod(PeriodInstance.address)
    await VoteTokenInstance.setPeriod(PeriodInstance.address)

    // Aproving and buying votes
    await FrontierTokenInstance.approve(TRLInstance.address, totalVotesBought, {from: voterAccounts[0]})
    await TRLInstance.buyTokenVotes(totalVotesBought, { from: voterAccounts[0] })

    await FrontierTokenInstance.approve(TRLInstance.address, totalVotesBought, {from: voterAccounts[1]})
    await TRLInstance.buyTokenVotes(totalVotesBought, { from: voterAccounts[1] })

    await FrontierTokenInstance.approve(TRLInstance.address, totalVotesBought, {from: voterAccounts[2]})
    await TRLInstance.buyTokenVotes(totalVotesBought, { from: voterAccounts[2] })

    // Approving trasfer to fund Vault
    await FrontierTokenInstance.approve(Vault.address, totalTokenIssuance, { from: voterAccounts[0] })

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
    mainSalaryInstance = await MainSalaryEntityContract.new(
      Vault.address,
      Balance.address,
      TRLInstance.address,
      VoteTokenInstance.address
      )
    await Allowance.addEntity(
      mainSalaryInstance.address,
      'Helena-fee',
      entityPercentageMultiplied,
      period
      )

    await mainSalaryInstance.setCandidateRegistry(CandidateRegistryInstance.address)
    await Balance.setBalancesForEntities([mainSalaryInstance.address], FrontierTokenInstance.address, period)
    await Vault.setBankContractAddress(Balance.address, { from: owner })
  })

  describe('Main Salary', async () => {
    it('Should count the total number of votes cast', async () => {
      let userVotes

      const voter1VotesCast = totalVotesBought
      const voter2VotesCast = totalVotesBought
      // Voting and  checking the user received the votes
      await TRLInstance.vote(candidateAccounts[0], voter1VotesCast, { from: voterAccounts[0] })
      userVotes = await TRLInstance.getUserVotes(0, candidateAccounts[0])
      assert.equal(userVotes, voter1VotesCast)

      await TRLInstance.vote(candidateAccounts[1], voter2VotesCast, { from: voterAccounts[1] })
      userVotes = await TRLInstance.getUserVotes(0, candidateAccounts[1])
      assert.equal(userVotes, voter2VotesCast)

      const expectedVotesCast = voter1VotesCast + voter2VotesCast
      await Utils.advancePeriods(1, PeriodInstance, CandidateRegistryInstance)
      const actualVotesCast = await TRLInstance.getEpochTotalVotes(0)

      assert.equal(actualVotesCast, expectedVotesCast)
    })

    it('Transfer the correct to 2 users', async () => {
      const VaultBalance = await FrontierTokenInstance.balanceOf(Vault.address)
      let userBalance = await FrontierTokenInstance.balanceOf(candidateAccounts[1])

      const voter1VotesCast = totalVotesBought
      // Voting and  checking the user received the votes
      await TRLInstance.vote(candidateAccounts[0], voter1VotesCast, { from: voterAccounts[0] })
      await TRLInstance.vote(candidateAccounts[1], voter1VotesCast, { from: voterAccounts[1] })

      await Utils.advancePeriods(2, PeriodInstance, CandidateRegistryInstance)

      await mainSalaryInstance.collectPayment(candidateAccounts[0], FrontierTokenInstance.address, 0)
      await mainSalaryInstance.collectPayment(candidateAccounts[1], FrontierTokenInstance.address, 0)

      const finalBalance1 = await FrontierTokenInstance.balanceOf(candidateAccounts[0])
      const finalBalance2 = await FrontierTokenInstance.balanceOf(candidateAccounts[1])

      assert.equal(finalBalance1, parseInt((userBalance + VaultBalance) / 2))
      assert.equal(finalBalance2, parseInt((userBalance + VaultBalance) / 2))
    })

    it('Should fail when collecting payment from current period', async () => {
      const voter1VotesCast = totalVotesBought
      // Voting and  checking the user received the votes
      await TRLInstance.vote(candidateAccounts[0], voter1VotesCast, { from: voterAccounts[0] })

      await assertRevert(mainSalaryInstance.collectPayment(candidateAccounts[0], FrontierTokenInstance.address, 0))
    })

    it('Should fail when collecting payment past the period limit (12 periods)', async () => {
      const voter1VotesCast = totalVotesBought
      // Voting and  checking the user received the votes
      await TRLInstance.vote(candidateAccounts[0], voter1VotesCast, { from: voterAccounts[0] })

      const periodsToAdvance = 12
      await Utils.advancePeriods(periodsToAdvance, PeriodInstance, CandidateRegistryInstance)
      await assertRevert(mainSalaryInstance.collectPayment(candidateAccounts[0], FrontierTokenInstance.address, 0))
    })

    it('Should round to the floor of the number', async () => {
      let userBalance = await FrontierTokenInstance.balanceOf(candidateAccounts[1])

      const voter1VotesCast = totalVotesBought
      // Voting and  checking the user received the votes
      await TRLInstance.vote(candidateAccounts[0], voter1VotesCast, { from: voterAccounts[0] })

      await Utils.advancePeriods(2, PeriodInstance, CandidateRegistryInstance)
      const invalidUser = adminAccount
      await assertRevert(mainSalaryInstance.collectPayment(invalidUser, FrontierTokenInstance.address, 0))
    })

    it('Transfer the correct to 2 users', async () => {
      const VaultBalance = await FrontierTokenInstance.balanceOf(Vault.address)

      const voter1VotesCast = 40
      const voter2VotesCast = 41
      // Voting and  checking the user received the votes
      await TRLInstance.vote(candidateAccounts[0], voter1VotesCast, { from: voterAccounts[0] })
      await TRLInstance.vote(candidateAccounts[1], voter2VotesCast, { from: voterAccounts[1] })
      await Utils.advancePeriods(2, PeriodInstance, CandidateRegistryInstance)

      await mainSalaryInstance.collectPayment(candidateAccounts[0], FrontierTokenInstance.address, 0)
      await mainSalaryInstance.collectPayment(candidateAccounts[1], FrontierTokenInstance.address, 0)

      const finalBalance1 = parseInt(await FrontierTokenInstance.balanceOf(candidateAccounts[0]))
      const finalBalance2 = parseInt(await FrontierTokenInstance.balanceOf(candidateAccounts[1]))
      // The sum of distributed tokens can not vary by more than 1 token per user
      const diff = VaultBalance - (finalBalance1 + finalBalance2)

      const passes = (diff <= 2) && (diff >= 0)

      assert.equal(passes, true)
    })
  })
  describe('Random Votes', async () => {
    for (let i = 0; i < 5; i++) {
      it('#' + i, async () => {
        const VaultBalance = await FrontierTokenInstance.balanceOf(Vault.address)
        let userBalance = await FrontierTokenInstance.balanceOf(candidateAccounts[1])

        const votes = Utils.getRandomVotes(totalVotesBought)
        // Voting and  checking the user received the votes
        await TRLInstance.vote(candidateAccounts[0], votes[0], { from: voterAccounts[0] })
        await TRLInstance.vote(candidateAccounts[1], votes[1], { from: voterAccounts[1] })

        await Utils.advancePeriods(2, PeriodInstance, CandidateRegistryInstance)

        await mainSalaryInstance.collectPayment(candidateAccounts[0], FrontierTokenInstance.address, 0)
        await mainSalaryInstance.collectPayment(candidateAccounts[1], FrontierTokenInstance.address, 0)

        const finalBalance1 = parseInt(await FrontierTokenInstance.balanceOf(candidateAccounts[0]))
        const finalBalance2 = parseInt(await FrontierTokenInstance.balanceOf(candidateAccounts[1]))
        // The sum of distributed tokens can not vary by more than 1 token per user
        const diff = VaultBalance - (finalBalance1 + finalBalance2)

        const passes = (diff <= 2) && (diff >= 0)

        assert.equal(passes, true)
      })
    }
  })
})

function printLogs () {
  if (DEBUG_MODE) {
    for (let i = 0; i < arguments.length; i++) {
      console.log(arguments[i])
    }
  }
}
