// scripts/mine-blocks.js
async function mineBlocks() {
  const hre = require("hardhat");
  const blocksToMine = 10; // Adjust number of blocks to mine as needed

  console.log(`Mining ${blocksToMine} blocks...`);
  for (let i = 0; i < blocksToMine; i++) {
    await hre.network.provider.send("evm_mine");
  }
  console.log("Mining completed.");
}

mineBlocks().catch((error) => {
  console.error("Error mining blocks:", error);
  process.exit(1);
});


