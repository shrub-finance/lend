const fs = require('fs');
const mustache = require('mustache');
const deployedContracts = require('../hardhat/deployments/deployed-contracts.json');

// Load the template file
const template = fs.readFileSync('subgraph.template.yaml', 'utf8');

// Define your variables (normally you would pull these from process.env)
const view = {
  LENDING_PLATFORM_ADDRESS: deployedContracts.contracts.LendingPlatform.address,
  // Add other dynamic values here
};

// Render the template with your variables
const output = mustache.render(template, view);

// Write the output to subgraph.yaml
fs.writeFileSync('subgraph.yaml', output);
