import { task, types } from 'hardhat/config'
import "@nomicfoundation/hardhat-toolbox";

import { Address } from 'hardhat-deploy/types';
import assert from 'node:assert/strict';
import {parseEther, parseUnits, TransactionResponse} from "ethers";
import {fromEthDate, getPlatformDates, toEthDate} from "@shrub-lend/common"
import {HardhatRuntimeEnvironment} from "hardhat/types";

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

async function signerFromFuzzyAccount(account: string, env: HardhatRuntimeEnvironment) {
    const { ethers, getNamedAccounts } = env;
    const namedAccounts = await getNamedAccounts();
    return namedAccounts[account] ?
        ethers.getSigner(namedAccounts[account]) :
        ethers.getSigner(account);
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
    const { ethers, getNamedAccounts} = env;
    const account = taskArgs.account;
    const {usdc, aeth} = await getDeployedContracts(env);
    const namedAccounts = await getNamedAccounts();
    const signer = await signerFromFuzzyAccount(account, env);
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

    const {ethers, getNamedAccounts} = env;
    const { deployer } = await getNamedAccounts();
    const {usdc} = await getDeployedContracts(env);

    const signer = await signerFromFuzzyAccount(taskArgs.to, env);
    // const toFormatted = ethers.getAddress(to);
    const amountInUnits = amount * 10 ** 6;

    // assert.ok(ethers.isAddress(toFormatted), "invalid to address");
    // assert.notEqual(toFormatted, deployer, "Address must not be deployer address")
    assert.ok(amount > 0, "Amount must be greater than 0");
    assert.equal(amountInUnits, Math.floor(amountInUnits), "Amount must have no more than 6 decimals")
    const deployerAccount = await ethers.getSigner(deployer);

    const tx = await usdc.connect(deployerAccount).transfer(signer.address, amountInUnits)
    // console.log(`${amount} USDC sent to ${toFormatted}`);
    const txReceipt = await tx.wait();
    if (!txReceipt) {
        throw new Error('no tx receipt');
    }
    const transaction = await tx.getTransaction();
    console.log(`${amount} USDC sent to ${signer.address} in block number ${txReceipt.blockNumber} txid ${txReceipt.hash}`);
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
            throw new Error('insufficient USDC balance in account - aborting');
        }

        // Check approval of account to ensure that it is sufficient
        await env.run('approveErc20', {
            account: liquidityAccount.address,
            tokenAddress: await usdc.getAddress(),
            spendAddress: await lendingPlatform.getAddress(),
            requiredAmount: ethers.formatUnits(parsedUsdc, 6)
        });
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
        await env.run('approveErc20', {
            account: liquidityAccount.address,
            tokenAddress: await usdc.getAddress(),
            spendAddress: await lendingPlatform.getAddress(),
            requiredAmount: ethers.formatUnits(usdcToDeposit, 6)
        });
        await sendTransaction(lendingPlatform.connect(liquidityAccount).extendDeposit(currentTimestamp, newTimestamp, tokenAmount), "Extend Deposit");
    });

