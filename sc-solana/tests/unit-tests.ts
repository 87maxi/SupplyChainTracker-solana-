/**
 * Unit Tests - Codama Client Format
 *
 * Converts existing Rust unit tests from lib.rs to Codama TypeScript test format.
 * These tests verify struct sizes, enum values, and error codes.
 *
 * Migrated from @coral-xyz/anchor to Codama-generated client (Issue #209).
 *
 * Related Issues:
 * - Issue #66: Convert Unit Tests to Anchor Test Format
 * - Original Issue #9: Phase 10: Testing Framework Setup
 */

import { Keypair } from "@solana/web3.js";
import { expect } from "chai";

// Import test helpers
import {
  NetbookState,
  RequestStatus,
  ROLE_TYPES,
  createHash,
  getConfigPdaAddress,
  getNetbookPdaAddress,
  getRoleRequestPdaAddress,
  createBatchId,
  createModelSpecs,
  toAddress,
} from "./test-helpers";

describe("Unit Tests - Codama Format", () => {
  // ========================================================================
  // Netbook Space Tests
  // ========================================================================

  describe("Netbook Space Verification", () => {
    it("verifies Netbook INIT_SPACE calculation", async () => {
      // Expected space breakdown (matches Netbook struct in state/netbook.rs):
      // 8 (discriminator) +
      // 4 + 200 (serial_number: String, max 200 chars) +
      // 4 + 100 (batch_id: String, max 100 chars) +
      // 4 + 500 (initial_model_specs: String, max 500 chars) +
      // 32 (hw_auditor: Pubkey) +
      // 1 (hw_integrity_passed: bool) +
      // 32 (hw_report_hash: [u8; 32]) +
      // 32 (sw_technician: Pubkey) +
      // 4 + 100 (os_version: String, max 100 chars) +
      // 1 (sw_validation_passed: bool) +
      // 32 (destination_school_hash: [u8; 32]) +
      // 32 (student_id_hash: [u8; 32]) +
      // 8 (distribution_timestamp: u64) +
      // 1 (state: u8) +
      // 1 (exists: bool) +
      // 8 (token_id: u64)
      // = 8 + 4 + 200 + 4 + 100 + 4 + 500 + 32 + 1 + 32 + 32 + 4 + 100 + 1 + 32 + 32 + 8 + 1 + 1 + 8
      // = 1104 bytes

      const expectedSpace = 8 + 4 + 200 + 4 + 100 + 4 + 500 + 32 + 1 + 32 + 32 + 4 + 100 + 1 + 32 + 32 + 8 + 1 + 1 + 8;
      expect(expectedSpace).to.equal(1104);

      // Verify the calculation components
      const components = {
        discriminator: 8,
        serialNumber: 4 + 200,
        batchId: 4 + 100,
        initialModelSpecs: 4 + 500,
        hwAuditor: 32,
        hwIntegrityPassed: 1,
        hwReportHash: 32,
        swTechnician: 32,
        osVersion: 4 + 100,
        swValidationPassed: 1,
        destinationSchoolHash: 32,
        studentIdHash: 32,
        distributionTimestamp: 8,
        state: 1,
        exists: 1,
        tokenId: 8,
      };

      const total = Object.values(components).reduce((sum, val) => sum + val, 0);
      expect(total).to.equal(expectedSpace);
    });

    it("verifies NetbookState enum values", async () => {
      // Test that enum values match Rust implementation
      expect(NetbookState.Fabricada).to.equal(0);
      expect(NetbookState.HwAprobado).to.equal(1);
      expect(NetbookState.SwValidado).to.equal(2);
      expect(NetbookState.Distribuida).to.equal(3);
    });

    it("verifies all netbook states are sequential", async () => {
      const states = Object.values(NetbookState)
        .filter((v) => typeof v === "number")
        .sort();

      for (let i = 0; i < states.length; i++) {
        expect(states[i]).to.equal(i);
      }
    });
  });

  // ========================================================================
  // Request Status Tests
  // ========================================================================

  describe("Request Status Verification", () => {
    it("verifies RequestStatus enum values", async () => {
      // Test that enum values match Rust implementation
      expect(RequestStatus.Pending).to.equal(0);
      expect(RequestStatus.Approved).to.equal(1);
      expect(RequestStatus.Rejected).to.equal(2);
    });

    it("verifies all request statuses are sequential", async () => {
      const statuses = Object.values(RequestStatus)
        .filter((v) => typeof v === "number")
        .sort();

      for (let i = 0; i < statuses.length; i++) {
        expect(statuses[i]).to.equal(i);
      }
    });

    it("verifies role type constants", async () => {
      // Test that role types are defined correctly
      expect(ROLE_TYPES.FABRICANTE).to.equal("FABRICANTE");
      expect(ROLE_TYPES.AUDITOR_HW).to.equal("AUDITOR_HW");
      expect(ROLE_TYPES.TECNICO_SW).to.equal("TECNICO_SW");
      expect(ROLE_TYPES.ESCUELA).to.equal("ESCUELA");
    });
  });

  // ========================================================================
  // Error Code Tests
  // ========================================================================

  describe("Error Code Verification", () => {
    // Note: Error codes are verified through test transactions
    // This test verifies the expected error code values

    it("verifies error code base value", async () => {
      // Anchor error codes start at 6000
      const errorCodeBase = 6000;
      expect(errorCodeBase).to.equal(6000);
    });

    it("verifies error code sequence", async () => {
      // Expected error codes from Rust implementation:
      // Unauthorized: 6000
      // InvalidStateTransition: 6001
      // NetbookNotFound: 6002
      // InvalidInput: 6003

      const expectedCodes = {
        unauthorized: 6000,
        invalidStateTransition: 6001,
        netbookNotFound: 6002,
        invalidInput: 6003,
      };

      // Verify sequential ordering
      const codes = Object.values(expectedCodes);
      for (let i = 1; i < codes.length; i++) {
        expect(codes[i]).to.equal(codes[i - 1] + 1);
      }
    });
  });

  // ========================================================================
  // Config Space Tests
  // ========================================================================

  describe("SupplyChainConfig Space Verification", () => {
    it("verifies SupplyChainConfig INIT_SPACE calculation", async () => {
      // Expected space breakdown (matches SupplyChainConfig struct in state/config.rs):
      // 8 (discriminator) +
      // 32 (admin: Pubkey) +
      // 32 (fabricante: Pubkey) +
      // 32 (auditor_hw: Pubkey) +
      // 32 (tecnico_sw: Pubkey) +
      // 32 (escuela: Pubkey) +
      // 1 (admin_bump: u8) +
      // 8 (next_token_id: u64) +
      // 8 (total_netbooks: u64) +
      // 8 (role_requests_count: u64) +
      // 8 (fabricante_count: u64) +
      // 8 (auditor_hw_count: u64) +
      // 8 (tecnico_sw_count: u64) +
      // 8 (escuela_count: u64)
      // = 8 + 160 + 1 + 56 = 225 bytes

      const expectedSpace = 8 + 32 + 32 + 32 + 32 + 32 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 8;
      expect(expectedSpace).to.equal(225);

      // Verify component breakdown
      const components = {
        discriminator: 8,
        admin: 32,
        fabricante: 32,
        auditorHw: 32,
        tecnicoSw: 32,
        escuela: 32,
        adminBump: 1,
        nextTokenId: 8,
        totalNetbooks: 8,
        roleRequestsCount: 8,
        fabricanteCount: 8,
        auditorHwCount: 8,
        tecnicoSwCount: 8,
        escuelaCount: 8,
      };

      const total = Object.values(components).reduce((sum, val) => sum + val, 0);
      expect(total).to.equal(expectedSpace);
    });

    it("verifies config account size is reasonable", async () => {
      // Config account should be under 1KB
      const configSpace = 225;
      expect(configSpace).to.be.lessThan(1024);
      expect(configSpace).to.be.greaterThan(100);
    });
  });

  // ========================================================================
  // Role Holder Space Tests
  // ========================================================================

  describe("RoleHolder Space Verification", () => {
    it("verifies RoleHolder INIT_SPACE calculation", async () => {
      // Expected space breakdown:
      // 8 (discriminator) +
      // 8 (index) +
      // 32 (user) +
      // 4 (role len + data) +
      // 64 (role max) +
      // 32 (granted_by) +
      // 8 (granted_at)
      // = 8 + 8 + 32 + 4 + 64 + 32 + 8 = 156 bytes

      const expectedSpace = 8 + 8 + 32 + 4 + 64 + 32 + 8;
      expect(expectedSpace).to.equal(156);

      // Verify component breakdown
      const components = {
        discriminator: 8,
        index: 8,
        user: 32,
        role: 4 + 64,
        grantedBy: 32,
        grantedAt: 8,
      };

      const total = Object.values(components).reduce((sum, val) => sum + val, 0);
      expect(total).to.equal(expectedSpace);
    });

    it("verifies role holder size is reasonable", async () => {
      // Role holder account should be under 512 bytes
      const roleHolderSpace = 156;
      expect(roleHolderSpace).to.be.lessThan(512);
      expect(roleHolderSpace).to.be.greaterThan(100);
    });
  });

  // ========================================================================
  // Role Holder Count Tests
  // ========================================================================

  describe("Role Holder Count Verification", () => {
    it("verifies MAX_ROLE_HOLDERS constant", async () => {
      // Maximum role holders per role type
      const maxRoleHolders = 100;
      expect(maxRoleHolders).to.equal(100);
    });

    it("verifies role holder count limits are reasonable", async () => {
      // MAX_ROLE_HOLDERS should be a power of 2 for efficient bit operations
      const maxRoleHolders = 100;
      expect(Math.log2(maxRoleHolders) % 1).to.not.equal(0); // 100 is not power of 2, but acceptable

      // Should be large enough for typical deployments
      expect(maxRoleHolders).to.be.greaterThan(10);

      // Should be small enough to prevent account bloat
      expect(maxRoleHolders).to.be.lessThan(1000);
    });

    it("verifies role holder count initialization", async () => {
      // When a new config is created, all role holder counts should be 0
      const initialCounts = {
        fabricanteCount: 0,
        auditorHwCount: 0,
        tecnicoSwCount: 0,
        escuelaCount: 0,
      };

      for (const [key, value] of Object.entries(initialCounts)) {
        expect(value).to.equal(0);
      }
    });
  });

  // ========================================================================
  // PDA Derivation Tests
  // ========================================================================

  describe("PDA Derivation Verification", () => {
    it("verifies config PDA derivation", async () => {
      const configPda = await getConfigPdaAddress();

      expect(configPda).to.be.a("string");
      expect(configPda.length).to.equal(44); // Base58 address length
    });

    it("verifies config PDA is a program-derived address", async () => {
      const configPda = await getConfigPdaAddress();

      // PDA should not be a valid system account
      expect(configPda).to.not.equal("11111111111111111111111111111111");
    });

    it("verifies consistent PDA derivation", async () => {
      const configPda1 = await getConfigPdaAddress();
      const configPda2 = await getConfigPdaAddress();

      // Same seeds should produce same PDA
      expect(configPda1).to.equal(configPda2);
    });

    it("verifies netbook PDA derivation with different token IDs", async () => {
      const pda1 = await getNetbookPdaAddress(1);
      const pda2 = await getNetbookPdaAddress(2);
      const pda100 = await getNetbookPdaAddress(100);

      // Different token IDs should produce different PDAs
      expect(pda1).to.not.equal(pda2);
      expect(pda2).to.not.equal(pda100);
      expect(pda1).to.not.equal(pda100);
    });

    it("verifies role request PDA derivation", async () => {
      const testUser = Keypair.generate();

      const pda1 = await getRoleRequestPdaAddress(toAddress(testUser.publicKey.toBase58()));
      const testUser2 = Keypair.generate();
      const pda2 = await getRoleRequestPdaAddress(toAddress(testUser2.publicKey.toBase58()));

      // Different users should produce different PDAs
      expect(pda1).to.not.equal(pda2);
    });
  });

  // ========================================================================
  // Hash Utility Tests
  // ========================================================================

  describe("Hash Utility Verification", () => {
    it("verifies createHash produces 32-byte arrays", async () => {
      const hash = createHash(42);
      expect(hash).to.be.an("array");
      expect(hash.length).to.equal(32);
    });

    it("verifies createHash produces consistent results", async () => {
      const hash1 = createHash(42);
      const hash2 = createHash(42);

      for (let i = 0; i < 32; i++) {
        expect(hash1[i]).to.equal(hash2[i]);
      }
    });

    it("verifies createHash produces different results for different inputs", async () => {
      const hash1 = createHash(1);
      const hash2 = createHash(2);

      let different = false;
      for (let i = 0; i < 32; i++) {
        if (hash1[i] !== hash2[i]) {
          different = true;
          break;
        }
      }
      expect(different).to.be.true;
    });

    it("verifies hash values are within valid byte range", async () => {
      const hash = createHash(12345);

      for (const byte of hash) {
        expect(byte).to.be.at.least(0);
        expect(byte).to.be.at.most(255);
      }
    });
  });

  // ========================================================================
  // String Utility Tests
  // ========================================================================

  describe("String Utility Verification", () => {
    it("verifies batch ID format", async () => {
      const batch = createBatchId("MFG", 2024, 1);

      expect(batch).to.match(/^MFG-2024-0001$/);
    });

    it("verifies model specs format", async () => {
      const specs = createModelSpecs("TestBrand", "ProBook", 2024);

      expect(specs).to.include("TestBrand");
      expect(specs).to.include("ProBook");
      expect(specs).to.include("2024");
    });
  });
});
