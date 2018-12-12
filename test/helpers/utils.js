function getRandomVotes (upperLimit) {
  while (1) {
    let a = Math.floor((Math.random() * upperLimit) + 1)
    let b = Math.floor((Math.random() * upperLimit) + 1)

    return [a, b]
  }
}

async function advancePeriods (periodsToAdvance, periodInstance, candidateRegistryInstance) {
  for (let i = 0; i < periodsToAdvance; i++) {
    await periodInstance.next()
    await candidateRegistryInstance.debug_forceUpdate()
  }
}

module.exports.getRandomVotes = getRandomVotes
module.exports.advancePeriods = advancePeriods
