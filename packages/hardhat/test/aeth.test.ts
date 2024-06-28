import {ethers, deployments, network, getNamedAccounts} from 'hardhat';
import chai from 'chai';
import {
  LendingPlatform,
  USDCoin,
  AETH,
  BorrowPositionToken,
  MockAaveV3,
  MockChainlinkAggregator
} from '../typechain-types';
import {parseEther} from 'ethers';
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";

const {expect} = chai;

const currentLogLevel = process.env.LOG_LEVEL || 'none';

function log(msg: any, level = 'verbose') {
  if (currentLogLevel === 'verbose') {
    console.log(msg);
  }
}

let aeth: AETH;
let usdc: USDCoin;
let bpt: BorrowPositionToken;
let lendingPlatform: LendingPlatform;
let mockAaveV3: MockAaveV3;
let mockChainlinkAggregator: MockChainlinkAggregator;
let deployer: HardhatEthersSigner;
let lender1: HardhatEthersSigner;
let lender2: HardhatEthersSigner;
let lender3: HardhatEthersSigner;
let borrower1: HardhatEthersSigner;
let borrower2: HardhatEthersSigner;
let borrower3: HardhatEthersSigner;

const withdrawFixture = deployments.createFixture(async () => {
  await deployments.fixture('MockErc20');
  const lender1BalanceBefore = await ethers.provider.getBalance(lender1.address);
  const lender2BalanceBefore = await ethers.provider.getBalance(lender2.address);
  const tx1 = await aeth.connect(lender1).deposit(lender1.address, {value: parseEther('1.1')});
  const tx2 = await aeth.connect(lender2).deposit(lender2.address, {value: parseEther('0.5')});
  const receipt1 = await tx1.wait();
  const receipt2 = await tx2.wait();
  if (!receipt1 || !receipt2) {
    throw new Error('no receipt');
  }
  const lender1AethBalance = await aeth.balanceOf(lender1.address);
  const lender2AethBalance = await aeth.balanceOf(lender2.address);
  const lender1BalanceAfter = await ethers.provider.getBalance(lender1.address);
  const lender2BalanceAfter = await ethers.provider.getBalance(lender2.address);
  const totalSupply = await aeth.totalSupply();
  const aethAddress = await aeth.getAddress();
  const aethEthBalance = await ethers.provider.getBalance(aethAddress);
  expect(lender1BalanceBefore).to.equal(parseEther('10000'));
  expect(lender2BalanceBefore).to.equal(parseEther('10000'));
  expect(lender1BalanceAfter).to.equal(parseEther('10000') - parseEther('1.1') - tx1.gasPrice * receipt1.gasUsed);
  expect(lender2BalanceAfter).to.equal(parseEther('10000') - parseEther('0.5') - tx2.gasPrice * receipt2.gasUsed);
  expect(lender1AethBalance).to.equal(parseEther('1.1'));
  expect(lender2AethBalance).to.equal(parseEther('0.5'));
  expect(totalSupply).to.equal(parseEther('1.6'));
  expect(aethEthBalance).to.equal(parseEther('1.6'));
})

const AETHEmergencyEtherTransferFixture = deployments.createFixture(async () => {
  await deployments.fixture('MockErc20');
  const lender1BalanceBefore = await ethers.provider.getBalance(lender1.address);
  const lender2BalanceBefore = await ethers.provider.getBalance(lender2.address);
  const tx1 = await aeth.connect(lender1).deposit(lender1.address, {value: parseEther('1.1')});
  const tx2 = await aeth.connect(lender2).deposit(lender2.address, {value: parseEther('0.5')});
  const receipt1 = await tx1.wait();
  const receipt2 = await tx2.wait();
  if (!receipt1 || !receipt2) {
    throw new Error('no receipt');
  }
  const lender1AethBalance = await aeth.balanceOf(lender1.address);
  const lender2AethBalance = await aeth.balanceOf(lender2.address);
  const lender1BalanceAfter = await ethers.provider.getBalance(lender1.address);
  const lender2BalanceAfter = await ethers.provider.getBalance(lender2.address);
  const totalSupply = await aeth.totalSupply();
  const aethAddress = await aeth.getAddress();
  const aethEthBalance = await ethers.provider.getBalance(aethAddress);
  expect(lender1BalanceBefore).to.equal(parseEther('10000'));
  expect(lender2BalanceBefore).to.equal(parseEther('10000'));
  expect(lender1BalanceAfter).to.equal(parseEther('10000') - parseEther('1.1') - tx1.gasPrice * receipt1.gasUsed);
  expect(lender2BalanceAfter).to.equal(parseEther('10000') - parseEther('0.5') - tx2.gasPrice * receipt2.gasUsed);
  expect(lender1AethBalance).to.equal(parseEther('1.1'));
  expect(lender2AethBalance).to.equal(parseEther('0.5'));
  expect(totalSupply).to.equal(parseEther('1.6'));
  expect(aethEthBalance).to.equal(parseEther('1.6'));
})

