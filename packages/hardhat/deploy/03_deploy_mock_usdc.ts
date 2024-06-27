import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";
import USDCAbi from "../abis/FiatTokenV2_2.json";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, network, deployAndVerify} = hre;
  const {deployer} = await getNamedAccounts();

  const USDC_INITIAL_SUPPLY = 1e6 // 1 million initial supply

  if (network.name === 'sepolia') {
    await deployments.save('USDCoin', {abi: [USDCAbi], address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'})
    return;
  }

  await deployAndVerify("USDCoin", {
    from: deployer,
    log: true,
    args: [USDC_INITIAL_SUPPLY]
  });
};
export default func;
func.id = "deploy_mock_usdc"; // id to prevent re-execution
func.tags = ["MockUsdc"];