task("extendBorrow", "extend an existing borrow")
    .addParam("account", "Address of account to extend borrow with (must be the holder of the borrow)", undefined, types.string, true)
    .addParam("tokenId", "tokenId of the borrow position token ERC-721", undefined, types.int)
    .addParam("newTimestamp", "End Date of the new borrow", undefined, types.int)
    .addParam("ltv", "Specified LTV of the new borrow", undefined, types.int, false)
    .addParam("additionalCollateral", "Additional ETH collateral to provide for the new borrow", 0, types.float)
    .addParam("additionalRepayment", "Additional USDC payment to make to the previous borrow", 0, types.float)
    .setAction(async (taskArgs, env) => {
        const account = taskArgs.account;
        const tokenId = taskArgs.tokenId;
        const newTimestamp: number = taskArgs.newTimestamp;
        const additionalCollateral = taskArgs.additionalCollateral;
        const additionalRepayment = taskArgs.additionalRepayment;

        const {ethers, deployments, getNamedAccounts} = env;
        const {lendingPlatform, usdc, aeth, bpt} = await getDeployedContracts(env);

        const ltv = ethers.parseUnits(taskArgs.ltv.toString(), 2);

        const borrowerAccount = await ethers.getSigner(account);
        const parsedAdditionalCollateral = ethers.parseUnits(additionalCollateral.toString(),6);
        const parsedAdditionalRepayment = ethers.parseEther(additionalRepayment.toString());
        const borrowDebt = await lendingPlatform.getBorrowDebt(tokenId);
        const borrowDetails = await bpt.getBorrow(tokenId);
        const usdcAllowance = await usdc.allowance(borrowerAccount.getAddress(), lendingPlatform.getAddress());
        const aethAllowance = await aeth.allowance(borrowerAccount.getAddress(), lendingPlatform.getAddress());
        const aethBalance = await aeth.balanceOf(borrowerAccount.getAddress());
        const flashLoanAmount = borrowDetails.collateral + parsedAdditionalCollateral - aethBalance > 0n ?
            borrowDetails.collateral + parsedAdditionalCollateral - aethBalance :
            0n
        const aethRequirement = borrowDetails.collateral + parsedAdditionalCollateral + flashLoanAmount;

        // Adding 1% buffer to deal with possible small increase in debt between calculation and when extend is called
        const usdcRequirement = borrowDebt * 101n / 100n + parsedAdditionalRepayment;
        // Check approval of account to ensure that it is sufficient
        await env.run('approveErc20', {
            account: borrowerAccount.address,
            tokenAddress: await usdc.getAddress(),
            spendAddress: await lendingPlatform.getAddress(),
            requiredAmount: ethers.formatUnits(usdcRequirement, 6)
        });
        await env.run('approveErc20', {
            account: borrowerAccount.address,
            tokenAddress: await aeth.getAddress(),
            spendAddress: await lendingPlatform.getAddress(),
            requiredAmount: ethers.formatUnits(aethRequirement, 18)
        });
        await sendTransaction(
            lendingPlatform.connect(borrowerAccount).extendBorrow(
                tokenId,
                newTimestamp,
                parsedAdditionalCollateral,
                parsedAdditionalRepayment,
                ltv
            ),
            "Extending borrow"
        );
    });

task("repayBorrow", "add USDC to a lending pool")
    .addParam("tokenId", "tokenId of the borrow", undefined, types.int, false)
    .addParam("account", "Address of account to partially repay borrow with (must be the holder of the borrow)", undefined, types.string, true)
    .addParam("beneficiary", "Address of account to receive the collateral", undefined, types.string, true)
    .setAction(async (taskArgs, env) => {
        const tokenId: number = taskArgs.tokenId;
        const account = taskArgs.account;

        const {ethers, deployments, getNamedAccounts} = env;
        const { deployer } = await getNamedAccounts();
        const {lendingPlatform, usdc} = await getDeployedContracts(env);

        const borrowerAccount = await ethers.getSigner(account || deployer);
        const beneficiary = taskArgs.beneficiary || borrowerAccount.address;
        // const parsedUsdc = ethers.parseUnits(repaymentAmount.toString(), 6);

        const debt = await lendingPlatform.getBorrowDebt(tokenId);

        // Check balance of account to ensure that it is sufficient
        const usdcBalance = await usdc.balanceOf(borrowerAccount);
        const borrowerAccountAddress = await borrowerAccount.getAddress();
        console.log(`There is a balance of ${ethers.formatUnits(usdcBalance, 6)} USDC in account ${borrowerAccountAddress}`);
        if (usdcBalance < debt) {
            console.log('insufficient USDC balance in account - aborting');
            throw new Error("insufficient USDC balance in account - aborting");
        }
        // Check approval of account to ensure that it is sufficient
        await env.run('approveErc20', {
            account: borrowerAccount.address,
            tokenAddress: await usdc.getAddress(),
            spendAddress: await lendingPlatform.getAddress(),
            requiredAmount: ethers.formatUnits(debt * 101n / 100n, 6)
        });
        // Send the deposit tx
        await sendTransaction(lendingPlatform.connect(borrowerAccount).repayBorrow(tokenId, beneficiary), `Fully Repay Borrow`);
    })

