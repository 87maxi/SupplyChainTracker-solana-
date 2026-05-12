# SupplyChainTracker - Solana Anchor Implementation

> **Trazabilidad Inmutable para la Educación** — Plataforma blockchain para rastrear la distribución de netbooks educativas en Solana.

[![Solana](https://img.shields.io/badge/blocks-solana-blue)](https://solana.com)
[![Anchor](https://img.shields.io/badge/framework-anchor-orange)](https://www.anchor-lang.com)
[![Next.js](https://img.shields.io/badge/frontend-next.js-black)](https://nextjs.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Tabla de Contenidos

1. [Overview](#overview)
2. [Solana Anchor Program](#solana-anchor-program)
   - [Program ID](#program-id)
   - [State Accounts](#state-accounts)
   - [Netbook State Machine](#netbook-state-machine)
   - [Instructions](#instructions)
   - [Events](#events)
   - [Errors](#errors)
3. [Frontend Web Application](#frontend-web-application)
   - [Technology Stack](#technology-stack)
   - [Directory Structure](#directory-structure)
   - [Pages & Routes](#pages--routes)
   - [Hooks Architecture](#hooks-architecture)
   - [Services Layer](#services-layer)
   - [Components Library](#components-library)
4. [Development Setup](#development-setup)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## Overview

SupplyChainTracker es un sistema de trazabilidad descentralizado que migra un sistema existente de Ethereum/Solidity a Solana/Anchor. El programa rastrea el ciclo de vida completo de netbooks educativas desde su fabricación hasta su distribución a estudiantes.

### Netbook Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Fabricada: RegisterNetbook()
    Fabricada --> HwAprobado: AuditHardware(passed=true)
    HwAprobado --> SwValidado: ValidateSoftware(passed=true)
    SwValidado --> Distribuida: AssignToStudent()
    Distribuida --> [*]

    note right of Fabricada
        State 0
        batch_id
        model_specs
    end note
    note right of HwAprobado
        State 1
        hw_auditor set
        hw_report_hash
    end note
    note right of SwValidado
        State 2
        sw_technician set
        os_version
    end note
    note right of Distribuida
        State 3
        student_hash
        school_hash
        timestamp
    end note
```

### Role-Based Access Control (RBAC)

```mermaid
graph LR
    AdminPDA["Admin PDA<br/>(seeds=[b`admin`, config.key()])"] -->|Grant/Revoke| Fabricante["FABRICANTE"]
    AdminPDA -->|Grant/Revoke| Auditor["AUDITOR HW"]
    AdminPDA -->|Grant/Revoke| Tecnico["TECNICO SW"]
    AdminPDA -->|Grant/Revoke| Escuela["ESCUELA"]
    AdminPDA -->|Transfer| NewAdmin["New Admin"]

    Usuario["Usuario"] -->|Request Role| Pending["Pending Request<br/>(60s cooldown)"]
    Pending -->|Approve| Granted["Role Granted<br/>(RoleHolder created)"]
    Pending -->|Reject| Denied["Role Rejected"]

    classDef pda fill:#f97316,stroke:#c2410c,color:#fff
    classDef role fill:#3b82f6,stroke:#1d4ed8,color:#fff
    classDef admin fill:#8b5cf6,stroke:#6d28d9,color:#fff
    class AdminPDA admin
    class Fabricante,Auditor,Tecnico,Escuela role
```

### Role Request Flow

```mermaid
sequenceDiagram
    participant U as Usuario
    participant P as Program
    participant A as Admin PDA

    U->>P: request_role(role)
    Note over P: Creates RoleRequest PDA<br/>Status: Pending
    P-->>U: RoleRequested event

    A->>P: approve_role_request()
    Note over P: Creates RoleHolder PDA<br/>Status: Approved
    P-->>A: RoleGranted event

    alt Reject
        A->>P: reject_role_request()
        Note over P: Status: Rejected
        P-->>A: RoleRevoked event
    end
```

---

## Solana Anchor Program

### Program ID

```
Program ID: 7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb
```

> **Nota Crítico:** El Program ID debe ser consistente en tres lugares:
> 1. [`declare_id!`](sc-solana/programs/sc-solana/src/lib.rs:17) en lib.rs
> 2. [`target/idl/sc_solana.json`](sc-solana/target/idl/sc_solana.json) (generado por Anchor)
> 3. [`Anchor.toml`](sc-solana/Anchor.toml:11) (`[programs.localnet]`)

Si hay mismatch entre el keypair y el IDL, el deploy con surfpool/txtx fallará con:
```
program keypair does not match program pubkey found in IDL
```

### State Accounts

El programa utiliza 5 tipos de cuentas de estado (todas PDA-based):

```mermaid
graph TD
    Config["SupplyChainConfig<br/>seeds=[config]<br/>289 bytes"] -->|"seeds=[serial_hashes, config]"| SHRegistry["SerialHashRegistry<br/>32017 bytes"]

    Config -->|"seeds=[admin, config]"| AdminPDA["Admin PDA<br/>UncheckedAccount"]

    Serial["Netbook<br/>seeds=[netbook, serial]<br/>~1147 bytes"] -.->|"related"| Config
    RoleHolder["RoleHolder<br/>seeds=[role_holder, role, acct]<br/>160 bytes"] -.->|"managed"| Config
    RoleRequest["RoleRequest<br/>seeds=[role_request, user, role]<br/>variable"] -.->|"tracked"| Config

    classDef main fill:#f97316,stroke:#c2410c,color:#fff
    class Config main
```

#### SupplyChainConfig

```mermaid
classDiagram
    class SupplyChainConfig {
        +Pubkey admin
        +u8 admin_bump
        +u8 admin_pda_bump
        +Pubkey fabricante
        +Pubkey auditor_hw
        +Pubkey tecnico_sw
        +Pubkey escuela
        +u64 next_token_id
        +u64 total_netbooks
        +u64 role_requests_count
        +u64 fabricante_count
        +u64 auditor_hw_count
        +u64 tecnico_sw_count
        +u64 escuela_count
        +bool has_role(role, account)
        +u64 get_role_holder_count(role)
    }

    note for SupplyChainConfig "Size: 289 bytes\nPDA: seeds=[b`config`]"
```

**Campos:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `admin` | `Pubkey` | Admin PDA address |
| `admin_bump` | `u8` | Bump seed for Config PDA (`seeds=[b"config"]`) |
| `admin_pda_bump` | `u8` | Bump seed for Admin PDA (`seeds=[b"admin", config.key()]`) |
| `fabricante` | `Pubkey` | Legacy single fabricante (multiple holders via RoleHolder) |
| `auditor_hw` | `Pubkey` | Legacy single auditor (multiple holders via RoleHolder) |
| `tecnico_sw` | `Pubkey` | Legacy single technician (multiple holders via RoleHolder) |
| `escuela` | `Pubkey` | Legacy single school (multiple holders via RoleHolder) |
| `next_token_id` | `u64` | Next token ID to assign |
| `total_netbooks` | `u64` | Total registered netbooks |
| `role_requests_count` | `u64` | Total role requests |
| `*_count` | `u64` | Role holder counts per role type |

#### SerialHashRegistry

```mermaid
classDiagram
    class SerialHashRegistry {
        +u8 config_bump
        +u64 serial_hash_count
        +[[u8; 32]; 10] registered_serial_hashes
        +bool is_serial_registered(hash)
        +void store_serial_hash(hash)
    }

    note for SerialHashRegistry "Size: 32,017 bytes\nPDA: seeds=[b`serial_hashes`, config.key()]\nMAX_SERIAL_HASHES: 10"
```

**Función:** Detección de duplicados de serial_number para prevenir registro duplicado.

#### Netbook

```mermaid
classDiagram
    class Netbook {
        +String serial_number
        +String batch_id
        +String initial_model_specs
        +Pubkey hw_auditor
        +bool hw_integrity_passed
        +[u8; 32] hw_report_hash
        +Pubkey sw_technician
        +String os_version
        +bool sw_validation_passed
        +[u8; 32] destination_school_hash
        +[u8; 32] student_id_hash
        +u64 distribution_timestamp
        +u8 state
        +bool exists
        +u64 token_id
    }

    note for Netbook "Size: ~1,147 bytes\nPDA: seeds=[b`netbook`, serial_number]\nPII protection via hashes"
```

**Campos:**
| Campo | Tipo | Límite | Descripción |
|-------|------|--------|-------------|
| `serial_number` | `String` | 200 chars | Número de serie único |
| `batch_id` | `String` | 100 chars | ID del lote de fabricación |
| `initial_model_specs` | `String` | 500 chars | Especificaciones del modelo |
| `hw_auditor` | `Pubkey` | - | Address del auditor HW |
| `hw_integrity_passed` | `bool` | - | Resultado auditoría HW |
| `hw_report_hash` | `[u8; 32]` | - | Hash del reporte HW (SHA-256) |
| `sw_technician` | `Pubkey` | - | Address del técnico SW |
| `os_version` | `String` | 100 chars | Versión del OS instalado |
| `sw_validation_passed` | `bool` | - | Resultado validación SW |
| `destination_school_hash` | `[u8; 32]` | - | Hash PII de la escuela |
| `student_id_hash` | `[u8; 32]` | - | Hash PII del estudiante |
| `distribution_timestamp` | `u64` | - | Timestamp de distribución |
| `state` | `u8` | - | Estado actual (NetbookState) |
| `exists` | `bool` | - | Flag de existencia |
| `token_id` | `u64` | - | Token ID único |

#### RoleHolder

```mermaid
classDiagram
    class RoleHolder {
        +u64 id
        +Pubkey account
        +String role
        +Pubkey granted_by
        +u64 timestamp
    }

    note for RoleHolder "Size: 160 bytes\nPDA: seeds=[b`role_holder`, role, account]\nMAX_ROLE_HOLDERS: 100 per role"
```

#### RoleRequest

```mermaid
classDiagram
    class RoleRequest {
        +u64 id
        +Pubkey user
        +String role
        +u8 status
        +u64 timestamp
    }

    note for RoleRequest "PDA: seeds=[b`role_request`, user, role]\nStatus: Pending(0) → Approved(1) / Rejected(2)"
```

### Netbook State Machine

```mermaid
stateDiagram-v2
    [*] --> Fabricada: RegisterNetbook()\nserial_number, batch_id, model_specs

    Fabricada --> HwAprobado: AuditHardware(serial, passed=true)\nhw_auditor, report_hash

    HwAprobado --> SwValidado: ValidateSoftware(serial, os_version, passed=true)\nsw_technician

    SwValidado --> Distribuida: AssignToStudent(serial, school_hash, student_hash)

    Fabricada --> Fabricada: AuditHardware(passed=false)\nTransición no válida

    SwValidado --> SwValidado: ValidateSoftware(passed=false)\nTransición no válida

    note right of Fabricada
        State: 0
        Fabricada
        batch_id set
    end note
    note right of HwAprobado
        State: 1
        HW Aprobado
        hw_auditor set
        hw_report_hash set
    end note
    note right of SwValidado
        State: 2
        SW Validado
        sw_technician set
        os_version set
    end note
    note right of Distribuida
        State: 3
        Distribuida
        student_hash set
        school_hash set
        timestamp set
    end note
```

### Instructions

El programa implementa 22 instrucciones organizadas en 5 módulos:

```mermaid
graph TD
    Program["sc_solana Program"] --> Deployer["deployer/"]
    Program --> Init["initialize/"]
    Program --> Netbook["netbook/"]
    Program --> Role["role/"]
    Program --> Query["query/"]

    Deployer --> fund["fund_deployer()"]
    Deployer --> close["close_deployer()"]

    Init --> init["initialize()"]

    Netbook --> reg["register_netbook()"]
    Netbook --> regBatch["register_netbooks_batch()"]
    Netbook --> audit["audit_hardware()"]
    Netbook --> validate["validate_software()"]
    Netbook --> assign["assign_to_student()"]

    Role --> grant["grant_role()"]
    Role --> revoke["revoke_role()"]
    Role --> req["request_role()"]
    Role --> approve["approve_role_request()"]
    Role --> reject["reject_role_request()"]
    Role --> reset["reset_role_request()"]
    Role --> addHolder["add_role_holder()"]
    Role --> removeHolder["remove_role_holder()"]
    Role --> closeHolder["close_role_holder()"]
    Role --> transfer["transfer_admin()"]

    Query --> queryNB["query_netbook_state()"]
    Query --> queryCfg["query_config()"]
    Query --> queryRole["query_role()"]

    classDef module fill:#f97316,stroke:#c2410c,color:#fff
    class Deployer,Init,Netbook,Role,Query module
```

#### Instruction Details

| Module | Instruction | Accounts | Description |
|--------|-------------|----------|-------------|
| **deployer** | `fund_deployer` | deployer (PDA), funder, system | Fund the deployer PDA for rent exemption |
| **deployer** | `close_deployer` | deployer (PDA), funder | Close deployer and return funds |
| **initialize** | `initialize` | config, serial_hash_registry, admin, deployer, funder, system | Initialize all accounts |
| **netbook** | `register_netbook` | config, netbook (PDA), manufacturer, system | Register single netbook |
| **netbook** | `register_netbooks_batch` | config, manufacturer, system | Register multiple netbooks |
| **netbook** | `audit_hardware` | config, netbook (PDA), auditor, system | Hardware audit |
| **netbook** | `validate_software` | config, netbook (PDA), technician, system | Software validation |
| **netbook** | `assign_to_student` | config, netbook (PDA), system | Assign to student |
| **role** | `grant_role` | config, role_holder (PDA), admin, recipient, system | Grant role with consent |
| **role** | `revoke_role` | config, role_holder (PDA), admin, system | Revoke role |
| **role** | `request_role` | config, role_request (PDA), requester, system | Request role (60s cooldown) |
| **role** | `approve_role_request` | config, role_request (PDA), role_holder (PDA), admin, system | Approve request |
| **role** | `reject_role_request` | config, role_request (PDA), admin, system | Reject request |
| **role** | `reset_role_request` | config, role_request (PDA), requester, system | Reset request |
| **role** | `add_role_holder` | config, role_holder (PDA), admin, system | Add holder to role |
| **role** | `remove_role_holder` | config, role_holder (PDA), admin, system | Remove holder from role |
| **role** | `close_role_holder` | config, role_holder (PDA), admin, system | Close role_holder account |
| **role** | `transfer_admin` | config, admin (PDA), new_admin, system | Transfer admin role |
| **query** | `query_netbook_state` | config, netbook (PDA), system | Query netbook state |
| **query** | `query_config` | config, system | Query config |
| **query** | `query_role` | config, system | Query role membership |

### Events

El programa emite 18 eventos organizados en 3 categorías:

```mermaid
graph LR
    subgraph NetbookEvents["Netbook Events"]
        NB1[NetbookRegistered]
        NB2[HardwareAudited]
        NB3[SoftwareValidated]
        NB4[NetbookAssigned]
        NB5[NetbooksRegistered]
    end

    subgraph RoleEvents["Role Events"]
        RE1[RoleRequested]
        RE2[RoleRequestUpdated]
        RE3[RoleGranted]
        RE4[RoleRevoked]
        RE5[RoleHolderAdded]
        RE6[RoleHolderRemoved]
        RE7[AdminTransferred]
    end

    subgraph QueryEvents["Query Events"]
        QE1[NetbookStateQuery]
        QE2[ConfigQuery]
        QE3[RoleQuery]
    end

    NetbookEvents -.->|Emitted by| Program["sc_solana Program"]
    RoleEvents -.->|Emitted by| Program
    QueryEvents -.->|Emitted by| Program

    classDef nb fill:#22c55e,stroke:#16a34a,color:#fff
    classDef role fill:#3b82f6,stroke:#1d4ed8,color:#fff
    classDef query fill:#a855f7,stroke:#9333ea,color:#fff
    class NB1,NB2,NB3,NB4,NB5 nb
    class RE1,RE2,RE3,RE4,RE5,RE6,RE7 role
    class QE1,QE2,QE3 query
```

#### Event Details

**Netbook Events** (`netbook_events.rs`):
| Event | Fields |
|-------|--------|
| `NetbookRegistered` | serial_number, batch_id, token_id |
| `HardwareAudited` | serial_number, passed |
| `SoftwareValidated` | serial_number, os_version, passed |
| `NetbookAssigned` | serial_number |
| `NetbooksRegistered` | count, start_token_id, timestamp |

**Role Events** (`role_events.rs`):
| Event | Fields |
|-------|--------|
| `RoleRequested` | id, user, role |
| `RoleRequestUpdated` | id, status |
| `RoleGranted` | role, account, admin, timestamp |
| `RoleRevoked` | role, account |
| `RoleHolderAdded` | role, account, admin, timestamp |
| `RoleHolderRemoved` | role, account, admin, timestamp |
| `AdminTransferred` | previous_admin, new_admin, timestamp |

**Query Events** (`query_events.rs`):
| Event | Fields |
|-------|--------|
| `NetbookStateQuery` | serial_number, state, token_id, exists |
| `ConfigQuery` | admin, fabricante, auditor_hw, tecnico_sw, escuela, next_token_id, total_netbooks, role_requests_count, *_count |
| `RoleQuery` | account, role, has_role |

### Errors

El programa define 15 error codes (range 6000-6014):

```mermaid
graph LR
    Error["SupplyChainError<br/>(error_code)"] --> E1["6000 Unauthorized"]
    Error --> E2["6001 InvalidStateTransition"]
    Error --> E3["6002 NetbookNotFound"]
    Error --> E4["6003 InvalidInput"]
    Error --> E5["6004 DuplicateSerial"]
    Error --> E6["6005 ArrayLengthMismatch"]
    Error --> E7["6006 RoleAlreadyGranted"]
    Error --> E8["6007 RoleNotFound"]
    Error --> E9["6008 InvalidSignature"]
    Error --> E10["6009 EmptySerial"]
    Error --> E11["6010 StringTooLong"]
    Error --> E12["6011 MaxRoleHoldersReached"]
    Error --> E13["6012 RoleHolderNotFound"]
    Error --> E14["6013 InvalidRequestState"]
    Error --> E15["6014 RateLimited"]

    classDef auth fill:#ef4444,stroke:#b91c1c,color:#fff
    classDef data fill:#f97316,stroke:#c2410c,color:#fff
    classDef role fill:#3b82f6,stroke:#1d4ed8,color:#fff
    class E1,E8,E9 auth
    class E2,E3,E4,E5,E6,E10,E11 data
    class E7,E12,E13,E14,E14 role
```

---

## Frontend Web Application

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 16.0.10 |
| Language | TypeScript (strict mode) | Latest |
| UI Library | React | 19.2.3 |
| Styling | Tailwind CSS | Latest |
| Component Library | shadcn/ui + Radix UI | Latest |
| Solana SDK | @solana/web3.js | ^1.98.0 |
| Anchor SDK | @coral-xyz/anchor | ^0.32.0 |
| Wallet Adapter | @solana/wallet-adapter-react/ui | Latest |
| State Management | TanStack React Query + Table | Latest |
| Testing (Unit) | Jest + Testing Library | Latest |
| Testing (E2E) | Playwright | Latest |
| Linting | ESLint | Latest |

### Directory Structure

```
web/
├── .env                    # Environment variables (needs Solana config)
├── .env.local              # Local environment overrides
├── EXAMPLE.env             # Example with Solana configuration
├── next.config.mjs         # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.mjs      # PostCSS configuration
├── tsconfig.json           # TypeScript configuration
├── playwright.config.ts    # Playwright E2E configuration
├── jest.config.js          # Jest unit test configuration
├── jest.setup.js           # Jest setup file
├── components.json         # shadcn/ui configuration
├── eslint.config.mjs       # ESLint configuration
├── role-requests.json      # Role requests data
│
├── public/                 # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   ├── window.svg
│   └── health-check.txt
│
├── e2e/                    # Playwright E2E tests
│   ├── dashboard.spec.ts
│   ├── full-user-flow.spec.ts
│   ├── homepage.spec.ts
│   ├── netbook-registration.spec.ts
│   ├── role-management.spec.ts
│   ├── wallet-connection.spec.ts
│   ├── helpers/
│   │   └── test-utils.ts
│   └── README.md
│
├── playwright-report/      # Test reports
│   └── index.html
│
├── scripts/                # Test scripts
│   ├── run-all-tests.sh
│   ├── run-e2e-tests.sh
│   └── run-unit-tests.sh
│
└── src/
    ├── app/                # Next.js App Router (pages)
    ├── components/         # React components
    ├── hooks/              # Custom React hooks
    ├── lib/                # Utilities and configuration
    └── services/           # Business logic services
```

### Pages & Routes

```mermaid
graph TD
    Root["Root Layout<br/>(layout.tsx)"] --> Home["<code>/</code><br/>Home/Landing"]
    Root --> Dashboard["<code>/dashboard</code><br/>Main Dashboard"]
    Root --> Admin["<code>/admin</code><br/>Admin Panel"]
    Root --> Tokens["<code>/tokens</code><br/>Token Listing"]
    Root --> Transfers["<code>/transfers</code><br/>Transfer Management"]

    Admin --> Analytics["<code>/admin/analytics</code><br/>Analytics"]
    Admin --> Audit["<code>/admin/audit</code><br/>Audit"]
    Admin --> Roles["<code>/admin/roles</code><br/>Role Management"]
    Admin --> Settings["<code>/admin/settings</code><br/>Settings"]

    Roles --> Pending["<code>/admin/roles/pending-requests</code><br/>Pending Requests"]

    Tokens --> TokenDetail["<code>/tokens/[id]</code><br/>Token Detail"]
    Tokens --> TokenCreate["<code>/tokens/create</code><br/>Create Token"]

    classDef layout fill:#f97316,stroke:#c2410c,color:#fff
    classDef page fill:#3b82f6,stroke:#1d4ed8,color:#fff
    class Root layout
    class Home,Dashboard,Admin,Tokens,Transfers,Analytics,Audit,Roles,Settings,Pending,TokenDetail,TokenCreate page
```

#### Page Components

| Route | Main Component | Key Sub-components |
|-------|---------------|-------------------|
| `/` | `page.tsx` | Hero, FeatureCard, WalletMultiButton |
| `/dashboard` | `dashboard/page.tsx` | NetbookDataTable, UserDataTable, NetbookStats, RoleActions, PendingRoleApprovals |
| `/admin` | `admin/page.tsx` | AdminClient, ActivityLogs, DashboardMetrics, DataManagementPanel, UsersList |
| `/admin/analytics` | `admin/analytics/page.tsx` | AnalyticsChart, DateRangeSelector, ReportGenerator, PeriodSummary |
| `/admin/audit` | `admin/audit/page.tsx` | AuditTimeline |
| `/admin/roles/pending-requests` | `pending-requests/page.tsx` | EnhancedPendingRoleRequests |
| `/admin/settings` | `admin/settings/page.tsx` | Settings panel |
| `/tokens` | `tokens/page.tsx` | Token listing |
| `/tokens/[id]` | `tokens/[id]/page.tsx` | Token detail view |
| `/tokens/create` | `tokens/create/page.tsx` | Create token form |
| `/transfers` | `transfers/page.tsx` | Transfer management |

### Hooks Architecture

```mermaid
graph TD
    Solana["useSolanaWeb3<br/>Wallet connection"] --> Service["useSupplyChainService<br/>Program interface"]

    Service --> DataFetch["Data Fetching"]
    DataFetch --> FetchNB["useFetchNetbooks"]
    DataFetch --> FetchU["useFetchUsers"]
    DataFetch --> StatsNB["useNetbookStats"]
    DataFetch --> StatsU["useUserStats"]
    DataFetch --> Processed["useProcessedUserAndNetbookData"]

    Service --> RoleMgmt["Role Management"]
    RoleMgmt --> RoleData["useRoleData"]
    RoleMgmt --> RoleReq["useRoleRequests"]
    RoleMgmt --> UserRoles["useUserRoles"]
    RoleMgmt --> RoleCalls["useRoleCallsManager"]

    Service --> Tx["useTransaction<br/>Transaction tracking"]

    Solana --> Safe["useSafeWallet<br/>Safe Wallet support"]
    Solana --> Web3["useWeb3<br/>Legacy hook"]

    Service --> Cached["useCachedData<br/>Cache utility"]

    UI["UI/UX Hooks"] --> Toast["useToast"]
    UI --> Notif["useNotifications"]
    UI --> Analytics["useAnalyticsData"]

    classDef core fill:#f97316,stroke:#c2410c,color:#fff
    classDef data fill:#22c55e,stroke:#16a34a,color:#fff
    classDef role fill:#3b82f6,stroke:#1d4ed8,color:#fff
    classDef ui fill:#a855f7,stroke:#9333ea,color:#fff
    class Solana,Service core
    class FetchNB,FetchU,StatsNB,StatsU,Processed,Cached data
    class RoleData,RoleReq,UserRoles,RoleCalls role
    class Toast,Notif,Analytics ui
```

#### Hooks Reference

| Hook | Category | Purpose |
|------|----------|---------|
| `useSolanaWeb3()` | Solana Core | Wallet connection & state |
| `useSupplyChainService()` | Solana Core | Program interaction wrapper |
| `useWeb3()` | Solana Core | Legacy Web3 hook |
| `useSafeWallet()` | Solana Core | Safe Wallet support |
| `useTransaction()` | Solana Core | Transaction tracking |
| `useFetchNetbooks()` | Data Fetching | Fetch netbooks from chain |
| `useFetchUsers()` | Data Fetching | Fetch users data |
| `useNetbookStats()` | Data Fetching | Netbook statistics |
| `useUserStats()` | Data Fetching | User statistics |
| `useProcessedUserAndNetbookData()` | Data Fetching | Processed combined data |
| `useCachedData()` | Data Fetching | Cached data utility |
| `useRoleData()` | Role Management | Role data fetching |
| `useRoleRequests()` | Role Management | Role request management |
| `useUserRoles()` | Role Management | User roles query |
| `useRoleCallsManager()` | Role Management | Role call orchestration |
| `useToast()` | UI/UX | Toast notifications |
| `useNotifications()` | UI/UX | Notification management |
| `useAnalyticsData()` | UI/UX | Analytics data |

### Services Layer

```mermaid
graph TD
    Components["Components/Hooks"] --> Unified["UnifiedSupplyChainService<br/>(Singleton - Active)"]

    Unified --> NetbookOps["Netbook Operations"]
    NetbookOps --> Reg["registerNetbook()"]
    NetbookOps --> RegBatch["registerNetbooksBatch()"]
    NetbookOps --> Audit["auditHardware()"]
    NetbookOps --> Validate["validateSoftware()"]
    NetbookOps --> Assign["assignToStudent()"]

    Unified --> RoleOps["Role Operations"]
    RoleOps --> Grant["grantRole()"]
    RoleOps --> Revoke["revokeRole()"]
    RoleOps --> Request["requestRole()"]
    RoleOps --> Approve["approveRoleRequest()"]
    RoleOps --> Reject["rejectRoleRequest()"]

    Unified --> QueryOps["Query Operations"]
    QueryOps --> QNB["queryNetbookState()"]
    QueryOps --> QCfg["queryConfig()"]
    QueryOps --> QRole["queryRole()"]

    Unified --> Events["Event Emission"]
    Events --> E1["NetbookRegistered"]
    Events --> E2["HardwareAudited"]
    Events --> E3["SoftwareValidated"]
    Events --> E4["NetbookAssigned"]

    Legacy1["SolanaSupplyChainService<br/>(Deprecated)"] -.->|Delegates to| Unified
    Legacy2["SupplyChainService<br/>(Deprecated)"] -.->|Delegates to| Unified

    Other["RoleRequestService<br/>ContractRegistryService<br/>actions.ts"]

    classDef active fill:#22c55e,stroke:#16a34a,color:#fff
    classDef deprecated fill:#ef4444,stroke:#b91c1c,color:#fff
    class Unified,Other active
    class Legacy1,Legacy2 deprecated
```

#### Services Reference

| Service | Status | Purpose |
|---------|--------|---------|
| `UnifiedSupplyChainService` | Active | Main Solana program interface (singleton) |
| `SolanaSupplyChainService` | Deprecated | Legacy wrapper (delegates to Unified) |
| `SupplyChainService` | Deprecated | Legacy service |
| `RoleRequestService` | Active | Role request management |
| `ContractRegistryService` | Active | Contract address registry |
| `actions.ts` | Active | Server actions |

### Components Library

```mermaid
graph TD
    Components["Components"] --> UI["UI (shadcn/ui)<br/>Button, Card, Badge, Input,<br/>Textarea, Table, Dialog, Form,<br/>Checkbox, Switch, Tabs,<br/>Select, Popover, Skeleton,<br/>Toast/Toaster, Alert, Label,<br/>Calendar, NavigationMenu,<br/>NotificationContainer"]
    Components --> Wallet["Wallet<br/>SolanaWalletClientProvider,<br/>WalletConnectButton,<br/>WalletReadyGate"]
    Components --> Layout["Layout<br/>Header, Navigation"]
    Components --> Auth["Auth<br/>RequireWallet"]
    Components --> Dashboard["Dashboard<br/>NetbookDataTable, UserDataTable,<br/>NetbookStats, UserStats,<br/>RoleActions, StatusBadge,<br/>TrackingCard, NetbookDetailsModal,<br/>ProgressStepper, DataTable"]
    Components --> Admin["Admin<br/>AdminClient, DashboardOverview,<br/>DashboardSkeleton, ActivityLogs,<br/>ActivityLogsTable, DashboardMetrics,<br/>DataManagementPanel, UsersList,<br/>EmptyState, NetbookStateMetrics,<br/>PendingRoleRequests,<br/>EnhancedPendingRoleRequests,<br/>RoleManagementSection,<br/>RoleRequestsDashboard,<br/>EnhancedRoleApprovalDialog,<br/>ApprovedAccountsList"]
    Components --> Forms["Forms<br/>HardwareAuditForm,<br/>NetbookForm,<br/>SoftwareValidationForm,<br/>StudentAssignmentForm,<br/>TransactionConfirmation"]
    Components --> Charts["Charts<br/>AnalyticsChart,<br/>NetbookStatusChart,<br/>UserRolesChart"]
    Components --> Audit["Audit<br/>AuditTimeline"]
    Components --> Diag["Diagnostics<br/>DiagnosticRunner,<br/>DebugComponent"]

    classDef ui fill:#eab308,stroke:#ca8a04,color:#fff
    classDef other fill:#3b82f6,stroke:#1d4ed8,color:#fff
    class UI ui
    class Wallet,Layout,Auth,Dashboard,Admin,Forms,Charts,Audit,Diag other
```

---

## Development Setup

### Prerequisites

| Tool | Version | Purpose | Installation |
|------|---------|---------|--------------|
| Rust | Latest stable | Solana program compilation | [`rustup`](https://rustup.rs/) |
| Anchor | 0.32.0 | Solana program framework | `cargo install anchor-cli --locked` |
| Node.js | Latest LTS | Frontend development | [`nvm`](https://github.com/nvm-sh/nvm) or [nodejs.org](https://nodejs.org) |
| Yarn | Latest | Package manager | `npm install -g yarn` |
| Solana CLI | Latest | Solana validator & tools | [`sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`](https://docs.solana.com/cli/install-solana-cli-tools) |
| Surfpool/txtx | Latest | Local deployment system | `npm install -g @surfpool/txtx` |

### Step-by-Step Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/your-org/SupplyChainTracker-solana.git
cd SupplyChainTracker-solana
```

#### 2. Install Solana Tools

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
rustup update stable

# Install Anchor CLI
cargo install anchor-cli --locked

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
source ~/.local/share/solana/install/active_solana/env

# Verify installations
anchor --version
solana --version
cargo --version
```

#### 3. Build the Solana Program

```bash
cd sc-solana

# Build the program (compiles Rust + generates IDL + keypair)
anchor build

# This produces:
# - target/deploy/sc_solana.so        (program binary)
# - target/deploy/sc_solana-keypair.json (program keypair)
# - target/idl/sc_solana.json         (IDL)
# - target/types/sc_solana.ts         (TypeScript types)

# Verify build
ls -la target/deploy/
ls -la target/idl/
```

#### 4. Configure Environment Variables

```bash
# Navigate to web directory
cd ../web

# Copy example environment
cp EXAMPLE.env .env.local

# Edit .env.local with your configuration
nano .env.local
```

**Required Environment Variables:**

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `NEXT_PUBLIC_RPC_URL` | Solana RPC endpoint | `http://localhost:8899` (local) or `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_WS_URL` | WebSocket RPC endpoint | `ws://localhost:8900` (local) or `wss://api.devnet.solana.com` |
| `NEXT_PUBLIC_PROGRAM_ID` | Program ID pubkey | `7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | Your WC project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com) |

**Optional Environment Variables:**

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `NEXT_PUBLIC_MONGODB_URI` | MongoDB connection | `mongodb://localhost:27017/supplychain` |
| `NEXT_PUBLIC_DEBUG_MODE` | Enable debug mode | `true` |

#### 5. Install Frontend Dependencies

```bash
# Install all dependencies
yarn install

# Verify installation
yarn list --depth=0
```

#### 6. Start Local Solana Validator

```bash
# In a separate terminal
solana-test-validator

# Or with specific configuration (from Anchor.toml)
anchor test --localnet

# The validator runs on:
# - RPC: http://localhost:8899
# - WebSocket: ws://localhost:8900
```

#### 7. Deploy Program to Localnet

```bash
# Method 1: Using anchor deploy
cd sc-solana
anchor deploy

# Method 2: Using txtx runbook (Surfpool)
txtx run runbooks/01-deployment/deploy-program.tx

# Verify deployment
solana program show --program-id 7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb
```

#### 8. Start Frontend Development Server

```bash
cd web
yarn dev

# The frontend runs on:
# - HTTP: http://localhost:3000
# - The server will hot-reload on file changes
```

### Development Workflow

```mermaid
graph LR
    Terminal1["Terminal 1<br/>solana-test-validator"] -->|RPC:8899| Frontend["Frontend<br/>localhost:3000"]
    Terminal2["Terminal 2<br/>yarn dev"] -->|RPC:8899| Frontend
    Frontend -->|Transactions| Program["sc_solana Program<br/>deployed on localnet"]

    Dev["Developer"] -->|cargo build| Program
    Dev -->|yarn dev| Frontend
    Dev -->|txtx run| Program

    classDef terminal fill:#f97316,stroke:#c2410c,color:#fff
    classDef service fill:#3b82f6,stroke:#1d4ed8,color:#fff
    class Terminal1,Terminal2 terminal
    class Frontend,Program service
```

### Recommended Terminal Layout

| Terminal | Command | Purpose |
|----------|---------|---------|
| 1 | `solana-test-validator` | Local Solana validator |
| 2 | `cd web && yarn dev` | Frontend dev server |
| 3 | `cd sc-solana && anchor build --watch` | Program build watcher |
| 4 | `cd sc-solana && cargo test` | Run tests on demand |

---

## Testing

### Solana Program Tests

```bash
cd sc-solana

# Run all Cargo unit tests
cargo test

# Run all Anchor integration tests
anchor test

# Run Anchor tests with verbose output
anchor test -- --nocapture

# Run specific test file
anchor test -- --test tests/lifecycle.ts

# Run specific test function
anchor test -- --test tests/lifecycle.ts --grep "test_netbook_space"
```

#### Test Files

| File | Description | Type |
|------|-------------|------|
| `tests/lifecycle.ts` | Full netbook lifecycle test | Integration |
| `tests/batch-registration.ts` | Batch registration tests | Integration |
| `tests/pda-derivation.ts` | PDA derivation verification | Integration |
| `tests/deployer-pda.ts` | Deployer PDA tests | Integration |
| `tests/query-instructions.ts` | Query instruction tests | Integration |
| `tests/rbac-consistency.ts` | RBAC consistency tests | Integration |
| `tests/edge-cases.ts` | Edge case tests | Integration |
| `tests/overflow-protection.ts` | Overflow protection tests | Integration |
| `tests/integration-full-lifecycle.ts` | Full lifecycle integration | Integration |
| `tests/unit-tests.ts` | Unit test equivalents | Unit |

### Frontend Tests

```bash
cd web

# Run all Jest unit tests
yarn test

# Run Jest tests in watch mode
yarn test --watch

# Run Jest tests with coverage
yarn test --coverage

# Run Playwright E2E tests
yarn exec playwright test

# Run Playwright E2E tests with UI mode
yarn exec playwright test --ui

# Run Playwright E2E tests with headed browser
yarn exec playwright test --headed

# Run specific E2E test
yarn exec playwright test e2e/dashboard.spec.ts

# Generate Playwright report
yarn exec playwright show-report

# Run all tests (unit + E2E)
./scripts/run-all-tests.sh
```

#### E2E Test Files

| File | Description |
|------|-------------|
| `e2e/homepage.spec.ts` | Homepage rendering and wallet connection |
| `e2e/dashboard.spec.ts` | Dashboard functionality |
| `e2e/wallet-connection.spec.ts` | Wallet adapter connection flow |
| `e2e/netbook-registration.spec.ts` | Netbook registration flow |
| `e2e/role-management.spec.ts` | Role management operations |
| `e2e/full-user-flow.spec.ts` | Complete user journey |

---

## Deployment

### Local Deployment with Surfpool/txtx

```bash
cd sc-solana

# Deploy program
txtx run runbooks/01-deployment/deploy-program.tx

# Run operations
txtx run runbooks/02-operations/query/query-config.tx
txtx run runbooks/02-operations/query/query-role.tx
txtx run runbooks/03-role-management/request-role.tx
txtx run runbooks/03-role-management/approve-role-request.tx

# Run full lifecycle
txtx run runbooks/04-testing/full-lifecycle.tx

# Run role workflow
txtx run runbooks/04-testing/role-workflow.tx
```

### Production Deployment

```bash
# Build program
cd sc-solana
anchor build

# Deploy to devnet
solana config set --url devnet
anchor deploy

# Deploy to mainnet-beta (requires program upgrade authority)
solana config set --url mainnet-beta
anchor deploy --program-keypair target/deploy/sc_solana-keypair.json
```

### CI/CD

```bash
# GitHub Actions workflows
# .github/workflows/ci.yml       - Continuous Integration
# .github/workflows/deploy.yml   - Deployment pipeline

# CI runs on push/PR:
# 1. cargo build
# 2. cargo test
# 3. anchor build
# 4. yarn install (web)
# 5. yarn test (web)
```

---

## Troubleshooting

### Common Issues

#### 1. Program Keypair Mismatch

**Error:**
```
program keypair does not match program pubkey found in IDL:
keypair pubkey: '8F8SCnsz...'; IDL pubkey: '7bGrgLgT...'
```

**Solution:**
```bash
# Verify consistency
echo "declare_id!: $(grep 'declare_id!' sc-solana/programs/sc-solana/src/lib.rs)"
echo "IDL address: $(grep '"address"' sc-solana/target/idl/sc_solana.json)"
echo "Keypair pubkey: $(solana-keygen pubkey target/deploy/sc_solana-keypair.json)"
echo "Anchor.toml: $(grep 'sc_solana' sc-solana/Anchor.toml)"

# All should show: 7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb

# If mismatched, restore keypair from git:
git show <commit>:sc-solana/target/deploy/sc_solana-keypair.json > sc-solana/target/deploy/sc_solana-keypair.json
```

#### 2. Port Conflicts

**Error:**
```
Address already in use
```

**Solution:**
```bash
# Check which process uses port 8899
lsof -i :8899

# Kill the process
kill -9 <PID>

# Or use different ports in Anchor.toml
```

#### 3. Anchor Build Fails

**Solution:**
```bash
# Clean build artifacts
cd sc-solana
rm -rf target/deploy/*.so target/deploy/*-keypair.json target/idl/*.json

# Rebuild
anchor build

# If still failing, check Rust toolchain
rustup default stable
cargo install anchor-cli --locked --force
```

#### 4. Frontend Cannot Connect to Program

**Solution:**
```bash
# Verify validator is running
solana cluster-version

# Check RPC endpoint in .env.local
cat web/.env.local | grep RPC_URL

# Verify program is deployed
solana program show --program-id 7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb

# Check browser console for errors
# Open DevTools > Console
```

#### 5. Wallet Connection Issues

**Solution:**
```bash
# Verify wallet adapter is installed
yarn list @solana/wallet-adapter-react

# Check WalletConnect project ID
# Visit https://cloud.walletconnect.com for project setup

# For local testing, use Phantom wallet directly (no WalletConnect needed)
```

### Configuration Reference

#### Solana Program (`sc-solana/Anchor.toml`)

```toml
[toolchain]
package_manager = "yarn"

[features]
resolution = true
skip-lint = false

[programs.localnet]
sc_solana = "7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb"

[test.validator]
rpc_port = 8899
```

#### Frontend Environment (`.env.local`)

```env
NEXT_PUBLIC_RPC_URL=http://localhost:8899
NEXT_PUBLIC_PROGRAM_ID=7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Key Files Reference

| File | Purpose |
|------|---------|
| [`sc-solana/Anchor.toml`](sc-solana/Anchor.toml) | Anchor program configuration |
| [`sc-solana/Cargo.toml`](sc-solana/Cargo.toml) | Rust program dependencies |
| [`sc-solana/programs/sc-solana/src/lib.rs`](sc-solana/programs/sc-solana/src/lib.rs) | Program entry point + `declare_id!` |
| [`sc-solana/txtx.yml`](sc-solana/txtx.yml) | Surfpool/txtx configuration |
| [`web/package.json`](web/package.json) | Frontend dependencies |
| [`web/.env.local`](web/.env.local) | Frontend environment variables |
| [`web/next.config.mjs`](web/next.config.mjs) | Next.js configuration |
| [`web/tailwind.config.js`](web/tailwind.config.js) | Tailwind CSS configuration |

---

## License

MIT

## Author

Codecrypto

## Acknowledgments

- Migrated from Ethereum/Solidity to Solana/Anchor
- Built with [Anchor Framework](https://www.anchor-lang.com)
- Frontend powered by [Next.js 16](https://nextjs.org) and [shadcn/ui](https://ui.shadcn.com)
