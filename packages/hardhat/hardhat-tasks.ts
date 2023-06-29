import { task, types } from 'hardhat/config'
import "@nomicfoundation/hardhat-toolbox";

import { USDCoin } from './typechain-types';
import { Address } from 'hardhat-deploy/types';
import assert from 'node:assert/strict';

// Helper Functions
function toEthDate(date: Date) {
    return Math.round(Number(date) / 1000);
}

// Tasks
task("accounts", "Prints the list of accounts", async (taskArgs, env) => {
  const { ethers } = env;
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("distributeUsdc", "distribute USDC from the deployer account")
  .addParam("to", "address to send funds to", null, types.string)
  .addParam("amount", "address in USDC to send", 0, types.float)
  .setAction(async (taskArgs, env) => {
    const to: Address = taskArgs.to;
    const amount: number = taskArgs.amount;

    const {ethers, deployments, getNamedAccounts} = env;
    const { deployer } = await getNamedAccounts();
    const usdCoinDeployment = await deployments.get('USDCoin');
    const usdc = await ethers.getContractAt("USDCoin", usdCoinDeployment.address);

    const toFormatted = ethers.getAddress(to);
    const amountInUnits = amount * 10 ** 6;

    assert.ok(ethers.isAddress(toFormatted), "invalid to address");
    assert.notEqual(toFormatted, deployer, "Address must not be deployer address")
    assert.ok(amount > 0, "Amount must be greater than 0");
    assert.equal(amountInUnits, Math.floor(amountInUnits), "Amount must have no more than 6 decimals")
    const deployerAccount = await ethers.getSigner(deployer);

    const usdcDeployer = usdc.connect(deployerAccount);

    const tx = await usdcDeployer.transfer(toFormatted, amountInUnits)
    // console.log(`${amount} USDC sent to ${toFormatted}`);
    const txReceipt = await tx.wait();
    if (!txReceipt) {
        console.log('timeout');
        return;
    }
    const transaction = await tx.getTransaction();
    console.log(`${amount} USDC sent to ${toFormatted} in block number ${txReceipt.blockNumber} txid ${txReceipt.hash}`);
  })

task("createPool", "Create a lending pool")
    .addParam("timestamp", "Unix timestamp of the pool", undefined, types.int, false)
    .setAction(async (taskArgs, env) => {
        const timestamp: Address = taskArgs.timestamp;

        const {ethers, deployments, getNamedAccounts} = env;
        const { deployer } = await getNamedAccounts();
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const lendingPlatform = await ethers.getContractAt("LendingPlatform", lendingPlatformDeployment.address);

        const deployerAccount = await ethers.getSigner(deployer);
        const lendingPlatformDeployer = lendingPlatform.connect(deployerAccount);

        const tx = await lendingPlatformDeployer.createPool(timestamp);
        console.log(`Create pool transaction broadcast with txid: ${tx.hash}`);
        const txReceipt = await tx.wait();
        console.log(`Pool created with timestamp ${timestamp}. Confirmed in block: ${txReceipt?.blockNumber}`);
    })

task("testLendingPlatform", "Setup an environment for development")
  .setAction(async (taskArgs, env) => {
    const {ethers, deployments, getNamedAccounts} = env;
    const { deployer, account1, account2, account3 } = await getNamedAccounts();
    await env.run('distributeUsdc', { to: account1, amount: 1000 });
    await env.run('distributeUsdc', { to: account2, amount: 2000 });
    await env.run('distributeUsdc', { to: account3, amount: 3000 });
    await env.run('createPool', { timestamp: toEthDate(new Date("2023-08-01"))});  // 1 month
    await env.run('createPool', { timestamp: toEthDate(new Date("2023-10-01"))});  // 3 month
    await env.run('createPool', { timestamp: toEthDate(new Date("2024-01-01"))});  // 6 month
    await env.run('createPool', { timestamp: toEthDate(new Date("2024-07-01"))});  // 12 month
  })

task("erc20Details", "get the details of an ERC20")
  .addParam('address', "contract address of the ERC-20", "", types.string)
  .setAction(async (taskArgs, env) => {
    const address: Address = taskArgs.address;

    const {ethers, deployments, getNamedAccounts} = env;

    const addressFormatted = ethers.getAddress(address);

    assert.ok(ethers.isAddress(addressFormatted), "invalid to address");

    const erc20 = await ethers.getContractAt("ERC20", addressFormatted);

    const symbol = await erc20.symbol();
    const name = await erc20.name();
    const totalSupply = await erc20.totalSupply();
    const decimals = await erc20.decimals();

    console.log(`
      symbol: ${symbol}
      name: ${name}
      decimals: ${decimals}
      totalSupply: ${totalSupply}
    `)

  })
