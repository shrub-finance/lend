import {task} from 'hardhat/config'
import "@nomicfoundation/hardhat-toolbox";
import {getPlatformDates, toEthDate} from "@shrub-lend/common"
import "./hardhat-tasks"

// Tasks
task("testLendingPlatform", "Setup an environment for development")
  .setAction(async (taskArgs, env) => {
    const {ethers, deployments, getNamedAccounts} = env;
    const { deployer, account1, account2, account3 } = await getNamedAccounts();
    const { oneMonth, threeMonth, sixMonth, twelveMonth } = getPlatformDates();
    // await env.run('distributeUsdc', { to: account1, amount: 1000 });
    await env.run('distributeUsdc', { to: account1, amount: 10000 });
    // await env.run('distributeUsdc', { to: account3, amount: 3000 });
    await env.run('createPool', { timestamp: toEthDate(oneMonth)});  // 1 month
    await env.run('createPool', { timestamp: toEthDate(threeMonth)});  // 3 month
    await env.run('createPool', { timestamp: toEthDate(sixMonth)});  // 6 month
    await env.run('createPool', { timestamp: toEthDate(twelveMonth)});  // 12 month
    await env.run('approveUsdc', { account: account1 });
    await env.run('provideLiquidity', { usdcAmount: 1000, timestamp: toEthDate(twelveMonth), account: account1});  // 12 month
    await env.run('borrow', { account: account2, timestamp: toEthDate(twelveMonth), borrowAmount: 100, collateralAmount: 1, ltv: 20})
    await env.run('borrow', { account: account3, timestamp: toEthDate(threeMonth), borrowAmount: 22, collateralAmount: 0.1, ltv: 33})
    await env.run('takeSnapshot', { account: deployer });
  })

task("testExtendBorrow", "testing extend borrow")
  .setAction(async (taskArgs, env) => {
    const {ethers, deployments, getNamedAccounts} = env;
    const { deployer, account1, account2, account3 } = await getNamedAccounts();
    const { oneMonth, threeMonth, sixMonth, twelveMonth } = getPlatformDates();
    await env.run('testLendingPlatform');
    await env.run('borrow', { account: account2, timestamp: toEthDate(oneMonth), borrowAmount: 2, collateralAmount: 0.001739, ltv: 50})
    await env.run('getBalance', {account: account2});
    await env.run('getBorrow', {tokenid: 2})
    // await env.run('extendBorrow', {account: account2, tokenId: 2, newTimestamp: toEthDate(threeMonth), ltv: 25, additionalCollateral: 0.001741, additionalRepayment: 0})
    // await env.run('extendBorrow', {account: account2, tokenId: 3, newTimestamp: toEthDate(sixMonth), ltv: 25, additionalCollateral: 0, additionalRepayment: 0})
    // await env.run('extendBorrow', {account: account2, tokenId: 4, newTimestamp: toEthDate(twelveMonth), ltv: 25, additionalCollateral: 0, additionalRepayment: 0})
  });

