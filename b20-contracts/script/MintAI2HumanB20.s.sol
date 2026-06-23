// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";

interface IB20Mintable {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/// @notice Mints a small test balance after the deployer has MINT_ROLE.
contract MintAI2HumanB20 is Script {
    function run() external {
        address token = vm.envAddress("TOKEN_ADDRESS");
        address recipient = vm.envAddress("ACCOUNT_ADDRESS");
        uint256 mintTokens = vm.envOr("B20_MINT_TOKENS", uint256(1_000));

        uint8 decimals = IB20Mintable(token).decimals();
        uint256 amount = mintTokens * (10 ** decimals);

        vm.startBroadcast();
        IB20Mintable(token).mint(recipient, amount);
        vm.stopBroadcast();

        console.log("Minted tokens:", mintTokens);
        console.log("Token:", token);
        console.log("Recipient:", recipient);
        console.log("Recipient raw balance:", IB20Mintable(token).balanceOf(recipient));
    }
}
