// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {SupplyChainTracker} from "../src/SupplyChainTracker.sol";

contract DeploySupplyChainTracker is Script {
    function run() external returns (SupplyChainTracker) {
        // Imprimir la dirección del broadcaster antes de iniciar
        console.log("Before vm.startBroadcast() - Sender:");
        console.log(msg.sender);

        vm.startBroadcast();

        console.log("After vm.startBroadcast() - Broadcaster:");
        console.log(msg.sender);

        SupplyChainTracker tracker = new SupplyChainTracker();

        console.log("Contract deployed at:");
        console.log(address(tracker));

        // Grant roles to transaction sender
        address deployer = msg.sender;
        tracker.grantRole(tracker.DEFAULT_ADMIN_ROLE(), deployer);
        tracker.grantRole(tracker.FABRICANTE_ROLE(), deployer);
        tracker.grantRole(tracker.AUDITOR_HW_ROLE(), deployer);
        tracker.grantRole(tracker.TECNICO_SW_ROLE(), deployer);
        tracker.grantRole(tracker.ESCUELA_ROLE(), deployer);

        console.log("Roles granted to:");
        console.log(deployer);

        vm.stopBroadcast();
        return tracker;
    }
}
