## Resumen

Documentacion detallada del proceso de ejecucion de runbooks Surfpool/txtx para verificacion de consistencia del sistema de deploys. Se identificaron errores criticos que bloquean la ejecucion completa del ciclo de vida.

---

## Proceso de Ejecucion del Sistema

### Arquitectura de Deploys

```
+------------------------------------------------------------------+
|                    SISTEMA DE DEPLOYS SURFPOOL                   |
+------------------------------------------------------------------+
|                                                                  |
|  1. COMPILAR: anchor build                                       |
|     -> Genera .so, IDL, keypair en target/                       |
|                                                                  |
|  2. VALIDATOR: solana-test-validator / surfpool network up       |
|     -> RPC en localhost:8899                                     |
|                                                                  |
|  3. DEPLOY: surfpool run deploy-program --env localnet           |
|     -> Despliega .so en la red                                   |
|     -> Output: program_id, signatures                            |
|                                                                  |
|  4. INITIALIZE: surfpool run initialize-config --env localnet    |
|     -> Crea SupplyChainConfig + SerialHashRegistry               |
|     -> Deriva PDAs: config, serial_hashes, admin                 |
|                                                                  |
|  5. GRANT ROLES: surfpool run grant-roles --env localnet         |
|     -> Otorga FABRICANTE, AUDITOR_HW, TECNICO_SW, ESCUELA        |
|                                                                  |
|  6. REGISTER: surfpool run register-netbook --env localnet       |
|     -> FABRICANTE registra netbook                               |
|     -> PDA: [b"netbook", token_id_bytes]                         |
|                                                                  |
|  7. AUDIT: surfpool run audit-hardware --env localnet            |
|     -> AUDITOR_HW audita -> Fabricada -> HwAprobado              |
|                                                                  |
|  8. VALIDATE: surfpool run validate-software --env localnet      |
|     -> TECNICO_SW valida -> HwAprobado -> SwValidado             |
|                                                                  |
|  9. ASSIGN: surfpool run assign-student --env localnet           |
|     -> ESCUELA asigna -> SwValidado -> Distribuida               |
|                                                                  |
+------------------------------------------------------------------+
```

---

## Errores Encontrados Durante Ejecucion

### Error 1: authority = null invalido en deploy-program.tx (CRITICO)

**Archivo:** sc-solana/runbooks/01-deployment/deploy-program.tx:28

**Código Problematico:**
```
action "deploy" "svm::deploy_program" {
  program = variable.program
  authority = null  // Surfpool espera string, no null
  payer = signer.deployer
}
```

**Error:**
```
value associated with 'authority' type mismatch: expected string
```

**Causa:** Surfpool/txtx SVM addon requiere authority como string (pubkey), no acepta null.

**Solucion Aplicada:**
```
action "deploy" "svm::deploy_program" {
  program = variable.program
  authority = signer.deployer  // Usar deployer como authority
  payer = signer.deployer
}
```

---

### Error 2: Program ID desincronizado (CRITICO)

**Archivos:** lib.rs, config.env, target/deploy/sc_solana-keypair.json

**Problema:**
| Fuente | Program ID |
|--------|------------|
| declare_id() original | 7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN |
| Keypair deploy | 7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb |

**Error:**
```
program keypair does not match program pubkey found in IDL:
keypair pubkey: '7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb';
IDL pubkey: '7xX49ydi4Sx6hJQjj26arXhLZgwZXpr5sNJAKb29aPaN'
```

**Causa:** El keypair generado por Anchor tiene un pubkey diferente al declarado en declare_id!().

**Solucion Aplicada:**
- Actualizado lib.rs y config.env al ID del keypair: 7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb
- Deploy manual exitoso con solana program deploy

---

### Error 3: Discriminator hardcodeado en initialize-config.tx (CRITICO)

**Archivo:** sc-solana/runbooks/01-deployment/initialize-config.tx:71

**Código Problematico:**
```
instruction {
  program_id = variable.program_id
  instruction_data = [175, 175, 109, 31, 13, 152, 155, 237]  // Hardcoded
  ...
}
```

**Error:**
```
data not found
```

**Causa:** El discriminator hardcodeado puede no coincidir con el IDL generado por anchor build despues de rebuild. Surfpool no encuentra la instruction data en el IDL.

