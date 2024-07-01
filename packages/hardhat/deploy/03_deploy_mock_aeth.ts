import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";
import aEthAbi from "../abis/AToken.json";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {getNamedAccounts, deployAndVerify, network, deployments} = hre;
  const {deployer} = await getNamedAccounts();

  const AETH_NAME = "Mock Aave Ethereum WETH";
  const AETH_SYMBOL = "aEthWETH";

  if (network.name === 'sepolia') {
    await deployments.save('AETH', {abi: aEthAbi, address: '0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830'})
    return;
  }

  await deployAndVerify("AETH", {
    from: deployer,
    log: true,
    args: [AETH_NAME, AETH_SYMBOL]
  });
};
export default func;
func.id = "deploy_mock_aeth"; // id to prevent re-execution
func.tags = ["MockAeth"];
