// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "openzeppelin-solidity/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract DemoToken is ERC20Burnable{
    constructor() ERC20("Demo Token", "DEMO") {
        _mint(msg.sender,500000000 * 10**18);
    }
}
