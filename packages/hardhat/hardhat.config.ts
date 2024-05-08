import {extendEnvironment, HardhatUserConfig} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "hardhat-abi-exporter";
import "./hardhat-tasks";
import "./hardhat-tests";

extendEnvironment((hre) => {
    hre.init = async() =>  {
        const {ethers, deployments, getNamedAccounts} = hre;
        const { account1, account2, account3, account4, account5, account6, deployer, shrubTreasury } = await getNamedAccounts()
        global.aeth = await ethers.getContractAt("AETH", (await deployments.get('AETH')).address);
        global.usdc = await ethers.getContractAt("USDCoin", (await deployments.get('USDCoin')).address);
        global.bpt = await ethers.getContractAt("BorrowPositionToken", (await deployments.get('BorrowPositionToken')).address);
        global.lendingPlatform = await ethers.getContractAt("LendingPlatform", (await deployments.get('LendingPlatform')).address);
        global.mockAaveV3 = await ethers.getContractAt("MockAaveV3", (await deployments.get('MockAaveV3')).address);
        global.mockChainlinkAggregator = await ethers.getContractAt("MockChainlinkAggregator", (await deployments.get('MockChainlinkAggregator')).address);
            
        global.account1 = account1;
        global.account2 = account2;
        global.account3 = account3;
        global.account4 = account4;
        global.account5 = account5;
        global.account6 = account6;
        global.deployer = deployer;
        global.shrubTreasury = shrubTreasury;
    }
});

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      chainId: 1337,
      // chainId: 1337,
      // mining: {
      //   auto: false,
      //   interval: [3000, 3500] // Simulate mining time between 3 and 6 seconds
      // }
    }
  },
  namedAccounts: {
    deployer: 0,
    account1: 1,
    account2: 2,
    account3: 3,
    account4: 4,
    account5: 5,
    account6: 6,
    shrubTreasury: 7
  },
    abiExporter: {
        path: "../subgraph/abis",
        runOnCompile: true,
        clear: true,
        flat: true,
        only: ["LendingPlatform", "USDCoin", "PoolShareToken"]
    }
};

export default config;
