import { ethers, deployments, network, getNamedAccounts } from 'hardhat';
import chai from 'chai';
import {
    LendingPlatform,
    PoolShareToken__factory,
    USDCoin,
    AETH,
    BorrowPositionToken,
    MockAaveV3,
    PoolShareToken,
    MockChainlinkAggregator
} from '../typechain-types';
import {formatEther, formatUnits, parseEther, parseUnits} from 'ethers';
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";
import {ContractTransactionResponse} from "ethers";
import assert from "node:assert/strict";
import {toEthDate} from "@shrub-lend/common";

const { expect } = chai;

const timestamps = {
    // jan0126: 1767225600,
    // feb0126: 1769904000,
    // mar0126: 1772323200,
    jan01_26: toEthDate(new Date('2026-01-01')),
    feb01_26: toEthDate(new Date('2026-02-01')),
    mar01_26: toEthDate(new Date('2026-03-01')),
    june01_26: toEthDate(new Date('2026-06-01')),
    july02_26: toEthDate(new Date('2026-07-02')),
    aug02_26: toEthDate(new Date('2026-08-02')),
};

const currentLogLevel = process.env.LOG_LEVEL || 'none';

const snapshots:{[name: string]: {pointer: string, hash: string}} = {};

async function addSnapshot(name: string) {
    const pointer = String(await network.provider.request({
        method: 'evm_snapshot',
    }));
    if (!pointer) {
        console.log(pointer);
        throw new Error(`Invalid pointer for snapshot`);
    }
    if (snapshots[name]) {
        throw new Error(`snapshot named ${name} already exists`);
    }
    const hash = await getCurrentBlockHash();
    snapshots[name] = {pointer, hash};
    await setCurrentSnapshot(name);
}

async function loadSnapshot(name: string) {
    if (!snapshots[name]) {
        throw new Error(`snapshot ${name} does not exist`)
    }
    const currentBlockHash = await getCurrentBlockHash();
    if (currentBlockHash === snapshots[name].hash) {
        log(`currentBlockHash match... skipping loadSnapshot`);
        return;
    }
    const snapshotId = snapshots[name].pointer;
    log(`reverting to snapshot ${name} - snapshotId: ${snapshotId}`);
    await network.provider.request({
        method: 'evm_revert',
        params: [snapshotId]
    })
    const blockNumber = await ethers.provider.getBlockNumber();
    const blockHash = await getCurrentBlockHash();
    log(`block now at ${blockNumber} - ${blockHash}`);

    // Update the pointer to the snapshot
    const newPointer = await network.provider.request({
        method: 'evm_snapshot',
    });

    snapshots[name].pointer = String(newPointer);
}

let currentSnapshot: string;

async function setCurrentSnapshot(newSnapshot: string) {
    if (!snapshots[newSnapshot]) {
        throw new Error(`invalid snapshot name - ${newSnapshot}`)
    }
    currentSnapshot = newSnapshot;
    // Maybe load also here
    await loadSnapshot(newSnapshot);
}

function log(msg: any, level = 'verbose') {
    if (currentLogLevel === 'verbose') {
        console.log(msg);
    }
}

async function getCurrentBlockHash() {
    const currentBlock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber())
    if (!currentBlock || !currentBlock.hash) {
        throw new Error('current block not found');
    }
    return currentBlock.hash;
}