task("partialRepayBorrow", "add USDC to a lending pool")
    .addParam("tokenId", "tokenId of the borrow", undefined, types.int, false)
    .addParam("repaymentAmount", "Amount of USDC - in USD to repay", undefined, types.float, false)
    .addParam("account", "Address of account to partially repay borrow with (must be the holder of the borrow)", undefined, types.string, true)
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
            throw new Error("insufficient USDC balance in account - aborting");
        }
        // Check approval of account to ensure that it is sufficient
        await env.run('approveErc20', {
            account: borrowerAccount.address,
            tokenAddress: await usdc.getAddress(),
            spendAddress: await lendingPlatform.getAddress(),
            requiredAmount: ethers.formatUnits(parsedUsdc, 6)
        });
        // Send the deposit tx
        await sendTransaction(lendingPlatform.connect(borrowerAccount).partialRepayBorrow(tokenId, parsedUsdc), `Partial Repay Borrow`);
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

task('forceExtendBorrow', 'Liquidator extends overdue loan for a reward')
    .addParam("account", "Address of account to force extend with (or named account)", undefined, types.string, false)
    .addParam("tokenid", "Token ID of the borrow position token ERC-721 of the loan to extend", undefined, types.int, false)
    .addParam("liquidationPhase", "Liquidation Phase to call this with. (0: 1% Bonus, 1: 2% Bonus, 2:3% Bonus)", 0, types.int, true)
    .setAction(async (taskArgs, env) => {
        const { account, tokenid, liquidationPhase } = taskArgs;
        const { ethers } = env;
        const {lendingPlatform, bpt, usdc, aeth} = await getDeployedContracts(env);
        const signer = await signerFromFuzzyAccount(account, env);
        const debt = await lendingPlatform.getBorrowDebt(tokenid);
        const loanDetails = await bpt.getBorrow(tokenid);
        await env.run('approveErc20', {
            account: signer.address,
            tokenAddress: await usdc.getAddress(),
            spendAddress: await lendingPlatform.getAddress(),
            requiredAmount: ethers.formatUnits(debt * 101n / 100n, 6)
        });
        await env.run('approveErc20', {
            account: signer.address,
            tokenAddress: await aeth.getAddress(),
            spendAddress: await lendingPlatform.getAddress(),
            // TODO: This could be reduced by the amount of the bonus... but don't want to think abou that right now
            requiredAmount: ethers.formatUnits(loanDetails.collateral * 2n, 18)
        });
        await sendTransaction(lendingPlatform.connect(signer).forceExtendBorrow(tokenid, liquidationPhase), "forceExtendBorrow");
    });

task('forceLiquidation', 'Liquidator pays off overdue loan in exchange for collateral at a discount')
    .addParam("account", "Address of account to liquidate with (or named account)", undefined, types.string, false)
    .addParam("tokenid", "Token ID of the borrow position token ERC-721 of the loan to liquidate", undefined, types.int, false)
    .addParam("liquidationPhase", "Liquidation Phase to call this with. (3: 4% Bonus, 4: 5% Bonus, 5: 6% Bonus)", 3, types.int, true)
    .setAction(async (taskArgs, env) => {
        const { account, tokenid, liquidationPhase } = taskArgs;
        const { ethers } = env;
        const {lendingPlatform, bpt, usdc} = await getDeployedContracts(env);
        const signer = await signerFromFuzzyAccount(account, env);
        const debt = await lendingPlatform.getBorrowDebt(tokenid);
        const loanDetails = await bpt.getBorrow(tokenid);
        await env.run('approveErc20', {
            account: signer.address,
            tokenAddress: await usdc.getAddress(),
            spendAddress: await lendingPlatform.getAddress(),
            requiredAmount: ethers.formatUnits(debt * 101n / 100n, 6)
        });
        await sendTransaction(lendingPlatform.connect(signer).forceLiquidation(tokenid, liquidationPhase), "forceLiquidation");
    });

task('shrubLiquidation', 'Shrub treasury pays off overdue loan in exchange for collateral at a discount')
    .addParam("account", "Address of account to liquidate with (or named account)", undefined, types.string, false)
    .addParam("tokenid", "Token ID of the borrow position token ERC-721 of the loan to liquidate", undefined, types.int, false)
    .addParam("liquidationPhase", "Liquidation Phase to call this with. (6)", 6, types.int, true)
    .setAction(async (taskArgs, env) => {
        const { account, tokenid, liquidationPhase } = taskArgs;
        const {lendingPlatform} = await getDeployedContracts(env);
        const signer = await signerFromFuzzyAccount(account, env);
        await sendTransaction(lendingPlatform.connect(signer).shrubLiquidation(tokenid, liquidationPhase), "shrubLiquidation");
    });

