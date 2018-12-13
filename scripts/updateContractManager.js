const ContractManager = require('@frontier-token-research/contract-manager-client')
const testFolder = '../build/contracts'
const fs = require('fs')
const VERSION = getVersion()

let imports = []
let updates = []

fs.readdirSync(testFolder).forEach(file => {
  // console.log(file)
  imports.push(require(testFolder + '/' + file))
})

// console.log(getVersion())

for (let contract of imports) {
  let contractNetworks = contract.networks
  let networkKeys = Object.keys(contractNetworks)

  if (networkKeys.length == 1) {
    const updateItem = {
    	name: contract.contractName,
    	address: contract.networks[networkKeys[0]].address,
    	abi: contract,
    	version: VERSION
    }
    updates.push(updateItem)
  }

  if (networkKeys.length > 1) {
  	throw 'More than 1 network defined on contract:' + contract.contractName
  }
}

function getVersion () {
  let TRL_VERSION = process.env.TRL_VERSION

  if (typeof TRL_VERSION !== 'undefined' && TRL_VERSION) {
  	if (TRL_VERSION.indexOf('.') > -1) {
  		return TRL_VERSION
  	}  	else {
    	return '0.0.0-' + getTimestamp()
  	}
  } else {
    return '0.0.0-' + getTimestamp()
  }
}

function getTimestamp () {
  return Date.now() / 1000 | 0
}

async function updateContractManager (updates) {
  for (let update of updates) {
    let updateState = await ContractManager.updateContract(update.name, update.version, update.abi, update.address)
    console.log('Updated ' + update.name + ' -> ' + updateState)
  }
}

// Main flow

if (true) {
  updateContractManager(updates)
} else {
  console.log('Env variables not set')
  process.exit(1)
}
