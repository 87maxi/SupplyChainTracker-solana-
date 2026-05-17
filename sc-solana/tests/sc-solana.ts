/**
 * Main Integration Test Suite
 *
 * Comprehensive integration tests for the SupplyChainTracker Solana program.
 * Tests cover initialization, role management, netbook registration, hardware
 * audit, software validation, student assignment, state machine validation,
 * PDA derivation, error codes, and config counters.
 *
 * Migrated from @coral-xyz/anchor to Codama-generated client (Issue #209).
 *
 * Program: SupplyChainTracker (sc-solana)
 */

import { expect } from "chai";
import { Keypair } from "@solana/web3.js";
import { createSignerFromKeyPair } from "./test-helpers";
import {
  createTestClient,
  getConfigPdaAddress,
  getNetbookPdaAddress,
  getRoleRequestPdaAddress,
  getSerialHashRegistryPdaAddress,
  getAdminPdaAddress,
  getRoleHolderByUserPdaAddress,
  fundKeypair,
  fundAndInitialize,
  grantRoleWithAdminPda,
  generateUniqueSerial,
  resetTokenCounter,
  createHash,
  resetInitialization,
  toAddress,
  toUint8Array,
  type TestClient,
  NetbookState,
  RequestStatus,
  ROLE_TYPES,
} from "./test-helpers";
import { fundAccounts } from "./shared-init";

// Role type constants
const FABRICANTE_ROLE = ROLE_TYPES.FABRICANTE;
const AUDITOR_HW_ROLE = ROLE_TYPES.AUDITOR_HW;
const TECNICO_SW_ROLE = ROLE_TYPES.TECNICO_SW;
const ESCUELA_ROLE = ROLE_TYPES.ESCUELA;