task('borrowLiquidation', 'Liquidator pays off part of an unhealty borrow to return health factor under 1')
    .addParam("account", "Address of account to liquidate with (or named account)", undefined, types.string, false)
    .addParam("tokenid", "Token ID of the borrow position token ERC-721 of the loan to liquidate", undefined, types.int, false)
    .addParam("percentage", "Percentage of borrow to liquidate (i.e. 50 for 50%)", 50, types.int, true)
    .setAction(async (taskArgs, env) => {
        const { account, tokenid, percentage } = taskArgs;
        const { ethers } = env;
        const {lendingPlatform, usdc} = await getDeployedContracts(env);
        const signer = await signerFromFuzzyAccount(account, env);
        const debt = await lendingPlatform.getBorrowDebt(tokenid);
        const percentageBN = ethers.parseUnits(percentage.toString(), 2);
        await env.run('approveErc20', {
            account: signer.address,
            tokenAddress: await usdc.getAddress(),
            spendAddress: await lendingPlatform.getAddress(),
            requiredAmount: ethers.formatUnits(debt * 101n / 100n * percentageBN / 10000n, 6)
        });
        await sendTransaction(lendingPlatform.connect(signer).borrowLiquidation(tokenid, percentageBN), "borrowLiquidation");
    });

task('borrow', 'take a borrow')
    .addParam("timestamp", "Unix timestamp of the pool", undefined, types.int, false)
    .addParam("borrowAmount", "Amount of USDC to borrow - in USD", undefined, types.float, false)
    .addParam("collateralAmount", "Amount of collateral to provide - in ETH", undefined, types.float, false)
    .addParam("ltv", "Specified LTV of the borrow", undefined, types.int, false)
    .addParam("account", "Address of account to take borrow with (or named account)", undefined, types.string, false)
    .setAction(async (taskArgs, env) => {
        const timestamp: number = taskArgs.timestamp;
        const borrowAmount: number = taskArgs.borrowAmount;
        const collateralAmount = taskArgs.collateralAmount;
        const account = taskArgs.account;
        const {ethers, deployments, getNamedAccounts} = env;
        const ltv = ethers.parseUnits(taskArgs.ltv.toString(), 2);
        const {lendingPlatform} = await getDeployedContracts(env);
        const signer = await signerFromFuzzyAccount(account, env);
        const borrowAmountBigInt = parseUnits(borrowAmount.toString(), 6);
        const collateralAmountBigInt = parseEther(collateralAmount.toString());

        await sendTransaction(lendingPlatform.connect(signer).borrow(
            borrowAmountBigInt,
            collateralAmountBigInt,
            ltv,
            timestamp,
            {value: collateralAmountBigInt}
        ), `Borrow USDC`);
    });

