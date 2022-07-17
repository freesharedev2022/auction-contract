import { ethers, hardhatArguments } from 'hardhat';
import * as Config from './config';

async function main() {
    const network = hardhatArguments.network ? hardhatArguments.network : 'dev';
    await Config.initConfig();

    const tokenContract = await deployDemoToken()
    Config.setConfig(network+'.Token', tokenContract);

    const nftContract = await deployNftToken()
    Config.setConfig(network+'.Nft', nftContract);

    const auctionContract = await deployAuction(tokenContract, nftContract)
    Config.setConfig(network+'.Auction', auctionContract);

    await Config.updateConfig();
}

async function deployDemoToken() {
    const [deployer] = await ethers.getSigners();
    console.log('deploy from address: ', deployer.address);
    const DemoToken = await ethers.getContractFactory('DemoToken');
    const token = await DemoToken.deploy();
    console.log('Token address: ', token.address);
    return token.address
}

async function deployNftToken() {
    const [deployer] = await ethers.getSigners();
    console.log('deploy from address: ', deployer.address);
    const NftToken = await ethers.getContractFactory('NftDemo');
    const token = await NftToken.deploy();
    console.log('NftToken address: ', token.address);
    return token.address
}

async function deployAuction(_token: string, _nft: string) {
    const [deployer] = await ethers.getSigners();
    console.log('deploy from address: ', deployer.address);
    const Auction = await ethers.getContractFactory('Auction');
    const token = await Auction.deploy(_token, _nft);
    console.log('Auction address: ', token.address);
    return token.address
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