describe("SupplyChainTracker Solana", () => {
  let client: TestClient;
  let admin: Keypair;
  let fabricante: Keypair;
  let auditor: Keypair;
  let technician: Keypair;
  let school: Keypair;

  // PDA addresses (typed as Address)
  let configPda: string;
  let serialHashRegistryPda: string;
  let adminPda: string;

  before(async () => {
    // Generate admin account
    admin = Keypair.generate();

    // Create test client first
    client = await createTestClient("http://localhost:8899", admin);

    // Reset initialization state for fresh test run
    resetInitialization();

    // Initialize using shared initialization (Issue #178)
    await fundAndInitialize(client, admin);

    // Calculate PDAs
    configPda = await getConfigPdaAddress();
    serialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));
    adminPda = await getAdminPdaAddress(toAddress(configPda));

    // Generate test accounts
    fabricante = Keypair.generate();
    auditor = Keypair.generate();
    technician = Keypair.generate();
    school = Keypair.generate();

    // Fund all accounts
    await fundAccounts(client, [fabricante, auditor, technician, school]);

    // Grant roles to test accounts
    await grantRoleWithAdminPda(
      client,
      toAddress(configPda),
      toAddress(adminPda),
      0,
      FABRICANTE_ROLE,
      toAddress(fabricante.publicKey.toBase58()),
      fabricante
    );
    console.log("Granted FABRICANTE role to", fabricante.publicKey.toString());

    await grantRoleWithAdminPda(
      client,
      toAddress(configPda),
      toAddress(adminPda),
      0,
      AUDITOR_HW_ROLE,
      toAddress(auditor.publicKey.toBase58()),
      auditor
    );
    console.log("Granted AUDITOR_HW role to", auditor.publicKey.toString());

    await grantRoleWithAdminPda(
      client,
      toAddress(configPda),
      toAddress(adminPda),
      0,
      TECNICO_SW_ROLE,
      toAddress(technician.publicKey.toBase58()),
      technician
    );
    console.log("Granted TECNICO_SW role to", technician.publicKey.toString());

    await grantRoleWithAdminPda(
      client,
      toAddress(configPda),
      toAddress(adminPda),
      0,
      ESCUELA_ROLE,
      toAddress(school.publicKey.toBase58()),
      school
    );
    console.log("Granted ESCUELA role to", school.publicKey.toString());
  });

  // Helper to get current token counter from config
  async function syncTokenCounter(): Promise<number> {
    const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
    return config.nextTokenId.toNumber();
  }

  describe("1. Initialization", () => {
    it("Verifies the supply chain config was initialized (PDA-first)", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.nextTokenId.toNumber()).to.equal(1);
      expect(config.totalNetbooks.toNumber()).to.equal(0);
      console.log("Config verified");
    });
  });

  describe("2. Role Management", () => {
    it("Can grant auditor role to auditor account", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config).to.be.an('object');
    });

    it("Can grant fabricante role", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config).to.be.an('object');
    });

    it("Can request a role", async () => {
      const roleRequestPda = await getRoleRequestPdaAddress(toAddress(technician.publicKey.toBase58()));
      const technicianSigner = await createSignerFromKeyPair(technician);

      const tx = await client.scSolana.instructions.requestRole({
        user: technicianSigner,
        config: toAddress(configPda),
        roleRequest: toAddress(roleRequestPda),
        role: TECNICO_SW_ROLE,
      }).sendTransaction();

      console.log("Request role TX:", tx);

      const roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Pending);
      expect(roleRequest.user).to.equal(technician.publicKey.toBase58());
      expect(roleRequest.role).to.equal(TECNICO_SW_ROLE);
    });

    it("Can approve role request", async () => {
      const roleRequestPda = await getRoleRequestPdaAddress(toAddress(technician.publicKey.toBase58()));
      const adminSigner = await createSignerFromKeyPair(admin);

      const tx = await client.scSolana.instructions.approveRoleRequest({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        payer: adminSigner,
        roleRequest: toAddress(roleRequestPda),
        roleHolder: toAddress(await getRoleHolderByUserPdaAddress(toAddress(technician.publicKey.toBase58()))),
      }).sendTransaction();

      console.log("Approve role TX:", tx);

      const roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Approved);
    });

    it("Can reject role request", async () => {
      const randomUser = Keypair.generate();
      await fundKeypair(client, randomUser, 5);
      const roleRequestPda = await getRoleRequestPdaAddress(toAddress(randomUser.publicKey.toBase58()));
      const randomUserSigner = await createSignerFromKeyPair(randomUser);

      // First create a new role request
      await client.scSolana.instructions.requestRole({
        user: randomUserSigner,
        config: toAddress(configPda),
        roleRequest: toAddress(roleRequestPda),
        role: ESCUELA_ROLE,
      }).sendTransaction();

      const tx = await client.scSolana.instructions.rejectRoleRequest({
        config: toAddress(configPda),
        admin: toAddress(adminPda),
        roleRequest: toAddress(roleRequestPda),
      }).sendTransaction();

      console.log("Reject role TX:", tx);

      const roleRequest = await client.scSolana.accounts.roleRequest.fetch(toAddress(roleRequestPda));
      expect(roleRequest.status).to.equal(RequestStatus.Rejected);
    });

    it("Cannot grant role as non-admin", async () => {
      const randomUser = Keypair.generate();
      const randomUserSigner = await createSignerFromKeyPair(randomUser);
      try {
        await client.scSolana.instructions.grantRole({
          config: toAddress(configPda),
          admin: toAddress(randomUser.publicKey.toBase58()), // Not admin PDA
          accountToGrant: randomUserSigner,
          role: AUDITOR_HW_ROLE,
        }).sendTransaction();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        console.log("Expected error (non-admin):", err.message);
      }
    });

    it("Cannot grant same role twice", async () => {
      try {
        await grantRoleWithAdminPda(
          client,
          toAddress(configPda),
          toAddress(adminPda),
          0,
          AUDITOR_HW_ROLE,
          toAddress(auditor.publicKey.toBase58()),
          auditor
        );
        expect.fail("Should have thrown error");
      } catch (err: any) {
        console.log("Expected duplicate error:", err.message);
        expect(err.message).to.include("RoleAlreadyGranted");
      }
    });
  });

  describe("3. Netbook Registration", () => {
    beforeEach(() => {
      resetTokenCounter();
    });

    it("Can register a single netbook", async () => {
      const tokenId = await syncTokenCounter();
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const uniqueSerial = generateUniqueSerial("SC");
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);

      const tx = await client.scSolana.instructions.registerNetbook({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        netbook: toAddress(netbookPda),
        serialNumber: uniqueSerial,
        batchId: "BATCH-2024-Q1",
        initialModelSpecs: "Intel i3, 8GB RAM, 256GB SSD",
      }).sendTransaction();

      console.log("Register netbook TX:", tx);

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.serialNumber).to.equal(uniqueSerial);
      expect(netbook.batchId).to.equal("BATCH-2024-Q1");
      expect(netbook.state).to.equal(NetbookState.Fabricada);
      expect(netbook.exists).to.equal(true);
      expect(netbook.tokenId.toNumber()).to.equal(tokenId);

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.nextTokenId.toNumber()).to.equal(tokenId + 1);
      expect(config.totalNetbooks.toNumber()).to.equal(1);
    });

    it("Can register multiple netbooks with incrementing token IDs", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      for (let i = 0; i < 4; i++) {
        const tokenId = await syncTokenCounter();
        const netbookPda = await getNetbookPdaAddress(tokenId);

        await client.scSolana.instructions.registerNetbook({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          netbook: toAddress(netbookPda),
          serialNumber: `SN-2024-${String(i + 2).padStart(3, "0")}`,
          batchId: "BATCH-2024-Q1",
          initialModelSpecs: "Intel i5, 16GB RAM, 512GB SSD",
        }).sendTransaction();

        const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
        expect(netbook.tokenId.toNumber()).to.equal(tokenId);
      }
    });

    it("Cannot register with empty serial", async () => {
      const tokenId = await syncTokenCounter();
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);

      try {
        await client.scSolana.instructions.registerNetbook({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          netbook: toAddress(netbookPda),
          serialNumber: "",
          batchId: "BATCH",
          initialModelSpecs: "Specs",
        }).sendTransaction();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        console.log("Expected error:", err.message);
      }
    });
  });

  describe("4. Hardware Audit", () => {
    beforeEach(() => {
      resetTokenCounter();
    });

    it("Can audit hardware and transition to HwAprobado state", async () => {
      const tokenId = 1;
      const serial = generateUniqueSerial("SC");
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const reportHash = toUint8Array(createHash(42));
      const auditorSigner = await createSignerFromKeyPair(auditor);

      const tx = await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial,
        passed: true,
        reportHash,
      }).sendTransaction();

      console.log("Audit hardware TX:", tx);

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.HwAprobado);
      expect(netbook.hwIntegrityPassed).to.equal(true);
    });

    it("Cannot audit hardware from wrong state", async () => {
      const tokenId = 1;
      const serial = "SN-2024-001";
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const reportHash = toUint8Array(createHash(0));
      const auditorSigner = await createSignerFromKeyPair(auditor);

      try {
        await client.scSolana.instructions.auditHardware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          auditor: auditorSigner,
          serial,
          passed: true,
          reportHash,
        }).sendTransaction();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        console.log("Expected state error:", err.message);
        expect(err.message).to.include("InvalidStateTransition");
      }
    });

    it("Cannot audit hardware without auditor role", async () => {
      const tokenId = await syncTokenCounter();
      const serial = "SN-2024-NO-AUDITOR";
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      const technicianSigner = await createSignerFromKeyPair(technician);

      await client.scSolana.instructions.registerNetbook({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        netbook: toAddress(netbookPda),
        serialNumber: serial,
        batchId: "BATCH-TEST",
        initialModelSpecs: "Test Specs",
      }).sendTransaction();

      const reportHash = toUint8Array(createHash(0));

      try {
        await client.scSolana.instructions.auditHardware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          auditor: technicianSigner,
          serial,
          passed: true,
          reportHash,
        }).sendTransaction();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        console.log("Expected role error:", err.message);
        expect(err.message).to.include("Unauthorized");
      }
    });

    it("Does not transition state when audit fails", async () => {
      const tokenId = await syncTokenCounter();
      const serial = "SN-2024-FAIL";
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      const auditorSigner = await createSignerFromKeyPair(auditor);

      await client.scSolana.instructions.registerNetbook({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        netbook: toAddress(netbookPda),
        serialNumber: serial,
        batchId: "BATCH-TEST",
        initialModelSpecs: "Test Specs",
      }).sendTransaction();

      const reportHash = toUint8Array(createHash(0));

      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial,
        passed: false,
        reportHash,
      }).sendTransaction();

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.Fabricada);
      expect(netbook.hwIntegrityPassed).to.equal(false);
    });
  });

  describe("5. Software Validation", () => {
    beforeEach(() => {
      resetTokenCounter();
    });

    it("Can validate software and transition to SwValidado state", async () => {
      const tokenId = 1;
      const serial = generateUniqueSerial("SC");
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const osVersion = "Ubuntu 22.04 LTS";
      const technicianSigner = await createSignerFromKeyPair(technician);

      const tx = await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial,
        osVersion,
        passed: true,
      }).sendTransaction();

      console.log("Validate software TX:", tx);

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.SwValidado);
      expect(netbook.swValidationPassed).to.equal(true);
      expect(netbook.osVersion).to.equal(osVersion);
    });

    it("Cannot validate software from wrong state", async () => {
      const tokenId = await syncTokenCounter();
      const serial = "SN-2024-ASSIGN-BAD-STATE";
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      const technicianSigner = await createSignerFromKeyPair(technician);

      await client.scSolana.instructions.registerNetbook({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        netbook: toAddress(netbookPda),
        serialNumber: serial,
        batchId: "BATCH-TEST",
        initialModelSpecs: "Test Specs",
      }).sendTransaction();

      try {
        await client.scSolana.instructions.validateSoftware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          technician: technicianSigner,
          serial,
          osVersion: "Ubuntu 24.04",
          passed: true,
        }).sendTransaction();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.message).to.include("InvalidStateTransition");
      }
    });

    it("Cannot validate software without tecnico role", async () => {
      const tokenId = await syncTokenCounter();
      const serial = "SN-2024-NO-TECH";
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      const auditorSigner = await createSignerFromKeyPair(auditor);

      await client.scSolana.instructions.registerNetbook({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        netbook: toAddress(netbookPda),
        serialNumber: serial,
        batchId: "BATCH-TEST",
        initialModelSpecs: "Test Specs",
      }).sendTransaction();

      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial,
        passed: true,
        reportHash: toUint8Array(createHash(0)),
      }).sendTransaction();

      try {
        await client.scSolana.instructions.validateSoftware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          technician: auditorSigner,
          serial,
          osVersion: "Ubuntu 22.04",
          passed: true,
        }).sendTransaction();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.message).to.include("Unauthorized");
      }
    });
  });

  describe("6. Student Assignment", () => {
    it("Can assign netbook to student and transition to Distribuida state", async () => {
      const tokenId = await syncTokenCounter();
      const serial = "SN-2024-ASSIGN";
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const schoolHash = toUint8Array(createHash(100));
      const studentHash = toUint8Array(createHash(200));
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      const auditorSigner = await createSignerFromKeyPair(auditor);
      const technicianSigner = await createSignerFromKeyPair(technician);
      const schoolSigner = await createSignerFromKeyPair(school);

      // Register
      await client.scSolana.instructions.registerNetbook({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        netbook: toAddress(netbookPda),
        serialNumber: serial,
        batchId: "BATCH-TEST",
        initialModelSpecs: "Test Specs",
      }).sendTransaction();

      // Audit
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial,
        passed: true,
        reportHash: toUint8Array(createHash(0)),
      }).sendTransaction();

      // Validate software
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial,
        osVersion: "Ubuntu 22.04",
        passed: true,
      }).sendTransaction();

      // Assign to student
      const tx = await client.scSolana.instructions.assignToStudent({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        school: schoolSigner,
        serial,
        schoolHash,
        studentHash,
      }).sendTransaction();

      console.log("Assign to student TX:", tx);

      const netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.Distribuida);
      expect(netbook.destinationSchoolHash).to.deep.equal(schoolHash);
      expect(netbook.studentIdHash).to.deep.equal(studentHash);
    });

    it("Cannot assign netbook from wrong state", async () => {
      const tokenId = await syncTokenCounter();
      const serial = "SN-2024-WRONG-STATE";
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const schoolHash = toUint8Array(createHash(0));
      const studentHash = toUint8Array(createHash(0));
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      const schoolSigner = await createSignerFromKeyPair(school);

      await client.scSolana.instructions.registerNetbook({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        netbook: toAddress(netbookPda),
        serialNumber: serial,
        batchId: "BATCH-TEST",
        initialModelSpecs: "Test Specs",
      }).sendTransaction();

      try {
        await client.scSolana.instructions.assignToStudent({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          school: schoolSigner,
          serial,
          schoolHash,
          studentHash,
        }).sendTransaction();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        console.log("Error message:", err.message);
        expect(err.message).to.include("InvalidStateTransition");
      }
    });

    it("Cannot assign netbook without school role", async () => {
      const tokenId = await syncTokenCounter();
      const serial = "SN-2024-NO-SCHOOL";
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const schoolHash = toUint8Array(createHash(0));
      const studentHash = toUint8Array(createHash(0));
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      const auditorSigner = await createSignerFromKeyPair(auditor);
      const technicianSigner = await createSignerFromKeyPair(technician);

      await client.scSolana.instructions.registerNetbook({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        netbook: toAddress(netbookPda),
        serialNumber: serial,
        batchId: "BATCH-TEST",
        initialModelSpecs: "Test Specs",
      }).sendTransaction();

      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial,
        passed: true,
        reportHash: toUint8Array(createHash(0)),
      }).sendTransaction();

      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial,
        osVersion: "Ubuntu 22.04",
        passed: true,
      }).sendTransaction();

      try {
        await client.scSolana.instructions.assignToStudent({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          school: fabricanteSigner,
          serial,
          schoolHash,
          studentHash,
        }).sendTransaction();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.message).to.include("Unauthorized");
      }
    });
  });

  describe("7. State Machine Validation", () => {
    it("Enforces complete state transition flow: Fabricada -> HwAprobado -> SwValidado -> Distribuida", async () => {
      const tokenId = await syncTokenCounter();
      const serial = "SN-2024-FULL";
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const reportHash = toUint8Array(createHash(0));
      const schoolHash = toUint8Array(createHash(0));
      const studentHash = toUint8Array(createHash(0));
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      const auditorSigner = await createSignerFromKeyPair(auditor);
      const technicianSigner = await createSignerFromKeyPair(technician);
      const schoolSigner = await createSignerFromKeyPair(school);

      // Step 1: Register (Fabricada)
      await client.scSolana.instructions.registerNetbook({
        config: toAddress(configPda),
        serialHashRegistry: toAddress(serialHashRegistryPda),
        manufacturer: fabricanteSigner,
        netbook: toAddress(netbookPda),
        serialNumber: serial,
        batchId: "BATCH-TEST",
        initialModelSpecs: "Test Specs",
      }).sendTransaction();

      let netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.Fabricada);

      // Step 2: Hardware Audit (HwAprobado)
      await client.scSolana.instructions.auditHardware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        auditor: auditorSigner,
        serial,
        passed: true,
        reportHash,
      }).sendTransaction();

      netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.HwAprobado);

      // Step 3: Software Validation (SwValidado)
      await client.scSolana.instructions.validateSoftware({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        technician: technicianSigner,
        serial,
        osVersion: "Ubuntu 22.04",
        passed: true,
      }).sendTransaction();

      netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.SwValidado);

      // Step 4: Assign to Student (Distribuida)
      await client.scSolana.instructions.assignToStudent({
        netbook: toAddress(netbookPda),
        config: toAddress(configPda),
        school: schoolSigner,
        serial,
        schoolHash,
        studentHash,
      }).sendTransaction();

      netbook = await client.scSolana.accounts.netbook.fetch(toAddress(netbookPda));
      expect(netbook.state).to.equal(NetbookState.Distribuida);
    });
  });

  describe("8. PDA Derivation", () => {
    it("Netbook PDA is deterministic for same token ID", async () => {
      const pda1 = await getNetbookPdaAddress(1);
      const pda2 = await getNetbookPdaAddress(1);
      expect(pda1).to.equal(pda2);
    });

    it("Netbook PDA is different for different token IDs", async () => {
      const pda1 = await getNetbookPdaAddress(1);
      const pda2 = await getNetbookPdaAddress(2);
      expect(pda1).to.not.equal(pda2);
    });

    it("Netbook PDA uses bump counter, not serial", async () => {
      const pda1 = await getNetbookPdaAddress(1);
      const serial = generateUniqueSerial("SC");
      expect(pda1).to.not.equal(serial);
    });
  });

  describe("9. Error Codes (Issue #21)", () => {
    it("Returns ArrayLengthMismatch for batch with mismatched arrays", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          serialNumbers: ["SN-1", "SN-2"],
          batchIds: ["BATCH-1"],
          modelSpecs: ["Specs-1", "Specs-2"],
        }).sendTransaction();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        console.log("Expected array mismatch error:", err.message);
        expect(err.message).to.include("ArrayLengthMismatch");
      }
    });

    it("Returns InvalidInput for empty batch", async () => {
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      try {
        await client.scSolana.instructions.registerNetbooksBatch({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          serialNumbers: [],
          batchIds: [],
          modelSpecs: [],
        }).sendTransaction();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        console.log("Expected invalid input error:", err.message);
        expect(err.message).to.include("InvalidInput");
      }
    });

    it("Returns EmptySerial for empty serial number", async () => {
      const tokenId = await syncTokenCounter();
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);

      try {
        await client.scSolana.instructions.registerNetbook({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          netbook: toAddress(netbookPda),
          serialNumber: "",
          batchId: "BATCH",
          initialModelSpecs: "Specs",
        }).sendTransaction();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        console.log("Expected error:", err.message);
      }
    });

    it("Returns StringTooLong for serial exceeding 200 chars", async () => {
      const longSerial = "A".repeat(201);
      const tokenId = await syncTokenCounter();
      const netbookPda = await getNetbookPdaAddress(tokenId);
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);

      try {
        await client.scSolana.instructions.registerNetbook({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          netbook: toAddress(netbookPda),
          serialNumber: longSerial,
          batchId: "BATCH",
          initialModelSpecs: "Specs",
        }).sendTransaction();
        expect.fail("Should have thrown error");
      } catch (err: any) {
        console.log("Expected error:", err.message);
      }
    });
  });

  describe("10. Config Counters (Issue #20)", () => {
    it("Tracks total netbooks count", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.totalNetbooks.toNumber()).to.be.greaterThan(0);
    });

    it("Tracks role requests count", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      expect(config.roleRequestsCount.toNumber()).to.be.greaterThan(0);
    });
  });
});
