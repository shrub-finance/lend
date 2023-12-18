import { ethers, deployments, network, getNamedAccounts } from 'hardhat';
import chai from 'chai';
import { LendingPlatform, PoolShareToken__factory, USDCoin, AETH, BorrowPositionToken, MockAaveV3, PoolShareToken } from '../typechain-types';
import {formatEther, parseEther, parseUnits} from 'ethers';
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";
import {ContractTransactionResponse} from "ethers";
import assert from "node:assert/strict";

const { expect } = chai;

const timestampsObj = {
    jan0126: 1767225600,
    feb0126: 1769904000,
    mar0126: 1772323200
};

const currentLogLevel = process.env.LOG_LEVEL || 'none';

function log(msg: any, level = 'verbose') {
    if (currentLogLevel === 'verbose') {
        console.log(msg);
    }
}


describe('testSuite', () => {
    let snapshotId: any;
    let globalSnapshotId: any;
    let initialSnapshotId: any;
    let aeth: AETH;
    let borrowPositionToken: BorrowPositionToken;
    let lendingPlatform: LendingPlatform;
    let mockAaveV3: MockAaveV3;
    let poolShareToken: PoolShareToken;
    let usdc: USDCoin;
    let deployer: HardhatEthersSigner;
    let lender1: HardhatEthersSigner;
    let lender2: HardhatEthersSigner;
    let lender3: HardhatEthersSigner;
    let borrower1: HardhatEthersSigner;
    let borrower2: HardhatEthersSigner;
    let borrower3: HardhatEthersSigner;


    async function loadGlobalSnapshot() {
        await network.provider.request({
            method: 'evm_revert',
            params: [snapshotId]
        })

        const newGlobal = snapshotId === globalSnapshotId;

        snapshotId = await network.provider.request({
            method: 'evm_snapshot',
        });

        if (newGlobal) {
            // If the globalSnapshotId was consumed, then update it
            globalSnapshotId = snapshotId;
        }
    }

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

        initialSnapshotId = await network.provider.request({
            method: 'evm_snapshot',
        })
        await deployments.fixture();
        globalSnapshotId = await network.provider.request({
            method: 'evm_snapshot',
        });
        snapshotId = globalSnapshotId;

        const aETHDeployment = await deployments.get('AETH');
        const borrowPositionTokenDeployment = await deployments.get('BorrowPositionToken');
        const lendingPlatformDeployment = await deployments.get('LendingPlatform');
        const mockAaveV3Deployment = await deployments.get('MockAaveV3');
        // const poolShareTokenDeployment = await deployments.get('PoolShareToken');
        const usdCoinDeployment = await deployments.get('USDCoin');

        aeth = await ethers.getContractAt("AETH", aETHDeployment.address);
        borrowPositionToken = await ethers.getContractAt("BorrowPositionToken", borrowPositionTokenDeployment.address);
        lendingPlatform = await ethers.getContractAt("LendingPlatform", lendingPlatformDeployment.address);
        mockAaveV3 = await ethers.getContractAt("MockAaveV3", mockAaveV3Deployment.address);
        // poolShareToken = await ethers.getContractAt("PoolShareToken", poolShareTokenDeployment.address);
        usdc = await ethers.getContractAt("USDCoin", usdCoinDeployment.address);

        await aeth.waitForDeployment();
        await borrowPositionToken.waitForDeployment();
        await lendingPlatform.waitForDeployment();
        await mockAaveV3.waitForDeployment();
        // await poolShareToken.waitForDeployment();
        await usdc.waitForDeployment();
    })

    beforeEach(async () => {
        log(`running global beforeEach`);
        log(`Block: ${await ethers.provider.getBlockNumber()}`);
       await loadGlobalSnapshot();
    });

    afterEach(async () => {
        log(`running global afterEach - ${snapshotId}`);
        await loadGlobalSnapshot();
        // log(`current block: ${await ethers.provider.getBlockNumber()}`);
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
            let localSnapshotId: any
            before(async () => {
                log("running withdraw before");
                await loadGlobalSnapshot();
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

                localSnapshotId = await network.provider.request({
                    method: 'evm_snapshot',
                });
                snapshotId = localSnapshotId;
            })
            after(() => {
                log('running withdraw after');
                log(`changing snapshotId (${snapshotId}) to globalSnapshotId (${globalSnapshotId})`);
                snapshotId = globalSnapshotId;
            })
            it('should revert if not the owner of contract', async() => {
                const ethBalanceBefore = await ethers.provider.getBalance(lender1.address);
                await expect(aeth.connect(lender1).withdraw(lender1.address, parseEther('1.1'), lender1.address)).to.be.revertedWith('Ownable: caller is not the owner');
                // const lender1AethBalanceAfter = await aeth.balanceOf(lender1.address);
                // const totalSupply = await aeth.totalSupply();
                // const ethBalanceAfter = await ethers.provider.getBalance(lender1.address);
                // expect(totalSupply).to.equal(parseEther('0.5'));
                // expect(lender1AethBalanceAfter).to.equal(parseEther('0'));
                // expect(ethBalanceAfter).to.equal(ethBalanceBefore + parseEther('1.1') - txFee);
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
            let localSnapshotId: any;
            before(async () => {
                log("running emergencyEtherTransfer before");
                await loadGlobalSnapshot();
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

                localSnapshotId = await network.provider.request({
                    method: 'evm_snapshot',
                });
                snapshotId = localSnapshotId;
            })
            after(() => {
                log('running emergencyEtherTransfer after');
                log(`changing snapshotId (${snapshotId}) to globalSnapshotId (${globalSnapshotId})`);
                snapshotId = globalSnapshotId;
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
    describe.only('Lend', () => {
        // TODO: skipping internal functions (i.e. insertIntoSortedArr, indexActivePools) - may need to do something later
        describe('bytesToString', () => {});
        describe('getEthPrice', () => {});
        describe('maxLoan', () => {});
        describe('requiredCollateral', () => {});
        describe('getLatestAethPrice', () => {});
        describe('getAethInterest', () => {});
        describe('getDeficitForPeriod', () => {});
        describe('getAvailableForPeriod', () => {});
        describe('getTotalLiquidity', () => {});
        describe('getPool', () => {});
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
        describe('createPool', () => {});
        describe('getUsdcAddress', () => {});
        describe('deposit', () => {});
        describe('withdraw', () => {});
        describe('takeLoan', () => {});
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
            let localSnapshotId: any
            before(async () => {
                log("running withdraw before");
                await loadGlobalSnapshot();
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

                localSnapshotId = await network.provider.request({
                    method: 'evm_snapshot',
                });
                snapshotId = localSnapshotId;
            })
            after(() => {
                log('running withdraw after');
                log(`changing snapshotId (${snapshotId}) to globalSnapshotId (${globalSnapshotId})`);
                snapshotId = globalSnapshotId;
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
            let localSnapshotId: any;
            before(async () => {
                log("running emergencyEtherTransfer before");
                await loadGlobalSnapshot();
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

                localSnapshotId = await network.provider.request({
                    method: 'evm_snapshot',
                });
                snapshotId = localSnapshotId;
            })
            after(() => {
                log('running emergencyEtherTransfer after');
                log(`changing snapshotId (${snapshotId}) to globalSnapshotId (${globalSnapshotId})`);
                snapshotId = globalSnapshotId;
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
