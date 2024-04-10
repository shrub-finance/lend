import { task, types } from 'hardhat/config'
import "@nomicfoundation/hardhat-toolbox";

import { Address } from 'hardhat-deploy/types';
import assert from 'node:assert/strict';
import {parseEther, parseUnits, TransactionResponse} from "ethers";
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
    const {usdc} = await getDeployedContracts(env);

    const toFormatted = ethers.getAddress(to);
    const amountInUnits = amount * 10 ** 6;

    assert.ok(ethers.isAddress(toFormatted), "invalid to address");
    assert.notEqual(toFormatted, deployer, "Address must not be deployer address")
    assert.ok(amount > 0, "Amount must be greater than 0");
    assert.equal(amountInUnits, Math.floor(amountInUnits), "Amount must have no more than 6 decimals")
    const deployerAccount = await ethers.getSigner(deployer);

    const tx = await usdc.connect(deployerAccount).transfer(toFormatted, amountInUnits)
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
        const {lendingPlatform} = await getDeployedContracts(env);

        const deployerAccount = await ethers.getSigner(deployer);

        const tx = await lendingPlatform.connect(deployerAccount).createPool(timestamp);
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
        const {lendingPlatform} = await getDeployedContracts(env);

        const deployerAccount = await ethers.getSigner(deployer);

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
        const {lendingPlatform, usdc} = await getDeployedContracts(env);

        const liquidityAccount = await ethers.getSigner(account || deployer);
        const parsedUsdc = ethers.parseUnits(usdcAmount.toString(), 6);

        // Check balance of account to ensure that it is sufficient
        const usdcBalance = await usdc.connect(liquidityAccount).balanceOf(liquidityAccount);
        const liquidityAccountAddress = await liquidityAccount.getAddress();
        console.log(`There is a balance of ${ethers.formatUnits(usdcBalance, 6)} USDC in account ${liquidityAccountAddress}`);
        if (usdcBalance < parsedUsdc) {
            console.log('insufficient USDC balance in account - aborting');
            return;
        }
        // Check approval of account to ensure that it is sufficient
        const approved = await usdc.connect(liquidityAccount).allowance(liquidityAccount.getAddress(), lendingPlatform.getAddress());
        console.log(`approval is currently ${ethers.formatUnits(approved, 6)} USDC`);
        // If approval is not sufficient then create an approval tx
        if (approved < parsedUsdc) {
            const needToApprove = parsedUsdc - approved;
            console.log(`approving additional ${ethers.formatUnits(needToApprove, 6)} USDC for deposit`);
            await sendTransaction(usdc.connect(liquidityAccount).approve(lendingPlatform.getAddress(), needToApprove), "USDC Approval");
        }
        // Send the deposit tx
        await sendTransaction(lendingPlatform.connect(liquidityAccount).deposit(timestamp, parsedUsdc), `Deposit USDC`);
    })

