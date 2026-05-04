// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {SupplyChainTracker} from "../src/SupplyChainTracker.sol";

contract DeployAnvil is Script {
    // Helper functions to calculate role hashes locally
    function _roleAdmin() internal pure returns (bytes32) {
        return 0x0000000000000000000000000000000000000000000000000000000000000000;
    }

    function _roleFabricante() internal pure returns (bytes32) {
        return keccak256("FABRICANTE_ROLE");
    }

    function _roleAuditorHw() internal pure returns (bytes32) {
        return keccak256("AUDITOR_HW_ROLE");
    }

    function _roleTecnicoSw() internal pure returns (bytes32) {
        return keccak256("TECNICO_SW_ROLE");
    }

    function _roleEscuela() internal pure returns (bytes32) {
        return keccak256("ESCUELA_ROLE");
    }

    function run() external returns (SupplyChainTracker) {
        // Use the default Anvil account (unlocked)
        address deployer = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

        vm.startBroadcast(deployer);

        SupplyChainTracker tracker = new SupplyChainTracker();

        // Grant roles to the deployer
        tracker.grantRole(_roleAdmin(), deployer);
        tracker.grantRole(_roleFabricante(), deployer);
        tracker.grantRole(_roleAuditorHw(), deployer);
        tracker.grantRole(_roleTecnicoSw(), deployer);
        tracker.grantRole(_roleEscuela(), deployer);

        vm.stopBroadcast();

        // Log the contract address for easy reference
        console.log("SupplyChainTracker deployed at:", address(tracker));
        console.log("Deployer address:", deployer);

        return tracker;
    }
}