task("testLendingPlatform2", "Setup an environment for development")
    .setAction(async (taskArgs, env) => {
        const jan2025 = toEthDate(new Date('2025-01-01T00:00:00Z'));
        const feb2025 = toEthDate(new Date('2025-02-01T00:00:00Z'));
        const may2025 = toEthDate(new Date('2025-05-01T00:00:00Z'));
        const aug2025 = toEthDate(new Date('2025-08-01T00:00:00Z'));
        const jan2026 = toEthDate(new Date('2026-01-01T00:00:00Z'));

        const {ethers, deployments, getNamedAccounts} = env;
        const { deployer, account1, account2, account3 } = await getNamedAccounts();
        // await env.run('createPlatformPools');
        // await env.run('distributeUsdc', { to: account1, amount: 10000 });
        // await env.run('distributeUsdc', { to: account2, amount: 10000 });
        // await env.run('createPool', { timestamp: feb2025});  // 1 month
        // await env.run('createPool', { timestamp: may2025});  // 3 month
        // await env.run('createPool', { timestamp: aug2025});  // 6 month
        // await env.run('createPool', { timestamp: jan2026});  // 12 month
        // await env.run('approveUsdc', { account: account1 });
        // await env.run('setTime', {ethDate: jan2025});
        // await env.run('setEthPrice', {ethPrice: '2000'});
        // await env.run('provideLiquidity', { usdcAmount: 1000, timestamp: jan2026, account: account1});  // 12 month
        // await env.run('provideLiquidity', { usdcAmount: 325.123456, timestamp: may2025, account: account1});  // 12 month
        await env.run('borrow', { account: account2, timestamp: jan2026, borrowAmount: 100, collateralAmount: 1, ltv: 20})
        await env.run('borrow', { account: account3, timestamp: jan2026, borrowAmount: 22, collateralAmount: 0.1, ltv: 33})
        await env.run('borrow', { account: account1, timestamp: feb2025, borrowAmount: 5.23, collateralAmount: 0.1, ltv: 25})
        await env.run('borrow', { account: account1, timestamp: aug2025, borrowAmount: 111.123456, collateralAmount: 0.52345, ltv: 33})
        await env.run('setTime', {ethDate: feb2025});
        await env.run('takeSnapshot', { account: deployer });
        await env.run('provideLiquidity', { usdcAmount: 1000, timestamp: jan2026, account: account2});
    })

