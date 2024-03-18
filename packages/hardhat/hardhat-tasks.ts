import { task, types } from 'hardhat/config'
import "@nomicfoundation/hardhat-toolbox";

import { Address } from 'hardhat-deploy/types';
import assert from 'node:assert/strict';
import {Contract, ContractMethod, parseEther, parseUnits, TransactionResponse} from "ethers";
import {fromEthDate, getPlatformDates, toEthDate} from "@shrub-lend/common"
import {HardhatRuntimeEnvironment} from "hardhat/types";

const x = async () => {}
async function sendTransaction(sentTx: Promise<TransactionResponse>, description: string) {
    const tx = await sentTx;
    console.log(`${description} transaction broadcast with txid: ${tx.hash}`);
    const txReceipt = await tx.wait();
    console.log(`${description} transaction confirmed in block: ${txReceipt?.blockNumber}`);
}

async function getDeployedContracts(env: HardhatRuntimeEnvironment) {
    const {ethers, deployments} = env;
    return {
        aeth: await ethers.getContractAt("AETH", (await deployments.get('AETH')).address),
        usdc: await ethers.getContractAt("USDCoin", (await deployments.get('USDCoin')).address),
        bpt: await ethers.getContractAt("BorrowPositionToken", (await deployments.get('BorrowPositionToken')).address),
        lendingPlatform: await ethers.getContractAt("LendingPlatform", (await deployments.get('LendingPlatform')).address),
        mockAaveV3: await ethers.getContractAt("MockAaveV3", (await deployments.get('MockAaveV3')).address),
        mockChainlinkAggregator: await ethers.getContractAt("MockChainlinkAggregator", (await deployments.get('MockChainlinkAggregator')).address),
    }
}