task('withdraw', 'withdraw deposited funds after term')
    .addParam("timestamp", "Unix timestamp of the pool", undefined, types.int, false)
    .addParam("account", "account which holds the deposit (named account or address)", undefined, types.string, false)
    .setAction(async (taskArgs, env) => {
        const timestamp: number = taskArgs.timestamp;
        const account = taskArgs.account;
        const {ethers} = env;
        const {lendingPlatform} = await getDeployedContracts(env);
        const signer = await signerFromFuzzyAccount(account, env);
        const lendingPoolDetails = await lendingPlatform.getPool(timestamp);
        const poolShareTokenAddress = lendingPoolDetails.lendPoolShareTokenAddress;
        const poolShareToken = await ethers.getContractAt("PoolShareToken", poolShareTokenAddress);
        const poolShareTokenBalance = await poolShareToken.balanceOf(signer.address);
        console.log(`Exchanging ${poolShareTokenBalance} of poolShareToken `)

        await sendTransaction(lendingPlatform.connect(signer).withdraw(
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
poolShareTokenTotalSupply: ${res.lendPoolShareTokenTotalSupply}
principal: ${ethers.formatUnits(res.lendPrincipal, 18)} USDC
accumInterest: ${ethers.formatUnits(res.lendAccumInterest, 18)} USDC
accumYield: ${ethers.formatEther(res.lendAccumYield)} ETH
shrubInterest: ${ethers.formatUnits(res.lendShrubInterest, 18)} USDC
shrubYield: ${ethers.formatEther(res.lendShrubYield)} ETH

Borrow Pool: ${ethDate} - ${fromEthDate(ethDate).toISOString().split('T')[0]}
============
pool share amount: ${res.borrowPoolShareAmount} of ${bpTotalPoolShares} (${bpTotalPoolShares === 0n ? 0 : ethers.formatUnits(res.borrowPoolShareAmount * 10000n / bpTotalPoolShares, 2)}%)
principal: ${ethers.formatUnits(res.borrowPrincipal, 6)} USDC
collateral: ${ethers.formatEther(res.borrowCollateral)} ETH
total accum interest: ${ethers.formatUnits(res.borrowTotalAccumInterest, 18)} USDC 
total accum yield: ${ethers.formatEther(res.borrowTotalAccumYield)} ETH
total repaid: ${ethers.formatUnits(res.borrowTotalRepaid, 18)} USDC 
        `)
    })

task("getBorrow", "get deatils of a borrow")
    .addParam('tokenid', 'tokenId of the borrow', "", types.int)
    .setAction(async (taskArgs, env) => {
        const tokenId = taskArgs.tokenid;
        const {ethers, deployments, getNamedAccounts} = env;
        const {lendingPlatform, bpt} = await getDeployedContracts(env);
        const ltv = await lendingPlatform.getLtv(tokenId);
        const ethPrice = await lendingPlatform.getEthPrice();
        let res;
        try {
            res = await bpt.getBorrow(tokenId);
        } catch (e) {
            console.log(`borrow with tokenId: ${tokenId} does not exist`);
            return;
        }
        const interest = await lendingPlatform.getBorrowInterest(tokenId);
        const debt = await lendingPlatform.getBorrowDebt(tokenId);
        const owner = await bpt.ownerOf(tokenId);
        // console.log(res);
        console.log(`
Borrow: ${tokenId}
============
owner: ${owner}
startDate: ${fromEthDate(Number(res.startDate)).toISOString()}
endDate: ${fromEthDate(Number(res.endDate)).toISOString()}
principal: ${ethers.formatUnits(res.principal, 6)} USDC
interest: ${ethers.formatUnits(interest, 6)} USDC
collateral: ${ethers.formatEther(res.collateral)} ETH ($${ethers.formatUnits(res.collateral * ethPrice, 18 * 2)} @ $${ethers.formatEther(ethPrice)}/ETH)
apy: ${ethers.formatUnits(res.apy, 2)}%

total debt: ${ethers.formatUnits(debt, 6)} USDC
ltv: ${ethers.formatUnits(ltv, 2)}%
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
            throw new Error(`Cannot set a time to the past - Current time: ${ethDate} - Value: ${ethDate}`);
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

task('approveErc20', 'checks if erc20 token has a sufficient allowance to be spent and increses allowance if necessary')
    .addParam("account", "Address of account to take loan with (or named account)", undefined, types.string, false)
    .addParam("tokenAddress", "contract address of the ERC-20 token", undefined, types.string, false)
    .addParam("spendAddress", "address of the authorized spender", undefined, types.string, false)
    .addParam("requiredAmount", "amount of the ERC-20 token that the authorized spender needs to spend", undefined, types.string, false)
    .setAction(async (taskArgs, env) => {
        const {account, tokenAddress, spendAddress, requiredAmount} = taskArgs;
        const {ethers} = env;
        const erc20contract = await ethers.getContractAt("ERC20", tokenAddress);
        const signer = await signerFromFuzzyAccount(account, env);

        const decimals = await erc20contract.decimals();
        const symbol = await erc20contract.symbol();
        // Check approval of account to ensure that it is sufficient
        const approved = await erc20contract.connect(signer).allowance(signer.getAddress(), spendAddress);
        console.log(`approval is currently ${ethers.formatUnits(approved, decimals)} ${symbol}`);


        const parsedRequiredAmount = ethers.parseUnits(requiredAmount, decimals);
        // If approval is not sufficient then create an approval tx
        if (approved < parsedRequiredAmount) {
            const needToApprove = parsedRequiredAmount - approved;
            console.log(`approving additional ${ethers.formatUnits(needToApprove, decimals)} ${symbol} for deposit`);
            console.log(`
        APPROVAL:
        approved: ${approved}
        needToApprove: ${needToApprove}
        `)
            await sendTransaction(erc20contract.connect(signer).approve(spendAddress, needToApprove + approved), `${symbol} Approval`);
        }
    });