task("extendDeposit", "extend an existing deposit")
    .addParam("currentTimestamp", "End Date of the current lend position", undefined, types.int)
    .addParam("newTimestamp", "End Date of the new lend position", undefined, types.int)
    .addParam("account", "Address of account who made the deposit", undefined, types.string, true)
    .setAction(async (taskArgs, env) => {
        const currentTimestamp: number = taskArgs.currentTimestamp;
        const newTimestamp: number = taskArgs.newTimestamp;
        const account = taskArgs.account;

        const {ethers, deployments, getNamedAccounts} = env;
        const { deployer } = await getNamedAccounts();
        const {lendingPlatform, usdc} = await getDeployedContracts(env);

        const liquidityAccount = await ethers.getSigner(account || deployer);
        const lendingPool = await lendingPlatform.getPool(currentTimestamp);
        const oldPoolShareTokenAddress = lendingPool.lendPoolShareTokenAddress;
        const oldPoolShareToken = await ethers.getContractAt('PoolShareToken', oldPoolShareTokenAddress);
        const tokenAmount = await oldPoolShareToken.balanceOf(liquidityAccount.address);
        const tokenTotalSupply = await oldPoolShareToken.totalSupply();

        const usdcToDeposit = (lendingPool.lendPrincipal + lendingPool.lendAccumInterest) * tokenAmount / tokenTotalSupply;
        // // Check approval of account to ensure that it is sufficient
        const usdcApproved = await usdc.allowance(liquidityAccount.getAddress(), lendingPlatform.getAddress());
        console.log(`approval is currently ${ethers.formatUnits(usdcApproved, 6)} USDC`);
        // If approval is not sufficient then create an approval tx
        if (usdcApproved < usdcToDeposit) {
            const needToApprove = usdcToDeposit - usdcApproved;
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
        const {lendingPlatform, usdc, aeth, bpt} = await getDeployedContracts(env);

        const borrowerAccount = await ethers.getSigner(account);
        const parsedAdditionalCollateral = ethers.parseUnits(additionalCollateral.toString(),6);
        const parsedAdditionalRepayment = ethers.parseEther(additionalRepayment.toString());
        const loanDebt = await bpt.debt(tokenId);
        const loanDetails = await bpt.getLoan(tokenId);
        const usdcAllowance = await usdc.allowance(borrowerAccount.getAddress(), lendingPlatform.getAddress());
        const aethAllowance = await aeth.allowance(borrowerAccount.getAddress(), lendingPlatform.getAddress());
        const aethBalance = await aeth.balanceOf(borrowerAccount.getAddress());
        const flashLoanAmount = loanDetails.collateral + parsedAdditionalCollateral - aethBalance > 0n ?
            loanDetails.collateral + parsedAdditionalCollateral - aethBalance :
            0n
        const aethRequirement = loanDetails.collateral + parsedAdditionalCollateral + flashLoanAmount;

        // Adding 1% buffer to deal with possible small increase in debt between calculation and when extend is called
        const usdcRequirement = loanDebt * 101n / 100n + parsedAdditionalRepayment;
        // Check approval of account to ensure that it is sufficient
        console.log(`approval is currently ${ethers.formatUnits(usdcAllowance, 6)} USDC`);
        // If approval is not sufficient then create an approval tx
        if (usdcAllowance < usdcRequirement) {
            const usdcNeedToApprove = usdcRequirement - usdcAllowance;
            console.log(`
bpt.debt: ${loanDebt}
parsedAdditionalRequirement: ${parsedAdditionalRepayment}
USDC Allowance: ${usdcAllowance}
USDC Requirement: ${usdcRequirement}
USDC needToApprove: ${usdcNeedToApprove}
`)
            console.log(`approving additional ${ethers.formatUnits(usdcNeedToApprove, 6)} USDC for deposit`);
            await sendTransaction(usdc.connect(borrowerAccount).approve(lendingPlatform.getAddress(), usdcNeedToApprove), "USDC Approval");
        }
        if (aethAllowance < aethRequirement) {
            const aethNeedToApprove = aethRequirement - aethAllowance;
            console.log(`
bpt.collateral: ${loanDetails.collateral}
parsedAdditionalCollateral: ${parsedAdditionalCollateral}
flashLoanAmount: ${flashLoanAmount}
AETH Allowance: ${aethAllowance}
AETH Requirement: ${aethRequirement}
AETH needToApprove: ${aethNeedToApprove}
`)
            console.log(`approving additional ${ethers.formatUnits(aethNeedToApprove, 6)} AETH for deposit`);
            await sendTransaction(aeth.connect(borrowerAccount).approve(lendingPlatform.getAddress(), aethNeedToApprove), "AETH Approval");
        }

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
        const {lendingPlatform, usdc, aeth, bpt} = await getDeployedContracts(env);

        const borrowerAccount = await ethers.getSigner(account || deployer);
        const beneficiary = taskArgs.beneficiary || borrowerAccount.address;
        // const parsedUsdc = ethers.parseUnits(repaymentAmount.toString(), 6);

        const debt = await bpt.debt(tokenId);

        // Check balance of account to ensure that it is sufficient
        const usdcBalance = await usdc.balanceOf(borrowerAccount);
        const borrowerAccountAddress = await borrowerAccount.getAddress();
        console.log(`There is a balance of ${ethers.formatUnits(usdcBalance, 6)} USDC in account ${borrowerAccountAddress}`);
        if (usdcBalance < debt) {
            console.log('insufficient USDC balance in account - aborting');
            throw new Error("insufficient USDC balance in account - aborting");
            return;
        }
        // Check approval of account to ensure that it is sufficient
        const approved = await usdc.allowance(borrowerAccount.getAddress(), lendingPlatform.getAddress());
        console.log(`approval is currently ${ethers.formatUnits(approved, 6)} USDC`);
        // If approval is not sufficient then create an approval tx
        if (approved < debt) {
            // Adding 1% buffer to deal with possible small increase in debt between calculation and when extend is called
            const needToApprove = debt * 101n / 100n - approved;
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
        const {lendingPlatform, usdc} = await getDeployedContracts(env);
        const { deployer } = await getNamedAccounts();

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
        const {usdc} = await getDeployedContracts(env);

        const signer = await ethers.getSigner(account);
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');

        await sendTransaction(usdc.connect(signer).approve(lendingPlatformDeployment.address, ethers.MaxUint256), "Approve USDC");
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
        const {lendingPlatform} = await getDeployedContracts(env);

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
        const {lendingPlatform} = await getDeployedContracts(env);
        const namedAccounts = await getNamedAccounts();
        const loanAccount = namedAccounts[account] ?
            await ethers.getSigner(namedAccounts[account]) :
            await ethers.getSigner(account);
        const loanAmountBigInt = parseUnits(loanAmount.toString(), 6);
        const collateralAmountBigInt = parseEther(collateralAmount.toString());

        await sendTransaction(lendingPlatform.connect(loanAccount).takeLoan(
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
        const {lendingPlatform} = await getDeployedContracts(env);
        const namedAccounts = await getNamedAccounts();
        const withdrawAccount = namedAccounts[account] ?
            await ethers.getSigner(namedAccounts[account]) :
            await ethers.getSigner(account);
        const lendingPoolDetails = await lendingPlatform.getPool(timestamp);
        const poolShareTokenAddress = lendingPoolDetails.lendPoolShareTokenAddress;
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

task("getAllPools", "get deatils of all active pools")
    .setAction(async (taskArgs, env) => {
        const {ethers, deployments, getNamedAccounts} = env;
        const {lendingPlatform} = await getDeployedContracts(env);
        let active = true;
        let i = 0;
        const activePoolTimestamps: bigint[] = [];
        while (active === true) {
            try {
                const timestamp = await lendingPlatform.activePools(i);
                activePoolTimestamps.push(timestamp);
                i++;
            } catch (e) {
                active = false;
            }
        }
        for (const activePoolTimestamp of activePoolTimestamps) {
            // console.log(activePoolTimestamp);
            await env.run('getPool', {timestamp: Number(activePoolTimestamp)});
        }
    })


task("getPool", "get deatils of a lending pool")
    .addParam('timestamp', 'timestamp of the lending pool', "", types.int)
    .setAction(async (taskArgs, env) => {
        const ethDate = taskArgs.timestamp;
        const {ethers, deployments, getNamedAccounts} = env;
        const {lendingPlatform} = await getDeployedContracts(env);
        const res = await lendingPlatform.getPool(ethDate);
        const bpTotalPoolShares = await lendingPlatform.bpTotalPoolShares();
        console.log(`
Lending Pool: ${ethDate} - ${fromEthDate(ethDate).toISOString().split('T')[0]}
============
poolShareTokenAddress: ${res.lendPoolShareTokenAddress}
principal: ${ethers.formatUnits(res.lendPrincipal, 6)} USDC
accumInterest: ${ethers.formatUnits(res.lendAccumInterest, 6)} USDC
accumYield: ${ethers.formatEther(res.lendAccumYield)} ETH
shrubInterest: ${ethers.formatUnits(res.lendShrubInterest, 6)} USDC
shrubYield: ${ethers.formatEther(res.lendShrubYield)} ETH

Borrow Pool: ${ethDate} - ${fromEthDate(ethDate).toISOString().split('T')[0]}
============
pool share amount: ${res.borrowPoolShareAmount} of ${bpTotalPoolShares} (${bpTotalPoolShares === 0n ? 0 : ethers.formatUnits(res.borrowPoolShareAmount * 10000n / bpTotalPoolShares, 2)}%)
principal: ${ethers.formatUnits(res.borrowPrincipal, 6)} USDC
collateral: ${ethers.formatEther(res.borrowCollateral)} ETH
total accum interest: ${ethers.formatUnits(res.borrowTotalAccumInterest, 6)} USDC 
total accum yield: ${ethers.formatEther(res.borrowTotalAccumYield)} ETH
total repaid: ${ethers.formatUnits(res.borrowTotalRepaid, 6)} USDC 
        `)
    })

task("getLoan", "get deatils of a loan")
    .addParam('tokenid', 'tokenId of the loan', "", types.int)
    .setAction(async (taskArgs, env) => {
        const tokenId = taskArgs.tokenid;
        const {ethers, deployments, getNamedAccounts} = env;
        const {lendingPlatform, bpt} = await getDeployedContracts(env);
        let res;
        try {
            res = await bpt.getLoan(tokenId);
        } catch (e) {
            console.log(`loan with tokenId: ${tokenId} does not exist`);
            return;
        }
        const interest = await bpt.getInterest(tokenId);
        const debt = await bpt.debt(tokenId);
        const owner = await bpt.ownerOf(tokenId);
        // console.log(res);
        console.log(`
Loan: ${tokenId}
============
owner: ${owner}
endDate: ${fromEthDate(Number(res.endDate)).toISOString()}
startDate: ${fromEthDate(Number(res.startDate)).toISOString()}
principal: ${ethers.formatUnits(res.principal, 6)} USDC
interest: ${ethers.formatUnits(interest, 6)} USDC
collateral: ${ethers.formatEther(res.collateral)} ETH
apy: ${ethers.formatUnits(res.apy, 6)}%

total debt: ${ethers.formatUnits(debt, 6)} USDC
`)
    })

task("setEthPrice", "udpate the mock Chainlink Aggregator's ETH price")
    .addParam('ethPrice', 'new ETH price, with up to 8 decimals (i.e. 2123.12345678)', undefined, types.string, false)
    .setAction(async (taskArgs, env) => {
        const {ethers, deployments, getNamedAccounts} = env;
        const {mockChainlinkAggregator} = await getDeployedContracts(env);
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
        const {mockChainlinkAggregator} = await getDeployedContracts(env);
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
