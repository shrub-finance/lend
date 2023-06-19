import { task, types } from 'hardhat/config'
import "@nomiclabs/hardhat-ethers";

import { LendingPlatform, USDCoin } from './typechain-types';
import { getContractFactory } from '@nomiclabs/hardhat-ethers/types';
import { Address } from 'hardhat-deploy/types';
import assert from 'node:assert/strict';


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
    const usdCoinFactory = await ethers.getContractFactory('USDCoin');

    const toFormatted = ethers.utils.getAddress(to);
    const amountInUnits = amount * 10 ** 6;

    assert.ok(ethers.utils.isAddress(toFormatted), "invalid to address");
    assert.notEqual(toFormatted, deployer, "Address must not be deployer address")
    assert.ok(amount > 0, "Amount must be greater than 0");
    assert.equal(amountInUnits, Math.floor(amountInUnits), "Amount must have no more than 6 decimals")
    const usdc = usdCoinFactory.attach(usdCoinDeployment.address);
    const deployerAccount = await ethers.getSigner(deployer);
    const usdcDeployer = usdc.connect(deployerAccount);

    const tx = await usdcDeployer.transfer(toFormatted, amountInUnits)
    // console.log(`${amount} USDC sent to ${toFormatted}`);
    const txReceipt = await tx.wait();
    console.log(`${amount} USDC sent to ${toFormatted} in block number ${txReceipt.blockNumber} txid ${txReceipt.transactionHash}`);
})

task("testLendingPlatform", "Setup an environment for development")
.setAction(async (taskArgs, env) => {
    const {ethers, deployments, getNamedAccounts} = env;
    const { deployer, account1, account2, account3 } = await getNamedAccounts();
    await env.run('distributeUsdc', { to: account1, amount: 1000 });
    await env.run('distributeUsdc', { to: account2, amount: 2000 });
    await env.run('distributeUsdc', { to: account3, amount: 3000 });
})

task("erc20Details", "get the details of an ERC20")
  .addParam('address', "contract address of the ERC-20", "", types.string)
  .setAction(async (taskArgs, env) => {
    const address: Address = taskArgs.address;

    const {ethers, deployments, getNamedAccounts} = env;
    const { deployer } = await getNamedAccounts();
    // const usdCoinDeployment = await deployments.get('USDCoin');
    // const usdCoinFactory = await ethers.getContractFactory('USDCoin');
    const erc20Factory = await ethers.getContractFactory('ERC20');

    const addressFormatted = ethers.utils.getAddress(address);

    assert.ok(ethers.utils.isAddress(addressFormatted), "invalid to address");


    const erc20 = erc20Factory.attach(addressFormatted);

    // console.log(`${amount} USDC sent to ${toFormatted}`);
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