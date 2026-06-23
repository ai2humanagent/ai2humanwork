// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {B20Constants} from "base-std/lib/B20Constants.sol";
import {B20FactoryLib} from "base-std/lib/B20FactoryLib.sol";
import {IB20Factory} from "base-std/interfaces/IB20Factory.sol";
import {StdPrecompiles} from "base-std/StdPrecompiles.sol";

/// @notice Deploys an AI2Human B20 Asset token on Base Sepolia through the B20Factory precompile.
/// @dev Requires Base Foundry (`base-forge`) on Beryl-enabled Base networks.
contract CreateAI2HumanB20 is Script {
    address public token;

    function run() external returns (address) {
        address admin = vm.envAddress("ACCOUNT_ADDRESS");
        string memory name = vm.envOr("B20_NAME", string("AI2Human Verified Proof Token"));
        string memory symbol = vm.envOr("B20_SYMBOL", string("A2HP"));
        uint8 decimals = uint8(vm.envOr("B20_DECIMALS", uint256(18)));
        uint256 supplyCapTokens = vm.envOr("B20_SUPPLY_CAP_TOKENS", uint256(1_000_000));
        string memory saltText = vm.envOr("B20_SALT", string("ai2human-b20-base-sepolia-v1"));
        string memory contractUri = vm.envOr(
            "B20_CONTRACT_URI",
            string("https://ai2human.work/agent/b20/manifest.json")
        );

        require(decimals >= 6 && decimals <= 18, "B20 decimals must be 6-18");
        uint256 unit = 10 ** decimals;
        uint256 supplyCap = supplyCapTokens * unit;
        require(supplyCap <= type(uint128).max, "B20 supply cap too large");

        bytes memory params = B20FactoryLib.encodeAssetCreateParams(name, symbol, admin, decimals);
        bytes[] memory initCalls = new bytes[](8);
        initCalls[0] = B20FactoryLib.encodeGrantRole(B20Constants.MINT_ROLE, admin);
        initCalls[1] = B20FactoryLib.encodeGrantRole(B20Constants.BURN_ROLE, admin);
        initCalls[2] = B20FactoryLib.encodeGrantRole(B20Constants.BURN_BLOCKED_ROLE, admin);
        initCalls[3] = B20FactoryLib.encodeGrantRole(B20Constants.PAUSE_ROLE, admin);
        initCalls[4] = B20FactoryLib.encodeGrantRole(B20Constants.UNPAUSE_ROLE, admin);
        initCalls[5] = B20FactoryLib.encodeGrantRole(B20Constants.METADATA_ROLE, admin);
        initCalls[6] = B20FactoryLib.encodeGrantRole(B20Constants.OPERATOR_ROLE, admin);
        initCalls[7] = B20FactoryLib.encodeUpdateSupplyCap(supplyCap);

        if (bytes(contractUri).length > 0) {
            bytes[] memory expanded = new bytes[](9);
            for (uint256 i = 0; i < initCalls.length; i++) {
                expanded[i] = initCalls[i];
            }
            expanded[8] = B20FactoryLib.encodeUpdateContractURI(contractUri);
            initCalls = expanded;
        }

        bytes32 salt = keccak256(bytes(saltText));

        vm.startBroadcast();
        token = StdPrecompiles.B20_FACTORY.createB20(
            IB20Factory.B20Variant.ASSET,
            salt,
            params,
            initCalls
        );
        vm.stopBroadcast();

        console.log("AI2Human B20 token:", token);
        console.log("Admin:", admin);
        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Supply cap tokens:", supplyCapTokens);
        return token;
    }
}
