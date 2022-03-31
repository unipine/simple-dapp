import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { BigNumber, ContractTransaction, ContractReceipt } from 'ethers'
import '@openzeppelin/hardhat-upgrades'
import '@nomiclabs/hardhat-ethers'

import { Pool__factory } from '../build/types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const { getContractFactory, getSigners } = ethers

describe('Pool', async () => {
  let pool
  let signers: SignerWithAddress[]

  before(async () => {
    signers = await getSigners()

    // deploy the basic version
    const poolFactory = (await getContractFactory('Pool', signers[1])) as Pool__factory
    pool = await upgrades.deployProxy(poolFactory, { initializer: 'initialize' })
    await pool.deployed()

    expect(await pool.name()).to.eq("ETHPool")
    expect(await pool.version()).to.eq("1.0.0")
    expect(upgrades.deployProxy(poolFactory, { initializer: 'initialize' })).to.be.revertedWith("already initialized")
  })

  it('Deposit: First User', async () => {
    const transaction: ContractTransaction = await pool.connect(signers[2]).deposit({ value: ethers.utils.parseEther("0.001") })
    const receipt: ContractReceipt = await transaction.wait()

    expect(receipt.events[0].event).to.eq("Deposit")
    expect(receipt.events[0].args.user).to.eq(signers[2].address)
    expect(receipt.events[0].args.amount).to.eq(getBigNumber(1))
    expect(await ethers.provider.getBalance(pool.address)).to.eq(getBigNumber(1))
  })

  it('Deposit: Second User', async () => {
    const transaction: ContractTransaction = await pool.connect(signers[3]).deposit({ value: ethers.utils.parseEther("0.002") })
    const receipt: ContractReceipt = await transaction.wait()

    expect(receipt.events[0].event).to.eq("Deposit")
    expect(receipt.events[0].args.user).to.eq(signers[3].address)
    expect(receipt.events[0].args.amount).to.eq(getBigNumber(2))
    expect(await ethers.provider.getBalance(pool.address)).to.eq(getBigNumber(3))
  })

  it('Deposit: Owner', async () => {
    expect(pool.connect(signers[1]).deposit({ value: ethers.utils.parseEther("0.005") })).to.be.revertedWith("not user")
    expect(await ethers.provider.getBalance(pool.address)).to.eq(getBigNumber(3))
  })

  it('Deposit History', async () => {
    const history = await pool.depositHistory();

    expect(history[0]['user']).to.eq(signers[2].address)
    expect(history[0]['amount']).to.eq(getBigNumber(1))
    expect(history[1]['user']).to.eq(signers[3].address)
    expect(history[1]['amount']).to.eq(getBigNumber(2))
  })

  it('Rewards - Owner', async () => {
    const transaction: ContractTransaction = await pool.connect(signers[1]).reward({ value: ethers.utils.parseEther("0.003") })
    const receipt: ContractReceipt = await transaction.wait()

    expect(receipt.events[0].event).to.eq("Reward")
    expect(receipt.events[0].args.amount).to.eq(getBigNumber(3))
    expect(await ethers.provider.getBalance(pool.address)).to.eq(getBigNumber(6))
  })

  it('Rewards - User', async () => {
    expect(pool.connect(signers[2]).reward({ value: ethers.utils.parseEther("0.005") })).to.be.revertedWith("not owner")
    expect(await ethers.provider.getBalance(pool.address)).to.eq(getBigNumber(6))
  })

  it('Withdraw: First User', async () => {
    await expect(pool.connect(signers[2]).withdraw())
      .to.emit(pool, "Withdraw")
      .withArgs(signers[2].address, getBigNumber(1).toString(), getBigNumber(2).toString())

    expect(await ethers.provider.getBalance(pool.address)).to.eq(getBigNumber(4))
    expect(pool.connect(signers[2]).withdraw()).to.be.revertedWith("nothing deposited")
  })

  it('Withdraw: Second User', async () => {
    await expect(pool.connect(signers[3]).withdraw())
      .to.emit(pool, "Withdraw")
      .withArgs(signers[3].address, getBigNumber(2).toString(), getBigNumber(4).toString())

    expect(await ethers.provider.getBalance(pool.address)).to.eq(getBigNumber(0))
    expect(pool.connect(signers[3]).withdraw()).to.be.revertedWith("nothing deposited")
  })

  it('Withdraw: Owner', async () => {
    expect(pool.connect(signers[1]).withdraw()).to.be.revertedWith("not user")
  })

  it('Contract Stop Toggle', async () => {
    // stop the some functions in the contract
    await pool.connect(signers[1]).toggleStopped();

    expect(pool.connect(signers[2]).deposit({ value: ethers.utils.parseEther("0.005") })).to.be.revertedWith("stopped contract")

    // change contract state from stopped to working
    await pool.connect(signers[1]).toggleStopped();

    const transaction: ContractTransaction = await pool.connect(signers[2]).deposit({ value: ethers.utils.parseEther("0.001") })
    const receipt: ContractReceipt = await transaction.wait()

    expect(receipt.events[0].event).to.eq("Deposit")
    expect(receipt.events[0].args.user).to.eq(signers[2].address)
    expect(receipt.events[0].args.amount).to.eq(getBigNumber(1))
  })
})

function getBigNumber(amount: number) {
  return BigNumber.from(amount).mul(BigNumber.from(10).pow(15))
}