**Solucion Necesaria:**
```
instruction {
  program_idl = variable.program.idl      // Usar IDL
  instruction_name = "initialize"          // Nombre de instruccion
  instruction_args = []
  ...
}
```

---

## Pasos a Seguir - Plan de Correccion

### Fase 1: Correccion de initialize-config.tx

**Archivo:** sc-solana/runbooks/01-deployment/initialize-config.tx

**Cambios:**
1. Reemplazar instruction_data = [...] por program_idl + instruction_name
2. Verificar que los accounts coinciden con el struct Initialize

**Resultado Esperado:**
- Config PDA creado
- SerialHashRegistry inicializado
- Admin PDA derivado
- Output: config_pda, admin_pda_address, serial_hashes_pda

**Verificacion:**
```bash
solana account <CONFIG_PDA> -u http://localhost:8899 --json | jq .data
```

---

### Fase 2: Ejecucion de grant-roles.tx

**Archivo:** sc-solana/runbooks/01-deployment/grant-roles.tx

**Verificar:**
- [ ] Admin signer es wallet (no PDA) - consistente con GrantRole struct
- [ ] Config PDA derivado correctamente
- [ ] 4 roles otorgados: FABRICANTE, AUDITOR_HW, TECNICO_SW, ESCUELA

**Resultado Esperado:**
- 4 transacciones exitosas (una por rol)
- Config actualizado con addresses de roles

---

### Fase 3: Ciclo de Vida del Netbook

#### 3a. register-netbook.tx
**Verificar:**
- [ ] FABRICANTE signer tiene rol
- [ ] PDA seed: ["netbook", svm::u64(token_id)]
- [ ] Serial hash registrado

**Resultado Esperado:**
- Netbook creado en estado Fabricada (0)
- token_id incrementado en config

#### 3b. audit-hardware.tx
**Verificar:**
- [ ] AUDITOR_HW signer tiene rol
- [ ] Transicion: Fabricada -> HwAprobado

**Resultado Esperado:**
- Estado cambiado a HwAprobado (1)
- hw_report_hash almacenado

#### 3c. validate-software.tx
**Verificar:**
- [ ] TECNICO_SW signer tiene rol
- [ ] Transicion: HwAprobado -> SwValidado

**Resultado Esperado:**
- Estado cambiado a SwValidado (2)
- os_version almacenado

#### 3d. assign-student.tx
**Verificar:**
- [ ] ESCUELA signer tiene rol
- [ ] Transicion: SwValidado -> Distribuida

**Resultado Esperado:**
- Estado cambiado a Distribuida (3)
- school_hash y student_hash almacenados

---

### Fase 4: Verificacion de Queries

- [ ] query-netbook.tx - Consultar estado del netbook
- [ ] query-config.tx - Verificar config actualizado
- [ ] query-role.tx - Verificar roles otorgados

---

## Checklist de Verificacion Final

### Configuracion
- [ ] Program ID consistente en lib.rs, config.env, Anchor.toml
- [ ] Puerto RPC: 8899 en todos los runbooks
- [ ] Keypair coincide con declare_id!()

### PDAs
- [ ] Config: [b"config"]
- [ ] Serial Hashes: [b"serial_hashes", config.key()]
- [ ] Admin: [b"admin", config.key()]
- [ ] Netbook: [b"netbook", token_id_bytes]

### Secuencia Completa
- [ ] deploy-program -> initialize-config -> grant-roles
- [ ] register -> audit -> validate -> assign
- [ ] Todas las transacciones exitosas

---

## Comandos de Referencia

```bash
# Verificar entorno
surfpool --version
solana balance -u http://localhost:8899

# Compilar
cd sc-solana && anchor build

# Ejecutar runbooks
source config/config.env
surfpool run deploy-program --env localnet -f --port 8491
surfpool run initialize-config --env localnet -f --port 8492
surfpool run grant-roles --env localnet -f --port 8493

# Verificar accounts
solana account <PDA> -u http://localhost:8899 --json
```

---

## Referencias

- Issues relacionados: #146-#161 (cerrados)
- Reporte: sc-solana/reports/runbook-consistency-audit.md
- Analisis: analysis/issues-hierarchical-plan.md
