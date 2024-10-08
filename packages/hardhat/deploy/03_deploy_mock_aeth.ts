import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";

const deployName = 'AETH';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {getNamedAccounts, deployAndVerify, skipDeployIfExists} = hre;
    const {deployer} = await getNamedAccounts();

    const alreadyPresent = await skipDeployIfExists(deployName);
    if (alreadyPresent) {
      return;
    }

    const AETH_NAME = "Mock Aave Ethereum WETH";
    const AETH_SYMBOL = "aEthWETH";

    await deployAndVerify(deployName, {
        from: deployer,
        log: true,
        args: [AETH_NAME, AETH_SYMBOL]
    });
};
export default func;
func.id = "deploy_mock_aeth"; // id to prevent re-execution
func.tags = [deployName];
