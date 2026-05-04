"use strict";
// web/src/services/contracts/role.service.ts
// Servicio para manejar operaciones de roles de acceso en SupplyChainTracker
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleService = exports.ProcessingState = void 0;
var base_contract_service_1 = require("./base-contract.service");
var wagmi_1 = require("wagmi");
var error_handler_1 = require("@/lib/errors/error-handler");
var activity_logger_1 = require("@/lib/activity-logger");
var client_1 = require("@/lib/blockchain/client");
var roles_1 = require("@/lib/constants/roles");
// Enumeración para los estados de procesamiento
var ProcessingState;
(function (ProcessingState) {
    ProcessingState["IDLE"] = "idle";
    ProcessingState["PROCESSING"] = "processing";
    ProcessingState["SUCCESS"] = "success";
    ProcessingState["ERROR"] = "error";
})(ProcessingState || (exports.ProcessingState = ProcessingState = {}));
/**
 * Servicio para manejar roles de acceso
 */
var RoleService = /** @class */ (function (_super) {
    __extends(RoleService, _super);
    function RoleService(contractAddress, abi, config, account) {
        var _this = _super.call(this, contractAddress, abi) || this;
        _this.publicClient = null;
        _this.walletClient = null;
        _this.account = null;
        _this.ROLE_NAMES = [
            'FABRICANTE',
            'AUDITOR_HW',
            'TECNICO_SW',
            'ESCUELA'
        ];
        // Estado para seguimiento
        _this.processingState = ProcessingState.IDLE;
        _this.processingMessage = '';
        _this.config = config;
        _this.account = account !== null && account !== void 0 ? account : null;
        return _this;
        // Client initialization is handled by the base contract service
        // through the virtual readContract/writeContract methods
    }
    // Removed initializeClients method that was calling React hooks
    // Client initialization is now handled by the base contract service
    // The publicClient and walletClient are provided through the base service methods
    /**
     * Verifica si el usuario actual es administrador
     */
    RoleService.prototype.isAdmin = function () {
        return __awaiter(this, void 0, void 0, function () {
            var address, adminRole, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        address = (0, wagmi_1.useAccount)({ config: this.config }).address;
                        if (!address)
                            return [2 /*return*/, false];
                        adminRole = roles_1.ROLE_HASHES.ADMIN;
                        return [4 /*yield*/, this.read('hasRole', [adminRole, address])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Error verificando rol de administrador:', error_1);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Verifica si una cuenta tiene un rol específico
     */
    RoleService.prototype.hasRole = function (address, role) {
        return __awaiter(this, void 0, void 0, function () {
            var roleHash, result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        roleHash = roles_1.ROLE_HASHES[role];
                        return [4 /*yield*/, this.read('hasRole', [roleHash, address])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 2:
                        error_2 = _a.sent();
                        throw error_handler_1.ErrorHandler.handleWeb3Error(error_2);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Obtiene todos los miembros de un rol
     */
    RoleService.prototype.getRoleMembers = function (role) {
        return __awaiter(this, void 0, void 0, function () {
            var roleHash, result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        roleHash = roles_1.ROLE_HASHES[role];
                        return [4 /*yield*/, this.read('getAllMembers', [roleHash])];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result];
                    case 2:
                        error_3 = _a.sent();
                        throw error_handler_1.ErrorHandler.handleWeb3Error(error_3);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Asigna un rol a una cuenta
     */
    RoleService.prototype.grantRole = function (role, account) {
        return __awaiter(this, void 0, void 0, function () {
            var roleHash, hash, error_4, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        this.setProcessingState(ProcessingState.PROCESSING, "Asignando rol ".concat(role, "..."));
                        roleHash = roles_1.ROLE_HASHES[role];
                        return [4 /*yield*/, this.write('grantRole', [roleHash, account], {
                                role: role,
                                account: account,
                                action: 'grantRole'
                            })];
                    case 1:
                        hash = (_a.sent()).hash;
                        this.setProcessingState(ProcessingState.SUCCESS, "Rol ".concat(role, " asignado exitosamente"));
                        // Registrar actividad
                        return [4 /*yield*/, activity_logger_1.ActivityLogger.logActivity({
                                type: 'role_grant',
                                details: {
                                    role: role,
                                    account: account
                                }
                            })];
                    case 2:
                        // Registrar actividad
                        _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                message: "Rol ".concat(role, " asignado exitosamente"),
                                txHash: hash
                            }];
                    case 3:
                        error_4 = _a.sent();
                        errorMessage = error_handler_1.ErrorHandler.handleWeb3Error(error_4);
                        this.setProcessingState(ProcessingState.ERROR, "Error: ".concat(errorMessage));
                        console.error('Error detallado en grantRole:', {
                            error: error_4,
                            functionName: functionName,
                            args: args,
                            role: role,
                            account: account,
                            roleHash: roleHash
                        });
                        return [2 /*return*/, {
                                success: false,
                                message: errorMessage
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Revoca un rol de una cuenta
     */
    RoleService.prototype.revokeRole = function (role, account) {
        return __awaiter(this, void 0, void 0, function () {
            var roleHash, hash, error_5, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        this.setProcessingState(ProcessingState.PROCESSING, "Revocando rol ".concat(role, "..."));
                        roleHash = roles_1.ROLE_HASHES[role];
                        return [4 /*yield*/, this.write('revokeRole', [roleHash, account], {
                                role: role,
                                account: account,
                                action: 'revokeRole'
                            })];
                    case 1:
                        hash = (_a.sent()).hash;
                        this.setProcessingState(ProcessingState.SUCCESS, "Rol ".concat(role, " revocado exitosamente"));
                        // Registrar actividad
                        return [4 /*yield*/, activity_logger_1.ActivityLogger.logActivity({
                                type: 'role_revoke',
                                details: {
                                    role: role,
                                    account: account
                                }
                            })];
                    case 2:
                        // Registrar actividad
                        _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                message: "Rol ".concat(role, " revocado exitosamente"),
                                txHash: hash
                            }];
                    case 3:
                        error_5 = _a.sent();
                        errorMessage = error_handler_1.ErrorHandler.handleWeb3Error(error_5);
                        this.setProcessingState(ProcessingState.ERROR, "Error: ".concat(errorMessage));
                        console.error('Error detallado en grantRole:', {
                            error: error_5,
                            functionName: functionName,
                            args: args,
                            role: role,
                            account: account,
                            roleHash: roleHash
                        });
                        return [2 /*return*/, {
                                success: false,
                                message: errorMessage
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Obtiene información del cliente de wallet para debugging
     */
    RoleService.prototype.getWalletClientDebugInfo = function (account) {
        return __awaiter(this, void 0, void 0, function () {
            var walletClient, _a, error_6;
            var _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 5, , 6]);
                        if (!account) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, client_1.getWalletClient)(account)];
                    case 1:
                        _a = _e.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, (0, client_1.getWalletClient)()];
                    case 3:
                        _a = _e.sent();
                        _e.label = 4;
                    case 4:
                        walletClient = _a;
                        return [2 /*return*/, {
                                hasClient: !!walletClient,
                                hasWriteContract: !!(walletClient === null || walletClient === void 0 ? void 0 : walletClient.writeContract),
                                hasAccount: !!(walletClient === null || walletClient === void 0 ? void 0 : walletClient.account),
                                accountAddress: (_b = walletClient === null || walletClient === void 0 ? void 0 : walletClient.account) === null || _b === void 0 ? void 0 : _b.address,
                                chainId: (_c = walletClient === null || walletClient === void 0 ? void 0 : walletClient.chain) === null || _c === void 0 ? void 0 : _c.id,
                                transport: (_d = walletClient === null || walletClient === void 0 ? void 0 : walletClient.transport) === null || _d === void 0 ? void 0 : _d.name
                            }];
                    case 5:
                        error_6 = _e.sent();
                        console.error('Error getting wallet client debug info:', error_6);
                        return [2 /*return*/, null];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Establece el estado de procesamiento
     */
    RoleService.prototype.setProcessingState = function (state, message) {
        this.processingState = state;
        this.processingMessage = message;
    };
    /**
     * Obtiene el estado actual de procesamiento
     */
    RoleService.prototype.getProcessingState = function () {
        return {
            state: this.processingState,
            message: this.processingMessage
        };
    };
    /**
     * Reinicia el estado de procesamiento
     */
    RoleService.prototype.resetProcessing = function () {
        this.setProcessingState(ProcessingState.IDLE, '');
    };
    // Implementaciones necesarias de BaseContractService
    RoleService.prototype.readContract = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var address = _b.address, abi = _b.abi, functionName = _b.functionName, args = _b.args;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, client_1.publicClient.readContract({
                            address: address,
                            abi: abi,
                            functionName: functionName,
                            args: args
                        })];
                    case 1: 
                    // Usamos el cliente público del contexto global
                    return [2 /*return*/, _c.sent()];
                }
            });
        });
    };
    RoleService.prototype.writeContract = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var walletClient, hash, _c;
            var _d, _e;
            var _f, _g, _h, _j;
            var address = _b.address, abi = _b.abi, functionName = _b.functionName, args = _b.args;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        // Validamos que todos los parámetros requeridos estén presentes
                        if (!this.account) {
                            throw new Error('Cuenta no disponible. Debe proporcionar una cuenta para operaciones de escritura');
                        }
                        if (!address) {
                            throw new Error('Dirección del contrato no disponible');
                        }
                        if (!abi) {
                            throw new Error('ABI no disponible');
                        }
                        if (!functionName) {
                            throw new Error('Nombre de función no disponible');
                        }
                        return [4 /*yield*/, (0, client_1.getWalletClient)(this.account)];
                    case 1:
                        walletClient = _k.sent();
                        if (!walletClient) {
                            throw new Error('No se pudo crear el cliente de wallet');
                        }
                        // Validamos que el walletClient tenga la capacidad de writeContract
                        if (!walletClient.writeContract) {
                            throw new Error('El cliente de wallet no tiene el método writeContract');
                        }
                        // Log para debugging del estado del cliente
                        // Log detallado para debugging del estado del cliente
                        console.log('=== Wallet Client Debug Info ===', {
                            walletClientType: typeof walletClient,
                            hasWriteContract: !!walletClient.writeContract,
                            writeContractType: typeof walletClient.writeContract,
                            hasAccount: !!walletClient.account,
                            accountAddress: (_f = walletClient.account) === null || _f === void 0 ? void 0 : _f.address,
                            accountType: typeof walletClient.account,
                            chainId: (_g = walletClient.chain) === null || _g === void 0 ? void 0 : _g.id,
                            transport: (_h = walletClient.transport) === null || _h === void 0 ? void 0 : _h.name,
                            functionName: functionName,
                            argsLength: (_j = args === null || args === void 0 ? void 0 : args.length) !== null && _j !== void 0 ? _j : 0,
                            argsType: typeof args,
                            args: args !== null && args !== void 0 ? args : []
                        });
                        // Validación adicional de parámetros
                        if (!args || !Array.isArray(args)) {
                            console.error('Parámetros de contrato no válidos:', args);
                            throw new Error('Parámetros de contrato deben ser un array válido');
                        }
                        // Validación específica por función
                        if (functionName === 'grantRole' || functionName === 'revokeRole') {
                            if (args.length !== 2) {
                                console.error("N\u00FAmero incorrecto de par\u00E1metros para ".concat(functionName, ":"), args);
                                throw new Error("Se requieren exactamente 2 par\u00E1metros para ".concat(functionName));
                            }
                            // Validamos que los hashes de roles sean válidos
                            if (!args[0] || typeof args[0] !== 'string' || !args[0].startsWith('0x')) {
                                throw new Error('Hash de rol inválido');
                            }
                            // Validamos que la dirección sea válida
                            if (!args[1] || typeof args[1] !== 'string' || !args[1].startsWith('0x') || args[1].length !== 42) {
                                throw new Error('Dirección inválida');
                            }
                        }
                        _k.label = 2;
                    case 2:
                        _k.trys.push([2, , 4, 5]);
                        console.log('=== writeContract params ===', {
                            address: address,
                            functionName: functionName,
                            args: args !== null && args !== void 0 ? args : [],
                            walletClientExists: !!walletClient,
                            writeContractExists: !!walletClient.writeContract
                        });
                        if (!walletClient.writeContract) {
                            throw new Error('Método writeContract no disponible en el cliente de wallet');
                        }
                        return [4 /*yield*/, walletClient.writeContract({
                                address: address,
                                abi: abi,
                                functionName: functionName,
                                args: args
                            })];
                    case 3:
                        hash = _k.sent();
                        return [2 /*return*/, hash];
                    case 4: return [7 /*endfinally*/];
                    case 5:
                        /**
                         * Verifica la conexión del cliente de wallet
                         */
                        async;
                        checkWalletConnection();
                        _c = Promise < { connected: boolean, error: string };
                        _d = {};
                        _e = {};
                        return [4 /*yield*/, (0, client_1.getWalletClient)()];
                    case 6:
                        _c > (_d.try = (_e.const = walletClient = _k.sent(),
                            _e.if = function (, walletClient) {
                                return { connected: false, error: 'No se pudo obtener el cliente de wallet' };
                            },
                            // Verificar métodos esenciales
                            _e.const = requiredMethods = ['writeContract', 'sendTransaction'],
                            _e.const = missingMethods = requiredMethods.filter(function (method) { return !walletClient[method]; }),
                            _e.if = function (missingMethods) { },
                            _e. = .length > 0,
                            _e),
                            _d);
                        {
                            return [2 /*return*/, {
                                    connected: false,
                                    error: "Cliente de wallet incompleto. M\u00E9todos faltantes: ".concat(missingMethods.join(', '))
                                }];
                        }
                        return [2 /*return*/, { connected: true }];
                }
            });
        });
    };
    RoleService.prototype.catch = function (error) {
        return { connected: false, error: error.message };
    };
    return RoleService;
}(base_contract_service_1.BaseContractService));
exports.RoleService = RoleService;
async;
waitForTransactionReceipt({
    hash: hash,
    timeout: timeout
}, {
    hash: "0x".concat(string),
    timeout: number
});
{
    // Usamos el cliente público del contexto global
    return await client_1.publicClient.waitForTransactionReceipt({
        hash: hash,
        timeout: timeout
    });
}
async;
getAddress();
Promise < string > {
    // Extraemos la lógica del hook a un servicio separado
    // Los hooks no pueden usarse en clases normales
    throw: new Error('Method not implemented. Use hooks only in React components')
};
