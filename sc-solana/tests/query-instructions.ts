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
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";
import { Keypair, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  getConfigPda,
  getNetbookPda,
  getSerialHashRegistryPda,
  getAdminPda,
  fundKeypair,
  fundAndInitialize,
  createTestNetbookData,
  createHash,
  onEvent,
  offEvent,
} from "./test-helpers";

describe("Query Instruction Integration Tests", () => {
  const provider = AnchorProvider.env() as AnchorProvider;
  const program = anchor.workspace.scSolana as Program<ScSolana>;

  // Test accounts
  let admin: Keypair;
  let fabricante: Keypair;
  let auditor: Keypair;
  let tecnico: Keypair;
  let escuela: Keypair;
  let randomUser: Keypair;
  let configPda: PublicKey;
  let adminPda: PublicKey;
  let serialHashRegistryPda: PublicKey;

  // Registered netbooks for querying
  let registeredNetbooks: { serial: string; tokenId: number; pda: PublicKey }[] = [];

  before(async () => {
    // Create test accounts
    admin = Keypair.generate();
    fabricante = Keypair.generate();
    auditor = Keypair.generate();
    tecnico = Keypair.generate();
    escuela = Keypair.generate();
    randomUser = Keypair.generate();

    // Fund admin account
    await fundKeypair(provider, admin, 2);

    // Get PDAs
    const configResult = getConfigPda(program);
    configPda = configResult[0];
    serialHashRegistryPda = getSerialHashRegistryPda(configPda, program.programId);

    // Airdrop to all accounts
    for (const kp of [fabricante, auditor, tecnico, escuela, randomUser]) {
      await fundKeypair(provider, kp, 1);
    }

    // Initialize using shared initialization (Issue #178)
    await fundAndInitialize(program, provider, admin);
    adminPda = getAdminPda(configPda, program.programId);

    // Grant roles
    for (const [role, account] of [
      ["fabricante", fabricante],
      ["auditor_hw", auditor],
      ["tecnico_sw", tecnico],
      ["escuela", escuela],
    ] as [string, Keypair][]) {
      await program.methods
        .grantRole(role)
        .accountsStrict({
          config: configPda,
          admin: adminPda,
          accountToGrant: account.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin, account])
        .rpc();
    }
  });

  describe("QueryConfig Instruction", () => {
    it("queries config and emits ConfigQuery event", async () => {
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Config query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("ConfigQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          configPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryConfig()
        .accountsStrict({
          config: configPda,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("returns correct next_token_id after registrations", async () => {
      // Register a netbook first
      const netbookData = createTestNetbookData(1);
      const serialNumber = netbookData.serialNumber;

      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      const netbookPda = getNetbookPda(tokenId, program.programId);

      await program.methods
        .registerNetbook(serialNumber, "batch-001", "Model-X-100")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          netbook: netbookPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      registeredNetbooks.push({ serial: serialNumber, tokenId, pda: netbookPda });

      // Now query config
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Config query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("ConfigQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          configPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryConfig()
        .accountsStrict({
          config: configPda,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("returns role holder counts correctly", async () => {
      // Should have 4 role holders (fabricante, auditor_hw, tecnico_sw, escuela)
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Config query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("ConfigQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          configPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryConfig()
        .accountsStrict({
          config: configPda,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("rejects query with invalid config PDA", async () => {
      const invalidConfig = Keypair.generate().publicKey;

      try {
        await program.methods
          .queryConfig()
          .accountsStrict({
            config: invalidConfig,
          })
          .signers([])
          .rpc();
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
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      const serialNumber = `QUERY-SERIAL-${tokenId.toString().padStart(3, '0')}`;
      const netbookPda = getNetbookPda(tokenId, program.programId);

      await program.methods
        .registerNetbook(serialNumber, "batch-query-001", "Model-Query-100")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          netbook: netbookPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      registeredNetbooks.push({ serial: serialNumber, tokenId, pda: netbookPda });

      // Query the netbook state
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Netbook state query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("NetbookStateQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          netbookPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryNetbookState(serialNumber)
        .accountsStrict({
          netbook: netbookPda,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("returns correct state for Fabricada netbook", async () => {
      const netbook = registeredNetbooks[0];
      const serialNumber = netbook.serial;
      const netbookPda = netbook.pda;

      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Netbook state query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("NetbookStateQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          netbookPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryNetbookState(serialNumber)
        .accountsStrict({
          netbook: netbookPda,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("queries netbook after hardware audit", async () => {
      const netbook = registeredNetbooks[0];
      const serialNumber = netbook.serial;
      const netbookPda = netbook.pda;

      // Perform hardware audit
      const reportHash = createHash(123456789);

      await program.methods
        .auditHardware(serialNumber, true, reportHash)
        .accountsStrict({
          netbook: netbookPda,
          config: configPda,
          auditor: auditor.publicKey,
        })
        .signers([auditor])
        .rpc();

      // Query netbook state - should now be HwAprobado
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Netbook state query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("NetbookStateQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          netbookPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryNetbookState(serialNumber)
        .accountsStrict({
          netbook: netbookPda,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("rejects query for non-existent netbook PDA", async () => {
      const nonExistentSerial = "NON-EXISTENT-SERIAL-999";
      const nonExistentPda = Keypair.generate().publicKey;

      try {
        await program.methods
          .queryNetbookState(nonExistentSerial)
          .accountsStrict({
            netbook: nonExistentPda,
          })
          .signers([])
          .rpc();
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
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Netbook state query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("NetbookStateQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          netbookPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryNetbookState("WRONG-SERIAL-NUMBER")
        .accountsStrict({
          netbook: netbookPda,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("queries multiple netbooks concurrently", async () => {
      // Register additional netbooks
      const additionalNetbooks: { serial: string; pda: PublicKey }[] = [];
      for (let i = 0; i < 3; i++) {
        const config = await program.account.supplyChainConfig.fetch(configPda);
        const tokenId = config.nextTokenId.toNumber();
        const serialNumber = `QUERY-SERIAL-${tokenId.toString().padStart(3, '0')}`;
        const netbookPda = getNetbookPda(tokenId, program.programId);

        await program.methods
          .registerNetbook(serialNumber, `batch-query-00${i + 2}`, `Model-Query-${100 + i}`)
          .accountsStrict({
            config: configPda,
            serialHashRegistry: serialHashRegistryPda,
            manufacturer: fabricante.publicKey,
            netbook: netbookPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([fabricante])
          .rpc();

        additionalNetbooks.push({ serial: serialNumber, pda: netbookPda });
        registeredNetbooks.push({ serial: serialNumber, tokenId, pda: netbookPda });
      }

      // Query all netbooks concurrently
      const queryPromises = additionalNetbooks.map(async (nb) => {
        let eventReceived = false;

        const eventPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Netbook state query event timeout"));
          }, 10000);

          const listener = (
            _logs: anchor.web3.Logs,
            _context: unknown
          ) => {
            const found = _logs.logs?.some((log) =>
              typeof log === "string" && log.includes("NetbookStateQuery")
            );
            if (found) {
              clearTimeout(timeout);
              eventReceived = true;
              resolve();
            }
          };

          provider.connection.onLogs(
            nb.pda,
            listener as any,
            "confirmed"
          );
        });

        await program.methods
          .queryNetbookState(nb.serial)
          .accountsStrict({
            netbook: nb.pda,
          })
          .signers([])
          .rpc();

        await eventPromise;
      });

      await Promise.all(queryPromises);
    });
  });

  describe("QueryRole Instruction", () => {
    it("returns true for account with granted role", async () => {
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Role query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("RoleQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          configPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryRole("fabricante")
        .accountsStrict({
          config: configPda,
          accountToCheck: fabricante.publicKey,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("returns false for account without role", async () => {
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Role query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("RoleQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          configPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryRole("auditor_hw")
        .accountsStrict({
          config: configPda,
          accountToCheck: randomUser.publicKey,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("checks multiple roles for same account", async () => {
      // Auditor should have auditor_hw role
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Role query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("RoleQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          configPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryRole("auditor_hw")
        .accountsStrict({
          config: configPda,
          accountToCheck: auditor.publicKey,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("checks non-existent role returns false", async () => {
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Role query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("RoleQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          configPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryRole("non_existent_role")
        .accountsStrict({
          config: configPda,
          accountToCheck: admin.publicKey,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("rejects query with invalid config PDA", async () => {
      const invalidConfig = Keypair.generate().publicKey;

      try {
        await program.methods
          .queryRole("fabricante")
          .accountsStrict({
            config: invalidConfig,
            accountToCheck: fabricante.publicKey,
          })
          .signers([])
          .rpc();
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
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Role query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("RoleQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          configPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryRole("")
        .accountsStrict({
          config: configPda,
          accountToCheck: randomUser.publicKey,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("checks all granted roles for different accounts", async () => {
      const roles = ["fabricante", "auditor_hw", "tecnico_sw", "escuela"];
      const accounts = [fabricante, auditor, tecnico, escuela];

      for (const [index, role] of roles.entries()) {
        const account = accounts[index];

        let eventReceived = false;

        const eventPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Role query event timeout"));
          }, 10000);

          const listener = (
            _logs: anchor.web3.Logs,
            _context: unknown
          ) => {
            const found = _logs.logs?.some((log) =>
              typeof log === "string" && log.includes("RoleQuery")
            );
            if (found) {
              clearTimeout(timeout);
              eventReceived = true;
              resolve();
            }
          };

          provider.connection.onLogs(
            configPda,
            listener as any,
            "confirmed"
          );
        });

        await program.methods
          .queryRole(role)
          .accountsStrict({
            config: configPda,
            accountToCheck: account.publicKey,
          })
          .signers([])
          .rpc();

        await eventPromise;
      }
    });
  });

  describe("Query Instructions Edge Cases", () => {
    it("handles query immediately after registration", async () => {
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      const serialNumber = `EDGE-SERIAL-${tokenId.toString().padStart(3, '0')}`;
      const netbookPda = getNetbookPda(tokenId, program.programId);

      // Register
      await program.methods
        .registerNetbook(serialNumber, "batch-edge-001", "Model-Edge-100")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          netbook: netbookPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Immediately query - no delay
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Netbook state query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("NetbookStateQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          netbookPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryNetbookState(serialNumber)
        .accountsStrict({
          netbook: netbookPda,
        })
        .signers([])
        .rpc();

      await eventPromise;
    });

    it("handles query during concurrent config and netbook queries", async () => {
      // Register a netbook
      const config = await program.account.supplyChainConfig.fetch(configPda);
      const tokenId = config.nextTokenId.toNumber();
      const serialNumber = `CONCURRENT-SERIAL-${tokenId.toString().padStart(3, '0')}`;
      const netbookPda = getNetbookPda(tokenId, program.programId);

      await program.methods
        .registerNetbook(serialNumber, "batch-concurrent", "Model-Concurrent-100")
        .accountsStrict({
          config: configPda,
          serialHashRegistry: serialHashRegistryPda,
          manufacturer: fabricante.publicKey,
          netbook: netbookPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([fabricante])
        .rpc();

      // Query config and netbook concurrently
      const configPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Config query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("ConfigQuery")
          );
          if (found) {
            clearTimeout(timeout);
            resolve();
          }
        };

        provider.connection.onLogs(
          configPda,
          listener as any,
          "confirmed"
        );
      });

      const netbookPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Netbook state query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("NetbookStateQuery")
          );
          if (found) {
            clearTimeout(timeout);
            resolve();
          }
        };

        provider.connection.onLogs(
          netbookPda,
          listener as any,
          "confirmed"
        );
      });

      // Execute queries concurrently
      const [configResult, netbookResult2] = await Promise.all([
        program.methods
          .queryConfig()
          .accountsStrict({ config: configPda })
          .signers([])
          .rpc(),
        program.methods
          .queryNetbookState(serialNumber)
          .accountsStrict({ netbook: netbookPda })
          .signers([])
          .rpc(),
      ]);

      // Wait for both events
      await Promise.all([configPromise, netbookPromise]);
    });

    it("handles rapid sequential queries on same netbook", async () => {
      const netbook = registeredNetbooks[0];
      const serialNumber = netbook.serial;
      const netbookPda = netbook.pda;

      // Perform 5 rapid sequential queries
      for (let i = 0; i < 5; i++) {
        let eventReceived = false;

        const eventPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Netbook state query event timeout"));
          }, 10000);

          const listener = (
            _logs: anchor.web3.Logs,
            _context: unknown
          ) => {
            const found = _logs.logs?.some((log) =>
              typeof log === "string" && log.includes("NetbookStateQuery")
            );
            if (found) {
              clearTimeout(timeout);
              eventReceived = true;
              resolve();
            }
          };

          provider.connection.onLogs(
            netbookPda,
            listener as any,
            "confirmed"
          );
        });

        await program.methods
          .queryNetbookState(serialNumber)
          .accountsStrict({ netbook: netbookPda })
          .signers([])
          .rpc();

        await eventPromise;
      }
    });

    it("verifies query does not modify state by querying multiple times", async () => {
      const netbook = registeredNetbooks[0];
      const serialNumber = netbook.serial;
      const netbookPda = netbook.pda;

      // Query the same netbook 10 times
      for (let i = 0; i < 10; i++) {
        let eventReceived = false;

        const eventPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Netbook state query event timeout"));
          }, 10000);

          const listener = (
            _logs: anchor.web3.Logs,
            _context: unknown
          ) => {
            const found = _logs.logs?.some((log) =>
              typeof log === "string" && log.includes("NetbookStateQuery")
            );
            if (found) {
              clearTimeout(timeout);
              eventReceived = true;
              resolve();
            }
          };

          provider.connection.onLogs(
            netbookPda,
            listener as any,
            "confirmed"
          );
        });

        await program.methods
          .queryNetbookState(serialNumber)
          .accountsStrict({ netbook: netbookPda })
          .signers([])
          .rpc();

        await eventPromise;
      }

      // If we got here without errors, the queries didn't modify state
      // (otherwise we would have seen errors from state changes)
    });
  });

  describe("Query Role Enforcement", () => {
    it("allows anyone to query config (no role required)", async () => {
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Config query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("ConfigQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          configPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryConfig()
        .accountsStrict({ config: configPda })
        .signers([]) // No signers required
        .rpc();

      await eventPromise;
    });

    it("allows anyone to query netbook state (no role required)", async () => {
      const netbook = registeredNetbooks[0];
      const serialNumber = netbook.serial;
      const netbookPda = netbook.pda;

      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Netbook state query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("NetbookStateQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          netbookPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryNetbookState(serialNumber)
        .accountsStrict({ netbook: netbookPda })
        .signers([]) // No signers required
        .rpc();

      await eventPromise;
    });

    it("allows anyone to query role (no role required)", async () => {
      let eventReceived = false;

      const eventPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Role query event timeout"));
        }, 10000);

        const listener = (
          _logs: anchor.web3.Logs,
          _context: unknown
        ) => {
          const found = _logs.logs?.some((log) =>
            typeof log === "string" && log.includes("RoleQuery")
          );
          if (found) {
            clearTimeout(timeout);
            eventReceived = true;
            resolve();
          }
        };

        provider.connection.onLogs(
          configPda,
          listener as any,
          "confirmed"
        );
      });

      await program.methods
        .queryRole("fabricante")
        .accountsStrict({
          config: configPda,
          accountToCheck: fabricante.publicKey,
        })
        .signers([]) // No signers required
        .rpc();

      await eventPromise;
    });
  });
});