// Tasks
task("accounts", "Prints the list of accounts", async (taskArgs, env) => {
  const { ethers } = env;
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("getBalances", "Prints the ETH and USDC balance in all named accounts", async(taskArgs, env) => {
    const { ethers, getNamedAccounts, deployments } = env;
    const accounts = await getNamedAccounts();
    const aETHDeployment = await deployments.get('AETH');
    const mockAaveV3Deployment = await deployments.get('MockAaveV3');
    const lendDeployment = await deployments.get('LendingPlatform')
    accounts.lendingPlatform = lendDeployment.address;
    accounts.aETH = aETHDeployment.address;
    accounts.mockAaveV3 = mockAaveV3Deployment.address;
    for (const accountName of Object.keys(accounts)) {
        await env.run('getBalance', {account: accountName});
    }
})

task("getBalance", "Prints the ETH and USDC balance in specified account")
    .addParam("account", "either namedAccount name or address")
    .setAction(async (taskArgs, env) => {
    const { ethers, getNamedAccounts, deployments } = env;
    const account = taskArgs.account;
    const {usdc, aeth} = await getDeployedContracts(env);
    const namedAccounts = await getNamedAccounts();
    const signer = namedAccounts[account] ?
        await ethers.getSigner(namedAccounts[account]) :
        await ethers.getSigner(account);
    const accountName = namedAccounts[account] ?
        account :
        "address";
    // const usdc = await getDeployedContract('USDCoin', env);
    // const aeth = await getDeployedContract('AETH', env);
    const usdcDecimals = await usdc.decimals();
    const aethDecimals = await aeth.decimals();
    const ethBalance = await ethers.provider.getBalance(signer.address);
    const usdcBalance = await usdc.balanceOf(signer.address);
    const aethBalance = await aeth.balanceOf(signer.address);
    console.log(`
${accountName} - ${signer.address}
==============
ETH: ${ethers.formatEther(ethBalance)}
USDC: ${ethers.formatUnits(usdcBalance, usdcDecimals)}
AETH: ${ethers.formatUnits(aethBalance, aethDecimals)}
`);
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

task("finalizeLendingPool", "Finalize a lending pool")
    .addParam("timestamp", "Unix timestamp of the pool", undefined, types.int, false)
    .setAction(async (taskArgs, env) => {
        const timestamp: Address = taskArgs.timestamp;

        const {ethers, deployments, getNamedAccounts} = env;
        const { deployer } = await getNamedAccounts();
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const lendingPlatform = await ethers.getContractAt("LendingPlatform", lendingPlatformDeployment.address);

        const deployerAccount = await ethers.getSigner(deployer);
        const lendingPlatformDeployer = lendingPlatform.connect(deployerAccount);

        const tx = await lendingPlatform.connect(deployerAccount).finalizeLendingPool(timestamp);
        console.log(`Finalize pool transaction broadcast with txid: ${tx.hash}`);
        const txReceipt = await tx.wait();
        console.log(`Pool with timestamp ${timestamp} finalized. Confirmed in block: ${txReceipt?.blockNumber}`);
    })

task("provideLiquidity", "add USDC to a lending pool")
    .addParam("timestamp", "Unix timestamp of the pool", undefined, types.int, false)
    .addParam("usdcAmount", "Amount of USDC - in USD", undefined, types.float, false)
    .addParam("account", "Address of account to provide liquidity with - default deployer account", undefined, types.string, true)
    .setAction(async (taskArgs, env) => {
        const timestamp: Address = taskArgs.timestamp;
        const usdcAmount: number = taskArgs.usdcAmount;
        const account = taskArgs.account;

        const {ethers, deployments, getNamedAccounts} = env;
        const { deployer } = await getNamedAccounts();
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const lendingPlatform = await ethers.getContractAt("LendingPlatform", lendingPlatformDeployment.address);
        const usdCoinDeployment = await deployments.get('USDCoin');
        const usdc = await ethers.getContractAt("USDCoin", usdCoinDeployment.address);

        const liquidityAccount = await ethers.getSigner(account || deployer);
        const lendingPlatformAccount = lendingPlatform.connect(liquidityAccount);
        const usdcAccount = usdc.connect(liquidityAccount);

        const parsedUsdc = ethers.parseUnits(usdcAmount.toString(), 6);

        // Check balance of account to ensure that it is sufficient
        const usdcBalance = await usdcAccount.balanceOf(liquidityAccount);
        const liquidityAccountAddress = await liquidityAccount.getAddress();
        console.log(`There is a balance of ${ethers.formatUnits(usdcBalance, 6)} USDC in account ${liquidityAccountAddress}`);
        if (usdcBalance < parsedUsdc) {
            console.log('insufficient USDC balance in account - aborting');
            return;
        }
        // Check approval of account to ensure that it is sufficient
        const approved = await usdcAccount.allowance(liquidityAccount.getAddress(), lendingPlatform.getAddress());
        console.log(`approval is currently ${ethers.formatUnits(approved, 6)} USDC`);
        // If approval is not sufficient then create an approval tx
        if (approved < parsedUsdc) {
            const needToApprove = parsedUsdc - approved;
            console.log(`approving additional ${ethers.formatUnits(needToApprove, 6)} USDC for deposit`);
            await sendTransaction(usdcAccount.approve(lendingPlatform.getAddress(), needToApprove), "USDC Approval");
        }
        // Send the deposit tx
        await sendTransaction(lendingPlatformAccount.deposit(timestamp, parsedUsdc), `Deposit USDC`);
    })

task("extendDeposit", "extend an existing deposit")
    .addParam("currentTimestamp", "End Date of the current lend position", undefined, types.int)
    .addParam("newTimestamp", "End Date of the new lend position", undefined, types.int)
    .addParam("account", "Address of account to partially repay loan with (must be the holder of the loan)", undefined, types.string, true)
    .setAction(async (taskArgs, env) => {
        const currentTimestamp: number = taskArgs.currentTimestamp;
        const newTimestamp: number = taskArgs.newTimestamp;
        const account = taskArgs.account;

        const {ethers, deployments, getNamedAccounts} = env;
        const { deployer } = await getNamedAccounts();
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const lendingPlatform = await ethers.getContractAt("LendingPlatform", lendingPlatformDeployment.address);
        const usdCoinDeployment = await deployments.get('USDCoin');
        const usdc = await ethers.getContractAt("USDCoin", usdCoinDeployment.address);

        const liquidityAccount = await ethers.getSigner(account || deployer);
        const lendingPool = await lendingPlatform.getLendingPool(currentTimestamp);
        const oldPoolShareTokenAddress = lendingPool.poolShareTokenAddress;
        const oldPoolShareToken = await ethers.getContractAt('PoolShareToken', oldPoolShareTokenAddress);
        const tokenAmount = await oldPoolShareToken.balanceOf(liquidityAccount.address);
        const tokenTotalSupply = await oldPoolShareToken.totalSupply();

        // Check if oldPoolShareToken is already approved
        const approved = await oldPoolShareToken.allowance(liquidityAccount.getAddress(), lendingPlatform.getAddress());
        console.log(`approval is currently ${ethers.formatUnits(approved, 18)} poolShareToken`);
        // If approval is not sufficient then create an approval tx
        if (approved < tokenAmount) {
            const needToApprove = tokenAmount - approved;
            console.log(`approving additional ${ethers.formatUnits(needToApprove, 18)} poolShareToken for deposit`);
            await sendTransaction(oldPoolShareToken.connect(liquidityAccount).approve(lendingPlatform.getAddress(), needToApprove), "oldPoolShareToken Approval");
        }
        // Approve oldPoolShareToken for moving if not
        const usdcToDeposit = (lendingPool.totalLiquidity + lendingPool.accumInterest) * tokenAmount / tokenTotalSupply;
        // // Check approval of account to ensure that it is sufficient
        const usdcApproved = await usdc.allowance(liquidityAccount.getAddress(), lendingPlatform.getAddress());
        console.log(`approval is currently ${ethers.formatUnits(usdcApproved, 6)} USDC`);
        // If approval is not sufficient then create an approval tx
        if (approved < usdcToDeposit) {
            const needToApprove = usdcToDeposit - approved;
            console.log(`approving additional ${ethers.formatUnits(needToApprove, 6)} USDC for deposit`);
            await sendTransaction(usdc.connect(liquidityAccount).approve(lendingPlatform.getAddress(), needToApprove), "USDC Approval");
        }

        await sendTransaction(lendingPlatform.connect(liquidityAccount).extendDeposit(currentTimestamp, newTimestamp, tokenAmount), "Extend Deposit");
    });

task("extendLoan", "extend an existing loan")
    .addParam("account", "Address of account to extend loan with (must be the holder of the loan)", undefined, types.string, true)
    .addParam("tokenId", "tokenId of the loan position token ERC-721", undefined, types.int)
    .addParam("newTimestamp", "End Date of the new loan", undefined, types.int)
    .addParam("ltv", "Specified LTV of the new loan", undefined, types.int, false)
    .addParam("additionalCollateral", "Additional ETH collateral to provide for the new loan", 0, types.float)
    .addParam("additionalRepayment", "Additional USDC payment to make to the previous loan", 0, types.float)
    .setAction(async (taskArgs, env) => {
        const account = taskArgs.account;
        const tokenId = taskArgs.tokenId;
        const newTimestamp: number = taskArgs.newTimestamp;
        const ltv = taskArgs.ltv;
        const additionalCollateral = taskArgs.additionalCollateral;
        const additionalRepayment = taskArgs.additionalRepayment;

        const {ethers, deployments, getNamedAccounts} = env;
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const lendingPlatform = await ethers.getContractAt("LendingPlatform", lendingPlatformDeployment.address);
        const borrowPositionTokenDeployment = await deployments.get("BorrowPositionToken");
        const borrowPositionToken = await ethers.getContractAt("BorrowPositionToken", borrowPositionTokenDeployment.address);
        const usdCoinDeployment = await deployments.get('USDCoin');
        const usdc = await ethers.getContractAt("USDCoin", usdCoinDeployment.address);
        const aethDeployment = await deployments.get("AETH");
        const aeth = await ethers.getContractAt("AETH", aethDeployment.address);

        const borrowerAccount = await ethers.getSigner(account);
        const parsedAdditionalCollateral = ethers.parseUnits(additionalCollateral.toString(),6);
        const parsedAdditionalRepayment = ethers.parseEther(additionalRepayment.toString());

        const usdcRequirement = await borrowPositionToken.debt(tokenId) + parsedAdditionalRepayment;
        // Check approval of account to ensure that it is sufficient
        const approved = await usdc.allowance(borrowerAccount.getAddress(), lendingPlatform.getAddress());
        console.log(`approval is currently ${ethers.formatUnits(approved, 6)} USDC`);
        // If approval is not sufficient then create an approval tx
        if (approved < usdcRequirement) {
            const needToApprove = usdcRequirement - approved;
            console.log(`approving additional ${ethers.formatUnits(needToApprove, 6)} USDC for deposit`);
            await sendTransaction(usdc.connect(borrowerAccount).approve(lendingPlatform.getAddress(), needToApprove), "USDC Approval");
        }
        await sendTransaction(aeth.connect(borrowerAccount).approve(lendingPlatform.getAddress(), ethers.parseEther("100")), "aETH Approval");

        await sendTransaction(
            lendingPlatform.connect(borrowerAccount).extendLoan(
                tokenId,
                newTimestamp,
                parsedAdditionalCollateral,
                parsedAdditionalRepayment,
                ltv
            ),
            "Extending loan"
        );
    });

task("repayLoan", "add USDC to a lending pool")
    .addParam("tokenId", "tokenId of the loan", undefined, types.int, false)
    .addParam("account", "Address of account to partially repay loan with (must be the holder of the loan)", undefined, types.string, true)
    .addParam("beneficiary", "Address of account to receive the collateral", undefined, types.string, true)
    .setAction(async (taskArgs, env) => {
        const tokenId: number = taskArgs.tokenId;
        const account = taskArgs.account;

        const {ethers, deployments, getNamedAccounts} = env;
        const { deployer } = await getNamedAccounts();
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const lendingPlatform = await ethers.getContractAt("LendingPlatform", lendingPlatformDeployment.address);
        const usdCoinDeployment = await deployments.get('USDCoin');
        const usdc = await ethers.getContractAt("USDCoin", usdCoinDeployment.address);
        const borrowPositionTokenDeployment = await deployments.get('BorrowPositionToken');
        const borrowPositionToken = await ethers.getContractAt("BorrowPositionToken", borrowPositionTokenDeployment.address);

        const borrowerAccount = await ethers.getSigner(account || deployer);
        const beneficiary = taskArgs.beneficiary || borrowerAccount.address;
        // const parsedUsdc = ethers.parseUnits(repaymentAmount.toString(), 6);

        const debt = await borrowPositionToken.debt(tokenId);

        // Check balance of account to ensure that it is sufficient
        const usdcBalance = await usdc.balanceOf(borrowerAccount);
        const borrowerAccountAddress = await borrowerAccount.getAddress();
        console.log(`There is a balance of ${ethers.formatUnits(usdcBalance, 6)} USDC in account ${borrowerAccountAddress}`);
        if (usdcBalance < debt) {
            console.log('insufficient USDC balance in account - aborting');
            return;
        }
        // Check approval of account to ensure that it is sufficient
        const approved = await usdc.allowance(borrowerAccount.getAddress(), lendingPlatform.getAddress());
        console.log(`approval is currently ${ethers.formatUnits(approved, 6)} USDC`);
        // If approval is not sufficient then create an approval tx
        if (approved < debt) {
            const needToApprove = debt - approved;
            console.log(`approving additional ${ethers.formatUnits(needToApprove, 6)} USDC for deposit`);
            await sendTransaction(usdc.connect(borrowerAccount).approve(lendingPlatform.getAddress(), needToApprove), "USDC Approval");
        }
        // Send the deposit tx
        await sendTransaction(lendingPlatform.connect(borrowerAccount).repayLoan(tokenId, beneficiary), `Fully Repay Loan`);
    })

task("partialRepayLoan", "add USDC to a lending pool")
    .addParam("tokenId", "tokenId of the loan", undefined, types.int, false)
    .addParam("repaymentAmount", "Amount of USDC - in USD to repay", undefined, types.float, false)
    .addParam("account", "Address of account to partially repay loan with (must be the holder of the loan)", undefined, types.string, true)
    .setAction(async (taskArgs, env) => {
        const tokenId: number = taskArgs.tokenId;
        const repaymentAmount: number = taskArgs.repaymentAmount;
        const account = taskArgs.account;

        const {ethers, deployments, getNamedAccounts} = env;
        const { deployer } = await getNamedAccounts();
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const lendingPlatform = await ethers.getContractAt("LendingPlatform", lendingPlatformDeployment.address);
        const usdCoinDeployment = await deployments.get('USDCoin');
        const usdc = await ethers.getContractAt("USDCoin", usdCoinDeployment.address);

        const borrowerAccount = await ethers.getSigner(account || deployer);
        const parsedUsdc = ethers.parseUnits(repaymentAmount.toString(), 6);

        // Check balance of account to ensure that it is sufficient
        const usdcBalance = await usdc.balanceOf(borrowerAccount);
        const borrowerAccountAddress = await borrowerAccount.getAddress();
        console.log(`There is a balance of ${ethers.formatUnits(usdcBalance, 6)} USDC in account ${borrowerAccountAddress}`);
        if (usdcBalance < parsedUsdc) {
            console.log('insufficient USDC balance in account - aborting');
            return;
        }
        // Check approval of account to ensure that it is sufficient
        const approved = await usdc.allowance(borrowerAccount.getAddress(), lendingPlatform.getAddress());
        console.log(`approval is currently ${ethers.formatUnits(approved, 6)} USDC`);
        // If approval is not sufficient then create an approval tx
        if (approved < parsedUsdc) {
            const needToApprove = parsedUsdc - approved;
            console.log(`approving additional ${ethers.formatUnits(needToApprove, 6)} USDC for deposit`);
            await sendTransaction(usdc.connect(borrowerAccount).approve(lendingPlatform.getAddress(), needToApprove), "USDC Approval");
        }
        // Send the deposit tx
        await sendTransaction(lendingPlatform.connect(borrowerAccount).partialRepayLoan(tokenId, parsedUsdc), `Partial Repay Loan`);
    })

task("approveUsdc", "Approve USDC to the lending platform")
    .addParam("account", "account to approve USDC for", undefined, types.string)
    .setAction(async (taskArgs, env) => {
        const account: Address = taskArgs.account;
        const {ethers, deployments, getNamedAccounts} = env;

        const signer = await ethers.getSigner(account);

        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const usdCoinDeployment = await deployments.get('USDCoin');
        const usdc = await ethers.getContractAt("USDCoin", usdCoinDeployment.address);
        const usdcAccount = usdc.connect(signer);

        await sendTransaction(usdcAccount.approve(lendingPlatformDeployment.address, ethers.MaxUint256), "Approve USDC");
    })

task("createPlatformPools", "Create the pools that are used by the app")
    .setAction(async (taskArgs, env) => {
        const { oneMonth, threeMonth, sixMonth, twelveMonth } = getPlatformDates();
        await env.run('createPool', { timestamp: toEthDate(oneMonth)});  // 1 month
        await env.run('createPool', { timestamp: toEthDate(threeMonth)});  // 3 month
        await env.run('createPool', { timestamp: toEthDate(sixMonth)});  // 6 month
        await env.run('createPool', { timestamp: toEthDate(twelveMonth)});  // 12 month
    });

task('takeSnapshot', 'snapshot and update the accumInterest and accumYield')
    .addParam("account", "Account to call takeSnapshot with", undefined, types.string, true)
    .setAction(async (taskArgs, env) => {
        const {ethers, deployments, getNamedAccounts} = env;
        const { deployer } = await getNamedAccounts();
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const lendingPlatform = await ethers.getContractAt("LendingPlatform", lendingPlatformDeployment.address);

        const signer = await ethers.getSigner(taskArgs.account || deployer);
        await sendTransaction(lendingPlatform.connect(signer).takeSnapshot(), "takeSnapshot");
    })

task('takeLoan', 'take a loan')
    .addParam("timestamp", "Unix timestamp of the pool", undefined, types.int, false)
    .addParam("loanAmount", "Amount of USDC to loan - in USD", undefined, types.float, false)
    .addParam("collateralAmount", "Amount of collateral to provide - in ETH", undefined, types.float, false)
    .addParam("ltv", "Specified LTV of the loan", undefined, types.int, false)
    .addParam("account", "Address of account to take loan with (or named account)", undefined, types.string, false)
    .setAction(async (taskArgs, env) => {
        const timestamp: number = taskArgs.timestamp;
        const loanAmount: number = taskArgs.loanAmount;
        const collateralAmount = taskArgs.collateralAmount;
        const ltv = taskArgs.ltv;
        const account = taskArgs.account;
        const {ethers, deployments, getNamedAccounts} = env;
        const namedAccounts = await getNamedAccounts();
        const loanAccount = namedAccounts[account] ?
            await ethers.getSigner(namedAccounts[account]) :
            await ethers.getSigner(account);
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const lendingPlatform = await ethers.getContractAt("LendingPlatform", lendingPlatformDeployment.address);
        const lendingPlatformAccount = lendingPlatform.connect(loanAccount);
        const loanAmountBigInt = parseUnits(loanAmount.toString(), 6);
        const collateralAmountBigInt = parseEther(collateralAmount.toString());

        await sendTransaction(lendingPlatformAccount.takeLoan(
            loanAmountBigInt,
            collateralAmountBigInt,
            ltv,
            timestamp,
            {value: collateralAmountBigInt}
        ), `Loan USDC`);
    });

task('withdraw', 'take a loan')
    .addParam("timestamp", "Unix timestamp of the pool", undefined, types.int, false)
    .addParam("account", "Address of account to take loan with (or named account)", undefined, types.string, false)
    .setAction(async (taskArgs, env) => {
        const timestamp: number = taskArgs.timestamp;
        const account = taskArgs.account;
        const {ethers, deployments, getNamedAccounts} = env;
        const namedAccounts = await getNamedAccounts();
        const withdrawAccount = namedAccounts[account] ?
            await ethers.getSigner(namedAccounts[account]) :
            await ethers.getSigner(account);
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const lendingPlatform = await ethers.getContractAt("LendingPlatform", lendingPlatformDeployment.address);
        const lendingPoolDetails = await lendingPlatform.getLendingPool(timestamp);
        const poolShareTokenAddress = lendingPoolDetails.poolShareTokenAddress;
        const poolShareToken = await ethers.getContractAt("PoolShareToken", poolShareTokenAddress);
        const poolShareTokenBalance = await poolShareToken.balanceOf(withdrawAccount.address);
        console.log(`Exchanging ${poolShareTokenBalance} of poolShareToken `)

        await sendTransaction(lendingPlatform.connect(withdrawAccount).withdraw(
            timestamp,
            poolShareTokenBalance
        ), `withdraw USDC`);
    });

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
  });

task("getLendingPool", "get deatils of a lending pool")
    .addParam('timestamp', 'timestamp of the lending pool', "", types.int)
    .setAction(async (taskArgs, env) => {
        const ethDate = taskArgs.timestamp;
        const {ethers, deployments, getNamedAccounts} = env;
        const {lendingPlatform} = await getDeployedContracts(env);
        const res = await lendingPlatform.getLendingPool(ethDate);
        console.log(res);
        console.log(`
Lending Pool
============
endDate: ${fromEthDate(ethDate)}
poolShareTokenAddress: ${res.poolShareTokenAddress}
principal: ${ethers.formatUnits(res.totalLiquidity), 6}
accumInterest: ${ethers.formatUnits(res.accumInterest, 6)}
accumYield: ${ethers.formatEther(res.accumYield)}
        `)
    })

task("setEthPrice", "udpate the mock Chainlink Aggregator's ETH price")
    .addParam('ethPrice', 'new ETH price, with up to 8 decimals (i.e. 2123.12345678)', undefined, types.string, false)
    .setAction(async (taskArgs, env) => {
        const {ethers, deployments, getNamedAccounts} = env;
        const mockChainlinkAggregatorDeployment = await deployments.get('MockChainlinkAggregator');
        const mockChainlinkAggregator = await ethers.getContractAt("MockChainlinkAggregator", mockChainlinkAggregatorDeployment.address);
        const ethDecimals = 8n;
        const usdcPriceDecimals = await mockChainlinkAggregator.decimals();
        const ethPrice = ethers.parseUnits(taskArgs.ethPrice, ethDecimals);
        const usdcPrice = ethers.parseUnits("1", usdcPriceDecimals + ethDecimals) / ethPrice;
        await sendTransaction(mockChainlinkAggregator.updateAnswer(usdcPrice), 'updateAnswer');
        console.log(`Update ETH / USDC pricefeed to ${ethers.formatUnits(usdcPrice, usdcPriceDecimals)}`);
    });

task("getEthPrice", "Get the ETH price in USD from the Chainlink Aggregator")
    .setAction(async (taskArgs, env) => {
        const {ethers, deployments, getNamedAccounts} = env;
        const mockChainlinkAggregatorDeployment = await deployments.get('MockChainlinkAggregator');
        const mockChainlinkAggregator = await ethers.getContractAt("MockChainlinkAggregator", mockChainlinkAggregatorDeployment.address);
        const decimals = await mockChainlinkAggregator.decimals();
        const latestRoundData = await mockChainlinkAggregator.latestRoundData();
        const ethPrice = latestRoundData.answer;
        // const ethPrice = ethers.parseUnits(taskArgs.ethPrice, decimals);
        // await sendTransaction(mockChainlinkAggregator.updateAnswer(ethPrice), 'updateAnswer');
        console.log(`ethPrice: ${ethers.formatUnits(ethPrice, decimals)}`);
    });

task("setTime", "update the blockchain time for the test environment")
    .addParam('ethDate', 'valid ethereum format timestamp in the future', undefined, types.int, false)
    .setAction(async (taskArgs, env) => {
        const { ethers } = env;
        // Mine a new block so that the current time is up to date
        await ethers.provider.send('evm_mine');
        const currentBlock = await ethers.provider.getBlock("latest");
        if (!currentBlock) {
            throw new Error('latest block not found');
        }
        const ethDate = taskArgs.ethDate;
        const currentTimestamp = currentBlock.timestamp;
        // const desiredTimestamp = toEthDate(desiredDate); // convert to Unix timestamp

        // Calculate the difference in seconds
        const timeDiff = ethDate - currentTimestamp;
        if (timeDiff < 0) {
            console.log(`Cannot set a time to the past - Current time: ${currentTimestamp} - Value: ${ethDate}`);
            return;
        }
        // Increase the network time
        await ethers.provider.send('evm_increaseTime', [timeDiff]);

        // Mine a new block so that the time increase takes effect
        await ethers.provider.send('evm_mine');
        const latestBlock = await ethers.provider.getBlock("latest");
        if (!latestBlock) {
            throw new Error('latest block not found');
        }
        console.log(`Time set to ${fromEthDate(latestBlock.timestamp)}`);
    });
