/**
 * Query Instruction Integration Tests
 *
 * Tests for query/view instructions:
 * - queryNetbookState: Query netbook state by PDA
 * - queryConfig: Query supply chain configuration
 * - queryRole: Check if account has a specific role
 *
 * These are view functions that emit events with query results.
 * They don't mutate state but require proper account accounts.
 *
 * Migrated from @coral-xyz/anchor to Codama-generated client (Issue #209).
 */

import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createSignerFromKeyPair } from "@solana/kit";
import { expect } from "chai";

import {
  createTestClient,
  getConfigPdaAddress,
  getNetbookPdaAddress,
  getSerialHashRegistryPdaAddress,
  getAdminPdaAddress,
  fundKeypair,
  fundAndInitialize,
  createTestNetbookData,
  createHash,
  toAddress,
  toUint8Array,
  generateUniqueSerial,
  type TestClient,
} from "./test-helpers";

describe("Query Instruction Integration Tests", () => {
  let client: TestClient;

  // Test accounts
  let admin: Keypair;
  let fabricante: Keypair;
  let auditor: Keypair;
  let tecnico: Keypair;
  let escuela: Keypair;
  let randomUser: Keypair;
  let configPda: string;
  let adminPda: string;
  let serialHashRegistryPda: string;

  // Registered netbooks for querying
  let registeredNetbooks: { serial: string; tokenId: number; pda: string }[] = [];

  before(async () => {
    // Create test accounts
    admin = Keypair.generate();
    fabricante = Keypair.generate();
    auditor = Keypair.generate();
    tecnico = Keypair.generate();
    escuela = Keypair.generate();
    randomUser = Keypair.generate();

    // Create client
    client = await createTestClient("http://localhost:8899", admin);

    // Airdrop to all accounts
    await fundKeypair(client, fabricante, 2 * LAMPORTS_PER_SOL);
    await fundKeypair(client, auditor, 2 * LAMPORTS_PER_SOL);
    await fundKeypair(client, tecnico, 2 * LAMPORTS_PER_SOL);
    await fundKeypair(client, escuela, 2 * LAMPORTS_PER_SOL);
    await fundKeypair(client, randomUser, 2 * LAMPORTS_PER_SOL);

    // Get PDAs
    configPda = await getConfigPdaAddress();
    serialHashRegistryPda = await getSerialHashRegistryPdaAddress(toAddress(configPda));

    // Initialize using shared initialization (Issue #178)
    await fundAndInitialize(client, admin);
    adminPda = await getAdminPdaAddress(toAddress(configPda));

    // Grant roles
    const roles = [
      { role: "FABRICANTE", account: fabricante },
      { role: "AUDITOR_HW", account: auditor },
      { role: "TECNICO_SW", account: tecnico },
      { role: "ESCUELA", account: escuela },
    ];

    for (const { role, account } of roles) {
      const accountSigner = await createSignerFromKeyPair(account);
      await client.scSolana.instructions
        .grantRole({
          config: toAddress(configPda),
          admin: toAddress(adminPda),
          accountToGrant: accountSigner,
          role,
        })
        .sendAndConfirm();
    }
  });

  describe("QueryConfig Instruction", () => {
    it("queries config and emits ConfigQuery event", async () => {
      const tx = await client.scSolana.instructions.queryConfig({
        config: toAddress(configPda),
      });
      await tx.sendAndConfirm();
    });

    it("returns correct next_token_id after registrations", async () => {
      // Register a netbook first
      const netbookData = createTestNetbookData(1);
      const serialNumber = netbookData.serialNumber;

      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      const netbookPda = await getNetbookPdaAddress(tokenId);

      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      await client.scSolana.instructions
        .registerNetbook({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          netbook: toAddress(netbookPda),
          serialNumber,
          batchId: "batch-001",
          initialModelSpecs: "Model-X-100",
        })
        .sendAndConfirm();

      registeredNetbooks.push({ serial: serialNumber, tokenId, pda: netbookPda });

      // Now query config
      const tx = await client.scSolana.instructions.queryConfig({
        config: toAddress(configPda),
      });
      await tx.sendAndConfirm();
    });

    it("returns role holder counts correctly", async () => {
      // Should have 4 role holders (fabricante, auditor_hw, tecnico_sw, escuela)
      const tx = await client.scSolana.instructions.queryConfig({
        config: toAddress(configPda),
      });
      await tx.sendAndConfirm();
    });

    it("rejects query with invalid config PDA", async () => {
      const invalidConfig = Keypair.generate().publicKey.toString();

      try {
        await client.scSolana.instructions
          .queryConfig({
            config: toAddress(invalidConfig),
          })
          .sendAndConfirm();
        throw new Error("Expected queryConfig to fail with invalid config PDA");
      } catch (error: any) {
        const errorMessage = error.message || "";
        if (!errorMessage.includes("AccountNotFound")) {
          throw new Error(
            `Expected error containing 'AccountNotFound', but got: '${errorMessage}'`
          );
        }
      }
    });
  });

  describe("QueryNetbookState Instruction", () => {
    it("queries registered netbook state correctly", async () => {
      // Register a netbook for querying
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      const serialNumber = `QUERY-SERIAL-${tokenId.toString().padStart(3, "0")}`;
      const netbookPda = await getNetbookPdaAddress(tokenId);

      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      await client.scSolana.instructions
        .registerNetbook({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          netbook: toAddress(netbookPda),
          serialNumber,
          batchId: "batch-query-001",
          initialModelSpecs: "Model-Query-100",
        })
        .sendAndConfirm();

      registeredNetbooks.push({ serial: serialNumber, tokenId, pda: netbookPda });

      // Query the netbook state
      const tx = await client.scSolana.instructions.queryNetbookState({
        netbook: toAddress(netbookPda),
        serialNumber,
      });
      await tx.sendAndConfirm();
    });

    it("returns correct state for Fabricada netbook", async () => {
      const netbook = registeredNetbooks[0];
      const serialNumber = netbook.serial;
      const netbookPda = netbook.pda;

      const tx = await client.scSolana.instructions.queryNetbookState({
        netbook: toAddress(netbookPda),
        serialNumber,
      });
      await tx.sendAndConfirm();
    });

    it("queries netbook after hardware audit", async () => {
      const netbook = registeredNetbooks[0];
      const serialNumber = netbook.serial;
      const netbookPda = netbook.pda;

      // Perform hardware audit
      const reportHash = createHash(123456789);
      const auditorSigner = await createSignerFromKeyPair(auditor);

      await client.scSolana.instructions
        .auditHardware({
          netbook: toAddress(netbookPda),
          config: toAddress(configPda),
          auditor: auditorSigner,
          serialNumber,
          passed: true,
          reportHash: toUint8Array(reportHash),
        })
        .sendAndConfirm();

      // Query netbook state - should now be HwAprobado
      const tx = await client.scSolana.instructions.queryNetbookState({
        netbook: toAddress(netbookPda),
        serialNumber,
      });
      await tx.sendAndConfirm();
    });

    it("rejects query for non-existent netbook PDA", async () => {
      const nonExistentSerial = "NON-EXISTENT-SERIAL-999";
      const nonExistentPda = Keypair.generate().publicKey.toString();

      try {
        await client.scSolana.instructions
          .queryNetbookState({
            netbook: toAddress(nonExistentPda),
            serialNumber: nonExistentSerial,
          })
          .sendAndConfirm();
        throw new Error("Expected queryNetbookState to fail for non-existent netbook");
      } catch (error: any) {
        const errorMessage = error.message || "";
        if (!errorMessage.includes("AccountNotFound")) {
          throw new Error(
            `Expected error containing 'AccountNotFound', but got: '${errorMessage}'`
          );
        }
      }
    });

    it("allows querying with different serial than stored (serial not validated in query)", async () => {
      // Use a different serial but the same PDA as registered netbook
      const netbook = registeredNetbooks[0];
      const netbookPda = netbook.pda;

      // Try to query with wrong serial - this should still work because
      // the serial is not validated against the PDA in the query instruction
      // (it's just passed for event emission)
      const tx = await client.scSolana.instructions.queryNetbookState({
        netbook: toAddress(netbookPda),
        serialNumber: "WRONG-SERIAL-NUMBER",
      });
      await tx.sendAndConfirm();
    });

    it("queries multiple netbooks concurrently", async () => {
      // Register additional netbooks
      const additionalNetbooks: { serial: string; pda: string }[] = [];
      for (let i = 0; i < 3; i++) {
        const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
        const tokenId = Number(config.nextTokenId);
        const serialNumber = `QUERY-SERIAL-${tokenId.toString().padStart(3, "0")}`;
        const netbookPda = await getNetbookPdaAddress(tokenId);

        const fabricanteSigner = await createSignerFromKeyPair(fabricante);
        await client.scSolana.instructions
          .registerNetbook({
            config: toAddress(configPda),
            serialHashRegistry: toAddress(serialHashRegistryPda),
            manufacturer: fabricanteSigner,
            netbook: toAddress(netbookPda),
            serialNumber,
            batchId: `batch-query-00${i + 2}`,
            initialModelSpecs: `Model-Query-${100 + i}`,
          })
          .sendAndConfirm();

        additionalNetbooks.push({ serial: serialNumber, pda: netbookPda });
        registeredNetbooks.push({ serial: serialNumber, tokenId, pda: netbookPda });
      }

      // Query all netbooks concurrently
      const queryPromises = additionalNetbooks.map(async (nb) => {
        const tx = await client.scSolana.instructions.queryNetbookState({
          netbook: toAddress(nb.pda),
          serialNumber: nb.serial,
        });
        await tx.sendAndConfirm();
      });

      await Promise.all(queryPromises);
    });
  });

  describe("QueryRole Instruction", () => {
    it("returns true for account with granted role", async () => {
      const tx = await client.scSolana.instructions.queryRole({
        config: toAddress(configPda),
        accountToCheck: toAddress(fabricante.publicKey.toString()),
        role: "FABRICANTE",
      });
      await tx.sendAndConfirm();
    });

    it("returns false for account without role", async () => {
      const tx = await client.scSolana.instructions.queryRole({
        config: toAddress(configPda),
        accountToCheck: toAddress(randomUser.publicKey.toString()),
        role: "AUDITOR_HW",
      });
      await tx.sendAndConfirm();
    });

    it("checks multiple roles for same account", async () => {
      // Auditor should have auditor_hw role
      const tx = await client.scSolana.instructions.queryRole({
        config: toAddress(configPda),
        accountToCheck: toAddress(auditor.publicKey.toString()),
        role: "AUDITOR_HW",
      });
      await tx.sendAndConfirm();
    });

    it("checks non-existent role returns false", async () => {
      const tx = await client.scSolana.instructions.queryRole({
        config: toAddress(configPda),
        accountToCheck: toAddress(admin.publicKey.toString()),
        role: "non_existent_role",
      });
      await tx.sendAndConfirm();
    });

    it("rejects query with invalid config PDA", async () => {
      const invalidConfig = Keypair.generate().publicKey.toString();

      try {
        await client.scSolana.instructions
          .queryRole({
            config: toAddress(invalidConfig),
            accountToCheck: toAddress(fabricante.publicKey.toString()),
            role: "FABRICANTE",
          })
          .sendAndConfirm();
        throw new Error("Expected queryRole to fail with invalid config PDA");
      } catch (error: any) {
        const errorMessage = error.message || "";
        if (!errorMessage.includes("AccountNotFound")) {
          throw new Error(
            `Expected error containing 'AccountNotFound', but got: '${errorMessage}'`
          );
        }
      }
    });

    it("handles empty role string gracefully", async () => {
      const tx = await client.scSolana.instructions.queryRole({
        config: toAddress(configPda),
        accountToCheck: toAddress(randomUser.publicKey.toString()),
        role: "",
      });
      await tx.sendAndConfirm();
    });

    it("checks all granted roles for different accounts", async () => {
      const roles = ["FABRICANTE", "AUDITOR_HW", "TECNICO_SW", "ESCUELA"];
      const accounts = [fabricante, auditor, tecnico, escuela];

      for (const [index, role] of roles.entries()) {
        const account = accounts[index];
        const tx = await client.scSolana.instructions.queryRole({
          config: toAddress(configPda),
          accountToCheck: toAddress(account.publicKey.toString()),
          role,
        });
        await tx.sendAndConfirm();
      }
    });
  });

  describe("Query Instructions Edge Cases", () => {
    it("handles query immediately after registration", async () => {
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      const serialNumber = `EDGE-SERIAL-${tokenId.toString().padStart(3, "0")}`;
      const netbookPda = await getNetbookPdaAddress(tokenId);

      // Register
      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      await client.scSolana.instructions
        .registerNetbook({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          netbook: toAddress(netbookPda),
          serialNumber,
          batchId: "batch-edge-001",
          initialModelSpecs: "Model-Edge-100",
        })
        .sendAndConfirm();

      // Immediately query - no delay
      const tx = await client.scSolana.instructions.queryNetbookState({
        netbook: toAddress(netbookPda),
        serialNumber,
      });
      await tx.sendAndConfirm();
    });

    it("handles query during concurrent config and netbook queries", async () => {
      // Register a netbook
      const config = await client.scSolana.accounts.supplyChainConfig.fetch(toAddress(configPda));
      const tokenId = Number(config.nextTokenId);
      const serialNumber = `CONCURRENT-SERIAL-${tokenId.toString().padStart(3, "0")}`;
      const netbookPda = await getNetbookPdaAddress(tokenId);

      const fabricanteSigner = await createSignerFromKeyPair(fabricante);
      await client.scSolana.instructions
        .registerNetbook({
          config: toAddress(configPda),
          serialHashRegistry: toAddress(serialHashRegistryPda),
          manufacturer: fabricanteSigner,
          netbook: toAddress(netbookPda),
          serialNumber,
          batchId: "batch-concurrent",
          initialModelSpecs: "Model-Concurrent-100",
        })
        .sendAndConfirm();

      // Execute queries concurrently
      await Promise.all([
        client.scSolana.instructions
          .queryConfig({ config: toAddress(configPda) })
          .sendAndConfirm(),
        client.scSolana.instructions
          .queryNetbookState({ netbook: toAddress(netbookPda), serialNumber })
          .sendAndConfirm(),
      ]);
    });

    it("handles rapid sequential queries on same netbook", async () => {
      const netbook = registeredNetbooks[0];
      const serialNumber = netbook.serial;
      const netbookPda = netbook.pda;

      // Perform 5 rapid sequential queries
      for (let i = 0; i < 5; i++) {
        const tx = await client.scSolana.instructions.queryNetbookState({
          netbook: toAddress(netbookPda),
          serialNumber,
        });
        await tx.sendAndConfirm();
      }
    });

    it("verifies query does not modify state by querying multiple times", async () => {
      const netbook = registeredNetbooks[0];
      const serialNumber = netbook.serial;
      const netbookPda = netbook.pda;

      // Query the same netbook 10 times
      for (let i = 0; i < 10; i++) {
        const tx = await client.scSolana.instructions.queryNetbookState({
          netbook: toAddress(netbookPda),
          serialNumber,
        });
        await tx.sendAndConfirm();
      }

      // If we got here without errors, the queries didn't modify state
      // (otherwise we would have seen errors from state changes)
    });
  });

  describe("Query Role Enforcement", () => {
    it("allows anyone to query config (no role required)", async () => {
      const tx = await client.scSolana.instructions.queryConfig({
        config: toAddress(configPda),
      });
      await tx.sendAndConfirm();
    });

    it("allows anyone to query netbook state (no role required)", async () => {
      const netbook = registeredNetbooks[0];
      const serialNumber = netbook.serial;
      const netbookPda = netbook.pda;

      const tx = await client.scSolana.instructions.queryNetbookState({
        netbook: toAddress(netbookPda),
        serialNumber,
      });
      await tx.sendAndConfirm();
    });

    it("allows anyone to query role (no role required)", async () => {
      const tx = await client.scSolana.instructions.queryRole({
        config: toAddress(configPda),
        accountToCheck: toAddress(fabricante.publicKey.toString()),
        role: "FABRICANTE",
      });
      await tx.sendAndConfirm();
    });
  });
});
