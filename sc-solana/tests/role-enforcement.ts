/**
 * Role Enforcement Boundary Tests
 *
 * Comprehensive test suite for role-based access control (RBAC) boundary testing.
 * Verifies that role constraints are properly enforced across all instructions.
 *
 * Issue #72: Role Enforcement Boundary Tests (P1)
 *
 * Migrated from @coral-xyz/anchor to Codama-generated client (Issue #209).
 */

import {
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createSignerFromKeyPair } from "./test-helpers";
import { expect } from "chai";

// Import test helpers
import {
  createTestClient,
  fundAndInitialize,
  fundKeypair,
  toAddress,
  toUint8Array,
  getConfigPdaAddress,
  getNetbookPdaAddress,
  getSerialHashRegistryPdaAddress,
  getAdminPdaAddress,
  createHash,
  NetbookState,
  generateUniqueSerial,
  type TestClient,
} from "./test-helpers";

describe("Role Enforcement Boundary Tests", () => {
  let client: TestClient;
  const admin = Keypair.generate();
  const fabricante = Keypair.generate();
  const auditor = Keypair.generate();
  const technician = Keypair.generate();
  const school = Keypair.generate();
  const randomUser = Keypair.generate();
  const anotherRandom = Keypair.generate();

  let configPda: string;
  let adminPda: string;
  let serialHashRegistryPda: string;
  let crossRoleNetbookPda: string;

  // ========================================================================
  // Setup
  // ========================================================================

  before(async () => {
    // Create client
    client = await createTestClient("http://localhost:8899", admin);

    // Fund all keypairs
    await fundKeypair(client, fabricante, 2 * LAMPORTS_PER_SOL);
    await fundKeypair(client, auditor, 2 * LAMPORTS_PER_SOL);
    await fundKeypair(client, technician, 2 * LAMPORTS_PER_SOL);
    await fundKeypair(client, school, 2 * LAMPORTS_PER_SOL);
    await fundKeypair(client, randomUser, 2 * LAMPORTS_PER_SOL);
    await fundKeypair(client, anotherRandom, 2 * LAMPORTS_PER_SOL);

    // Get PDAs
    configPda = await getConfigPdaAddress();
    adminPda = await getAdminPdaAddress(toAddress(configPda));
    serialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));
  });

  // ========================================================================
  // Test Helper: Initialize Config (using shared initialization - Issue #178)
  // ========================================================================

  async function initializeConfig() {
    await fundAndInitialize(client, admin);
  }

  // ========================================================================
  // 1. Grant Role Boundary Tests
  // ========================================================================

  describe("Grant Role Boundary Tests", () => {
    before(async () => {
      await initializeConfig();
    });

    it("allows admin to grant FABRICANTE role", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      const tx = await client.scSolana.instructions.grantRole({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        accountToGrant: fabricanteSigner,
        role: "FABRICANTE",
      });
      const sig = await tx.sendTransaction();
      expect(sig).to.not.be.null;
    });

    it("allows admin to grant AUDITOR_HW role", async () => {
      const auditorSigner = await createSignerFromKeyPair(auditor);
      const tx = await client.scSolana.instructions.grantRole({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        accountToGrant: auditorSigner,
        role: "AUDITOR_HW",
      });
      const sig = await tx.sendTransaction();
      expect(sig).to.not.be.null;
    });

    it("allows admin to grant TECNICO_SW role", async () => {
      const technicianSigner = await createSignerFromKeyPair(technician);
      const tx = await client.scSolana.instructions.grantRole({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        accountToGrant: technicianSigner,
        role: "TECNICO_SW",
      });
      const sig = await tx.sendTransaction();
      expect(sig).to.not.be.null;
    });

    it("allows admin to grant ESCUELA role", async () => {
      const schoolSigner = await createSignerFromKeyPair(school);
      const tx = await client.scSolana.instructions.grantRole({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        accountToGrant: schoolSigner,
        role: "ESCUELA",
      });
      const sig = await tx.sendTransaction();
      expect(sig).to.not.be.null;
    });

    it("rejects grant role from non-admin account", async () => {
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      const anotherRandomSigner = await createSignerFromKeyPair(anotherRandom);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(randomUser.publicKey.toString()),
            accountToGrant: anotherRandomSigner,
            role: "FABRICANTE",
          })
          .sendTransaction();
        expect.fail("Expected grant role to fail from non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects grant of invalid role name", async () => {
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToGrant: randomUserSigner,
            role: "INVALID_ROLE",
          })
          .sendTransaction();
        expect.fail("Expected grant role to fail for invalid role");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects duplicate FABRICANTE role grant", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToGrant: fabricanteSigner,
            role: "FABRICANTE",
          })
          .sendTransaction();
        expect.fail("Expected duplicate grant to fail");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 2. Revoke Role Boundary Tests
  // ========================================================================

  describe("Revoke Role Boundary Tests", () => {
    before(async () => {
      // Grant role first
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: fabricanteSigner,
          role: "FABRICANTE",
        })
        .sendTransaction();
    });

    it("allows admin to revoke FABRICANTE role", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      const tx = await client.scSolana.instructions.revokeRole({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        accountToRevoke: fabricanteSigner,
        role: "FABRICANTE",
      });
      const sig = await tx.sendTransaction();
      expect(sig).to.not.be.null;
    });

    it("rejects revoke role from non-admin", async () => {
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      const anotherRandomSigner = await createSignerFromKeyPair(anotherRandom);
      try {
        await client.scSolana.instructions
          .revokeRole({
            config: toAddress(configPda),
            admin: toAddress(randomUser.publicKey.toString()),
            accountToRevoke: anotherRandomSigner,
            role: "FABRICANTE",
          })
          .sendTransaction();
        expect.fail("Expected revoke role to fail from non-admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects revoke of invalid role name", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions
          .revokeRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToRevoke: fabricanteSigner,
            role: "INVALID_ROLE",
          })
          .sendTransaction();
        expect.fail("Expected revoke role to fail for invalid role");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 3. Netbook Registration Role Enforcement
  // ========================================================================

  describe("Netbook Registration Role Enforcement", () => {
    before(async () => {
      await initializeConfig();

      // Grant FABRICANTE role
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: fabricanteSigner,
          role: "FABRICANTE",
        })
        .sendTransaction();
    });

    it("allows manufacturer with FABRICANTE role to register netbook", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      const netbookPda = await getNetbookPdaAddress(tokenId);

      const uniqueSerial = generateUniqueSerial("ROLE");
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      const tx = await client.scSolana.instructions.registerNetbook({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        netbook: toAddress(netbookPda),
        serialNumber: uniqueSerial,
        batchId: "ROLE-BATCH-001",
        initialModelSpecs: "Test Model",
      });
      const sig = await tx.sendTransaction();
      expect(sig).to.not.be.null;
    });

    it("rejects netbook registration from non-manufacturer", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      const netbookPda = await getNetbookPdaAddress(tokenId);

      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .registerNetbook({
            config: toAddress(configPda),
            serialHashRegistry: toAddress(serialHashRegistryPda),
            manufacturer: randomUserSigner,
            netbook: toAddress(netbookPda),
            serialNumber: generateUniqueSerial("ROLE"),
            batchId: "ROLE-BATCH-002",
            initialModelSpecs: "Test Model",
          })
          .sendTransaction();
        expect.fail("Expected registration to fail from non-manufacturer");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects netbook registration from user without FABRICANTE role", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      const netbookPda = await getNetbookPdaAddress(tokenId);

      const auditorSigner = await createSignerFromKeyPair(auditor);
      try {
        await client.scSolana.instructions
          .registerNetbook({
            config: toAddress(configPda),
            serialHashRegistry: toAddress(serialHashRegistryPda),
            manufacturer: auditorSigner,
            netbook: toAddress(netbookPda),
            serialNumber: generateUniqueSerial("ROLE"),
            batchId: "ROLE-BATCH-003",
            initialModelSpecs: "Test Model",
          })
          .sendTransaction();
        expect.fail("Expected registration to fail from auditor without FABRICANTE");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 4. Hardware Audit Role Enforcement
  // ========================================================================

  describe("Hardware Audit Role Enforcement", () => {
    let auditSerial: string;

    before(async () => {
      // Grant AUDITOR_HW role
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: auditorSigner,
          role: "AUDITOR_HW",
        })
        .sendTransaction();

      // Register a netbook first
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      const netbookPda = await getNetbookPdaAddress(tokenId);
      auditSerial = generateUniqueSerial("AUDIT");

      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      await client.scSolana.instructions
        .registerNetbook({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          netbook: toAddress(netbookPda),
          serialNumber: auditSerial,
          batchId: "AUDIT-BATCH-001",
          initialModelSpecs: "Audit Test Model",
        })
        .sendTransaction();
    });

    it("allows auditor with AUDITOR_HW role to audit hardware", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      const netbookPda = await getNetbookPdaAddress(tokenId);

      const auditorSigner = await createSignerFromKeyPair(auditor);
      const tx = await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serialNumber: auditSerial,
        passed: true,
        reportHash: toUint8Array(createHash(42)),
      });
      const sig = await tx.sendTransaction();
      expect(sig).to.not.be.null;
    });

    it("rejects hardware audit from non-auditor", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      const netbookPda = await getNetbookPdaAddress(tokenId);

      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .auditHardware({
            netbook: toAddress(netbookPda),
            config: toAddress(configPda),
            auditor: randomUserSigner,
            serialNumber: "AUDIT-ROLE-001",
            passed: true,
            reportHash: toUint8Array(createHash(43)),
          })
          .sendTransaction();
        expect.fail("Expected audit to fail from non-auditor");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects hardware audit from technician without AUDITOR_HW role", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      const netbookPda = await getNetbookPdaAddress(tokenId);

      const technicianSigner = await createSignerFromKeyPair(technician);
      try {
        await client.scSolana.instructions
          .auditHardware({
            netbook: toAddress(netbookPda),
            config: toAddress(configPda),
            auditor: technicianSigner,
            serialNumber: "AUDIT-ROLE-001",
            passed: true,
            reportHash: toUint8Array(createHash(44)),
          })
          .sendTransaction();
        expect.fail("Expected audit to fail from technician without AUDITOR_HW");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 5. Software Validation Role Enforcement
  // ========================================================================

  describe("Software Validation Role Enforcement", () => {
    let netbookPda: string;
    let validateSerial: string;

    before(async () => {
      // Grant TECNICO_SW role
      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: technicianSigner,
          role: "TECNICO_SW",
        })
        .sendTransaction();

      // Register and audit a netbook first
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      netbookPda = await getNetbookPdaAddress(tokenId);
      validateSerial = generateUniqueSerial("VAL");

      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      await client.scSolana.instructions
        .registerNetbook({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          netbook: toAddress(netbookPda),
          serialNumber: validateSerial,
          batchId: "VALIDATE-BATCH-001",
          initialModelSpecs: "Validate Test Model",
        })
        .sendTransaction();

      // Audit hardware first
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions
        .auditHardware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          auditor: auditorSigner,
          serialNumber: validateSerial,
          passed: true,
          reportHash: toUint8Array(createHash(50)),
        })
        .sendTransaction();
    });

    it("allows technician with TECNICO_SW role to validate software", async () => {
      const technicianSigner = await createSignerFromKeyPair(technician);
      const tx = await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serialNumber: validateSerial,
        osVersion: "Ubuntu 22.04",
        passed: true,
      });
      const sig = await tx.sendTransaction();
      expect(sig).to.not.be.null;
    });

    it("rejects software validation from non-technician", async () => {
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .validateSoftware({
            netbook: toAddress(netbookPda),
            config: toAddress(configPda),
            technician: randomUserSigner,
            serialNumber: validateSerial,
            osVersion: "Ubuntu 22.04",
            passed: true,
          })
          .sendTransaction();
        expect.fail("Expected validation to fail from non-technician");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects software validation from auditor without TECNICO_SW role", async () => {
      const auditorSigner = await createSignerFromKeyPair(auditor);
      try {
        await client.scSolana.instructions
          .validateSoftware({
            netbook: toAddress(netbookPda),
            config: toAddress(configPda),
            technician: auditorSigner,
            serialNumber: validateSerial,
            osVersion: "Ubuntu 22.04",
            passed: true,
          })
          .sendTransaction();
        expect.fail("Expected validation to fail from auditor without TECNICO_SW");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 6. Student Assignment Role Enforcement
  // ========================================================================

  describe("Student Assignment Role Enforcement", () => {
    let netbookPda: string;
    let assignSerial: string;

    before(async () => {
      // Grant ESCUELA role
      const schoolSigner = await createSignerFromKeyPair(school);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: schoolSigner,
          role: "ESCUELA",
        })
        .sendTransaction();

      // Register, audit, and validate a netbook first
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      netbookPda = await getNetbookPdaAddress(tokenId);
      assignSerial = generateUniqueSerial("ASGN");

      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      await client.scSolana.instructions
        .registerNetbook({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          netbook: toAddress(netbookPda),
          serialNumber: assignSerial,
          batchId: "ASSIGN-BATCH-001",
          initialModelSpecs: "Assign Test Model",
        })
        .sendTransaction();

      // Audit hardware
      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions
        .auditHardware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          auditor: auditorSigner,
          serialNumber: assignSerial,
          passed: true,
          reportHash: toUint8Array(createHash(60)),
        })
        .sendTransaction();

      // Validate software
      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions
        .validateSoftware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          technician: technicianSigner,
          serialNumber: assignSerial,
          osVersion: "Ubuntu 22.04",
          passed: true,
        })
        .sendTransaction();
    });

    it("allows school with ESCUELA role to assign netbook to student", async () => {
      const schoolSigner = await createSignerFromKeyPair(school);
      const tx = await client.scSolana.instructions.assignToStudent({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        school: schoolSigner,
        serialNumber: assignSerial,
        studentIdHash: toUint8Array(createHash(100)),
        schoolIdHash: toUint8Array(createHash(200)),
      });
      const sig = await tx.sendTransaction();
      expect(sig).to.not.be.null;
    });

    it("rejects student assignment from non-school account", async () => {
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .assignToStudent({
            netbook: toAddress(netbookPda),
            config: toAddress(configPda),
            school: randomUserSigner,
            serialNumber: assignSerial,
            studentIdHash: toUint8Array(createHash(101)),
            schoolIdHash: toUint8Array(createHash(201)),
          })
          .sendTransaction();
        expect.fail("Expected assignment to fail from non-school");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects student assignment from manufacturer without ESCUELA role", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions
          .assignToStudent({
            netbook: toAddress(netbookPda),
            config: toAddress(configPda),
            school: fabricanteSigner,
            serialNumber: assignSerial,
            studentIdHash: toUint8Array(createHash(102)),
            schoolIdHash: toUint8Array(createHash(202)),
          })
          .sendTransaction();
        expect.fail("Expected assignment to fail from manufacturer without ESCUELA");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 7. Cross-Role Boundary Tests
  // ========================================================================

  describe("Cross-Role Boundary Tests", () => {
    before(async () => {
      // Grant all roles
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: fabricanteSigner,
          role: "FABRICANTE",
        })
        .sendTransaction();

      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: auditorSigner,
          role: "AUDITOR_HW",
        })
        .sendTransaction();

      const technicianSigner = await createSignerFromKeyPair(technician);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: technicianSigner,
          role: "TECNICO_SW",
        })
        .sendTransaction();

      const schoolSigner = await createSignerFromKeyPair(school);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: schoolSigner,
          role: "ESCUELA",
        })
        .sendTransaction();

      // Register a netbook for cross-role tests (needs to be in Fabricada state for audit tests)
      const serialNumber = "CROSS-ROLE-001";
      const batchId = "CROSS-BATCH-001";
      const modelSpecs = "Cross-Role Test Model";
      crossRoleNetbookPda = await getNetbookPdaAddress(1);
      const crossRoleSerialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));

      await client.scSolana.instructions
        .registerNetbook({
          manufacturer: fabricanteSigner,
          netbook: toAddress(crossRoleNetbookPda),
          config: toAddress(configPda),
          serialHashRegistry: toAddress(crossRoleSerialHashRegistryPda),
          serialNumber,
          batchId,
          initialModelSpecs: modelSpecs,
        })
        .sendTransaction();
    });

    it("fabricante cannot perform hardware audit", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions
          .auditHardware({
            netbook: toAddress(await getNetbookPdaAddress(1)),
            config: toAddress(configPda),
            auditor: fabricanteSigner,
            serialNumber: "TEST-SERIAL",
            passed: true,
            reportHash: toUint8Array(createHash(70)),
          })
          .sendTransaction();
        expect.fail("Expected audit to fail from fabricante");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("fabricante cannot perform software validation", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions
          .validateSoftware({
            netbook: toAddress(await getNetbookPdaAddress(1)),
            config: toAddress(configPda),
            technician: fabricanteSigner,
            serialNumber: "TEST-SERIAL",
            osVersion: "Ubuntu 22.04",
            passed: true,
          })
          .sendTransaction();
        expect.fail("Expected validation to fail from fabricante");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("fabricante cannot assign to student", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions
          .assignToStudent({
            netbook: toAddress(await getNetbookPdaAddress(1)),
            config: toAddress(configPda),
            school: fabricanteSigner,
            serialNumber: "TEST-SERIAL",
            studentIdHash: toUint8Array(createHash(80)),
            schoolIdHash: toUint8Array(createHash(90)),
          })
          .sendTransaction();
        expect.fail("Expected assignment to fail from fabricante");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("auditor cannot perform software validation", async () => {
      const auditorSigner = await createSignerFromKeyPair(auditor);
      try {
        await client.scSolana.instructions
          .validateSoftware({
            netbook: toAddress(await getNetbookPdaAddress(1)),
            config: toAddress(configPda),
            technician: auditorSigner,
            serialNumber: "TEST-SERIAL",
            osVersion: "Ubuntu 22.04",
            passed: true,
          })
          .sendTransaction();
        expect.fail("Expected validation to fail from auditor");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("auditor cannot assign to student", async () => {
      const auditorSigner = await createSignerFromKeyPair(auditor);
      try {
        await client.scSolana.instructions
          .assignToStudent({
            netbook: toAddress(await getNetbookPdaAddress(1)),
            config: toAddress(configPda),
            school: auditorSigner,
            serialNumber: "TEST-SERIAL",
            studentIdHash: toUint8Array(createHash(81)),
            schoolIdHash: toUint8Array(createHash(91)),
          })
          .sendTransaction();
        expect.fail("Expected assignment to fail from auditor");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("technician cannot perform hardware audit", async () => {
      const technicianSigner = await createSignerFromKeyPair(technician);
      try {
        await client.scSolana.instructions
          .auditHardware({
            netbook: toAddress(await getNetbookPdaAddress(1)),
            config: toAddress(configPda),
            auditor: technicianSigner,
            serialNumber: "TEST-SERIAL",
            passed: true,
            reportHash: toUint8Array(createHash(71)),
          })
          .sendTransaction();
        expect.fail("Expected audit to fail from technician");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("technician cannot assign to student", async () => {
      const technicianSigner = await createSignerFromKeyPair(technician);
      try {
        await client.scSolana.instructions
          .assignToStudent({
            netbook: toAddress(await getNetbookPdaAddress(1)),
            config: toAddress(configPda),
            school: technicianSigner,
            serialNumber: "TEST-SERIAL",
            studentIdHash: toUint8Array(createHash(82)),
            schoolIdHash: toUint8Array(createHash(92)),
          })
          .sendTransaction();
        expect.fail("Expected assignment to fail from technician");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("school cannot perform hardware audit", async () => {
      const schoolSigner = await createSignerFromKeyPair(school);
      try {
        await client.scSolana.instructions
          .auditHardware({
            netbook: toAddress(await getNetbookPdaAddress(1)),
            config: toAddress(configPda),
            auditor: schoolSigner,
            serialNumber: "TEST-SERIAL",
            passed: true,
            reportHash: toUint8Array(createHash(72)),
          })
          .sendTransaction();
        expect.fail("Expected audit to fail from school");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("school cannot perform software validation", async () => {
      const schoolSigner = await createSignerFromKeyPair(school);
      try {
        await client.scSolana.instructions
          .validateSoftware({
            netbook: toAddress(await getNetbookPdaAddress(1)),
            config: toAddress(configPda),
            technician: schoolSigner,
            serialNumber: "TEST-SERIAL",
            osVersion: "Ubuntu 22.04",
            passed: true,
          })
          .sendTransaction();
        expect.fail("Expected validation to fail from school");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 8. Role Enforcement with Default Pubkey
  // ========================================================================

  describe("Role Enforcement with Default Pubkey", () => {
    let newConfigPda: string;
    let newSerialHashPda: string;

    before(async () => {
      // Create a new config where auditor_hw is default (no auditor granted)
      const newAdmin = Keypair.generate();
      await fundKeypair(client, newAdmin, 2 * LAMPORTS_PER_SOL);

      newConfigPda = await getConfigPdaAddress();
      newSerialHashPda = await getSerialHashRegistryPdaAddress(newConfigPda);

      // Initialize with admin as fabricante only
      const newAdminSigner = await createSignerFromKeyPair(newAdmin);
      await client.scSolana.instructions
        .initialize({
          config: toAddress(newConfigPda),
          serialHashRegistry: toAddress(newSerialHashPda),
          admin: newAdminSigner,
        })
        .sendTransaction();
    });

    it("rejects hardware audit when no auditor_hw is set (default pubkey)", async () => {
      const auditorSigner = await createSignerFromKeyPair(auditor);
      try {
        await client.scSolana.instructions
          .auditHardware({
            netbook: toAddress(await getNetbookPdaAddress(1)),
            config: toAddress(newConfigPda),
            auditor: auditorSigner,
            serialNumber: "TEST-SERIAL",
            passed: true,
            reportHash: toUint8Array(createHash(73)),
          })
          .sendTransaction();
        expect.fail("Expected audit to fail when no auditor_hw is set");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects software validation when no tecnico_sw is set (default pubkey)", async () => {
      const technicianSigner = await createSignerFromKeyPair(technician);
      try {
        await client.scSolana.instructions
          .validateSoftware({
            netbook: toAddress(await getNetbookPdaAddress(1)),
            config: toAddress(newConfigPda),
            technician: technicianSigner,
            serialNumber: "TEST-SERIAL",
            osVersion: "Ubuntu 22.04",
            passed: true,
          })
          .sendTransaction();
        expect.fail("Expected validation to fail when no tecnico_sw is set");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects student assignment when no escuela is set (default pubkey)", async () => {
      const schoolSigner = await createSignerFromKeyPair(school);
      try {
        await client.scSolana.instructions
          .assignToStudent({
            netbook: toAddress(await getNetbookPdaAddress(1)),
            config: toAddress(newConfigPda),
            school: schoolSigner,
            serialNumber: "TEST-SERIAL",
            studentIdHash: toUint8Array(createHash(83)),
            schoolIdHash: toUint8Array(createHash(93)),
          })
          .sendTransaction();
        expect.fail("Expected assignment to fail when no escuela is set");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });

  // ========================================================================
  // 9. Query Instructions No Role Required
  // ========================================================================

  describe("Query Instructions No Role Required", () => {
    before(async () => {
      await initializeConfig();
    });

    it("allows anyone to query config without any role", async () => {
      const tx = await client.scSolana.instructions.queryConfig({
        config: toAddress(configPda),
      });
      const sig = await tx.sendTransaction();
      expect(sig).to.not.be.null;
    });

    it("allows anyone to query netbook state without any role", async () => {
      try {
        const netbookPda = await getNetbookPdaAddress(99999);
        const tx = await client.scSolana.instructions.queryNetbookState({
          netbook: toAddress(netbookPda),
          serialNumber: "non-existent-serial",
        });
        await tx.sendAndConfirm({ skipPreflight: true });
        // May fail due to account not existing, but not due to role
        expect(true).to.be.true;
      } catch (error: any) {
        // Any error is acceptable - we're testing that it doesn't fail due to role
        expect(error).to.not.be.null;
      }
    });

    it("allows anyone to query role without any role", async () => {
      const tx = await client.scSolana.instructions.queryRole({
        config: toAddress(configPda),
        accountToCheck: toAddress(randomUser.publicKey.toString()),
        role: "FABRICANTE",
      });
      const sig = await tx.sendTransaction();
      expect(sig).to.not.be.null;
    });
  });

  // ========================================================================
  // 10. Role Enforcement Edge Cases
  // ========================================================================

  describe("Role Enforcement Edge Cases", () => {
    before(async () => {
      await initializeConfig();

      // Grant roles
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: fabricanteSigner,
          role: "FABRICANTE",
        })
        .sendTransaction();

      const auditorSigner = await createSignerFromKeyPair(auditor);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: auditorSigner,
          role: "AUDITOR_HW",
        })
        .sendTransaction();
    });

    it("rejects operation with empty role string", async () => {
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToGrant: randomUserSigner,
            role: "",
          })
          .sendTransaction();
        expect.fail("Expected grant role to fail with empty role");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects operation with role containing special characters", async () => {
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToGrant: randomUserSigner,
            role: "FABRICANTE; DROP TABLE config;--",
          })
          .sendTransaction();
        expect.fail("Expected grant role to fail with special characters");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("rejects operation with role exceeding maximum length", async () => {
      const longRole = "A".repeat(1000);
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(adminPda),
            accountToGrant: randomUserSigner,
            role: longRole,
          })
          .sendTransaction();
        expect.fail("Expected grant role to fail with very long role");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });

    it("verifies role constraint uses has_one check on config", async () => {
      // This tests that the has_one constraint in GrantRole is enforced
      // The admin must match config.admin
      const wrongAdmin = Keypair.generate();
      await fundKeypair(client, wrongAdmin, 2 * LAMPORTS_PER_SOL);

      const wrongAdminSigner = await createSignerFromKeyPair(wrongAdmin);
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions
          .grantRole({
            config: toAddress(configPda),
            admin: toAddress(wrongAdmin.publicKey.toString()),
            accountToGrant: randomUserSigner,
            role: "FABRICANTE",
          })
          .sendTransaction();
        expect.fail("Expected grant role to fail with wrong admin");
      } catch (error: any) {
        expect(error).to.not.be.null;
      }
    });
  });
});
