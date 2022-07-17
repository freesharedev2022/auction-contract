// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol";

contract Auction is Ownable {
    ERC20 public tokenAddres;
    ERC721 public nftAddress;

    struct AutionData {
        address owner;
        uint nftId;
        uint price;
        uint timeStamp;
        uint timeEnded;
        bool isAution;
        address winner;
        uint winnerPrice;
    }

    struct UserAution {
        address owner;
        uint nftId;
        uint price;
        uint timeStamp;
        bool isActive;
    }

    mapping(uint=> AutionData) public AutionLists;
    mapping(uint => UserAution[]) public AutionUsers;
    mapping(uint => mapping(address=>uint)) public ValueLastBid;
    mapping(address => UserAution[]) public MyAuctions;
    uint8 fee = 5; // 5%

    event CreateAution(address owner, uint nftId, uint price, uint timeStamp, uint timeEnded);
    event CreateBid(address owner, uint nftId, uint price , uint timeStamp);
    event FinishAution(uint nftId, address owner, address winner, uint winnerPrice, uint timestamp);

    constructor(ERC20 _token, ERC721 _nft){
        tokenAddres = _token;
        nftAddress = _nft;
    }

    function createAution(uint _nftId, uint _price, uint time) external {
        require(time > 0,  "Time aution must greater 0");
        require(_nftId >= 0,  "Id nft must greater 0");
        require(_price > 0,  "Price must greater 0");
        AutionData memory audata = AutionLists[_nftId];
        if(audata.isAution == true) revert("Aution is in active, please cancel aution previous");
        nftAddress.transferFrom(msg.sender, address(this), _nftId);
        AutionLists[_nftId] = AutionData(msg.sender, _nftId, _price, block.timestamp, block.timestamp + time, true, address(0), 0);
        emit CreateAution(msg.sender, _nftId, _price, block.timestamp, block.timestamp + time);
    }

    function userAutionBid(uint _nftId, uint _price) external {
        require(_nftId >= 0,  "Id nft must greater 0");
        AutionData memory audata = AutionLists[_nftId];
        if(audata.isAution == false) revert("Aution is inactive");
        if(audata.timeEnded < block.timestamp) revert("Aution is ended");
        UserAution[] memory bids = AutionUsers[_nftId];
        uint lastBid = audata.price;
        if(bids.length > 0) lastBid = bids[bids.length - 1].price;
        require(_price > lastBid, "Price must greater lastBid");

        uint calPrice = _caculatorPrice(_nftId);

        SafeERC20.safeTransferFrom(tokenAddres, msg.sender, address(this), _price - calPrice);
        UserAution memory _autionUser = UserAution(msg.sender, _nftId, _price, block.timestamp, true);
        AutionUsers[_nftId].push(_autionUser);
        ValueLastBid[_nftId][msg.sender] = _price - calPrice;
        MyAuctions[msg.sender].push(_autionUser);
        emit CreateBid(msg.sender, _nftId, _price , block.timestamp);
    }

    function _caculatorPrice(uint _nftId) private view returns (uint price) {
        UserAution[] memory bids = AutionUsers[_nftId];
        price = 0;
        for(uint i=0; i<bids.length; i++){
            if(bids[i].owner == msg.sender){
                price = bids[i].price;
            }
        }
    }

    function setEndedAution(uint _nftId) external {
        AutionData memory audata = AutionLists[_nftId];
        if(audata.timeEnded > block.timestamp) revert("Aution is aution");
        if(audata.isAution == false) revert("Aution is aution");
        address winner = address(0);
        UserAution[] memory bids = AutionUsers[_nftId];
        uint winnerPrice = 0;
        if(bids.length>0){
            winner = AutionUsers[_nftId][bids.length - 1].owner;
            AutionLists[_nftId].winner = winner;
            winnerPrice = AutionUsers[_nftId][bids.length - 1].price;
        }
        AutionLists[_nftId].isAution = false;
        AutionLists[_nftId].winnerPrice = winnerPrice;
        AutionLists[_nftId].timeEnded = 0;
        AutionLists[_nftId].timeStamp = 0;
        AutionLists[_nftId].price = 0;
        _caculatorReturnToken(_nftId, winner);
        _claimNft(_nftId);
        // delete history
        delete AutionUsers[_nftId];

        emit FinishAution(_nftId, audata.owner, winner, winnerPrice, block.timestamp);
    }

    function _caculatorReturnToken(uint _nftId, address _winner) private {
        UserAution[] memory bids = AutionUsers[_nftId];
        if(bids.length == 0) return;
        for(uint i = bids.length; i>0; i--){
            if(bids[i-1].owner != _winner && ValueLastBid[_nftId][bids[i-1].owner] == bids[i-1].price){
                SafeERC20.safeTransfer(tokenAddres, bids[i-1].owner, bids[i-1].price);
            }
        }
    }

    function _claimNft(uint _nftId) private {
        AutionData memory audata = AutionLists[_nftId];
        if(audata.winner != address(0) && audata.isAution == false){
            nftAddress.transferFrom(address(this), audata.winner, _nftId);
            AutionLists[_nftId].winner = address(0);
            AutionLists[_nftId].owner = audata.winner;
            SafeERC20.safeTransfer(tokenAddres, audata.owner, audata.winnerPrice * (100 - fee)/100);
        }
    }

    fallback () external {
        revert();
    }
}
