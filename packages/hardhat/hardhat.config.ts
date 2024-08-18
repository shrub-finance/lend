import {extendConfig, extendEnvironment} from "hardhat/config";
import {HardhatConfig, HardhatUserConfig} from "hardhat/types";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "hardhat-contract-sizer";
import "hardhat-abi-exporter";
import "./hardhat-tasks";
import "./hardhat-tests";

import dotenv from "dotenv";
import {DeployOptions} from "hardhat-deploy/dist/types";
import {contractAddresses} from "./deploy-constants";
dotenv.config();

extendEnvironment((hre) => {
    hre.init = async() =>  {
        const {ethers, deployments, getNamedAccounts} = hre;
        const { account1, account2, account3, account4, account5, account6, deployer, shrubTreasury } = await getNamedAccounts()
// @ts-ignore
      global.aeth = await ethers.getContractAt("AETH", (await deployments.get('AETH')).address);
// @ts-ignore
        global.usdc = await ethers.getContractAt("USDCoin", (await deployments.get('USDCoin')).address);
// @ts-ignore
        global.bpt = await ethers.getContractAt("BorrowPositionToken", (await deployments.get('BorrowPositionToken')).address);
// @ts-ignore
        global.lendingPlatform = await ethers.getContractAt("LendingPlatform", (await deployments.get('LendingPlatform')).address);
// @ts-ignore
        global.mockAaveV3 = await ethers.getContractAt("MockAaveV3", (await deployments.get('MockAaveV3')).address);
// @ts-ignore
        global.mockChainlinkAggregator = await ethers.getContractAt("MockChainlinkAggregator", (await deployments.get('MockChainlinkAggregator')).address);

// @ts-ignore
        global.account1 = account1;
// @ts-ignore
        global.account2 = account2;
// @ts-ignore
        global.account3 = account3;
// @ts-ignore
        global.account4 = account4;
// @ts-ignore
        global.account5 = account5;
// @ts-ignore
        global.account6 = account6;
// @ts-ignore
        global.deployer = deployer;
// @ts-ignore
        global.shrubTreasury = shrubTreasury;
    }
});
extendEnvironment((hre) => {
  hre.deployAndVerify = async(name: string, options: DeployOptions) => {
    const { deployments, run, network } = hre;
    const { deploy } = deployments;
    const deployResult = await deploy(name, {...options, autoMine:true});
    if (process.env.ETHERSCAN_VERIFY !== "true" || ['hardhat', 'localhost'].includes(network.name)) {
      // Skip verification if local testing
      return deployResult;
    }
    await run('verify:verify', {
      address: deployResult.address,
      constructorArgsParams: deployResult.args,
      libraries: deployResult.libraries
    })
    return deployResult;
  }

  hre.skipDeployIfExists = async(name: string) => {
    const { deployments, network } = hre;

    if (!contractAddresses[name].networks[network.name]) {
      return false;
    }
    const { abi } = contractAddresses[name];
    const address = contractAddresses[name].networks[network.name];
    await deployments.save(name, { abi, address })
    return true;
  }
})

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1
          }
        }
      },
      { version: "0.4.18" }
    ]
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
//       allowUnlimitedContractSize: true,
      chainId: 1337,
      gasPrice: 80e9,
      // chainId: 1337,
      mining: {
        auto: false,
        interval: [3000, 3500] // Simulate mining time between 3 and 6 seconds
      }
    }
  },
  namedAccounts: {
    deployer: 0,
    shrubTreasury: 1,
    account1: 2,
    account2: 3,
    account3: 4,
    account4: 5,
    account5: 6,
    account6: 7,
  },
    abiExporter: {
        path: "../subgraph/abis",
        runOnCompile: true,
        clear: true,
        flat: true,
        only: ["LendingPlatform", "USDCoin", "PoolShareToken"]
    }
};

if (
  process.env.HOLESKY_SECRET_KEY &&
  process.env.HOLESKY_TREASURY_SECRET_KEY &&
  config.networks
) {
  config.networks.holesky = {
    url: "https://rpc.holesky.ethpandaops.io",
    chainId: 17000,
    accounts: [
      process.env.HOLESKY_SECRET_KEY,
      process.env.HOLESKY_TREASURY_SECRET_KEY
    ]
  };
}

// On purpose using same accounts for Holesky and Sepolia
if (
  process.env.HOLESKY_SECRET_KEY &&
  process.env.HOLESKY_TREASURY_SECRET_KEY &&
  config.networks
) {
  config.networks.sepolia = {
    url: "https://11155111.rpc.thirdweb.com",
    chainId: 11155111,
    accounts: [
      process.env.HOLESKY_SECRET_KEY,
      process.env.HOLESKY_TREASURY_SECRET_KEY
    ]
  };
}

if (process.env.ETHERSCAN_SEPOLIA_KEY) {
  if (!config.etherscan) {
    config.etherscan = {apiKey: {sepolia: process.env.ETHERSCAN_SEPOLIA_KEY}}
  } else if (!config.etherscan.apiKey) {
    config.etherscan.apiKey = {sepolia: process.env.ETHERSCAN_SEPOLIA_KEY}
  } else if (typeof config.etherscan.apiKey !== 'string') {
    config.etherscan.apiKey = {...config.etherscan.apiKey, sepolia: process.env.ETHERSCAN_SEPOLIA_KEY}
  }
}

export default config;
