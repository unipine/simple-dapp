import '@nomiclabs/hardhat-ethers'
import { ethers, upgrades } from 'hardhat'

async function main() {
  const signers = await ethers.getSigners()
  const factory = await ethers.getContractFactory("Pool", signers[0])

  console.log(' > Deploying Pool...')

  const contract = await upgrades.deployProxy(factory)

  await contract.deployed()

  console.log(' > Pool deployed to: ', contract.address)

  saveContractAddress(contract.address, signers[0].address)
}

function saveContractAddress(address: string, owner: string) {
  const fs = require("fs");
  const contractsDir = __dirname + "/../frontend/src/contracts/Pool.sol";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/Address.json",
    JSON.stringify({ address, owner }, undefined, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