describe('testSuite', () => {
    let aeth: AETH;
    let borrowPositionToken: BorrowPositionToken;
    let lendingPlatform: LendingPlatform;
    let mockAaveV3: MockAaveV3;
    let mockChainlinkAggregator: MockChainlinkAggregator;
    let poolShareToken: PoolShareToken;
    let usdc: USDCoin;
    let deployer: HardhatEthersSigner;
    let lender1: HardhatEthersSigner;
    let lender2: HardhatEthersSigner;
    let lender3: HardhatEthersSigner;
    let borrower1: HardhatEthersSigner;
    let borrower2: HardhatEthersSigner;
    let borrower3: HardhatEthersSigner;

    before(async () => {
        log("running global before");
        // get the named accounts;
        const {
            deployer:deployerStr,
            account1,
            account2,
            account3,
            account4,
            account5,
            account6
        } = await getNamedAccounts()

        deployer = await ethers.getSigner(deployerStr);
        lender1 = await ethers.getSigner(account1);
        lender2 = await ethers.getSigner(account2);
        lender3 = await ethers.getSigner(account3);
        borrower1 = await ethers.getSigner(account4);
        borrower2 = await ethers.getSigner(account5);
        borrower3 = await ethers.getSigner(account6);

        await addSnapshot('new');
        await deployments.fixture();

        const aETHDeployment = await deployments.get('AETH');
        const borrowPositionTokenDeployment = await deployments.get('BorrowPositionToken');
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const mockAaveV3Deployment = await deployments.get('MockAaveV3');
        const usdCoinDeployment = await deployments.get('USDCoin');
        const mockChainlinkAggregatorDeployment = await deployments.get('MockChainlinkAggregator');

        aeth = await ethers.getContractAt("AETH", aETHDeployment.address);
        borrowPositionToken = await ethers.getContractAt("BorrowPositionToken", borrowPositionTokenDeployment.address);
        lendingPlatform = await ethers.getContractAt("LendingPlatform", lendingPlatformDeployment.address);
        mockAaveV3 = await ethers.getContractAt("MockAaveV3", mockAaveV3Deployment.address);
        usdc = await ethers.getContractAt("USDCoin", usdCoinDeployment.address);
        mockChainlinkAggregator = await ethers.getContractAt("MockChainlinkAggregator", mockChainlinkAggregatorDeployment.address);

        await usdc.waitForDeployment();
        await aeth.waitForDeployment();
        await borrowPositionToken.waitForDeployment();
        await mockAaveV3.waitForDeployment();
        await mockChainlinkAggregator.waitForDeployment();
        await lendingPlatform.waitForDeployment();

        await addSnapshot('contractDeployment');
    })

    beforeEach(async () => {
        log(`running global beforeEach - ${currentSnapshot}`);
        log(`loading currentSnapshot - ${currentSnapshot}`);
        await loadSnapshot(currentSnapshot);
    });

    afterEach(async () => {
        log(`running global afterEach - ${currentSnapshot}`);
        await loadSnapshot(currentSnapshot);
    })

    after(() => {
        log(`running global after`);
    })

    it('should run hooks properly', () => {
        return true;
    })

    describe('AETH', () => {
        describe('ERC-20 naming and decimal', () => {
            it('should have name implemented', async() => {
                const name = await aeth.name();
                expect(name).to.equal('Mock Aave Ethereum WETH');
            })
            it('should have symbol implemented', async() => {
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
            before(async () => {
                log("running withdraw before");
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

                await addSnapshot('withdraw');
            })
            after(async () => {
                log('running withdraw after');
                await setCurrentSnapshot('contractDeployment');
            })
            it('should revert if not the owner of contract', async() => {
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
        describe.skip('emergencyEtherTransfer', () => {
            before(async () => {
                log("running emergencyEtherTransfer before");
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

                await addSnapshot('AETH-emergencyEtherTransfer');
            })
            after(async () => {
                log('running emergencyEtherTransfer after');
                await setCurrentSnapshot('contractDeployment');
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
    describe('BorrowPositionToken', () => {});
    describe('Lend', () => {
        // TODO: skipping internal functions (i.e. insertIntoSortedArr, indexActivePools) - may need to do something later
        describe('bytesToString', () => {
            // This is used only for internal purposes (debugging) so testing is not required
        });
        describe('getEthPrice', () => {

        });
        describe('maxLoan', () => {
            it('should reject invalid ltv', async () => {
                    await expect(lendingPlatform.maxLoan(5, parseEther('1'))).to.be.revertedWith("Invalid LTV");
                })

            it('should calculate the correct value for 50% LTV loan', async () => {
                const maxLoan = await lendingPlatform.maxLoan(50, parseEther('1'));
                expect(maxLoan).to.equal(parseUnits('926.05515', 6));
            })
        });
        describe('requiredCollateral', () => {});
        describe('getLatestAethPrice', () => {});
        describe('getAethInterest', () => {});
        describe('getDeficitForPeriod', () => {});
        describe('getAvailableForPeriod', () => {});
        describe('getTotalLiquidity', () => {
            before(async () => {
                log("running getTotalLiquidity before");

                // Blockchain transactions here
                await usdc.transfer(lender1.getAddress(), parseUnits('6500', 6));
                await usdc.connect(lender1).approve(lendingPlatform.getAddress(), parseUnits('6500', 6));

                await lendingPlatform.createPool(timestamps.jan01_26);
                await lendingPlatform.createPool(timestamps.feb01_26);
                await lendingPlatform.createPool(timestamps.mar01_26);

                await lendingPlatform.connect(lender1).deposit(timestamps.jan01_26, parseUnits('1000', 6));
                await lendingPlatform.connect(lender1).deposit(timestamps.feb01_26, parseUnits('1500', 6));
                await lendingPlatform.connect(lender1).deposit(timestamps.mar01_26, parseUnits('4000', 6));

                // Tests for new state here
                const janPool = await lendingPlatform.getPool(timestamps.jan01_26);
                const febPool = await lendingPlatform.getPool(timestamps.feb01_26);
                const marPool = await lendingPlatform.getPool(timestamps.mar01_26);
                const lender1UsdcBalance = await usdc.balanceOf(lender1.address);
                const platformUsdcBalance = await usdc.balanceOf(lendingPlatform.getAddress());

                expect(janPool.totalLiquidity).to.equal(parseUnits('1000', 6));
                expect(febPool.totalLiquidity).to.equal(parseUnits('1500', 6));
                expect(marPool.totalLiquidity).to.equal(parseUnits('4000', 6));
                expect(lender1UsdcBalance).to.equal(parseUnits('0', 6));
                expect(platformUsdcBalance).to.equal(parseUnits('6500', 6));

                await addSnapshot('Lend-getTotalLiquidity');
                // localSnapshotId = await network.provider.request({
                //     method: 'evm_snapshot',
                // });
                // snapshotId = localSnapshotId;
            })
            after(async () => {
                log('running getTotalLiquidity after');
                await setCurrentSnapshot('contractDeployment');
                // log(`changing snapshotId (${snapshotId}) to globalSnapshotId (${globalSnapshotId})`);
                // snapshotId = globalSnapshotId;
                // await loadGlobalSnapshot();
            })

            it('should return the correct total available liquidity before 2026-01-01', async () => {
                const totalLiquidity = await lendingPlatform.getTotalLiquidity(timestamps.jan01_26 - 1);
                await expect(lendingPlatform.getAvailableForPeriod(timestamps.jan01_26 - 1)).to.be.revertedWith("Invalid timestamp");
                expect(totalLiquidity).to.equal(parseUnits('6500', 6));
            });

            it('should return the correct total available liquidity on 2026-01-01', async () => {
                const totalLiquidity = await lendingPlatform.getTotalLiquidity(timestamps.jan01_26);
                const avail = await lendingPlatform.getAvailableForPeriod(timestamps.jan01_26);
                expect(totalLiquidity).to.equal(parseUnits('6500', 6));
                expect(avail).to.equal(parseUnits('6500', 6));
            });

            it('should return the correct total available liquidity on 2026-02-01', async () => {
                const totalLiquidity = await lendingPlatform.getTotalLiquidity(timestamps.feb01_26);
                const avail = await lendingPlatform.getAvailableForPeriod(timestamps.feb01_26);
                expect(totalLiquidity).to.equal(parseUnits('5500', 6));
                expect(avail).to.equal(parseUnits('5500', 6));
            });

            it('should return the correct total available liquidity on 2026-03-01', async () => {
                const totalLiquidity = await lendingPlatform.getTotalLiquidity(timestamps.mar01_26);
                const avail = await lendingPlatform.getAvailableForPeriod(timestamps.mar01_26);
                expect(totalLiquidity).to.equal(parseUnits('4000', 6));
                expect(avail).to.equal(parseUnits('4000', 6));
            });

            it('should return the correct total available liquidity after 2026-03-01', async () => {
                const totalLiquidity = await lendingPlatform.getTotalLiquidity(timestamps.mar01_26 + 1);
                await expect(lendingPlatform.getAvailableForPeriod(timestamps.mar01_26 + 1)).to.be.revertedWith("Invalid timestamp");
                expect(totalLiquidity).to.equal(parseUnits('0', 6));
            });
        });
        describe('getPool', () => {
            // 2026-01-01 1767225600
            // 2026-02-01 1769904000
            // const poolTimestamps = [1767225600, 1769904000];
            // const depositAmounts = [1000 * 10 ** 6, 1500 * 10 ** 6];
            // let lender1LendingPlatform: LendingPlatform;
            // let usdcLender1: USDCoin;
            let createPoolTxs: (ContractTransactionResponse)[];
            before(async () => {
                log("running getPool before");

                // Blockchain transactions here
                // Deposit amounts
                await usdc.transfer(lender1.address, parseUnits('2500', 6));
                await usdc.connect(lender1).approve(lendingPlatform.getAddress(), parseUnits('2500', 6));

                const janPoolTx = await lendingPlatform.createPool(timestamps.jan01_26);
                const febPoolTx = await lendingPlatform.createPool(timestamps.feb01_26);
                createPoolTxs = [janPoolTx, febPoolTx]
                await lendingPlatform.connect(lender1).deposit(timestamps.jan01_26, parseUnits('1000', 6));
                await lendingPlatform.connect(lender1).deposit(timestamps.feb01_26, parseUnits('1500', 6));

                // Tests for new state here
                // lender1 should have 0 USDC
                // lender1 should have 0 allowance remaining for USDC in lendingPlatform
                const lender1UsdcBalance = await usdc.balanceOf(lender1);
                const platformUsdcBalance = await usdc.balanceOf(lendingPlatform.getAddress());
                const lender1UsdcAllowance = await usdc.allowance(lender1.address, lendingPlatform.getAddress());

                expect(lender1UsdcBalance).to.equal(parseUnits('0', 6));
                expect(platformUsdcBalance).to.equal(parseUnits('2500', 6));
                expect(lender1UsdcBalance).to.equal(parseUnits('0', 6));

                await addSnapshot('Lend-getPool');
            })
            after(async () => {
                log('running getPool after');
                await setCurrentSnapshot('contractDeployment')
            })


            // beforeEach(async () => {
            //     lender1LendingPlatform = lendingPlatform.connect(lender1);
            //     usdcLender1 = usdc.connect(lender1);
            //     createPoolTxs = [];
            //
            //     // Deposit amounts
            //     await usdc.transfer(lender1.getAddress(), 2500 * 10 ** 6);
            //     await usdcLender1.approve(lendingPlatform.getAddress(), 2500 * 10 ** 6)
            //
            //     for (let i = 0; i < 2; i++) {
            //         const tx = await lendingPlatform.createPool(poolTimestamps[i]);
            //         createPoolTxs.push(tx);
            //         // const txReceipt = await tx.wait();
            //
            //         // const createPoolEvent = txReceipt.events?.find(event => event.event === "poolCreated");
            //         // createPoolEvents.push(createPoolEvent);
            //
            //         await lender1LendingPlatform.deposit(poolTimestamps[i], depositAmounts[i]);
            //     }
            // });

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
        describe('getAPYBasedOnTLV', () => {
            it('should return the correct APY for a given LTV', async () => {
                expect(await lendingPlatform.getAPYBasedOnLTV(20)).to.equal(parseUnits('0',6));
                expect(await lendingPlatform.getAPYBasedOnLTV(25)).to.equal(parseUnits('1',6));
                expect(await lendingPlatform.getAPYBasedOnLTV(33)).to.equal(parseUnits('5',6));
                expect(await lendingPlatform.getAPYBasedOnLTV(50)).to.equal(parseUnits('8',6));
            });

            it('should revert for invalid LTV', async () => {
                await expect(lendingPlatform.getAPYBasedOnLTV(15)).to.be.revertedWith('Invalid LTV');
                await expect(lendingPlatform.getAPYBasedOnLTV(60)).to.be.revertedWith('Invalid LTV');
            });
        });
        describe('validPool', () => {});
        describe('getLoan', () => {});
        describe('createPool', () => {
            it('should create a new pool with 0 totalLiquidity and 0 aaveInterestSnapshot', async () => {
                const timestamp = timestamps.june01_26; // 1st June, 2026
                await lendingPlatform.createPool(timestamp);

                const pool = await lendingPlatform.pools(timestamp);
                expect(pool.totalLiquidity).to.equal(0);
                expect(pool.aaveInterestSnapshot).to.equal(0);
            });

            it('should revert if a non-owner tries to create a pool', async () => {
                const timestamp = timestamps.july02_26; // 2nd July, 2026
                await expect(lendingPlatform.connect(lender1).createPool(timestamp)).to.be.revertedWith('Ownable: caller is not the owner');
            });

            it('should create a new token for the pool', async () => {
                const timestamp = timestamps.aug02_26; // 2nd August, 2026
                await lendingPlatform.createPool(timestamp);

                const pool = await lendingPlatform.pools(timestamp);
                expect(pool.poolShareToken).to.not.equal(ethers.ZeroAddress);
            });

            it('should revert if a pool with the same timestamp already exists', async () => {
                const timestamp = timestamps.aug02_26; // 2nd August, 2026
                await lendingPlatform.createPool(timestamp);

                await expect(lendingPlatform.createPool(timestamp)).to.be.revertedWith('Pool already exists');
            });

            it('should create a PoolShareToken with the correct name and symbol', async () => {
                const timestamp = timestamps.aug02_26; // 2nd August, 2026
                await lendingPlatform.createPool(timestamp);

                const pool = await lendingPlatform.pools(timestamp);
                const poolShareToken = await ethers.getContractAt('PoolShareToken', pool.poolShareToken);

                const name = await poolShareToken.name();
                const symbol = await poolShareToken.symbol();

                expect(name).to.equal(`PoolShareToken_${timestamp}`);
                expect(symbol).to.equal(`PST_${timestamp}`);
            });

            it('should emit the correct event when initializing the pool', async () => {
                const timestamp = timestamps.aug02_26; // 2nd August, 2026
                const createPoolTx = await lendingPlatform.createPool(timestamp);
                const createPoolReciept = await createPoolTx.wait();

                const pool = await lendingPlatform.pools(timestamp);

                expect(createPoolTx).to.emit(lendingPlatform, "poolCreated")
                    .withArgs(timestamp, pool.poolShareToken);
            });

        });
        describe('getUsdcAddress', () => {});
        describe('deposit', () => {
            const timestamp = timestamps.aug02_26; // 2nd August, 2026
            before(async () => {
                log("running deposit before");
                // await loadGlobalSnapshot();
                await usdc.transfer(lender1.getAddress(), 1000 * 10 ** 6);
                await usdc.transfer(lender2.getAddress(), 2000 * 10 ** 6);
                await lendingPlatform.createPool(timestamp);

                const lender1Balance = await usdc.balanceOf(lender1.getAddress());
                const lender2Balance = await usdc.balanceOf(lender2.getAddress());
                expect(lender1Balance).to.equal(1000 * 10 ** 6);
                expect(lender2Balance).to.equal(2000 * 10 ** 6);

                await addSnapshot('Lend-deposit');
            })
            after(async () => {
                log('running deposit after');
                await setCurrentSnapshot('contractDeployment');
            })

            it('should revert when deposit amount is 0', async () => {
                await expect(lendingPlatform.connect(lender1).deposit(1, 0)).to.be.revertedWith("Deposit amount must be greater than 0");
            });

            it('should revert if no allowance', async () => {
                // Assuming you have setup mock USDC contract and the user doesn't have any USDC tokens
                await expect(lendingPlatform.connect(lender1).deposit(timestamp, 1000)).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
            });

            it('should revert if insufficient allowance', async () => {
                await usdc.connect(lender1).approve(lendingPlatform.getAddress(), 900 * 10 ** 6)
                await expect(lendingPlatform.connect(lender1).deposit(timestamp, 1000 * 10 ** 6)).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
            });

            it('should revert when user does not have enough USDC tokens', async () => {
                await usdc.connect(lender1).approve(lendingPlatform.getAddress(), 1100 * 10 ** 6)
                await expect(lendingPlatform.connect(lender1).deposit(timestamp, 1001 * 10 ** 6)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });

            // it('should revert when USDC token transfer fails', async () => {
            //     // Assuming you have setup mock USDC contract and the USDC transfer function is designed to fail
            //     await expect(lendingPlatform.deposit(1, 1000)).to.be.reverted;
            // });

            it('should revert if the pool is not yet created', async () => {
                const badTimestamp = 12345;
                await usdc.connect(lender1).approve(lendingPlatform.getAddress(), 1100 * 10 ** 6)
                await expect(lendingPlatform.connect(lender1).deposit(badTimestamp, 1000 * 10 ** 6)).to.be.revertedWith("Pool does not exist");
            })

            it('should all deposit into active pool', async () => {
                const poolBefore = await lendingPlatform.getPool(timestamp);
                const usdcLender1Before = await usdc.balanceOf(lender1.getAddress());
                const usdcPoolBefore = await usdc.balanceOf(lendingPlatform.getAddress());
                await usdc.connect(lender1).approve(lendingPlatform.getAddress(), 1100 * 10 ** 6)
                await lendingPlatform.connect(lender1).deposit(timestamp, 800 * 10 ** 6);
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
        describe('withdraw', () => {});
        describe('takeLoan', () => {

            before(async () => {
                log("running takeLoan before");
                log(`before tx block: ${await ethers.provider.getBlockNumber()}`);

                // Blockchain transactions here
                
                // Send 10000 USDC to both lender1 and lender2
                // Approve 10000 USDC to the lendingPlatform for both lender1 and lender2
                // Initialize 3 pools:
                // 1-Jan-2026 1767225600
                // 1-Feb-2026 1769904000
                // 1-Mar-2026 1772323200
                await usdc.transfer(lender1.getAddress(), parseUnits('10000', 6));
                await usdc.transfer(lender2.getAddress(), parseUnits('10000', 6));

                await usdc.connect(lender1).approve(lendingPlatform.getAddress(), parseUnits('10000', 6));
                await usdc.connect(lender2).approve(lendingPlatform.getAddress(), parseUnits('10000', 6));

                await lendingPlatform.createPool(timestamps.jan01_26);
                await lendingPlatform.createPool(timestamps.feb01_26);
                await lendingPlatform.createPool(timestamps.mar01_26);

                // Tests for new state here
                const lender1UsdcBalance = await usdc.balanceOf(lender1.address);
                const lender2UsdcBalance = await usdc.balanceOf(lender2.address);
                const lendingPool1 = await lendingPlatform.getPool(timestamps.jan01_26);
                const lendingPool2 = await lendingPlatform.getPool(timestamps.feb01_26);
                const lendingPool3 = await lendingPlatform.getPool(timestamps.mar01_26);
                
                expect(lender1UsdcBalance).to.equal(parseUnits('10000', 6));
                expect(lender2UsdcBalance).to.equal(parseUnits('10000', 6));
                expect(lendingPool1.poolShareTokenAddress).to.not.equal(ethers.ZeroAddress);
                expect(lendingPool2.poolShareTokenAddress).to.not.equal(ethers.ZeroAddress);
                expect(lendingPool3.poolShareTokenAddress).to.not.equal(ethers.ZeroAddress);

                log(`after tx block: ${await ethers.provider.getBlockNumber()}`);

                await addSnapshot('Lend-takeLoan');
            })
            
            after(async () => {
                log('running takeLoan after');
                await setCurrentSnapshot('contractDeployment')
            })

            describe('general checks', () => {
                it('should reject if the collateral sent is lower than the amount specified', async() => {
                    const amount = parseUnits('1000', 6);
                    const collateral = parseEther('1');
                    const ltv = 0;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: parseEther('0.1')})).to.be.revertedWith("Wrong amount of Ether provided.");
                });
                it('should reject if the collateral sent is higher than the amount specified', async() => {
                    const amount = parseUnits('1000', 6);
                    const collateral = parseEther('1');
                    const ltv = 0;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: parseEther('2')})).to.be.revertedWith("Wrong amount of Ether provided.");
                });
                it('should reject if an invalid pool is specified', async() => {
                    const amount = parseUnits('1000', 6);
                    const collateral = parseEther('1');
                    const ltv = 0;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26 + 1, {value: parseEther('1')})).to.be.revertedWith("Not a valid pool");
                });
                it('should reject if specified ltv is less than the calculated ltv', async() => {
                    const amount = parseUnits('1000', 6);
                    const collateral = parseEther('1');
                    const ltv = 25;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: parseEther('1')})).to.be.revertedWith("Insufficient collateral provided for specified ltv");
                });
            });

            describe('loan from single pool with a single lender', () => {
                before(async () => {
                    log("running loan from single pool with a single lender before");
                    log(`before tx block: ${await ethers.provider.getBlockNumber()}`);

                    // Blockchain transactions here
                    await lendingPlatform.connect(lender1).deposit(timestamps.jan01_26, parseUnits('1000', 6));

                    // Tests for new state here
                    const totalLiquidityForPool = await lendingPlatform.getTotalLiquidity(timestamps.jan01_26);
                    expect(totalLiquidityForPool).to.equal(parseUnits('1000', 6));

                    log(`after tx block: ${await ethers.provider.getBlockNumber()}`);

                    await addSnapshot('Lend-takeLoan-lfspwasl');
                })

                after(async () => {
                    log('running loan from single pool with a single lender after');
                    await setCurrentSnapshot('Lend-takeLoan');
                })

                it('should reject if insufficient liquidity across pools', async() => {
                    const amount = parseUnits('1001', 6);
                    const collateral = parseEther('2');
                    const ltv = 33;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral})).to.be.revertedWith("Insufficient liquidity across pools");
                });
                it('should reject if pool with no liquidity is selected', async() => {
                    const amount = parseUnits('1', 6);
                    const collateral = parseEther('2');
                    const ltv = 20;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.feb01_26, {value: collateral})).to.be.revertedWith("Insufficient liquidity across pools");
                });
                it('should reject if invalid ltv is specified', async() => {
                    const amount = parseUnits('1000', 6);
                    const collateral = parseEther('2');
                    const ltv = 35;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral})).to.be.revertedWith("Invalid LTV");
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
                    const lendingPlatformAEthBalanceBefore = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceBefore).to.equal(0);
                    expect(borrower1EthBalanceBefore).to.equal(parseEther('10000'));
                    expect(lendingPlatformUsdcBalanceBefore).to.equal(parseUnits('1000', 6));
                    expect(lendingPlatformEthBalanceBefore).to.equal(parseEther('0'));
                    expect(lendingPlatformAEthBalanceBefore).to.equal(parseEther('0'));

                    const amount = parseUnits('900', 6);
                    const collateral = parseEther('2');
                    const ltv = 25;

                    const borrowTx = await lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral});
                    const borrowReceipt = await borrowTx.wait();
                    assert(borrowReceipt);
                    const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice

                    const borrower1UsdcBalanceAfter = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceAfter = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceAfter = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceAfter = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceAfter = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceAfter).to.equal(parseUnits('900', 6));
                    expect(borrower1EthBalanceAfter).to.equal(borrower1EthBalanceBefore - txFee - parseEther('2'));
                    expect(lendingPlatformUsdcBalanceAfter).to.equal(parseUnits('100', 6));
                    expect(lendingPlatformAEthBalanceAfter).to.equal(parseEther('2'));
                    expect(lendingPlatformEthBalanceAfter).to.equal(parseEther('0'));

                    const janPool = await lendingPlatform.getPool(timestamps.jan01_26);
                    expect(janPool.totalLoans).to.equal(parseUnits('900', 6));

                    const loan = await lendingPlatform.getLoan(borrower1.getAddress(), timestamps.jan01_26);
                    expect(loan.amount).to.equal(parseUnits('900', 6));
                    expect(loan.collateral).to.equal(parseEther('2'));
                    expect(loan.LTV).to.equal(25);
                    expect(loan.APY).to.equal(parseUnits('1', 6));
                    expect(loan.contributingPools.length).to.equal(1);
                    expect(loan.contributingPools[0].poolTimestamp).to.equal(timestamps.jan01_26);
                    expect(loan.contributingPools[0].liquidityContribution).to.equal(parseUnits('1', 8));

                    const totalAvailableLiquidity = await lendingPlatform.getAvailableForPeriod(timestamps.jan01_26);
                    expect(totalAvailableLiquidity).to.equal(parseUnits('100', 6));
                });
                it('should reject a second loan from the same borrower and same timestamp', async() => {
                    const amount = parseUnits('900', 6);
                    const collateral = parseEther('2');
                    const ltv = 25;

                    const borrowTx = await lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral});
                    const borrowReceipt = await borrowTx.wait();
                    assert(borrowReceipt);
                    const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice;

                    const amount2 = parseUnits('9', 6);
                    const collateral2 = parseEther('2');
                    const ltv2 = 20;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount2, collateral2, ltv2, timestamps.jan01_26, {value: collateral2})).to.be.revertedWith("Loan already exists in this slot");

                });
                it('should reject if a second loan does not have sufficient liquidity', async() => {
                    const borrower2LendingPlatform = lendingPlatform.connect(borrower2);

                    const amount = parseUnits('900', 6);
                    const collateral = parseEther('2');
                    const ltv = 25;

                    const borrowTx = await lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral});
                    const borrowReceipt = await borrowTx.wait();
                    assert(borrowReceipt);
                    const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice;

                    const amount2 = parseUnits('101', 6);
                    const collateral2 = parseEther('1');
                    const ltv2 = 20;

                    await expect(borrower2LendingPlatform.takeLoan(amount2, collateral2, ltv2, timestamps.jan01_26, {value: collateral2})).to.be.revertedWith("Insufficient liquidity across pools");
                });
                it('should succeed with a second loan with sufficient liquidity', async() => {
                    const borrower2LendingPlatform = lendingPlatform.connect(borrower2);

                    const borrower1UsdcBalanceBefore = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceBefore = await ethers.provider.getBalance(borrower1.getAddress());
                    const borrower2UsdcBalanceBefore = await usdc.balanceOf(borrower2.getAddress());
                    const borrower2EthBalanceBefore = await ethers.provider.getBalance(borrower2.getAddress());
                    const lendingPlatformUsdcBalanceBefore = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceBefore = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceBefore = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1EthBalanceBefore).to.equal(parseEther('10000'));
                    expect(borrower2EthBalanceBefore).to.equal(parseEther('10000'));
                    expect(borrower1UsdcBalanceBefore).to.equal(0);
                    expect(borrower2UsdcBalanceBefore).to.equal(0);
                    expect(lendingPlatformUsdcBalanceBefore).to.equal(parseUnits('1000', 6));
                    expect(lendingPlatformEthBalanceBefore).to.equal(0);
                    expect(lendingPlatformAEthBalanceBefore).to.equal(0);

                    const amount = parseUnits('900', 6);
                    const collateral = parseEther('2');
                    const ltv = 25;

                    const borrowTx = await lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral});
                    const borrowReceipt = await borrowTx.wait();
                    assert(borrowReceipt);
                    const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice;

                    const amount2 = parseUnits('100', 6);
                    const collateral2 = parseEther('1');
                    const ltv2 = 20;

                    const borrowTx2 = await borrower2LendingPlatform.takeLoan(amount2, collateral2, ltv2, timestamps.jan01_26, {value: collateral2});
                    const borrowReceipt2 = await borrowTx2.wait();
                    assert(borrowReceipt2);
                    const txFee2 = borrowReceipt2.gasUsed * borrowTx2.gasPrice;

                    const borrower1UsdcBalanceAfter = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceAfter = await ethers.provider.getBalance(borrower1.getAddress());
                    const borrower2UsdcBalanceAfter = await usdc.balanceOf(borrower2.getAddress());
                    const borrower2EthBalanceAfter = await ethers.provider.getBalance(borrower2.getAddress());
                    const lendingPlatformUsdcBalanceAfter = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceAfter = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceAfter = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceAfter).to.equal(parseUnits('900', 6));
                    expect(borrower1EthBalanceAfter).to.equal(parseEther('10000') - txFee - parseEther('2'));
                    expect(borrower2UsdcBalanceAfter).to.equal(parseUnits('100', 6));
                    expect(borrower2EthBalanceAfter).to.equal(parseEther('10000') - txFee2 - parseEther('1'));
                    expect(lendingPlatformUsdcBalanceAfter).to.equal(0);
                    expect(lendingPlatformEthBalanceAfter).to.equal(parseEther('0'));
                    expect(lendingPlatformAEthBalanceAfter).to.equal(parseEther('3'));

                    const janPool = await lendingPlatform.getPool(timestamps.jan01_26);
                    expect(janPool.totalLoans).to.equal(parseUnits('1000', 6));

                    const loan = await lendingPlatform.getLoan(borrower2.getAddress(), timestamps.jan01_26);
                    expect(loan.amount).to.equal(parseUnits('100', 6));
                    expect(loan.collateral).to.equal(parseEther('1'));
                    expect(loan.LTV).to.equal(20);
                    expect(loan.APY).to.equal(parseUnits('0', 6));
                    expect(loan.contributingPools.length).to.equal(1);
                    expect(loan.contributingPools[0].poolTimestamp).to.equal(timestamps.jan01_26);
                    expect(loan.contributingPools[0].liquidityContribution).to.equal(parseUnits('1', 8));

                    const totalAvailableLiquidity = await lendingPlatform.getAvailableForPeriod(timestamps.jan01_26)
                    expect(totalAvailableLiquidity).to.equal(parseUnits('0', 6));
                })
            })

            describe('loan from single pool with two lenders', () => {
                before(async () => {
                    log("running loan from single pool with two lenders before");
                    log(`before tx block: ${await ethers.provider.getBlockNumber()}`);
                    log(`${await ethers.provider.getBlock(await ethers.provider.getBlockNumber())}`)

                    // lender1 should have 10000 USDC
                    // lender2 should have 10000 USDC

                    // Blockchain transactions here
                    const lender1UsdcBalanceBefore = await usdc.balanceOf(lender1.address);
                    expect(lender1UsdcBalanceBefore).to.equal(parseUnits('10000',6));

                    await lendingPlatform.connect(lender1).deposit(timestamps.jan01_26, 1000 * 10 ** 6);
                    await lendingPlatform.connect(lender2).deposit(timestamps.jan01_26, 2000 * 10 ** 6);
                    log(`before tx block: ${await ethers.provider.getBlockNumber()}`);

                    // Tests for new state here
                    const lender1UsdcBalance = await usdc.balanceOf(lender1.address);
                    const lender2UsdcBalance = await usdc.balanceOf(lender2.address);
                    const lender1UsdcAllowance = await usdc.allowance(lender1.address, lendingPlatform.getAddress());
                    const lender2UsdcAllowance = await usdc.allowance(lender2.address, lendingPlatform.getAddress());
                    const platformUsdcBalance = await usdc.balanceOf(lendingPlatform.getAddress());
                    const janPool = await lendingPlatform.getPool(timestamps.jan01_26);

                    expect(lender1UsdcBalance).to.equal(parseUnits('9000', 6));
                    expect(lender2UsdcBalance).to.equal(parseUnits('8000', 6));
                    expect(lender1UsdcAllowance).to.equal(parseUnits('9000', 6));
                    expect(lender2UsdcAllowance).to.equal(parseUnits('8000', 6));
                    expect(platformUsdcBalance).to.equal(parseUnits('3000', 6))
                    expect(janPool.totalLiquidity).to.equal(parseUnits('3000', 6));
                    console.log(janPool);

                    // Take a local snapshot that will be used within this "describe" block
                    await addSnapshot('Lend-takeLoan-lfspwtl');
                })

                after(async () => {
                    log('running loan from single pool with two lenders after');
                    await setCurrentSnapshot('Lend-takeLoan');
                })

                it('should reject if insufficient liquidity across pools', async() => {
                    const amount = parseUnits('3001', 6);
                    const collateral = parseEther('6');
                    const ltv = 33;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral})).to.be.revertedWith("Insufficient liquidity across pools");
                });
                it('should reject if pool with no liquidity is selected', async() => {
                    const amount = parseUnits('1', 6);
                    const collateral = parseEther('1');
                    const ltv = 33;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.feb01_26, {value: collateral})).to.be.revertedWith("Insufficient liquidity across pools");
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
                    const lendingPlatformAEthBalanceBefore = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceBefore).to.equal(0);
                    expect(borrower1EthBalanceBefore).to.equal(parseEther('10000'));
                    expect(lendingPlatformUsdcBalanceBefore).to.equal(parseUnits('3000', 6));
                    expect(lendingPlatformEthBalanceBefore).to.equal(0);
                    expect(lendingPlatformAEthBalanceBefore).to.equal(0);

                    const amount = parseUnits('2900', 6);
                    const collateral = parseEther('7');
                    const ltv = 25;

                    const borrowTx = await lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral});
                    const borrowReceipt = await borrowTx.wait();
                    assert(borrowReceipt);
                    const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice

                    const borrower1UsdcBalanceAfter = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceAfter = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceAfter = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceAfter = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceAfter = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceAfter).to.equal(parseUnits('2900', 6));
                    expect(borrower1EthBalanceAfter).to.equal(borrower1EthBalanceBefore - txFee - parseEther('7'));
                    expect(lendingPlatformUsdcBalanceAfter).to.equal(parseUnits('100', 6));
                    expect(lendingPlatformEthBalanceAfter).to.equal(parseEther('0'));
                    expect(lendingPlatformAEthBalanceAfter).to.equal(parseEther('7'));

                    const janPool = await lendingPlatform.getPool(timestamps.jan01_26);
                    expect(janPool.totalLoans).to.equal(parseUnits('2900', 6));

                    const loan = await lendingPlatform.getLoan(borrower1.getAddress(), timestamps.jan01_26);
                    expect(loan.amount).to.equal(parseUnits('2900', 6));
                    expect(loan.collateral).to.equal(parseEther('7'));
                    expect(loan.LTV).to.equal(25);
                    expect(loan.APY).to.equal(parseUnits('1', 6));
                    expect(loan.contributingPools.length).to.equal(1);
                    expect(loan.contributingPools[0].poolTimestamp).to.equal(timestamps.jan01_26);
                    expect(loan.contributingPools[0].liquidityContribution).to.equal(parseUnits('1', 8));

                    const totalAvailableLiquidity = await lendingPlatform.getAvailableForPeriod(timestamps.jan01_26);
                    expect(totalAvailableLiquidity).to.equal(parseUnits('100', 6));
                });
            })

            describe('loan from multiple pools with multiple lenders', () => {
                before(async() => {
                    log("running loan from multiple pools with multiple lenders before");

                    // Blockchain transactions here
                    //     // Lender1 deposit 2000 USDC to 1-Jan-2026 pool
                    //     // Lender2 deposit 3000 USDC to 1-Jan-2026 pool
                    //     // Lender1 deposit 1200 USDC to 1-Feb-2026 pool
                    //     // Lender2 deposit 300 USDC to 1-Feb-2026 pool
                    //     // Lender1 deposit 500 USDC to 1-Mar-2026 pool
                    //     // Liquidity:
                    //     // March: 500
                    //     // February: 1500
                    //     // January: 5000
                    // await usdc.transfer(lender1.getAddress(), 3700 * 10 ** 6);
                    // await usdc.transfer(lender2.getAddress(), 3300 * 10 ** 6);
                    await usdc.transfer(lender1.getAddress(), parseUnits('3700', 6));
                    await usdc.transfer(lender2.getAddress(), parseUnits('3300', 6));

                    // await usdc.connect(lender1).approve(lendingPlatform.getAddress(), 3700 * 10 ** 6);
                    // await lendingPlatform.connect(lender1).deposit(timestamps.jan01_26, 2000 * 10 ** 6);
                    // await lendingPlatform.connect(lender1).deposit(timestamps.feb01_26, 1200 * 10 ** 6);
                    // await lendingPlatform.connect(lender1).deposit(timestamps.mar01_26, 500 * 10 ** 6);
                    await usdc.connect(lender1).approve(lendingPlatform.getAddress(), parseUnits('3700', 6));
                    await lendingPlatform.connect(lender1).deposit(timestamps.jan01_26, parseUnits('2000', 6));
                    await lendingPlatform.connect(lender1).deposit(timestamps.feb01_26, parseUnits('1200', 6));
                    await lendingPlatform.connect(lender1).deposit(timestamps.mar01_26, parseUnits('500', 6));

                    // await usdc.connect(lender2).approve(lendingPlatform.getAddress(), 3300 * 10 ** 6);
                    // await lendingPlatform.connect(lender2).deposit(timestamps.jan01_26, 3000 * 10 ** 6);
                    // await lendingPlatform.connect(lender2).deposit(timestamps.feb01_26, 300 * 10 ** 6);
                    await usdc.connect(lender2).approve(lendingPlatform.getAddress(), parseUnits('3300', 6));
                    await lendingPlatform.connect(lender2).deposit(timestamps.jan01_26, parseUnits('3000', 6));
                    await lendingPlatform.connect(lender2).deposit(timestamps.feb01_26, parseUnits('300', 6));

                    // Tests for new state here
                    const lender1UsdcBalance = await usdc.balanceOf(lender1.address);
                    const lender2UsdcBalance = await usdc.balanceOf(lender2.address);
                    const totalAvailableLiquidityJan = await lendingPlatform.getAvailableForPeriod(timestamps.jan01_26);
                    const totalAvailableLiquidityFeb = await lendingPlatform.getAvailableForPeriod(timestamps.feb01_26);
                    const totalAvailableLiquidityMar = await lendingPlatform.getAvailableForPeriod(timestamps.mar01_26);
                    const platformAETHBalance = await aeth.balanceOf(lendingPlatform.getAddress());
                    const platformETHBalance = await ethers.provider.getBalance(lendingPlatform.getAddress());

                    expect(lender1UsdcBalance).to.equal(parseUnits('10000', 6));
                    expect(lender2UsdcBalance).to.equal(parseUnits('10000', 6));
                    expect(platformAETHBalance).to.equal(parseEther('0'));
                    expect(platformETHBalance).to.equal(parseEther('0'));
                    expect(totalAvailableLiquidityJan).to.equal(parseUnits('7000', 6));
                    expect(totalAvailableLiquidityFeb).to.equal(parseUnits('2000', 6));
                    expect(totalAvailableLiquidityMar).to.equal(parseUnits('500', 6));

                    await addSnapshot('Lend-takeLoan-lfmpwml');
                });
                after(async () => {
                    log('running loan from multiple pools with multiple lenders after');
                    await setCurrentSnapshot('Lend-takeLoan');
                });
                // beforeEach(async () => {
                //     // Lender1 deposit 2000 USDC to 1-Jan-2026 pool
                //     // Lender2 deposit 3000 USDC to 1-Jan-2026 pool
                //     // Lender1 deposit 1200 USDC to 1-Feb-2026 pool
                //     // Lender2 deposit 300 USDC to 1-Feb-2026 pool
                //     // Lender1 deposit 500 USDC to 1-Mar-2026 pool
                //     // Liquidity:
                //     // March: 500
                //     // February: 1500
                //     // January: 5000
                //     await usdc.transfer(lender1.getAddress(), 3700 * 10 ** 6);
                //     await usdc.transfer(lender2.getAddress(), 3300 * 10 ** 6);
                //
                //     await usdc.connect(lender1).approve(lendingPlatform.getAddress(), 3700 * 10 ** 6);
                //     await lendingPlatform.connect(lender1).deposit(timestamps.jan01_26, 2000 * 10 ** 6);
                //     await lendingPlatform.connect(lender1).deposit(timestamps.feb01_26, 1200 * 10 ** 6);
                //     await lendingPlatform.connect(lender1).deposit(timestamps.mar01_26, 500 * 10 ** 6);
                //
                //     await usdc.connect(lender2).approve(lendingPlatform.getAddress(), 3300 * 10 ** 6);
                //     await lendingPlatform.connect(lender2).deposit(timestamps.jan01_26, 3000 * 10 ** 6);
                //     await lendingPlatform.connect(lender2).deposit(timestamps.feb01_26, 300 * 10 ** 6);
                // })
                it('should reject if not enough liquidity for march', async () => {
                    // 501 Loan March
                    const amount = parseUnits('501', 6);
                    const collateral = parseEther('2');
                    const ltv = 33;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.mar01_26, {value: collateral})).to.be.revertedWith("Insufficient liquidity across pools");
                });
                it('should reject if not enough liquidity for feb', async () => {
                    // 2001 Loan February
                    const amount = parseUnits('2001', 6);
                    const collateral = parseEther('8');
                    const ltv = 33;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.feb01_26, {value: collateral})).to.be.revertedWith("Insufficient liquidity across pools");
                });
                it('should reject if not enough liquidity for january', async () => {
                    // 7001 Loan January
                    const amount = parseUnits('7001', 6);
                    const collateral = parseEther('28');
                    const ltv = 33;

                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral})).to.be.revertedWith("Insufficient liquidity across pools");
                });
                it('should create the loan for jan', async() => {
                    // 7000 Loan Jan
                    const amount = parseUnits('7000', 6);
                    const collateral = parseEther('28');
                    const ltv = 33;

                    const borrower1UsdcBalanceBefore = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceBefore = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceBefore = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceBefore = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceBefore = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceBefore).to.equal(0);
                    expect(lendingPlatformUsdcBalanceBefore).to.equal(parseUnits('7000', 6));
                    expect(lendingPlatformEthBalanceBefore).to.equal(0);
                    expect(lendingPlatformAEthBalanceBefore).to.equal(0);

                    const borrowTx = await lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral});
                    const borrowReceipt = await borrowTx.wait();
                    assert(borrowReceipt);
                    const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice

                    const borrower1UsdcBalanceAfter = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceAfter = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceAfter = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceAfter = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceAfter = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceAfter).to.equal(parseUnits('7000', 6));
                    expect(borrower1EthBalanceAfter).to.equal(borrower1EthBalanceBefore - txFee - parseEther('28'));
                    expect(lendingPlatformUsdcBalanceAfter).to.equal(parseUnits('0', 6));
                    expect(lendingPlatformEthBalanceAfter).to.equal(parseEther('0'));
                    expect(lendingPlatformAEthBalanceAfter).to.equal(parseEther('28'));

                    const janPool = await lendingPlatform.getPool(timestamps.jan01_26);
                    const totalLoans = janPool.totalLoans;
                    // const totalLoans = await lendingPlatform.totalLoans(timestamps.jan01_26);
                    expect(totalLoans).to.equal(parseUnits('7000', 6));

                    const loan = await lendingPlatform.getLoan(borrower1.getAddress(), timestamps.jan01_26);
                    expect(loan.amount).to.equal(parseUnits('7000', 6));
                    expect(loan.collateral).to.equal(parseEther('28'));
                    expect(loan.LTV).to.equal(33);
                    expect(loan.APY).to.equal(parseUnits('5', 6));
                    expect(loan.contributingPools.length).to.equal(3);
                    expect(loan.contributingPools[0].poolTimestamp).to.equal(timestamps.jan01_26);
                    expect(loan.contributingPools[1].poolTimestamp).to.equal(timestamps.feb01_26);
                    expect(loan.contributingPools[2].poolTimestamp).to.equal(timestamps.mar01_26);
                    expect(loan.contributingPools[0].liquidityContribution).to.equal(parseUnits('5000', 8) / 7000n);
                    expect(loan.contributingPools[1].liquidityContribution).to.equal(parseUnits('1500', 8) / 7000n);
                    expect(loan.contributingPools[2].liquidityContribution).to.equal(parseUnits('500', 8) / 7000n);

                    const totalAvailableLiquidity = await lendingPlatform.getAvailableForPeriod(timestamps.jan01_26);
                    expect(totalAvailableLiquidity).to.equal(parseUnits('0', 6));
                });
                it('should create the loan for feb', async() => {
                    // 2000 Loan Feb
                    const amount = parseUnits('2000', 6);
                    const collateral = parseEther('8');
                    const ltv = 33;

                    const borrower1UsdcBalanceBefore = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceBefore = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceBefore = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceBefore = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceBefore = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceBefore).to.equal(0);
                    expect(lendingPlatformUsdcBalanceBefore).to.equal(parseUnits('7000', 6));
                    expect(lendingPlatformEthBalanceBefore).to.equal(0);
                    expect(lendingPlatformAEthBalanceBefore).to.equal(0);

                    const borrowTx = await lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.feb01_26, {value: collateral});
                    const borrowReceipt = await borrowTx.wait();
                    assert(borrowReceipt);
                    const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice

                    const borrower1UsdcBalanceAfter = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceAfter = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceAfter = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceAfter = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceAfter = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceAfter).to.equal(parseUnits('2000', 6));
                    expect(borrower1EthBalanceAfter).to.equal(borrower1EthBalanceBefore - txFee - parseEther('8'));
                    expect(lendingPlatformUsdcBalanceAfter).to.equal(parseUnits('5000', 6));
                    expect(lendingPlatformEthBalanceAfter).to.equal(parseEther('0'));
                    expect(lendingPlatformAEthBalanceAfter).to.equal(parseEther('8'));

                    const febPool = await lendingPlatform.getPool(timestamps.feb01_26);
                    expect(febPool.totalLoans).to.equal(parseUnits('2000', 6));

                    const loan = await lendingPlatform.getLoan(borrower1.getAddress(), timestamps.feb01_26);
                    expect(loan.amount).to.equal(parseUnits('2000', 6));
                    expect(loan.collateral).to.equal(parseEther('8'));
                    expect(loan.LTV).to.equal(33);
                    expect(loan.APY).to.equal(parseUnits('5', 6));
                    expect(loan.contributingPools.length).to.equal(2);
                    expect(loan.contributingPools[0].poolTimestamp).to.equal(timestamps.feb01_26);
                    expect(loan.contributingPools[1].poolTimestamp).to.equal(timestamps.mar01_26);
                    expect(loan.contributingPools[0].liquidityContribution).to.equal(parseUnits('1500', 8) / 2000n);
                    expect(loan.contributingPools[1].liquidityContribution).to.equal(parseUnits('500', 8) / 2000n);

                    const totalAvailableLiquidityJan = await lendingPlatform.getAvailableForPeriod(timestamps.jan01_26);
                    expect(totalAvailableLiquidityJan).to.equal(parseUnits('5000', 6));

                    const totalAvailableLiquidityFeb = await lendingPlatform.getAvailableForPeriod(timestamps.feb01_26);
                    expect(totalAvailableLiquidityFeb).to.equal(parseUnits('0', 6));
                });
                it('should create the loan for march', async() => {
                    // 500 Loan Mar
                    const amount = parseUnits('500', 6);
                    const collateral = parseEther('2');
                    const ltv = 33;

                    const borrower1UsdcBalanceBefore = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceBefore = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceBefore = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceBefore = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceBefore = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceBefore).to.equal(0);
                    expect(lendingPlatformUsdcBalanceBefore).to.equal(parseUnits('7000', 6));
                    expect(lendingPlatformEthBalanceBefore).to.equal(0);
                    expect(lendingPlatformAEthBalanceBefore).to.equal(0);

                    const borrowTx = await lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.mar01_26, {value: collateral});
                    const borrowReceipt = await borrowTx.wait();
                    assert(borrowReceipt);
                    const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice

                    const borrower1UsdcBalanceAfter = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceAfter = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceAfter = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceAfter = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceAfter = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceAfter).to.equal(parseUnits('500', 6));
                    expect(borrower1EthBalanceAfter).to.equal(borrower1EthBalanceBefore - txFee - parseEther('2'));
                    expect(lendingPlatformUsdcBalanceAfter).to.equal(parseUnits('6500', 6));
                    expect(lendingPlatformEthBalanceAfter).to.equal(parseEther('0'));
                    expect(lendingPlatformAEthBalanceAfter).to.equal(parseEther('2'));

                    const marPool = await lendingPlatform.getPool(timestamps.mar01_26);
                    expect(marPool.totalLoans).to.equal(parseUnits('500', 6));

                    const loan = await lendingPlatform.getLoan(borrower1.getAddress(), timestamps.mar01_26);
                    expect(loan.amount).to.equal(parseUnits('500', 6));
                    expect(loan.collateral).to.equal(parseEther('2'));
                    expect(loan.LTV).to.equal(33);
                    expect(loan.APY).to.equal(parseUnits('5', 6));
                    expect(loan.contributingPools.length).to.equal(1);
                    expect(loan.contributingPools[0].poolTimestamp).to.equal(timestamps.mar01_26);
                    expect(loan.contributingPools[0].liquidityContribution).to.equal(parseUnits('1', 8));

                    const totalAvailableLiquidityJan = await lendingPlatform.getAvailableForPeriod(timestamps.jan01_26);
                    expect(totalAvailableLiquidityJan).to.equal(parseUnits('6500', 6));

                    const totalAvailableLiquidityFeb = await lendingPlatform.getAvailableForPeriod(timestamps.feb01_26);
                    expect(totalAvailableLiquidityFeb).to.equal(parseUnits('1500', 6));

                    const totalAvailableLiquidityMar = await lendingPlatform.getAvailableForPeriod(timestamps.mar01_26);
                    expect(totalAvailableLiquidityMar).to.equal(parseUnits('0', 6));
                });
                it('should create the loan for feb even if some of the feb liquidity is consumed for a jan loan', async() => {
                    // TODO: This test is failing but I think it is an issue with the contract
                    // 5500 Loan Jan
                    // 1000 Loan Feb
                    const amount = parseUnits('5500', 6);
                    const collateral = parseEther('22');
                    const ltv = 33;

                    const amount2 = parseUnits('1000', 6);
                    const collateral2 = parseEther('5')

                    const borrower1UsdcBalanceBefore = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceBefore = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceBefore = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceBefore = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceBefore = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceBefore).to.equal(0);
                    expect(lendingPlatformUsdcBalanceBefore).to.equal(parseUnits('7000', 6));
                    expect(lendingPlatformEthBalanceBefore).to.equal(0);
                    expect(lendingPlatformAEthBalanceBefore).to.equal(0);

                    const borrowTx = await lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral});
                    const borrowReceipt = await borrowTx.wait();
                    assert(borrowReceipt);
                    const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice

                    const borrower1UsdcBalanceAfter = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceAfter = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceAfter = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceAfter = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceAfter = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceAfter).to.equal(parseUnits('5500', 6));
                    expect(borrower1EthBalanceAfter).to.equal(borrower1EthBalanceBefore - txFee - parseEther('22'));
                    expect(lendingPlatformUsdcBalanceAfter).to.equal(parseUnits('1500', 6));
                    expect(lendingPlatformEthBalanceAfter).to.equal(parseEther('0'));
                    expect(lendingPlatformAEthBalanceAfter).to.equal(parseEther('22'));

                    const janPool = await lendingPlatform.getPool(timestamps.jan01_26);
                    expect(janPool.totalLoans).to.equal(parseUnits('5500', 6));

                    const loan = await lendingPlatform.getLoan(borrower1.getAddress(), timestamps.jan01_26);
                    expect(loan.amount).to.equal(parseUnits('5500', 6));
                    expect(loan.collateral).to.equal(parseEther('22'));
                    expect(loan.LTV).to.equal(33);
                    expect(loan.APY).to.equal(parseUnits('5', 6));
                    expect(loan.contributingPools.length).to.equal(3);
                    expect(loan.contributingPools[0].poolTimestamp).to.equal(timestamps.jan01_26);
                    expect(loan.contributingPools[1].poolTimestamp).to.equal(timestamps.feb01_26);
                    expect(loan.contributingPools[2].poolTimestamp).to.equal(timestamps.mar01_26);
                    expect(loan.contributingPools[0].liquidityContribution).to.equal(parseUnits('5000', 8) / 7000n);
                    expect(loan.contributingPools[1].liquidityContribution).to.equal(parseUnits('1500', 8) / 7000n);
                    expect(loan.contributingPools[2].liquidityContribution).to.equal(parseUnits('500', 8) / 7000n);

                    const totalAvailableLiquidityJan = await lendingPlatform.getAvailableForPeriod(timestamps.jan01_26);
                    expect(totalAvailableLiquidityJan).to.equal(parseUnits('1500', 6));

                    const totalAvailableLiquidityFeb = await lendingPlatform.getAvailableForPeriod(timestamps.feb01_26);
                    expect(totalAvailableLiquidityFeb).to.equal(parseUnits('1500', 6));

                    const totalAvailableLiquidityMar = await lendingPlatform.getAvailableForPeriod(timestamps.mar01_26);
                    expect(totalAvailableLiquidityMar).to.equal(parseUnits('500', 6));

                    const borrowTx2 = await lendingPlatform.connect(borrower1).takeLoan(amount2, collateral2, ltv, timestamps.feb01_26, {value: collateral2});
                    const borrowReceipt2 = await borrowTx2.wait();
                    assert(borrowReceipt2);
                    const txFee2 = borrowReceipt2.gasUsed * borrowTx2.gasPrice

                    const borrower1UsdcBalanceAfter2 = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceAfter2 = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceAfter2 = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceAfter2 = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceAfter2 = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceAfter2).to.equal(parseUnits('6500', 6));
                    expect(borrower1EthBalanceAfter2).to.equal(borrower1EthBalanceAfter - txFee2 - parseEther('5'));
                    expect(lendingPlatformUsdcBalanceAfter2).to.equal(parseUnits('500', 6));
                    expect(lendingPlatformEthBalanceAfter2).to.equal(parseEther('0'));
                    expect(lendingPlatformAEthBalanceAfter2).to.equal(parseEther('27'));

                    const janPool2 = await lendingPlatform.getPool(timestamps.jan01_26);
                    expect(janPool2.totalLoans).to.equal(parseUnits('5500', 6));
                    const febPool2 = await lendingPlatform.getPool(timestamps.feb01_26);
                    expect(febPool2.totalLoans).to.equal(parseUnits('1000', 6));

                    const loan2 = await lendingPlatform.getLoan(borrower1.getAddress(), timestamps.feb01_26);
                    expect(loan2.amount).to.equal(parseUnits('1000', 6));
                    expect(loan2.collateral).to.equal(parseEther('5'));
                    expect(loan2.LTV).to.equal(33);
                    expect(loan2.APY).to.equal(parseUnits('5', 6));
                    expect(loan2.contributingPools.length).to.equal(2);
                    expect(loan2.contributingPools[0].poolTimestamp).to.equal(timestamps.feb01_26);
                    expect(loan2.contributingPools[1].poolTimestamp).to.equal(timestamps.mar01_26);
                    expect(loan2.contributingPools[0].liquidityContribution).to.equal(parseUnits('1500', 8) / 2000n);
                    expect(loan2.contributingPools[1].liquidityContribution).to.equal(parseUnits('500', 8) / 2000n);

                    const totalAvailableLiquidityJan2 = await lendingPlatform.getAvailableForPeriod(timestamps.jan01_26);
                    expect(totalAvailableLiquidityJan2).to.equal(parseUnits('500', 6));

                    const totalAvailableLiquidityFeb2 = await lendingPlatform.getAvailableForPeriod(timestamps.feb01_26);
                    expect(totalAvailableLiquidityFeb2).to.equal(parseUnits('500', 6));

                    const totalAvailableLiquidityMar2 = await lendingPlatform.getAvailableForPeriod(timestamps.mar01_26);
                    expect(totalAvailableLiquidityMar2).to.equal(parseUnits('500', 6));
                });
                it('should consume mar liquidity even if jan and feb used up', async () => {
                    // 6500 Loan Jan
                    // 100 Loan Feb
                    const amount = parseUnits('6500', 6);
                    const collateral = parseEther('22');
                    const ltv = 33;

                    const amount2 = parseUnits('100', 6);
                    const collateral2 = parseEther('1')

                    const borrower1UsdcBalanceBefore = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceBefore = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceBefore = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceBefore = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceBefore = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceBefore).to.equal(0);
                    expect(lendingPlatformUsdcBalanceBefore).to.equal(parseUnits('7000', 6));
                    expect(lendingPlatformEthBalanceBefore).to.equal(0);
                    expect(lendingPlatformAEthBalanceBefore).to.equal(0);

                    const borrowTx = await lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral});
                    const borrowReceipt = await borrowTx.wait();
                    assert(borrowReceipt);
                    const txFee = borrowReceipt.gasUsed * borrowTx.gasPrice

                    const borrower1UsdcBalanceAfter = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceAfter = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceAfter = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceAfter = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceAfter = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceAfter).to.equal(parseUnits('6500', 6));
                    expect(borrower1EthBalanceAfter).to.equal(borrower1EthBalanceBefore - txFee - parseEther('22'));
                    expect(lendingPlatformUsdcBalanceAfter).to.equal(parseUnits('500', 6));
                    expect(lendingPlatformEthBalanceAfter).to.equal(parseEther('0'));
                    expect(lendingPlatformAEthBalanceAfter).to.equal(parseEther('22'));

                    const janPool = await lendingPlatform.getPool(timestamps.jan01_26);
                    expect(janPool.totalLoans).to.equal(parseUnits('6500', 6));

                    const loan = await lendingPlatform.getLoan(borrower1.getAddress(), timestamps.jan01_26);
                    expect(loan.amount).to.equal(parseUnits('6500', 6));
                    expect(loan.collateral).to.equal(parseEther('22'));
                    expect(loan.LTV).to.equal(33);
                    expect(loan.APY).to.equal(parseUnits('5', 6));
                    expect(loan.contributingPools.length).to.equal(3);
                    expect(loan.contributingPools[0].poolTimestamp).to.equal(timestamps.jan01_26);
                    expect(loan.contributingPools[1].poolTimestamp).to.equal(timestamps.feb01_26);
                    expect(loan.contributingPools[2].poolTimestamp).to.equal(timestamps.mar01_26);
                    expect(loan.contributingPools[0].liquidityContribution).to.equal(parseUnits('5000', 8) / 7000n);
                    expect(loan.contributingPools[1].liquidityContribution).to.equal(parseUnits('1500', 8) / 7000n);
                    expect(loan.contributingPools[2].liquidityContribution).to.equal(parseUnits('500', 8) / 7000n);

                    const totalAvailableLiquidityJan = await lendingPlatform.getAvailableForPeriod(timestamps.jan01_26);
                    expect(totalAvailableLiquidityJan).to.equal(parseUnits('500', 6));

                    const totalAvailableLiquidityFeb = await lendingPlatform.getAvailableForPeriod(timestamps.feb01_26);
                    expect(totalAvailableLiquidityFeb).to.equal(parseUnits('500', 6));

                    const totalAvailableLiquidityMar = await lendingPlatform.getAvailableForPeriod(timestamps.mar01_26);
                    expect(totalAvailableLiquidityMar).to.equal(parseUnits('500', 6));

                    const borrowTx2 = await lendingPlatform.connect(borrower1).takeLoan(amount2, collateral2, ltv, timestamps.feb01_26, {value: collateral2});
                    const borrowReceipt2 = await borrowTx2.wait();
                    assert(borrowReceipt2);
                    const txFee2 = borrowReceipt2.gasUsed * borrowTx2.gasPrice

                    const borrower1UsdcBalanceAfter2 = await usdc.balanceOf(borrower1.getAddress());
                    const borrower1EthBalanceAfter2 = await ethers.provider.getBalance(borrower1.getAddress());
                    const lendingPlatformUsdcBalanceAfter2 = await usdc.balanceOf(lendingPlatform.getAddress());
                    const lendingPlatformEthBalanceAfter2 = await ethers.provider.getBalance(lendingPlatform.getAddress());
                    const lendingPlatformAEthBalanceAfter2 = await aeth.balanceOf(lendingPlatform.getAddress());

                    expect(borrower1UsdcBalanceAfter2).to.equal(parseUnits('6600', 6));
                    expect(borrower1EthBalanceAfter2).to.equal(borrower1EthBalanceAfter - txFee2 - parseEther('1'));
                    expect(lendingPlatformUsdcBalanceAfter2).to.equal(parseUnits('400', 6));
                    expect(lendingPlatformEthBalanceAfter2).to.equal(parseEther('0'));
                    expect(lendingPlatformAEthBalanceAfter2).to.equal(parseEther('23'));

                    const janPool2 = await lendingPlatform.getPool(timestamps.jan01_26);
                    expect(janPool2.totalLoans).to.equal(parseUnits('6500', 6));
                    const febPool2 = await lendingPlatform.getPool(timestamps.feb01_26);
                    expect(febPool2.totalLoans).to.equal(parseUnits('100', 6));

                    const loan2 = await lendingPlatform.getLoan(borrower1.getAddress(), timestamps.feb01_26);
                    expect(loan2.amount).to.equal(parseUnits('100', 6));
                    expect(loan2.collateral).to.equal(parseEther('1'));
                    expect(loan2.LTV).to.equal(33);
                    expect(loan2.APY).to.equal(parseUnits('5', 6));
                    expect(loan2.contributingPools.length).to.equal(2);
                    expect(loan2.contributingPools[0].poolTimestamp).to.equal(timestamps.feb01_26);
                    expect(loan2.contributingPools[1].poolTimestamp).to.equal(timestamps.mar01_26);
                    expect(loan2.contributingPools[0].liquidityContribution).to.equal(parseUnits('1500', 8) / 2000n);
                    expect(loan2.contributingPools[1].liquidityContribution).to.equal(parseUnits('500', 8) / 2000n);

                    const totalAvailableLiquidityJan2 = await lendingPlatform.getAvailableForPeriod(timestamps.jan01_26);
                    expect(totalAvailableLiquidityJan2).to.equal(parseUnits('400', 6));

                    const totalAvailableLiquidityFeb2 = await lendingPlatform.getAvailableForPeriod(timestamps.feb01_26);
                    expect(totalAvailableLiquidityFeb2).to.equal(parseUnits('400', 6));

                    const totalAvailableLiquidityMar2 = await lendingPlatform.getAvailableForPeriod(timestamps.mar01_26);
                    expect(totalAvailableLiquidityMar2).to.equal(parseUnits('400', 6));
                });
                it('should reject if all of the possible feb liquidity is used up for jan loans', async () => {
                    // 7000 Loan Jan
                    // 1 Loan Feb

                    const amount = parseUnits('7000', 6);
                    const collateral = parseEther('30');
                    const amount2 = parseUnits('1', 6);
                    const collateral2 = parseEther('1');
                    const ltv = 33;

                    const borrowTx = await lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.jan01_26, {value: collateral});
                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount2, collateral2, ltv, timestamps.feb01_26, {value: collateral2})).to.be.revertedWith("Insufficient liquidity across pools");
                });
                it('should reject if feb runs out of liquidity for feb loans', async () => {
                    // 2000 Loan Feb
                    // 1 Loan Feb
                    const amount = parseUnits('2000', 6);
                    const collateral = parseEther('10');
                    const amount2 = parseUnits('1', 6);
                    const collateral2 = parseEther('1');
                    const ltv = 33;

                    const borrowTx = await lendingPlatform.connect(borrower1).takeLoan(amount, collateral, ltv, timestamps.feb01_26, {value: collateral});
                    await expect(lendingPlatform.connect(borrower1).takeLoan(amount2, collateral2, ltv, timestamps.feb01_26, {value: collateral2})).to.be.revertedWith("Insufficient liquidity across pools");
                });
            })
        });
        describe('partialRepayLoan', () => {});
        describe('repayLoan', () => {});
    });
    describe('MockAaveV3', () => {
        const referralCode = 0; // uint16 that is unused in the context the the mock contract
        const unusedAddressArg = ethers.ZeroAddress; // address that is a required arg but unused
        describe('receive', () => {
            it('receive should revert', async () => {
                const mockAaveV3Address = await mockAaveV3.getAddress();
                const balanceBefore = await ethers.provider.getBalance(lender1.address);
                expect(balanceBefore).to.equal(parseEther('10000'));
                // await lender1.sendTransaction({to: aethAddress, value: ethers.parseEther('1')});
                await expect(lender1.sendTransaction({
                    to: mockAaveV3Address,
                    value: ethers.parseEther('1')
                })).to.be.revertedWith('MockAaveV3: Receive not allowed');
                const balanceAfter = await ethers.provider.getBalance(lender1.address);
                expect(balanceAfter).to.be.greaterThan(parseEther('9999'));
            });
        });
        describe('fallback', () => {
            it('fallback should revert', async () => {
                const mockAaveV3Address = await mockAaveV3.getAddress();
                const balanceBefore = await ethers.provider.getBalance(lender1.address);
                expect(balanceBefore).to.equal(parseEther('10000'));
                await expect(lender1.sendTransaction({
                        to: mockAaveV3Address,
                        value: ethers.parseEther('1'),
                        data: '0x12345678'
                    }
                )).to.be.revertedWith('MockAaveV3: Fallback not allowed');
                const balanceAfter = await ethers.provider.getBalance(lender1.address);
                expect(balanceAfter).to.be.greaterThan(parseEther('9999'));
            });
        });
        describe('depositETH', () => {
            it('should mint nothing if 0 value', async () => {
                const lenderBalanceBefore = await ethers.provider.getBalance(lender1.address);
                expect(lenderBalanceBefore).to.equal(parseEther('10000'));
                const tx = await mockAaveV3.connect(lender1).depositETH(unusedAddressArg, lender1.address, referralCode, {value: 0});
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
                await expect(mockAaveV3.connect(lender1).depositETH(unusedAddressArg, lender1.address, referralCode, {value: parseEther('10001')})).to.be.rejected;
                const aethSupply = await aeth.totalSupply();
                expect(aethSupply).to.equal(0);
                const lenderBalanceAfter = await ethers.provider.getBalance(lender1.address);
                expect(lenderBalanceAfter).to.equal(parseEther('10000'));
            });
            it('should mint tokens equivalent to the value - sender receives', async () => {
                const lenderBalanceBefore = await ethers.provider.getBalance(lender1.address);
                expect(lenderBalanceBefore).to.equal(parseEther('10000'));
                const tx = await mockAaveV3.connect(lender1).depositETH(unusedAddressArg, lender1.address, referralCode, {value: parseEther('121.3256')});
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
                const tx = await mockAaveV3.connect(lender1).depositETH(unusedAddressArg, lender2.address, referralCode, {value: parseEther('823.123456789012345678')});
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
                await mockAaveV3.connect(lender1).depositETH(unusedAddressArg, lender1.address, referralCode, {value: parseEther('100.2')});
                await mockAaveV3.connect(lender2).depositETH(unusedAddressArg, lender2.address, referralCode, {value: parseEther('200.3')});
                const lender1aeth = await aeth.balanceOf(lender1.address);
                const lender2aeth = await aeth.balanceOf(lender2.address);
                const aethSupply = await aeth.totalSupply();
                expect(lender1aeth).to.equal(parseEther('100.2'));
                expect(lender2aeth).to.equal(parseEther('200.3'));
                expect(aethSupply).to.equal(parseEther('300.5'));
            });
        });
        describe('withdraw', () => {
            before(async () => {
                log("running withdraw before");
                // await loadGlobalSnapshot();
                const lender1BalanceBefore = await ethers.provider.getBalance(lender1.address);
                const lender2BalanceBefore = await ethers.provider.getBalance(lender2.address);
                const tx1 = await mockAaveV3.connect(lender1).depositETH(unusedAddressArg, lender1.address, referralCode, {value: parseEther('1.1')});
                const tx2 = await mockAaveV3.connect(lender2).depositETH(unusedAddressArg, lender2.address, referralCode, {value: parseEther('0.5')});
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

                await addSnapshot('MockAaveV3-withdraw')
            })
            after(async () => {
                log('running withdraw after');
                await setCurrentSnapshot('contractDeployment');
            })
            it('should revert if sender does not have sufficient tokens - none', async () => {
                await expect(mockAaveV3.connect(lender3).withdrawETH(unusedAddressArg, parseEther('1.2'), lender1.address)).to.be.revertedWith("ERC20: burn amount exceeds balance");
                const lender3AethBalanceAfter = await aeth.balanceOf(lender3.address);
                expect(lender3AethBalanceAfter).to.equal(parseEther('0'));
                const totalSupply = await aeth.totalSupply();
                expect(totalSupply).to.equal(parseEther('1.6'));
            });
            it('should revert if sender does not have sufficient tokens - some', async () => {
                await expect(mockAaveV3.connect(lender1).withdrawETH(unusedAddressArg, parseEther('1.2'), lender1.address)).to.be.revertedWith("ERC20: burn amount exceeds balance");
                const lender1AethBalanceAfter = await aeth.balanceOf(lender1.address);
                expect(lender1AethBalanceAfter).to.equal(parseEther('1.1'));
                const totalSupply = await aeth.totalSupply();
                expect(totalSupply).to.equal(parseEther('1.6'));
            });
            it('should work - onBehalfOf sender - full amount', async () => {
                const ethBalanceBefore = await ethers.provider.getBalance(lender1.address);
                const tx = await mockAaveV3.connect(lender1).withdrawETH(unusedAddressArg, parseEther('1.1'), lender1.address);
                const receipt = await tx.wait();
                if (!receipt) {
                    throw new Error('no receipt');
                }
                const txFee = tx.gasPrice * receipt.gasUsed;
                const lender1AethBalanceAfter = await aeth.balanceOf(lender1.address);
                const totalSupply = await aeth.totalSupply();
                const ethBalanceAfter = await ethers.provider.getBalance(lender1.address);
                expect(totalSupply).to.equal(parseEther('0.5'));
                expect(lender1AethBalanceAfter).to.equal(parseEther('0'));
                expect(ethBalanceAfter).to.equal(ethBalanceBefore + parseEther('1.1') - txFee);
            });
            it('should work - onBehalfOf different', async () => {
                const ethBalanceBefore = await ethers.provider.getBalance(borrower1.address);
                await mockAaveV3.connect(lender1).withdrawETH(unusedAddressArg, parseEther('1.1'), borrower1.address);
                const lender1AethBalanceAfter = await aeth.balanceOf(lender1.address);
                const totalSupply = await aeth.totalSupply();
                const ethBalanceAfter = await ethers.provider.getBalance(borrower1.address);
                expect(totalSupply).to.equal(parseEther('0.5'));
                expect(lender1AethBalanceAfter).to.equal(parseEther('0'));
                expect(ethBalanceAfter).to.equal(ethBalanceBefore + parseEther('1.1'));
            });
            it('should work - original depositor different (transfer)', async () => {
                await aeth.connect(lender1).transfer(lender3.address, parseEther('0.3'));
                const lender3AethBefore = await aeth.balanceOf(lender3.address);
                const lender3EthBalanceBefore = await ethers.provider.getBalance(lender3.address);
                expect(lender3AethBefore).to.equal(parseEther('0.3'));
                const tx = await mockAaveV3.connect(lender3).withdrawETH(unusedAddressArg, parseEther('0.2'), lender3.address);
                const receipt = await tx.wait();
                if (!receipt) {
                    throw new Error('no receipt');
                }
                const txFee = tx.gasPrice * receipt.gasUsed;
                const lender1AethBalanceAfter = await aeth.balanceOf(lender1.address);
                const lender3AethBalanceAfter = await aeth.balanceOf(lender3.address);
                const totalSupply = await aeth.totalSupply();
                const lender3EthBalanceAfter = await ethers.provider.getBalance(lender3.address);
                expect(totalSupply).to.equal(parseEther('1.4'));
                expect(lender1AethBalanceAfter).to.equal(parseEther('0.8'));
                expect(lender3AethBalanceAfter).to.equal(parseEther('0.1'));
                expect(lender3EthBalanceAfter).to.equal(lender3EthBalanceBefore + parseEther('0.2') - txFee);
            });
            it('should work with multiple deposits and withdraws', async () => {
                // lender1: 1.1
                // lender2: 0.5
                // ---
                // lender3 deposits 1.3
                // lender1 withdraws 0.5
                // lender2 withdraws 0.2
                // lender3 withdraws 0.9
                // ---
                // lender1 0.6
                // lender2 0.3
                // lender3 0.4
                // total 1.3
                await mockAaveV3.connect(lender3).depositETH(unusedAddressArg, lender3.address, referralCode, {value: parseEther('1.3')});
                await mockAaveV3.connect(lender1).withdrawETH(unusedAddressArg, parseEther('0.5'), lender1.address);
                await mockAaveV3.connect(lender2).withdrawETH(unusedAddressArg, parseEther('0.2'), lender2.address);
                await mockAaveV3.connect(lender3).withdrawETH(unusedAddressArg, parseEther('0.9'), lender3.address);
                const lender1Aeth = await aeth.balanceOf(lender1.address);
                const lender2Aeth = await aeth.balanceOf(lender2.address);
                const lender3Aeth = await aeth.balanceOf(lender3.address);
                const totalSupply = await aeth.totalSupply();
                expect(lender1Aeth).to.equal(parseEther('0.6'));
                expect(lender2Aeth).to.equal(parseEther('0.3'));
                expect(lender3Aeth).to.equal(parseEther('0.4'));
                expect(totalSupply).to.equal(parseEther('1.3'));
            });
        });
        describe('emergencyEtherTransfer', () => {
            before(async () => {
                log("running emergencyEtherTransfer before");
                // await loadGlobalSnapshot();
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

                await addSnapshot('MockAaveV3-emergencyEtherTransfer')
            })
            after(async () => {
                log('running emergencyEtherTransfer after');
                await setCurrentSnapshot('contractDeployment');
            })
            it('should revert if sender is not owner', async () => {
                await expect(mockAaveV3.connect(lender1).emergencyEtherTransfer(lender1.address, parseEther('1.1'))).to.be.revertedWith('Ownable: caller is not the owner');
            });
            // TODO: In order to properly test this we will need to transfer ETH before the contract is deployed. We can do this but skipping for now
            it.skip('should send correct amount of ETH if owner', async () => {
                const borrowerEthBefore = await ethers.provider.getBalance(borrower1.address);
                const aethAddress = await aeth.getAddress();
                const aethEthBalanceBefore = await ethers.provider.getBalance(aethAddress);
                const totalSupplyBefore = await aeth.totalSupply();
                expect(borrowerEthBefore).to.equal(parseEther('10000'));
                expect(aethEthBalanceBefore).to.equal(parseEther('1.6'));
                expect(totalSupplyBefore).to.equal(parseEther('1.6'));
                await mockAaveV3.connect(deployer).emergencyEtherTransfer(borrower1.address, parseEther('1.1'));
                const aethEthBalanceAfter = await ethers.provider.getBalance(aethAddress);
                const totalSupplyAfter = await aeth.totalSupply();
                const borrowerEthAfter = await ethers.provider.getBalance(borrower1.address);
                expect(borrowerEthAfter).to.equal(parseEther('10001.1'));
                expect(aethEthBalanceAfter).to.equal(parseEther('0.5'));
                expect(totalSupplyAfter).to.equal(parseEther('1.6'));  // aETH balance stays the same and gets out of sync (hence emergency)
            });
            // TODO: In order to properly test this we will need to transfer ETH before the contract is deployed. We can do this but skipping for now
            it.skip('should send all ETH if owner', async () => {
                const borrowerEthBefore = await ethers.provider.getBalance(borrower1.address);
                const aethAddress = await aeth.getAddress();
                const aethEthBalanceBefore = await ethers.provider.getBalance(aethAddress);
                const totalSupplyBefore = await aeth.totalSupply();
                expect(borrowerEthBefore).to.equal(parseEther('10000'));
                expect(aethEthBalanceBefore).to.equal(parseEther('1.6'));
                expect(totalSupplyBefore).to.equal(parseEther('1.6'));
                await mockAaveV3.connect(deployer).emergencyEtherTransfer(borrower1.address, parseEther('1.6'));
                const aethEthBalanceAfter = await ethers.provider.getBalance(aethAddress);
                const totalSupplyAfter = await aeth.totalSupply();
                const borrowerEthAfter = await ethers.provider.getBalance(borrower1.address);
                expect(borrowerEthAfter).to.equal(parseEther('10001.6'));
                expect(aethEthBalanceAfter).to.equal(parseEther('0'));
                expect(totalSupplyAfter).to.equal(parseEther('1.6'));  // aETH balance stays the same and gets out of sync (hence emergency)
            });
        });
    });
    describe('MockChainlinkAggregator', () => {
        it('should have 8 decimals', async() => {
            const decimals = await mockChainlinkAggregator.decimals()
            expect(decimals).to.equal(8);
        });
        it('should match deploy specs', async() => {
            const {roundId, answer, startedAt, updatedAt, answeredInRound} = await mockChainlinkAggregator.latestRoundData();
            expect(answer).to.equal(185211030001);
            expect(roundId).to.equal(1);
        });
        it('should update price with updateAnswer', async() => {
            await mockChainlinkAggregator.updateAnswer(parseUnits('2000.12345678', 8));
            const {roundId, answer, startedAt, updatedAt, answeredInRound} = await mockChainlinkAggregator.latestRoundData();
            expect(answer).to.equal(200012345678);
            expect(answer).to.equal(parseUnits('2000.12345678', 8));
            expect(roundId).to.equal(2);
            await mockChainlinkAggregator.updateAnswer(parseUnits('3022.87654321', 8));
            const { roundId: roundId2, answer: answer2 } = await mockChainlinkAggregator.latestRoundData();
            expect(answer2).to.equal(parseUnits('3022.87654321', 8));
            expect(roundId2).to.equal(3);
        });
    });
    // describe('PoolShareToken', () => {});
    describe('USDCoin', () => {
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
    });
});
