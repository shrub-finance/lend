import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {deployments, getNamedAccounts} = hre;
    const {deploy} = deployments;

    const {deployer} = await getNamedAccounts();

    const USDC_INITIAL_SUPPLY = 1e6 // 1 million initial supply

    const AETH_NAME = "Mock Aave Ethereum WETH";
    const AETH_SYMBOL = "aEthWETH";

    await deploy("USDCoin", {
        from: deployer,
        log: true,
        args: [USDC_INITIAL_SUPPLY]
    });

    await deploy("AETH", {
        from: deployer,
        log: true,
        args: [AETH_NAME, AETH_SYMBOL]
    });
};
export default func;
func.id = "deploy_mock_erc20"; // id to prevent re-execution
func.tags = ["MockErc20"];