describe('AETH', () => {
  before(async () => {
    const {
      deployer: deployerStr,
      account1,
      account2,
      account3,
      account4,
      account5,
      account6
    } = await getNamedAccounts();
    deployer = await ethers.getSigner(deployerStr);
    lender1 = await ethers.getSigner(account1);
    lender2 = await ethers.getSigner(account2);
    lender3 = await ethers.getSigner(account3);
    borrower1 = await ethers.getSigner(account4);
    borrower2 = await ethers.getSigner(account5);
    borrower3 = await ethers.getSigner(account6);
    await deployments.fixture('MockErc20');
    aeth = await ethers.getContractAt("AETH", (await deployments.get('AETH')).address);
  })
  beforeEach(async () => {
    await deployments.fixture('MockErc20');
    log(`running AETH beforeEach - ${await ethers.provider.getBlockNumber()}`);
    // log(await ethers.provider.getBlockNumber());
  })
  afterEach(async () => {
    log(`running AETH afterEach - ${await ethers.provider.getBlockNumber()}`);
  })
  describe('ERC-20 naming and decimal', () => {
    it('should have name implemented', async () => {
      const name = await aeth.name();
      expect(name).to.equal('Mock Aave Ethereum WETH');
    })
    it('should have symbol implemented', async () => {
      const symbol = await aeth.symbol();
      expect(symbol).to.equal('aEthWETH');
    })
    it('should have a decimal of 18', async () => {
      const decimals = await aeth.decimals();
      expect(decimals).to.equal(18);
    });
  });
  describe('initial supply', () => {
    it('should have an initial supply of 0', async () => {
      const aethSupplyBefore = await aeth.totalSupply();
      expect(aethSupplyBefore).to.equal(parseEther('0'));
    });
  });
  describe('receive', () => {
    it('receive should revert', async () => {
      const aethAddress = await aeth.getAddress();
      const balanceBefore = await ethers.provider.getBalance(lender1.address);
      expect(balanceBefore).to.equal(parseEther('10000'));
      // await lender1.sendTransaction({to: aethAddress, value: ethers.parseEther('1')});
      await expect(lender1.sendTransaction({
        to: aethAddress,
        value: ethers.parseEther('1')
      })).to.be.revertedWith('Receive not allowed');
      const balanceAfter = await ethers.provider.getBalance(lender1.address);
      expect(balanceAfter).to.be.greaterThan(parseEther('9999'));
      log(await ethers.provider.getBlockNumber());
    });
  });
  describe('fallback', () => {
    it('fallback should revert', async () => {
      const aethAddress = await aeth.getAddress();
      const balanceBefore = await ethers.provider.getBalance(lender1.address);
      expect(balanceBefore).to.equal(parseEther('10000'));
      await expect(lender1.sendTransaction({
          to: aethAddress,
          value: ethers.parseEther('1'),
          data: '0x12345678'
        }
      )).to.be.revertedWith('Fallback not allowed');
      const balanceAfter = await ethers.provider.getBalance(lender1.address);
      expect(balanceAfter).to.be.greaterThan(parseEther('9999'));
    });
  });
  describe('deposit', () => {
    it('should mint nothing if 0 value', async () => {
      const lenderBalanceBefore = await ethers.provider.getBalance(lender1.address);
      expect(lenderBalanceBefore).to.equal(parseEther('10000'));
      const tx = await aeth.connect(lender1).deposit(lender1.address, {value: 0});
      const receipt = await tx.wait();
      const aethSupply = await aeth.totalSupply();
      expect(aethSupply).to.equal(0);
      const lenderBalanceAfter = await ethers.provider.getBalance(lender1.address);
      if (!receipt) {
        throw new Error('no receipt');
      }
      expect(lenderBalanceAfter).to.equal(lenderBalanceBefore - tx.gasPrice * receipt.gasUsed);
    });
    it('should reject if address has insufficient value from call', async () => {
      const lenderBalanceBefore = await ethers.provider.getBalance(lender1.address);
      expect(lenderBalanceBefore).to.equal(parseEther('10000'));
      await expect(aeth.connect(lender1).deposit(lender1.address, {value: parseEther('10001')})).to.be.rejected;
      const aethSupply = await aeth.totalSupply();
      expect(aethSupply).to.equal(0);
      const lenderBalanceAfter = await ethers.provider.getBalance(lender1.address);
      expect(lenderBalanceAfter).to.equal(parseEther('10000'));
    });
    it('should mint tokens equivalent to the value - sender receives', async () => {
      const lenderBalanceBefore = await ethers.provider.getBalance(lender1.address);
      expect(lenderBalanceBefore).to.equal(parseEther('10000'));
      const tx = await aeth.connect(lender1).deposit(lender1.address, {value: parseEther('121.3256')});
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('no receipt');
      }
      const aethSupply = await aeth.totalSupply();
      const lenderAeth = await aeth.balanceOf(lender1.address);
      expect(aethSupply).to.equal(parseEther('121.3256'));
      expect(lenderAeth).to.equal(parseEther('121.3256'));
      const lenderBalanceAfter = await ethers.provider.getBalance(lender1.address);
      expect(lenderBalanceAfter).to.equal(parseEther('10000') - parseEther('121.3256') - receipt.gasUsed * tx.gasPrice);
    });
    it('should mint tokens equivalent to the value - other address receives', async () => {
      const lenderBalanceBefore = await ethers.provider.getBalance(lender1.address);
      const receiverBalanceBefore = await ethers.provider.getBalance(lender2.address);
      expect(lenderBalanceBefore).to.equal(parseEther('10000'));
      expect(receiverBalanceBefore).to.equal(parseEther('10000'));
      const tx = await aeth.connect(lender1).deposit(lender2.address, {value: parseEther('823.123456789012345678')});
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('no receipt');
      }
      const aethSupply = await aeth.totalSupply();
      const receiverAeth = await aeth.balanceOf(lender2.address);
      expect(aethSupply).to.equal(parseEther('823.123456789012345678'));
      expect(receiverAeth).to.equal(parseEther('823.123456789012345678'));
      const lenderBalanceAfter = await ethers.provider.getBalance(lender1.address);
      const receiverBalanceAfter = await ethers.provider.getBalance(lender2.address);
      expect(lenderBalanceAfter).to.equal(parseEther('10000') - parseEther('823.123456789012345678') - receipt.gasUsed * tx.gasPrice);
      expect(receiverBalanceAfter).to.equal(parseEther('10000'));
    });
    it('should handle multiple deposits', async () => {
      await aeth.connect(lender1).deposit(lender1.address, {value: parseEther('100.2')});
      await aeth.connect(lender2).deposit(lender2.address, {value: parseEther('200.3')});
      const lender1aeth = await aeth.balanceOf(lender1.address);
      const lender2aeth = await aeth.balanceOf(lender2.address);
      const aethSupply = await aeth.totalSupply();
      expect(lender1aeth).to.equal(parseEther('100.2'));
      expect(lender2aeth).to.equal(parseEther('200.3'));
      expect(aethSupply).to.equal(parseEther('300.5'));
    });
  });
  describe('withdraw', () => {
    beforeEach(async () => {
      await withdrawFixture();
      log(`running AETH-withdraw beforeEach - ${await ethers.provider.getBlockNumber()}`);
    })
    after(async () => {
      log(`running AETH-withdraw after - ${await ethers.provider.getBlockNumber()}`);
    })
    it('should revert if not the owner of contract', async () => {
      const ethBalanceBefore = await ethers.provider.getBalance(lender1.address);
      await expect(aeth.connect(lender1).withdraw(lender1.address, parseEther('1.1'), lender1.address)).to.be.revertedWith('Ownable: caller is not the owner');
      const lender1AethBalanceAfter = await aeth.balanceOf(lender1.address);
      const totalSupply = await aeth.totalSupply();
      const ethBalanceAfter = await ethers.provider.getBalance(lender1.address);
      expect(totalSupply).to.equal(parseEther('1.6'));
      expect(lender1AethBalanceAfter).to.equal(parseEther('1.1'));
    });
    // it('should revert if sender does not have sufficient tokens - none', async () => {
    //     await expect(aeth.connect(lender3).withdraw(parseEther('1.2'), lender1.address)).to.be.revertedWith("ERC20: burn amount exceeds balance");
    //     const lender3AethBalanceAfter = await aeth.balanceOf(lender3.address);
    //     expect(lender3AethBalanceAfter).to.equal(parseEther('0'));
    //     const totalSupply = await aeth.totalSupply();
    //     expect(totalSupply).to.equal(parseEther('1.6'));
    // });
    // it('should revert if sender does not have sufficient tokens - some', async () => {
    //     await expect(aeth.connect(lender1).withdraw(parseEther('1.2'), lender1.address)).to.be.revertedWith("ERC20: burn amount exceeds balance");
    //     const lender1AethBalanceAfter = await aeth.balanceOf(lender1.address);
    //     expect(lender1AethBalanceAfter).to.equal(parseEther('1.1'));
    //     const totalSupply = await aeth.totalSupply();
    //     expect(totalSupply).to.equal(parseEther('1.6'));
    // });
    // it('should work - onBehalfOf sender - full amount', async () => {
    //     const ethBalanceBefore = await ethers.provider.getBalance(lender1.address);
    //     const tx = await aeth.connect(lender1).withdraw(parseEther('1.1'), lender1.address);
    //     const receipt = await tx.wait();
    //     if (!receipt) {
    //         throw new Error('no receipt');
    //     }
    //     const txFee = tx.gasPrice * receipt.gasUsed;
    //     const lender1AethBalanceAfter = await aeth.balanceOf(lender1.address);
    //     const totalSupply = await aeth.totalSupply();
    //     const ethBalanceAfter = await ethers.provider.getBalance(lender1.address);
    //     expect(totalSupply).to.equal(parseEther('0.5'));
    //     expect(lender1AethBalanceAfter).to.equal(parseEther('0'));
    //     expect(ethBalanceAfter).to.equal(ethBalanceBefore + parseEther('1.1') - txFee);
    // });
    // it('should work - onBehalfOf different', async () => {
    //     const ethBalanceBefore = await ethers.provider.getBalance(borrower1.address);
    //     await aeth.connect(lender1).withdraw(parseEther('1.1'), borrower1.address);
    //     const lender1AethBalanceAfter = await aeth.balanceOf(lender1.address);
    //     const totalSupply = await aeth.totalSupply();
    //     const ethBalanceAfter = await ethers.provider.getBalance(borrower1.address);
    //     expect(totalSupply).to.equal(parseEther('0.5'));
    //     expect(lender1AethBalanceAfter).to.equal(parseEther('0'));
    //     expect(ethBalanceAfter).to.equal(ethBalanceBefore + parseEther('1.1'));
    // });
    // it('should work - original depositor different (transfer)', async () => {
    //     await aeth.connect(lender1).transfer(lender3.address, parseEther('0.3'));
    //     const lender3AethBefore = await aeth.balanceOf(lender3.address);
    //     const lender3EthBalanceBefore = await ethers.provider.getBalance(lender3.address);
    //     expect(lender3AethBefore).to.equal(parseEther('0.3'));
    //     const tx = await aeth.connect(lender3).withdraw(parseEther('0.2'), lender3.address);
    //     const receipt = await tx.wait();
    //     if (!receipt) {
    //         throw new Error('no receipt');
    //     }
    //     const txFee = tx.gasPrice * receipt.gasUsed;
    //     const lender1AethBalanceAfter = await aeth.balanceOf(lender1.address);
    //     const lender3AethBalanceAfter = await aeth.balanceOf(lender3.address);
    //     const totalSupply = await aeth.totalSupply();
    //     const lender3EthBalanceAfter = await ethers.provider.getBalance(lender3.address);
    //     expect(totalSupply).to.equal(parseEther('1.4'));
    //     expect(lender1AethBalanceAfter).to.equal(parseEther('0.8'));
    //     expect(lender3AethBalanceAfter).to.equal(parseEther('0.1'));
    //     expect(lender3EthBalanceAfter).to.equal(lender3EthBalanceBefore + parseEther('0.2') - txFee);
    // });
    // it('should work with multiple deposits and withdraws', async () => {
    //     // lender1: 1.1
    //     // lender2: 0.5
    //     // ---
    //     // lender3 deposits 1.3
    //     // lender1 withdraws 0.5
    //     // lender2 withdraws 0.2
    //     // lender3 withdraws 0.9
    //     // ---
    //     // lender1 0.6
    //     // lender2 0.3
    //     // lender3 0.4
    //     // total 1.3
    //     await aeth.connect(lender3).deposit(lender3.address, {value: parseEther('1.3')});
    //     await aeth.connect(lender1).withdraw(parseEther('0.5'), lender1.address);
    //     await aeth.connect(lender2).withdraw(parseEther('0.2'), lender2.address);
    //     await aeth.connect(lender3).withdraw(parseEther('0.9'), lender3.address);
    //     const lender1Aeth = await aeth.balanceOf(lender1.address);
    //     const lender2Aeth = await aeth.balanceOf(lender2.address);
    //     const lender3Aeth = await aeth.balanceOf(lender3.address);
    //     const totalSupply = await aeth.totalSupply();
    //     expect(lender1Aeth).to.equal(parseEther('0.6'));
    //     expect(lender2Aeth).to.equal(parseEther('0.3'));
    //     expect(lender3Aeth).to.equal(parseEther('0.4'));
    //     expect(totalSupply).to.equal(parseEther('1.3'));
    // });
  });
  // Calling emergencyEtherTransfer requires calling it from mockAaveV3 - this is a bit much... therefore skipping for now
  describe('emergencyEtherTransfer', () => {
    beforeEach(async () => {
      await AETHEmergencyEtherTransferFixture();
      log(`running AETH-emergencyEtherTransfer beforeEach - ${await ethers.provider.getBlockNumber()}`);
    })
    after(async () => {
      log(`running AETH-emergencyEtherTransfer after - ${await ethers.provider.getBlockNumber()}`);
    })
    it('should revert if sender is not owner', async () => {
      await expect(aeth.connect(lender1).emergencyEtherTransfer(lender1.address, parseEther('1.1'))).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('should send correct amount of ETH if owner', async () => {
      const borrowerEthBefore = await ethers.provider.getBalance(borrower1.address);
      const aethAddress = await aeth.getAddress();
      const aethEthBalanceBefore = await ethers.provider.getBalance(aethAddress);
      const totalSupplyBefore = await aeth.totalSupply();
      expect(borrowerEthBefore).to.equal(parseEther('10000'));
      expect(aethEthBalanceBefore).to.equal(parseEther('1.6'));
      expect(totalSupplyBefore).to.equal(parseEther('1.6'));
      await aeth.connect(deployer).emergencyEtherTransfer(borrower1.address, parseEther('1.1'));
      const aethEthBalanceAfter = await ethers.provider.getBalance(aethAddress);
      const totalSupplyAfter = await aeth.totalSupply();
      const borrowerEthAfter = await ethers.provider.getBalance(borrower1.address);
      expect(borrowerEthAfter).to.equal(parseEther('10001.1'));
      expect(aethEthBalanceAfter).to.equal(parseEther('0.5'));
      expect(totalSupplyAfter).to.equal(parseEther('1.6'));  // aETH balance stays the same and gets out of sync (hence emergency)
    });
    it('should send all ETH if owner', async () => {
      const borrowerEthBefore = await ethers.provider.getBalance(borrower1.address);
      const aethAddress = await aeth.getAddress();
      const aethEthBalanceBefore = await ethers.provider.getBalance(aethAddress);
      const totalSupplyBefore = await aeth.totalSupply();
      expect(borrowerEthBefore).to.equal(parseEther('10000'));
      expect(aethEthBalanceBefore).to.equal(parseEther('1.6'));
      expect(totalSupplyBefore).to.equal(parseEther('1.6'));
      await aeth.connect(deployer).emergencyEtherTransfer(borrower1.address, parseEther('1.6'));
      const aethEthBalanceAfter = await ethers.provider.getBalance(aethAddress);
      const totalSupplyAfter = await aeth.totalSupply();
      const borrowerEthAfter = await ethers.provider.getBalance(borrower1.address);
      expect(borrowerEthAfter).to.equal(parseEther('10001.6'));
      expect(aethEthBalanceAfter).to.equal(parseEther('0'));
      expect(totalSupplyAfter).to.equal(parseEther('1.6'));  // aETH balance stays the same and gets out of sync (hence emergency)
    });
  });
});
