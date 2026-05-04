"use client";
"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseContractService = void 0;
var cache_service_1 = require("@/lib/cache/cache-service");
var error_handler_1 = require("@/lib/errors/error-handler");
/**
 * Clase base para servicios de contratos inteligentes
 * Proporciona funcionalidad común para todos los servicios de contratos
 */
var BaseContractService = /** @class */ (function () {
    function BaseContractService(contractAddress, abi, cachePrefix) {
        if (cachePrefix === void 0) { cachePrefix = 'contract'; }
        var _this = this;
        this.transactionTimeouts = new Map();
        /**
         * Realiza una llamada de lectura al contrato
         * @param functionName Nombre de la función del contrato
         * @param args Argumentos para la función
         * @param useCache Si se debe usar caché (por defecto: true)
         * @returns Resultado de la llamada
         */
        this.read = function (functionName_1) {
            var args_1 = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args_1[_i - 1] = arguments[_i];
            }
            return __awaiter(_this, __spreadArray([functionName_1], args_1, true), void 0, function (functionName, args, useCache) {
                var cacheKey, cached, result, error_1;
                if (args === void 0) { args = []; }
                if (useCache === void 0) { useCache = true; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            cacheKey = "".concat(this.cachePrefix, ":").concat(functionName, ":").concat(JSON.stringify(args));
                            // Intentar obtener de caché si está habilitado
                            if (useCache) {
                                cached = cache_service_1.CacheService.get(cacheKey);
                                if (cached !== null) {
                                    return [2 /*return*/, cached];
                                }
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.readContract({
                                    address: this.contractAddress,
                                    abi: this.abi,
                                    functionName: functionName,
                                    args: args
                                })];
                        case 2:
                            result = _a.sent();
                            // Almacenar en caché si está habilitado
                            if (useCache) {
                                cache_service_1.CacheService.set(cacheKey, result);
                            }
                            return [2 /*return*/, result];
                        case 3:
                            error_1 = _a.sent();
                            throw error_handler_1.ErrorHandler.handleWeb3Error(error_1);
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Realiza una llamada de escritura al contrato
         * @param functionName Nombre de la función del contrato
         * @param args Argumentos para la función
         * @returns Hash de la transacción
         */
        this.write = function (functionName_1) {
            var args_1 = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args_1[_i - 1] = arguments[_i];
            }
            return __awaiter(_this, __spreadArray([functionName_1], args_1, true), void 0, function (functionName, args, metadata) {
                var hash, _a, _b, _c, error_2;
                var _d;
                if (args === void 0) { args = []; }
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _e.trys.push([0, 3, , 4]);
                            return [4 /*yield*/, this.writeContract({
                                    address: this.contractAddress,
                                    abi: this.abi,
                                    functionName: functionName,
                                    args: args
                                })];
                        case 1:
                            hash = _e.sent();
                            // Log transaction
                            _a = this.logTransactionToAPI;
                            _c = (_b = Object).assign;
                            _d = {
                                transactionHash: hash,
                                functionName: functionName,
                                args: args
                            };
                            return [4 /*yield*/, this.getAddress()];
                        case 2:
                            // Log transaction
                            _a.apply(this, [_c.apply(_b, [(_d.from = _e.sent(),
                                        _d), metadata])]).catch(function (error) {
                                console.error('Error logging transaction via API:', error);
                            });
                            return [2 /*return*/, { hash: hash }];
                        case 3:
                            error_2 = _e.sent();
                            throw error_handler_1.ErrorHandler.handleWeb3Error(error_2);
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Espera a que una transacción sea confirmada
         * @param hash Hash de la transacción
         * @param timeout Tiempo máximo de espera en segundos (por defecto: 60)
         * @returns Recibo de la transacción
         */
        this.waitForTransaction = function (hash_1) {
            var args_1 = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args_1[_i - 1] = arguments[_i];
            }
            return __awaiter(_this, __spreadArray([hash_1], args_1, true), void 0, function (hash, timeout) {
                var receipt, error_3;
                if (timeout === void 0) { timeout = 60; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.waitForTransactionReceipt({
                                    hash: hash,
                                    timeout: timeout * 1000
                                })];
                        case 1:
                            receipt = _a.sent();
                            // Update transaction status
                            this.updateTransactionInAPI({
                                transactionHash: hash,
                                status: 'success',
                                blockNumber: Number(receipt.blockNumber),
                                gasUsed: Number(receipt.gasUsed)
                            }).catch(function (error) {
                                console.error('Error updating transaction via API:', error);
                            });
                            return [2 /*return*/, receipt];
                        case 2:
                            error_3 = _a.sent();
                            this.updateTransactionInAPI({
                                transactionHash: hash,
                                status: 'failed'
                            }).catch(function (error) {
                                console.error('Error updating transaction status to failed:', error);
                            });
                            throw error_handler_1.ErrorHandler.handleWeb3Error(error_3);
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * Invalida la caché para una clave específica
         * @param keyPart Parte de la clave a invalidar
         */
        this.invalidateCache = function (keyPart) {
            try {
                Object.keys(localStorage)
                    .filter(function (key) { return key.includes(_this.cachePrefix) && key.includes(keyPart); })
                    .forEach(function (key) { return cache_service_1.CacheService.remove(key); });
            }
            catch (error) {
                console.warn('Error al invalidar caché:', error);
            }
        };
        /**
         * Invalida toda la caché relacionada con este servicio
         */
        this.invalidateAllCache = function () {
            try {
                Object.keys(localStorage)
                    .filter(function (key) { return key.includes(_this.cachePrefix); })
                    .forEach(function (key) { return cache_service_1.CacheService.remove(key); });
            }
            catch (error) {
                console.warn('Error al invalidar caché completa:', error);
            }
        };
        // Optional background operations that can be overridden
        this.logTransactionToAPI = function (data) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Default implementation - override in specific services if needed
                console.log('Transaction logged:', data);
                return [2 /*return*/];
            });
        }); };
        this.updateTransactionInAPI = function (data) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Default implementation - override in specific services if needed
                console.log('Transaction updated:', data);
                return [2 /*return*/];
            });
        }); };
        this.contractAddress = contractAddress;
        this.abi = abi;
        this.cachePrefix = cachePrefix;
    }
    /**
     * Same initialization method as in the old version
     */
    BaseContractService.prototype.initializeContract = function (contractAddress, abi) {
        this.contractAddress = contractAddress;
        this.abi = abi;
    };
    // Wagmi hook wrappers - these will be overridden by specific service implementations
    BaseContractService.prototype.readContract = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var address = _b.address, abi = _b.abi, functionName = _b.functionName, args = _b.args;
            return __generator(this, function (_c) {
                throw new Error('readContract must be implemented by specific service');
            });
        });
    };
    BaseContractService.prototype.writeContract = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var address = _b.address, abi = _b.abi, functionName = _b.functionName, args = _b.args;
            return __generator(this, function (_c) {
                throw new Error('writeContract must be implemented by specific service');
            });
        });
    };
    BaseContractService.prototype.waitForTransactionReceipt = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var hash = _b.hash, timeout = _b.timeout;
            return __generator(this, function (_c) {
                throw new Error('waitForTransactionReceipt must be implemented by specific service');
            });
        });
    };
    BaseContractService.prototype.getAddress = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error('getAddress must be implemented by specific service');
            });
        });
    };
    return BaseContractService;
}());
exports.BaseContractService = BaseContractService;
