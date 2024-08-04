import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";

const deployName = 'USDCoin';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {getNamedAccounts, deployAndVerify, skipDeployIfExists} = hre;
  const {deployer} = await getNamedAccounts();

  const USDC_INITIAL_SUPPLY = 1e6 // 1 million initial supply

  const alreadyPresent = await skipDeployIfExists(deployName);
  if (alreadyPresent) {
    return;
  }
  // if (contractAddresses.USDCoin.networks[network.name]) {
  //   const { abi } = contractAddresses.USDCoin;
  //   const address = contractAddresses.USDCoin.networks[network.name];
  //   await deployments.save('USDCoin', { abi, address })
  //   return;
  // }
  // if (network.name === 'sepolia') {
  //   await deployments.save('USDCoin', {abi: USDCAbi, address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'})
  //   return;
  // }

  await deployAndVerify(deployName, {
    from: deployer,
    log: true,
    args: [USDC_INITIAL_SUPPLY]
  });
};
export default func;
func.id = "deploy_mock_usdc"; // id to prevent re-execution
func.tags = [deployName];
