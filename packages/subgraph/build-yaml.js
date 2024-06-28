const fs = require('fs');
const mustache = require('mustache');
const deployedContracts = require('../hardhat/deployments/deployed-contracts.json');
const chainId = process.env.CHAIN_ID;
if (!chainId) {
  throw new Error('Missing chainId');
}
const subgraphNetworkNameDictionary = {
  1337: "mainnet",
  11155111: "sepolia",
  17000: "holesky"
}

const hardhatNetworkNameDictionary = {
  1337: "localhost",
  11155111: "sepolia",
  17000: "holesky"
}

contractDetails = require(`../hardhat/deployments/${hardhatNetworkNameDictionary[chainId]}/LendingPlatform.json`);

// Load the template file
const template = fs.readFileSync('subgraph.template.yaml', 'utf8');

const chainData = deployedContracts[chainId].find(o => o.chainId === chainId);

// Define your variables (normally you would pull these from process.env)
const view = {
  LENDING_PLATFORM_ADDRESS: chainData.contracts.LendingPlatform.address,
  NETWORK_NAME: subgraphNetworkNameDictionary[chainId],
  START_BLOCK: contractDetails.receipt.blockNumber
  // Add other dynamic values here
};

// Render the template with your variables
const output = mustache.render(template, view);

// Write the output to subgraph.yaml
fs.writeFileSync('subgraph.yaml', output);
