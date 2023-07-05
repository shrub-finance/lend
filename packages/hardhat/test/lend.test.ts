import { ethers } from 'hardhat';
import chai from 'chai';
import { LendingPlatform, PoolShareToken__factory, USDCoin } from '../typechain-types';
import { parseEther, parseUnits } from 'ethers';
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";
import {ContractTransactionResponse} from "ethers";
import assert from "node:assert/strict";

const { expect } = chai;

describe('LendingPlatform', () => {
  let lendingPlatform: LendingPlatform;
  let usdc: USDCoin;
  let deployer: HardhatEthersSigner;
  let lender1: HardhatEthersSigner;
  let lender2: HardhatEthersSigner;
  let lender3: HardhatEthersSigner;
  let borrower1: HardhatEthersSigner;
  let borrower2: HardhatEthersSigner;
  let borrower3: HardhatEthersSigner;
  let poolShareTokenFactory: PoolShareToken__factory;

  before(async () => {
    [deployer, lender1, lender2, lender3, borrower1, borrower2, borrower3] = await ethers.getSigners();
  })

  beforeEach(async () => {
    const usdCoinFactory = await ethers.getContractFactory('USDCoin');
    const LendingPlatformFactory = await ethers.getContractFactory('LendingPlatform');
    poolShareTokenFactory = await ethers.getContractFactory('PoolShareToken');

    usdc = (await usdCoinFactory.deploy(1e6)) as USDCoin;
    await usdc.waitForDeployment();


    lendingPlatform = (await LendingPlatformFactory.deploy(usdc.getAddress())) as LendingPlatform;
    await lendingPlatform.waitForDeployment();

  });

  describe('getUsdcAddress', () => {
    it('returns the address', async () => {
      const address = await lendingPlatform.getUsdcAddress();
      console.log(address);
      console.log(usdc.getAddress());
    })
  })

  describe('usdc', () => {
    it('should have name implemented', async() => {
      const name = await usdc.name();
      expect(name).to.equal('USD Coin');
    })
    it('should have symbol implemented', async() => {
      const symbol = await usdc.symbol();
      expect(symbol).to.equal('USDC');
    })
    it('should have a decimal of 6', async () => {
      const decimals = await usdc.decimals();
      expect(decimals).to.equal(6);
    });
    it('should have an initial supply of 1 million', async () => {
      const initialSupply = await usdc.balanceOf(deployer.getAddress());
      const unitsPerCoin = 10 ** 6
      expect(initialSupply).to.equal(1e6 * unitsPerCoin);
    });
    it('should be able to transfer 100 USDC to lender1 and then lender1 sends 60 USDC to lender2', async () => {
      const lender1BalanceBefore = await usdc.balanceOf(lender1.getAddress());
      const lender2BalanceBefore = await usdc.balanceOf(lender2.getAddress());
      expect(lender1BalanceBefore).to.equal(0);
      expect(lender2BalanceBefore).to.equal(0);
      await usdc.transfer(lender1.getAddress(), 100 * 10 ** 6);
      const lender1BalanceMiddle = await usdc.balanceOf(lender1.getAddress());
      expect(lender1BalanceMiddle).to.equal(100 * 10 ** 6);
      const usdcLender1 = usdc.connect(lender1);
      await usdcLender1.transfer(lender2.getAddress(), 60 * 10 ** 6);
      const lender1BalanceEnd = await usdc.balanceOf(lender1.getAddress());
      const lender2BalanceEnd = await usdc.balanceOf(lender2.getAddress());
      expect(lender1BalanceEnd).to.equal(40 * 10 ** 6);
      expect(lender2BalanceEnd).to.equal(60 * 10 ** 6);
    });
  })

  describe('getAPYBasedOnLTV', () => {
    it('should return the correct APY for a given LTV', async () => {
      expect(await lendingPlatform.getAPYBasedOnLTV(20)).to.equal(0);
      expect(await lendingPlatform.getAPYBasedOnLTV(25)).to.equal(1);
      expect(await lendingPlatform.getAPYBasedOnLTV(33)).to.equal(5);
      expect(await lendingPlatform.getAPYBasedOnLTV(50)).to.equal(8);
    });

    it('should revert for invalid LTV', async () => {
      await expect(lendingPlatform.getAPYBasedOnLTV(15)).to.be.revertedWith('Invalid LTV');
      await expect(lendingPlatform.getAPYBasedOnLTV(60)).to.be.revertedWith('Invalid LTV');
    });
  });

  describe('createPool', async () => {
    it('should create a new pool with 0 totalLiquidity and 0 aaveInterestSnapshot', async () => {
      const timestamp = 1780268400; // 1st June, 2026
      await lendingPlatform.createPool(timestamp);

      const pool = await lendingPlatform.pools(timestamp);
      expect(pool.totalLiquidity).to.equal(0);
      expect(pool.aaveInterestSnapshot).to.equal(0);
    });

    it('should revert if a non-owner tries to create a pool', async () => {
      const timestamp = 1782946800; // 2nd July, 2026
      await expect(lendingPlatform.connect(lender1).createPool(timestamp)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should create a new token for the pool', async () => {
      const timestamp = 1785625200; // 2nd August, 2026
      await lendingPlatform.createPool(timestamp);

      const pool = await lendingPlatform.pools(timestamp);
      expect(pool.poolShareToken).to.not.equal(ethers.ZeroAddress);
    });

    it('should revert if a pool with the same timestamp already exists', async () => {
      const timestamp = 1785625200; // 2nd August, 2026
      await lendingPlatform.createPool(timestamp);

      await expect(lendingPlatform.createPool(timestamp)).to.be.revertedWith('Pool already exists');
    });

    it('should create a PoolShareToken with the correct name and symbol', async () => {
      const timestamp = 1785625200; // 2nd August, 2026
      await lendingPlatform.createPool(timestamp);

      const pool = await lendingPlatform.pools(timestamp);
      const poolShareToken = await ethers.getContractAt('PoolShareToken', pool.poolShareToken);

      const name = await poolShareToken.name();
      const symbol = await poolShareToken.symbol();

      expect(name).to.equal(`PoolShareToken_${timestamp}`);
      expect(symbol).to.equal(`PST_${timestamp}`);
    });

    it('should emit the correct event when initializing the pool', async () => {
      const timestamp = 1785625200; // 2nd August, 2026
      const createPoolTx = await lendingPlatform.createPool(timestamp);
      const createPoolReciept = await createPoolTx.wait();

      const pool = await lendingPlatform.pools(timestamp);

      // const createPoolEvent = createPoolReciept.events?.find(event => event.event === "poolCreated");
      expect(createPoolTx).to.emit(lendingPlatform, "poolCreated")
        .withArgs(timestamp, pool.poolShareToken);
      //
      // expect(createPoolEvent).to.exist;
      // expect(createPoolEvent?.args).to.exist;
      // expect(createPoolEvent?.args?.timestamp).to.equal(timestamp);
      // expect(createPoolEvent?.args?.poolShareTokenAddress).to.equal(pool.poolShareToken);
    });

  });

  describe('deposit', async () => {
    let lender1LendingPlatform: LendingPlatform;
    let usdcLender1: USDCoin;
    const timestamp = 1785625200; // 2nd August, 2026

    beforeEach(async () => {
      // lender1 should have 1000 USDC
      // lender2 should have 2000 USDC
      await usdc.transfer(lender1.getAddress(), 1000 * 10 ** 6);
      await usdc.transfer(lender2.getAddress(), 2000 * 10 ** 6);
      await lendingPlatform.createPool(timestamp);
      lender1LendingPlatform = lendingPlatform.connect(lender1);
      usdcLender1 = usdc.connect(lender1);

    })
    it('should have the right initial amounts of USDC', async () => {
      const lender1Balance = await usdc.balanceOf(lender1.getAddress());
      const lender2Balance = await usdc.balanceOf(lender2.getAddress());
      expect(lender1Balance).to.equal(1000 * 10 ** 6);
      expect(lender2Balance).to.equal(2000 * 10 ** 6);
    })
    it('should revert when deposit amount is 0', async () => {
      await expect(lender1LendingPlatform.deposit(1, 0)).to.be.revertedWith("Deposit amount must be greater than 0");
    });

    it('should revert if no allowance', async () => {
      // Assuming you have setup mock USDC contract and the user doesn't have any USDC tokens
      await expect(lender1LendingPlatform.deposit(timestamp, 1000)).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it('should revert if insufficient allowance', async () => {
      await usdcLender1.approve(lendingPlatform.getAddress(), 900 * 10 ** 6)
      await expect(lender1LendingPlatform.deposit(timestamp, 1000 * 10 ** 6)).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it('should revert when user does not have enough USDC tokens', async () => {
      await usdcLender1.approve(lendingPlatform.getAddress(), 1100 * 10 ** 6)
      await expect(lender1LendingPlatform.deposit(timestamp, 1001 * 10 ** 6)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    // it('should revert when USDC token transfer fails', async () => {
    //     // Assuming you have setup mock USDC contract and the USDC transfer function is designed to fail
    //     await expect(lendingPlatform.deposit(1, 1000)).to.be.reverted;
    // });

    it('should revert if the pool is not yet created', async () => {
      const badTimestamp = 12345;
      await usdcLender1.approve(lendingPlatform.getAddress(), 1100 * 10 ** 6)
      await expect(lender1LendingPlatform.deposit(badTimestamp, 1000 * 10 ** 6)).to.be.revertedWith("Pool does not exist");
    })

    it('should all deposit into active pool', async () => {
      const poolBefore = await lendingPlatform.getPool(timestamp);
      const usdcLender1Before = await usdc.balanceOf(lender1.getAddress());
      const usdcPoolBefore = await usdc.balanceOf(lendingPlatform.getAddress());
      await usdcLender1.approve(lendingPlatform.getAddress(), 1100 * 10 ** 6)
      await lender1LendingPlatform.deposit(timestamp, 800 * 10 ** 6);
      const poolAfter = await lendingPlatform.getPool(timestamp);
      const usdcLender1After = await usdc.balanceOf(lender1.getAddress());
      const usdcPoolAfter = await usdc.balanceOf(lendingPlatform.getAddress());
      // Total liquidity should be added to the pool
      expect(poolBefore.totalLiquidity).to.equal(0);
      expect(poolBefore.totalLoans).to.equal(0);
      expect(poolAfter.totalLiquidity).to.equal(800 * 10 ** 6);
      expect(poolAfter.totalLoans).to.equal(0);
      expect(usdcLender1Before).to.equal(1000 * 10 ** 6);
      expect(usdcLender1After).to.equal(200 * 10 ** 6);
      expect(usdcPoolBefore).to.equal(0);
      expect(usdcPoolAfter).to.equal(800 * 10 ** 6);
      // lender1 should receive the poolShareToken

      const poolShareToken = await ethers.getContractAt("PoolShareToken", poolAfter.poolShareTokenAddress);
      const lender1PoolTokenBalance = await poolShareToken.balanceOf(lender1.getAddress());
      expect(lender1PoolTokenBalance).to.equal(800 * 10 ** 6);
    });
  });

  describe('getTotalAvailableLiquidity', () => {
    // 2026-01-01 1767225600
    // 2026-02-01 1769904000
    // 2026-03-01 1772323200
    const poolTimestamps = [1767225600, 1769904000, 1772323200];
    const depositAmounts = [1000 * 10 ** 6, 1500 * 10 ** 6, 4000 * 10 ** 6];
    let lender1LendingPlatform: LendingPlatform;
    let usdcLender1: USDCoin;

    beforeEach(async () => {
      lender1LendingPlatform = lendingPlatform.connect(lender1);
      usdcLender1 = usdc.connect(lender1);

      // Deposit amounts
      await usdc.transfer(lender1.getAddress(), 6500 * 10 ** 6);
      await usdcLender1.approve(lendingPlatform.getAddress(), 6500 * 10 ** 6)

      for (let i = 0; i < 3; i++) {
        await lendingPlatform.createPool(poolTimestamps[i]);
        await lender1LendingPlatform.deposit(poolTimestamps[i], depositAmounts[i]);
      }
    });

    it('should return the correct total available liquidity before 2026-01-01', async () => {
      const totalLiquidity = await lendingPlatform.getTotalLiquidity(1767225599);
      const totalLiquidityConsumed = await lendingPlatform.getTotalLiquidityConsumed(1767225599);
      const totalAvailableLiquidity = totalLiquidity - totalLiquidityConsumed;
      expect(totalAvailableLiquidity).to.equal(6500 * 10 ** 6);
    });

    it('should return the correct total available liquidity on 2026-01-01', async () => {
      const totalLiquidity = await lendingPlatform.getTotalLiquidity(1767225600);
      const totalLiquidityConsumed = await lendingPlatform.getTotalLiquidityConsumed(1767225600);
      const totalAvailableLiquidity = totalLiquidity - totalLiquidityConsumed;
      expect(totalAvailableLiquidity).to.equal(6500 * 10 ** 6);
    });

    it('should return the correct total available liquidity on 2026-02-01', async () => {
      const totalLiquidity = await lendingPlatform.getTotalLiquidity(1769904000);
      const totalLiquidityConsumed = await lendingPlatform.getTotalLiquidityConsumed(1769904000);
      const totalAvailableLiquidity = totalLiquidity - totalLiquidityConsumed;
      expect(totalAvailableLiquidity).to.equal(5500 * 10 ** 6);
    });

    it('should return the correct total available liquidity on 2026-03-01', async () => {
      const totalLiquidity = await lendingPlatform.getTotalLiquidity(1772323200);
      const totalLiquidityConsumed = await lendingPlatform.getTotalLiquidityConsumed(1772323200);
      const totalAvailableLiquidity = totalLiquidity - totalLiquidityConsumed;
      expect(totalAvailableLiquidity).to.equal(4000 * 10 ** 6);
    });

    it('should return the correct total available liquidity after 2026-03-01', async () => {
      const totalLiquidity = await lendingPlatform.getTotalLiquidity(1772323201);
      const totalLiquidityConsumed = await lendingPlatform.getTotalLiquidityConsumed(1772323201);
      const totalAvailableLiquidity = totalLiquidity - totalLiquidityConsumed;
      expect(totalAvailableLiquidity).to.equal(0);
    });
  });

  describe('getPool', () => {
    // 2026-01-01 1767225600
    // 2026-02-01 1769904000
    const poolTimestamps = [1767225600, 1769904000];
    const depositAmounts = [1000 * 10 ** 6, 1500 * 10 ** 6];
    let lender1LendingPlatform: LendingPlatform;
    let usdcLender1: USDCoin;
    let createPoolTxs: (ContractTransactionResponse)[] = []

    beforeEach(async () => {
      lender1LendingPlatform = lendingPlatform.connect(lender1);
      usdcLender1 = usdc.connect(lender1);
      createPoolTxs = [];

      // Deposit amounts
      await usdc.transfer(lender1.getAddress(), 2500 * 10 ** 6);
      await usdcLender1.approve(lendingPlatform.getAddress(), 2500 * 10 ** 6)

      for (let i = 0; i < 2; i++) {
        const tx = await lendingPlatform.createPool(poolTimestamps[i]);
        createPoolTxs.push(tx);
        // const txReceipt = await tx.wait();

        // const createPoolEvent = txReceipt.events?.find(event => event.event === "poolCreated");
        // createPoolEvents.push(createPoolEvent);

        await lender1LendingPlatform.deposit(poolTimestamps[i], depositAmounts[i]);
      }
    });

    it('should return zeros if the pool does not exist', async () => {
      const pool = await lendingPlatform.getPool(1767225599);
      expect(pool.totalLiquidity).to.equal(0);
      expect(pool.totalLoans).to.equal(0);
      expect(pool.aaveInterestSnapshot).to.equal(0);
      expect(pool.poolShareTokenAddress).to.equal(ethers.ZeroAddress);
    });

    it('should return the correct pool details for the first pool', async () => {
      const pool = await lendingPlatform.getPool(1767225600);
      expect(pool.totalLiquidity).to.equal(1000 * 10 ** 6);
      expect(pool.totalLoans).to.equal(0);
      expect(pool.aaveInterestSnapshot).to.equal(0);
      // expect(pool.poolShareTokenAddress).to.equal(createPoolTxs[0])
      expect(createPoolTxs[0]).to.emit(lendingPlatform, "poolCreated").withArgs(pool.poolShareTokenAddress);
      // expect(pool.poolShareTokenAddress).to.equal(createPoolEvents[0]?.args?.poolShareTokenAddress);
    });

    it('should return the correct pool details for the second pool', async () => {
      const pool = await lendingPlatform.getPool(1769904000);
      expect(pool.totalLiquidity).to.equal(1500 * 10 ** 6);
      expect(pool.totalLoans).to.equal(0);
      expect(pool.aaveInterestSnapshot).to.equal(0);
      // expect(pool.poolShareTokenAddress).to.equal(createPoolEvents[1]?.args?.poolShareTokenAddress);
      expect(createPoolTxs[1]).to.emit(lendingPlatform, "poolCreated").withArgs(pool.poolShareTokenAddress);

    });

    it('should return zeros if the pool does not exist with a larger timestamp', async () => {
      const pool = await lendingPlatform.getPool(1769904001);
      expect(pool.totalLiquidity).to.equal(0);
      expect(pool.totalLoans).to.equal(0);
      expect(pool.aaveInterestSnapshot).to.equal(0);
      expect(pool.poolShareTokenAddress).to.equal(ethers.ZeroAddress);
    });
  });

  describe('takeLoan', () => {
    const timestamps = [1767225600, 1769904000, 1772323200];
    let lender1Usdc: USDCoin;
    let lender2Usdc: USDCoin;
    beforeEach(async () => {
      // Send 10000 USDC to both lender1 and lender2
      // Approve 10000 USDC to the lendingPlatform for both lender1 and lender2
      // Initialize 3 pools:
      // 1-Jan-2026 1767225600
      // 1-Feb-2026 1769904000
      // 1-Mar-2026 1772323200

      lender1Usdc = usdc.connect(lender1);
      lender2Usdc = usdc.connect(lender2);
      const lender1Address = await lender1.getAddress();

      await usdc.transfer(lender1.getAddress(), parseUnits('10000', 6));
      await usdc.transfer(lender2.getAddress(), parseUnits('10000', 6));

      await lender1Usdc.approve(lendingPlatform.getAddress(), parseUnits('10000', 6));
      await lender2Usdc.approve(lendingPlatform.getAddress(), parseUnits('10000', 6));

      await lendingPlatform.createPool(timestamps[0]);
      await lendingPlatform.createPool(timestamps[1]);
      await lendingPlatform.createPool(timestamps[2]);

    })
    describe('general checks', () => {
      let borrower1LendingPlatform: LendingPlatform;
      beforeEach(() => {
        borrower1LendingPlatform = lendingPlatform.connect(borrower1);
      })
      it('should reject if the collateral sent is lower than the amount specified', async() => {

        // const borrower1Balance = await borrower1.getBalance();
        // console.log(borrower1Balance);
        const amount = parseUnits('1000', 6);
        const collateral = parseEther('1');
        const ltv = 0;

        await expect(borrower1LendingPlatform.takeLoan(amount, collateral, ltv, timestamps[0], {value: parseEther('0.1')})).to.be.revertedWith("Wrong amount of Ether provided.");

      });
      it('should reject if the collateral sent is higher than the amount specified', async() => {
        const amount = parseUnits('1000', 6);
        const collateral = parseEther('1');
        const ltv = 0;

        await expect(borrower1LendingPlatform.takeLoan(amount, collateral, ltv, timestamps[0], {value: parseEther('2')})).to.be.revertedWith("Wrong amount of Ether provided.");
      });
      it('should reject if an invalid pool is specified', async() => {
        const amount = parseUnits('1000', 6);
        const collateral = parseEther('1');
        const ltv = 0;

        await expect(borrower1LendingPlatform.takeLoan(amount, collateral, ltv, 1767225601, {value: parseEther('1')})).to.be.revertedWith("Not a valid pool");
      });
      it('should reject if specified ltv is less than the calculated ltv', async() => {
        const amount = parseUnits('1000', 6);
        const collateral = parseEther('1');
        const ltv = 25;

        await expect(borrower1LendingPlatform.takeLoan(amount, collateral, ltv, timestamps[0], {value: parseEther('1')})).to.be.revertedWith("Insufficient collateral provided for specified ltv");
      });
    });

    describe('loan from single pool with a single lender', () => {
      let lender1LendingPlatform: LendingPlatform;
      let borrower1LendingPlatform: LendingPlatform;
      beforeEach(async () => {
        lender1LendingPlatform = lendingPlatform.connect(lender1);
        borrower1LendingPlatform = lendingPlatform.connect(borrower1);
        // console.log((await borrower1.getBalance()))

        // Lender1 deposit 1000 USDC to 1-Jan-2026 pool
        await lender1LendingPlatform.deposit(timestamps[0], parseUnits('1000', 6));
      })
      it('should reject if insufficient liquidity across pools', async() => {
        const amount = parseUnits('1001', 6);
        const collateral = parseEther('2');
        const ltv = 33;

        await expect(borrower1LendingPlatform.takeLoan(amount, collateral, ltv, timestamps[0], {value: collateral})).to.be.revertedWith("Insufficient liquidity across pools");
      });
      it('should reject if pool with no liquidity is selected', async() => {
        const amount = parseUnits('1', 6);
        const collateral = parseEther('2');
        const ltv = 20;

        await expect(borrower1LendingPlatform.takeLoan(amount, collateral, ltv, timestamps[1], {value: collateral})).to.be.revertedWith("Insufficient liquidity across pools");
      });
      it('should reject if invalid ltv is specified', async() => {
        const amount = parseUnits('1000', 6);
        const collateral = parseEther('2');
        const ltv = 35;

        await expect(borrower1LendingPlatform.takeLoan(amount, collateral, ltv, timestamps[0], {value: collateral})).to.be.revertedWith("Invalid LTV");
      });
      it('should create the loan', async() => {
        // All loan values should be as expected:
        // amount
        // collateral
        // aaveCollateral
        // LTV
        // APY
        // contributing pools
        //
        // totalLoans should be as expected
        // USDC balance of contract and borrower should be as expected
        // ETH balance of contract and borrower should be as expected

        const borrower1UsdcBalanceBefore = await usdc.balanceOf(borrower1.getAddress());
        const borrower1EthBalanceBefore = await ethers.provider.getBalance(borrower1.getAddress());
        const lendingPlatformUsdcBalanceBefore = await usdc.balanceOf(lendingPlatform.getAddress());
        const lendingPlatformEthBalanceBefore = await ethers.provider.getBalance(lendingPlatform.getAddress());

        expect(borrower1UsdcBalanceBefore).to.equal(0);
        expect(borrower1EthBalanceBefore).to.be.greaterThan(parseEther('9999'));
        expect(borrower1EthBalanceBefore).to.be.lessThan(parseEther('10000'));
        expect(lendingPlatformUsdcBalanceBefore).to.equal(parseUnits('1000', 6));
        expect(lendingPlatformEthBalanceBefore).to.equal(0);

        const amount = parseUnits('900', 6);
        const collateral = parseEther('2');
        const ltv = 25;

        const borrowTx = await borrower1LendingPlatform.takeLoan(amount, collateral, ltv, timestamps[0], {value: collateral});
        const borrowReceipt = await borrowTx.wait();
        assert(borrowReceipt);
        const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice

        const borrower1UsdcBalanceAfter = await usdc.balanceOf(borrower1.getAddress());
        const borrower1EthBalanceAfter = await ethers.provider.getBalance(borrower1.getAddress());
        const lendingPlatformUsdcBalanceAfter = await usdc.balanceOf(lendingPlatform.getAddress());
        const lendingPlatformEthBalanceAfter = await ethers.provider.getBalance(lendingPlatform.getAddress());

        expect(borrower1UsdcBalanceAfter).to.equal(parseUnits('900', 6));
        expect(borrower1EthBalanceAfter).to.equal(borrower1EthBalanceBefore - txFee - parseEther('2'));
        expect(lendingPlatformUsdcBalanceAfter).to.equal(parseUnits('100', 6));
        expect(lendingPlatformEthBalanceAfter).to.equal(parseEther('2'));

        const totalLoans = await lendingPlatform.totalLoans(timestamps[0]);
        expect(totalLoans).to.equal(parseUnits('900', 6));

        const loan = await lendingPlatform.getLoan(borrower1.getAddress(), timestamps[0]);
        expect(loan.amount).to.equal(parseUnits('900', 6));
        expect(loan.collateral).to.equal(parseEther('2'));
        expect(loan.LTV).to.equal(25);
        expect(loan.APY).to.equal(1);
        expect(loan.contributingPools.length).to.equal(1);
        expect(loan.contributingPools[0].poolTimestamp).to.equal(timestamps[0]);
        expect(loan.contributingPools[0].liquidityContribution).to.equal(parseUnits('1', 8));

        const totalLiquidity = await lendingPlatform.getTotalLiquidity(timestamps[0]);
        const totalLiquidityConsumed = await lendingPlatform.getTotalLiquidityConsumed(timestamps[0]);
        const totalAvailableLiquidity = totalLiquidity - totalLiquidityConsumed;
        expect(totalAvailableLiquidity).to.equal(parseUnits('100', 6));
      });
      it('should reject a second loan from the same borrower and same timestamp', async() => {
        const amount = parseUnits('900', 6);
        const collateral = parseEther('2');
        const ltv = 25;

        const borrowTx = await borrower1LendingPlatform.takeLoan(amount, collateral, ltv, timestamps[0], {value: collateral});
        const borrowReceipt = await borrowTx.wait();
        assert(borrowReceipt);
        const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice;

        const amount2 = parseUnits('9', 6);
        const collateral2 = parseEther('2');
        const ltv2 = 20;

        await expect(borrower1LendingPlatform.takeLoan(amount2, collateral2, ltv2, timestamps[0], {value: collateral2})).to.be.revertedWith("Loan already exists in this slot");

      });
      it('should reject if a second loan does not have sufficient liquidity', async() => {
        const borrower2LendingPlatform = lendingPlatform.connect(borrower2);

        const amount = parseUnits('900', 6);
        const collateral = parseEther('2');
        const ltv = 25;

        const borrowTx = await borrower1LendingPlatform.takeLoan(amount, collateral, ltv, timestamps[0], {value: collateral});
        const borrowReceipt = await borrowTx.wait();
        assert(borrowReceipt);
        const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice;

        const amount2 = parseUnits('101', 6);
        const collateral2 = parseEther('1');
        const ltv2 = 20;

        await expect(borrower2LendingPlatform.takeLoan(amount2, collateral2, ltv2, timestamps[0], {value: collateral2})).to.be.revertedWith("Insufficient liquidity across pools");
      });
      it('should succeed with a second loan with sufficient liquidity', async() => {
        const borrower2LendingPlatform = lendingPlatform.connect(borrower2);

        const borrower1UsdcBalanceBefore = await usdc.balanceOf(borrower1.getAddress());
        const borrower1EthBalanceBefore = await ethers.provider.getBalance(borrower1.getAddress());
        const borrower2UsdcBalanceBefore = await usdc.balanceOf(borrower2.getAddress());
        const borrower2EthBalanceBefore = await ethers.provider.getBalance(borrower2.getAddress());
        const lendingPlatformUsdcBalanceBefore = await usdc.balanceOf(lendingPlatform.getAddress());
        const lendingPlatformEthBalanceBefore = await ethers.provider.getBalance(lendingPlatform.getAddress());

        expect(borrower1UsdcBalanceBefore).to.equal(0);
        expect(borrower2UsdcBalanceBefore).to.equal(0);
        expect(lendingPlatformUsdcBalanceBefore).to.equal(parseUnits('1000', 6));
        expect(lendingPlatformEthBalanceBefore).to.equal(0);

        const amount = parseUnits('900', 6);
        const collateral = parseEther('2');
        const ltv = 25;

        const borrowTx = await borrower1LendingPlatform.takeLoan(amount, collateral, ltv, timestamps[0], {value: collateral});
        const borrowReceipt = await borrowTx.wait();
        assert(borrowReceipt);
        const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice;

        const amount2 = parseUnits('100', 6);
        const collateral2 = parseEther('1');
        const ltv2 = 20;

        const borrowTx2 = await borrower2LendingPlatform.takeLoan(amount2, collateral2, ltv2, timestamps[0], {value: collateral2});
        const borrowReceipt2 = await borrowTx2.wait();
        assert(borrowReceipt2);
        const txFee2 = borrowReceipt2.gasUsed * borrowTx2.gasPrice;

        const borrower1UsdcBalanceAfter = await usdc.balanceOf(borrower1.getAddress());
        const borrower1EthBalanceAfter = await ethers.provider.getBalance(borrower1.getAddress());
        const borrower2UsdcBalanceAfter = await usdc.balanceOf(borrower2.getAddress());
        const borrower2EthBalanceAfter = await ethers.provider.getBalance(borrower2.getAddress());
        const lendingPlatformUsdcBalanceAfter = await usdc.balanceOf(lendingPlatform.getAddress());
        const lendingPlatformEthBalanceAfter = await ethers.provider.getBalance(lendingPlatform.getAddress());

        expect(borrower1UsdcBalanceAfter).to.equal(parseUnits('900', 6));
        expect(borrower1EthBalanceAfter).to.equal(borrower1EthBalanceBefore - txFee - parseEther('2'));
        expect(borrower2UsdcBalanceAfter).to.equal(parseUnits('100', 6));
        expect(borrower2EthBalanceAfter).to.equal(borrower2EthBalanceBefore - txFee2 - parseEther('1'));
        expect(lendingPlatformUsdcBalanceAfter).to.equal(0);
        expect(lendingPlatformEthBalanceAfter).to.equal(parseEther('3'));

        const totalLoans = await lendingPlatform.totalLoans(timestamps[0]);
        expect(totalLoans).to.equal(parseUnits('1000', 6));

        const loan = await lendingPlatform.getLoan(borrower2.getAddress(), timestamps[0]);
        expect(loan.amount).to.equal(parseUnits('100', 6));
        expect(loan.collateral).to.equal(parseEther('1'));
        expect(loan.LTV).to.equal(20);
        expect(loan.APY).to.equal(0);
        expect(loan.contributingPools.length).to.equal(1);
        expect(loan.contributingPools[0].poolTimestamp).to.equal(timestamps[0]);
        expect(loan.contributingPools[0].liquidityContribution).to.equal(parseUnits('1', 8));

        const totalLiquidity = await lendingPlatform.getTotalLiquidity(timestamps[0]);
        const totalLiquidityConsumed = await lendingPlatform.getTotalLiquidityConsumed(timestamps[0]);
        const totalAvailableLiquidity = totalLiquidity - totalLiquidityConsumed;
        expect(totalAvailableLiquidity).to.equal(parseUnits('0', 6));
      })
    })

    describe('loan from single pool with two lenders', () => {
      beforeEach(async () => {
        // Lender1 deposit 2000 USDC to 1-Jan-2026 pool
        // Lender2 deposit 3000 USDC to 1-Jan-2026 pool
      })
      it('should reject if insufficient liquidity across pools', async() => {});
      it('should reject if pool with no liquidity is selected', async() => {});
      it('should create the loan', async() => {});
    })

    describe('loan from multiple pools with multiple lenders', () => {
      beforeEach(async () => {
        // Lender1 deposit 2000 USDC to 1-Jan-2026 pool
        // Lender2 deposit 3000 USDC to 1-Jan-2026 pool
        // Lender1 deposit 1200 USDC to 1-Feb-2026 pool
        // Lender2 deposit 300 USDC to 1-Feb-2026 pool
        // Lender1 deposit 500 USDC to 1-Mar-2026 pool
      })
      it('should reject if not enough liquidity for march', async () => {});
      it('should reject if not enough liquidity for feb', async () => {});
      it('should reject if not enough liquidity for january', async () => {});
      it('should create the loan for jan', async() => {});
      it('should create the loan for feb', async() => {});
      it('should create the loan for march', async() => {});
      it('should create the loan for jan even if some of the jan liquidity is consumed for a feb loan', async() => {});
      it('should reject if all of the possible jan liquidity is used up for jan loans', async () => {});
    })
  })

  describe('maxLoan', () => {
    it('should reject invalid ltv', async () => {
      await expect(lendingPlatform.maxLoan(5, parseEther('1'))).to.be.revertedWith("Invalid LTV");
    })

    it('should calculate the correct value for 50% LTV loan', async () => {
      const maxLoan = await lendingPlatform.maxLoan(50, parseEther('1'));
      expect(maxLoan).to.equal(parseUnits('926.05515', 6));
    })
  })
});