task("testLendingPlatform3", "Setup an environment for development")
    .setAction(async (taskArgs, env) => {
        const jan2026 = toEthDate(new Date('2026-01-01T00:00:00Z'));
        const feb2026 = toEthDate(new Date('2026-02-01T00:00:00Z'));
        const mar2026 = toEthDate(new Date('2026-03-01T00:00:00Z'));
        const apr2026 = toEthDate(new Date('2026-04-01T00:00:00Z'));
        const may2026 = toEthDate(new Date('2026-05-01T00:00:00Z'));
        const aug2026 = toEthDate(new Date('2026-08-01T00:00:00Z'));
        const jan2027 = toEthDate(new Date('2027-01-01T00:00:00Z'));

        const {ethers, deployments, getNamedAccounts} = env;
        const { deployer, account1, account2, account3, account4, shrubTreasury } = await getNamedAccounts();

        await partA();
        await partB();
        await partC();
        await partD();
        await partD4();
        // await partD2();
        // await partD3();
        await partE();
        await partF();
        // await partF2();
        await partG();
        await partH();

        async function partA() {
            // await env.run('createPlatformPools');
            await env.run('distributeUsdc', { to: account1, amount: 10000 });
            await env.run('distributeUsdc', { to: account2, amount: 10000 });
            // await env.run('distributeUsdc', { to: shrubTreasury, amount: 100 });
            await env.run('createPool', { timestamp: feb2026});  // 1 month
            await env.run('createPool', { timestamp: may2026});  // 3 month
            await env.run('createPool', { timestamp: aug2026});  // 6 month
            await env.run('createPool', { timestamp: jan2027});  // 12 month
        }
        async function partB() {
            await env.run('approveUsdc', { account: account1 });
            await env.run('approveUsdc', { account: shrubTreasury });
            await env.run('setTime', {ethDate: jan2026});
            await env.run('takeSnapshot', { account: deployer });
            await env.run('setEthPrice', {ethPrice: '2000'});
            await env.run('provideLiquidity', { usdcAmount: 1000, timestamp: jan2027, account: account1});  // 12 month
            await env.run('provideLiquidity', { usdcAmount: 500, timestamp: may2026, account: account2});  // 4 month
            await env.run('borrow', { account: account3, timestamp: may2026, borrowAmount: 100, collateralAmount: 0.1, ltv: 50})
            await env.run('borrow', { account: account4, timestamp: may2026, borrowAmount: 100, collateralAmount: 0.1, ltv: 50})
            // await env.run('getBorrow', {tokenid: 0});
            // await env.run('getBorrow', {tokenid: 1});
        }
        async function partC() {
            await env.run('setTime', {ethDate: feb2026});
            await env.run('takeSnapshot', { account: deployer });
            await env.run('provideLiquidity', { usdcAmount: 1000, timestamp: jan2027, account: account2});  // 12 month
        }

        async function partD() {
            await env.run('partialRepayBorrow', { account: account3, tokenId: 0, repaymentAmount: 50});
            await env.run('extendBorrow', {account: account4, tokenId: 1, newTimestamp: jan2027, ltv: 80, additionalCollateral: 0, additionalRepayment: 0})
            await env.run('setTime', {ethDate: apr2026});
            await env.run('takeSnapshot', { account: deployer });
            // await env.run('getBorrow', {tokenid: 0});
            // await env.run('getBorrow', {tokenid: 1});
            // await env.run('getBorrow', {tokenid: 2});
        }

        async function partD2() {
            await env.run('extendDeposit', {account: account2, currentTimestamp: may2026, newTimestamp: aug2026});
            await env.run('takeSnapshot', { account: deployer });
        }

        async function partD3() {
            await env.run('extendBorrow', {account: account3, tokenId: 0, newTimestamp: aug2026, ltv: 50, additionalCollateral: 0, additionalRepayment: 0})
            await env.run('setTime', {ethDate: may2026});
            // await env.run('getBorrow', {tokenid: 0});
            // await env.run('getBorrow', {tokenid: 1});
            // await env.run('getBorrow', {tokenid: 2});
            // await env.run('getBorrow', {tokenid: 3});
        }

        async function partD4() {
            await env.run('setTime', {ethDate: may2026});
            await env.run('takeSnapshot', { account: deployer });
            // await env.run('getBorrow', {tokenid: 0});
            await env.run('setTime', {ethDate: may2026 + 60 * 135});
            // await env.run('setTime', {ethDate: may2026 + 60 * 300});
            await env.run('takeSnapshot', { account: deployer });
        }

        async function partE() {
            await env.run('distributeUsdc', { to: account4, amount: 6 });
            await env.run('repayBorrow', { account: account4, tokenId: 2 })
            await env.run('takeSnapshot', { account: deployer });
            // await env.run('getBorrow', {tokenid: 0});
            // await env.run('getBorrow', {tokenid: 1});
            // await env.run('getBorrow', {tokenid: 2});
            // await env.run('getBorrow', {tokenid: 3});
        }

        async function partF() {
            await env.run('setTime', {ethDate: may2026 + 6 * 60 * 60})
            await env.run('takeSnapshot', { account: deployer });
            await env.run('finalizeLendingPool', {timestamp: may2026});
            // await env.run('withdraw', {account: account2, timestamp: may2026});
        }

        async function partF2() {
            // await env.run('getBorrow', {tokenid: 0});
            // await env.run('getBorrow', {tokenid: 1});
            // await env.run('getBorrow', {tokenid: 2});
            // await env.run('getBorrow', {tokenid: 3});
            await env.run('distributeUsdc', { to: account3, amount: 3 });
            await env.run('repayBorrow', { account: account3, tokenId: 3 });
            await env.run('setTime', {ethDate: aug2026 + 6 * 60 * 60});
            await env.run('takeSnapshot', { account: deployer });
            await env.run('finalizeLendingPool', {timestamp: aug2026});
            await env.run('withdraw', {account: account2, timestamp: aug2026});
        }

        async function partG() {
            await env.run('setTime', {ethDate: jan2027 + 6 * 60 * 60})
            await env.run('takeSnapshot', { account: deployer });
            await env.run('finalizeLendingPool', {timestamp: jan2027});
        }

        async function partH() {
            await env.run('withdraw', {account: account1, timestamp: jan2027});
            await env.run('withdraw', {account: account2, timestamp: jan2027});
        }

        async function printPools() {
            await env.run('getPool', {timestamp: feb2026});
            await env.run('getPool', {timestamp: may2026});
            await env.run('getPool', {timestamp: aug2026});
            await env.run('getPool', {timestamp: jan2027});
        }
    })
