import { BigNumber } from '@ethersproject/bignumber';
import * as chai from 'chai';
import { expect } from 'chai';
const chaiAsPromised = require('chai-as-promised');
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';

chai.use(chaiAsPromised);

async function deployContract(deployer: SignerWithAddress) {
    const token = await ethers.getContractFactory("DemoToken", deployer);
    const tokenContract = await token.deploy();

    await tokenContract.transfer(deployer.address, parseEther(100 * 10**6));

    const nft = await ethers.getContractFactory("NftDemo", deployer);
    const nftContract = await nft.deploy();


    const auction = await ethers.getContractFactory("Auction", deployer);
    const auctionContract = await auction.deploy(tokenContract.address, nftContract.address);

    nftContract.mint(deployer.address);
    nftContract.mint(deployer.address);
    nftContract.mint(deployer.address);
    nftContract.mint(deployer.address);
    nftContract.mint(deployer.address);

    return [ tokenContract, nftContract, auctionContract];
}

function parseEther(amount: Number) {
    return ethers.utils.parseUnits(amount.toString(), 18);
}

describe('Auction contract', function() {
    it("Check Deploy", async function(){
        const [ owner ] = await ethers.getSigners();
        const [tokenContract, nftContract, auctionContract] = await deployContract(owner)
    })

    it("Create Aution", async function(){
        const [ owner, user1 ] = await ethers.getSigners();
        const [tokenContract, nftContract, auctionContract] = await deployContract(owner)
        await nftContract.transferFrom(owner.address, user1.address, 0)
        expect(await nftContract.balanceOf(user1.address)).equal(1)
        await expect(auctionContract.connect(user1).createAution(0, parseEther(1000), 86400 * 3)).revertedWith("");
        await expect(auctionContract.connect(owner).createAution(0, parseEther(1000), 86400 * 3)).revertedWith("");
        await nftContract.connect(user1).approve(auctionContract.address, 0)
        await auctionContract.connect(user1).createAution(0, parseEther(1000), 86400 * 3)
        const AutionLists = await auctionContract.AutionLists(0)
        console.log(AutionLists, "AutionLists")
    })

    it("Test Bid Nft", async function(){
        const [ owner, user1, user2, user3 ] = await ethers.getSigners();
        const [tokenContract, nftContract, auctionContract] = await deployContract(owner)
        await nftContract.transferFrom(owner.address, user1.address, 0)
        expect(await nftContract.balanceOf(user1.address)).equal(1)

        await nftContract.connect(user1).approve(auctionContract.address, 0)
        await auctionContract.connect(user1).createAution(0, parseEther(500), 86400 * 3)
        await expect(auctionContract.connect(user2).userAutionBid(1, parseEther(100))).revertedWith("");

        await tokenContract.transfer(user2.address, parseEther(10000))
        await expect(auctionContract.connect(user2).userAutionBid(0, parseEther(1000))).revertedWith("")
        await tokenContract.connect(user2).approve(auctionContract.address, tokenContract.balanceOf(user2.address))
        await auctionContract.connect(user2).userAutionBid(0, parseEther(1000))

        await tokenContract.transfer(user3.address, parseEther(10000))
        await tokenContract.connect(user3).approve(auctionContract.address, tokenContract.balanceOf(user3.address))
        await auctionContract.connect(user3).userAutionBid(0, parseEther(2000))

        await auctionContract.connect(user2).userAutionBid(0, parseEther(3000))

        await expect(auctionContract.connect(user1).setEndedAution(1)).revertedWith("")
        await expect(auctionContract.connect(user1).setEndedAution(0)).revertedWith("")

        // increase time
        ethers.provider.send("evm_increaseTime", [86400 * 3]);
        ethers.provider.send("evm_mine",[]);
        await auctionContract.connect(user1).setEndedAution(0)

        expect(await nftContract.balanceOf(user2.address)).equal(1)
        expect(await tokenContract.balanceOf(user1.address)).equal(parseEther(3000 * 0.95))
        expect(await tokenContract.balanceOf(user2.address)).equal(parseEther(7000))
        expect(await tokenContract.balanceOf(user3.address)).equal(parseEther(10000))

        // re create aution
        await nftContract.connect(user2).approve(auctionContract.address, 0)
        await auctionContract.connect(user2).createAution(0, parseEther(400), 86400 * 3)
        await expect(auctionContract.connect(user3).userAutionBid(0, parseEther(300))).revertedWith("")
        await auctionContract.connect(user3).userAutionBid(0, parseEther(500))
    })

});
