// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../lib/openzeppelin-contracts/contracts/access/AccessControl.sol";
import "../lib/openzeppelin-contracts/contracts/access/extensions/IAccessControlEnumerable.sol";
import "../lib/openzeppelin-contracts/contracts/access/extensions/AccessControlEnumerable.sol";

/// @title SupplyChainTracker
/// @notice Enhanced blockchain-based supply chain tracking system for netbooks with JSON metadata support
/// @dev Implements a state machine pattern with role-based access control
/// @dev This contract uses AccessControlEnumerable to enable role enumeration
/// @dev Each netbook is associated with a token ID for tracking its lifecycle
contract SupplyChainTracker is AccessControl, AccessControlEnumerable {
    // --- Custom Errors ---
    error Unauthorized(bytes32 role);
    error ArrayLengthMismatch();
    error InvalidSerialNumber();
    error NetbookAlreadyRegistered();
    error InvalidState(State current, State expected);
    error NetbookNotFound();
    error InvalidRequestID();
    error RequestNotPending();
    error InvalidRoleType();

    /// @dev Overrides _grantRole to satisfy multiple inheritance
    function _grantRole(bytes32 role, address account) internal virtual override(AccessControl, AccessControlEnumerable) returns (bool) {
        return super._grantRole(role, account);
    }

    /// @dev Overrides _revokeRole to satisfy multiple inheritance
    function _revokeRole(bytes32 role, address account) internal virtual override(AccessControl, AccessControlEnumerable) returns (bool) {
        return super._revokeRole(role, account);
    }

    /// @dev Overrides supportsInterface to satisfy multiple inheritance
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, AccessControlEnumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    // --- Roles ---
    /// @notice Role for manufacturers to register new netbooks
    bytes32 public constant FABRICANTE_ROLE = keccak256("FABRICANTE_ROLE");
    
    /// @notice Role for hardware auditors to verify physical integrity
    bytes32 public constant AUDITOR_HW_ROLE = keccak256("AUDITOR_HW_ROLE");
    
    /// @notice Role for software technicians to validate installed software
    bytes32 public constant TECNICO_SW_ROLE = keccak256("TECNICO_SW_ROLE");
    
    /// @notice Role for schools to assign netbooks to students
    bytes32 public constant ESCUELA_ROLE = keccak256("ESCUELA_ROLE");

    // DEFAULT_ADMIN_ROLE is already defined in AccessControl as 0x00...
    // We expose it through our mapping system for consistency

    // --- Enums ---
    /// @notice Lifecycle states for netbooks in the supply chain
    /// @dev States progress linearly: FABRICADA -> HW_APROBADO -> SW_VALIDADO -> DISTRIBUIDA
    enum State {
        FABRICADA,
        HW_APROBADO,
        SW_VALIDADO,
        DISTRIBUIDA
    }

    /// @notice Status for role requests
    enum RequestStatus {
        PENDING,
        APPROVED,
        REJECTED
    }

    // --- Data Structures ---
    /// @notice Complete tracking record for a netbook throughout its supply chain lifecycle
    /// @dev All data is immutable once set; PII is stored as hashes for privacy
    // Mapping de serial a token ID
    mapping(string => uint256) public serialToTokenId;
    mapping(uint256 => string) public tokenIdToSerial;
    
    // Contador de tokens
    uint256 private _tokenIdCounter;
    
    // Datos de metadatos por token
    mapping(uint256 => string) private _tokenMetadata;
    
    // Estructura de datos para el netbook
    struct Netbook {
        // A. Datos de Origen
        string serialNumber;
        string batchId;
        string initialModelSpecs;

        // B. Datos de Hardware
        address hwAuditor;
        bool hwIntegrityPassed;
        bytes32 hwReportHash;

        // C. Datos de Software
        address swTechnician;
        string osVersion;
        bool swValidationPassed;

        // D. Datos de Destino
        bytes32 destinationSchoolHash;
        bytes32 studentIdHash;
        uint distributionTimestamp;

        // Estado actual
        State currentState;
        bool exists;
        uint256 tokenId;
    }

    /// @notice Structure for role requests
    struct RoleRequest {
        uint256 id;
        address user;
        bytes32 role;
        RequestStatus status;
        uint256 timestamp;
        string signature; // Optional: to store the signature if needed
    }

    // --- Storage ---
    /// @notice Mapping of serial numbers to netbook records
    // Almacén principal de netbooks por número de serie
    mapping(string => Netbook) private netbooks;
    
    // Almacenar todos los números de serie registrados para enumeración
    string[] public allSerialNumbers;
    
    // Estructura para almacenar datos de trazabilidad por hash de transacción
    mapping(bytes32 => string) public transactionToSerial;
    
    // Almacén de solicitudes de roles
    RoleRequest[] public roleRequests;
    
    // Contador para IDs de solicitudes
    uint256 private _roleRequestIdCounter;

    // Evento para rastrear cambios en los datos de trazabilidad
    event TraceabilityDataUpdated(bytes32 indexed transactionHash, string serialNumber, string dataType, string dataValue);

    // --- Events ---
    /// @notice Emitted when a role is requested
    event RoleRequested(uint256 indexed requestId, address indexed user, bytes32 indexed role);
    
    /// @notice Emitted when a role request status is updated
    event RoleRequestUpdated(uint256 indexed requestId, RequestStatus status);

    // --- Events ---
    /// @notice Emitted when a new netbook is registered by a manufacturer
    /// @param serialNumber Unique identifier of the netbook
    /// @param batchId Production batch identifier
    /// @param manufacturer Address of the registering manufacturer
    event NetbookRegistered(string indexed serialNumber, string batchId, address indexed manufacturer);
    
    /// @notice Emitted when hardware audit is completed
    /// @param serialNumber Unique identifier of the netbook
    /// @param auditor Address of the auditing entity
    /// @param passed Whether hardware integrity passed inspection
    event HardwareAudited(string indexed serialNumber, address indexed auditor, bool passed);
    
    /// @notice Emitted when software validation is completed
    /// @param serialNumber Unique identifier of the netbook
    /// @param technician Address of the validating technician
    /// @param osVersion Operating system version installed
    event SoftwareValidated(string indexed serialNumber, address indexed technician, string osVersion);
    
    /// @notice Emitted when a netbook is assigned to a student
    /// @param serialNumber Unique identifier of the netbook
    /// @param schoolHash Hash of the school identifier (protects PII)
    /// @param studentHash Hash of the student identifier (protects PII)
    event NetbookAssigned(string indexed serialNumber, bytes32 schoolHash, bytes32 studentHash);

        constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @notice Obtiene el metadata asociado a un token
     * @param tokenId El ID del token
     * @return El string JSON con los metadata
     */
    function getTokenMetadata(uint256 tokenId) public view returns (string memory) {
        return _tokenMetadata[tokenId];
    }
    
    /**
     * @notice Obtiene el ID del token para un número de serie
     * @param serialNumber El número de serie
     * @return El ID del token
     */
    function getTokenId(string memory serialNumber) public view returns (uint256) {
        return serialToTokenId[serialNumber];
    }
    
    /**
     * @notice Obtiene el número de serie para un ID de token
     * @param tokenId El ID del token
     * @return El número de serie
     */
    function getSerialNumber(uint256 tokenId) public view returns (string memory) {
        return tokenIdToSerial[tokenId];
    }

    

    // --- Role Management Functions ---

    function grantRole(bytes32 role, address account) public override(AccessControl, IAccessControl) onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(role, account);
    }

    /// @notice Revokes a role from an account
    /// @dev Only the admin can call this function
    /// @param role The role identifier to revoke
    /// @param account The account to revoke the role from
    /// @custom:role DEFAULT_ADMIN_ROLE
    function revokeRole(bytes32 role, address account) public override(AccessControl, IAccessControl) onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(role, account);
    }

    /**
     * @notice Obtiene el hash del rol por su nombre
     * @dev Este función esta deprecada y será removida en futuras versiones
     * @param roleType El nombre del rol ("FABRICANTE", "AUDITOR_HW", "TECNICO_SW", "ESCUELA")
     * @return role El hash del rol correspondiente
     * @custom:deprecated Usa constantes de roles directamente en su lugar
     */
    function getRoleByName(string calldata roleType) public pure returns (bytes32) {
        if (keccak256(abi.encodePacked(roleType)) == keccak256(abi.encodePacked("FABRICANTE"))) {
            return FABRICANTE_ROLE;
        }
        if (keccak256(abi.encodePacked(roleType)) == keccak256(abi.encodePacked("AUDITOR_HW"))) {
            return AUDITOR_HW_ROLE;
        }
        if (keccak256(abi.encodePacked(roleType)) == keccak256(abi.encodePacked("TECNICO_SW"))) {
            return TECNICO_SW_ROLE;
        }
        if (keccak256(abi.encodePacked(roleType)) == keccak256(abi.encodePacked("ESCUELA"))) {
            return ESCUELA_ROLE;
        }
        if (keccak256(abi.encodePacked(roleType)) == keccak256(abi.encodePacked("ADMIN")) ||
            keccak256(abi.encodePacked(roleType)) == keccak256(abi.encodePacked("DEFAULT_ADMIN")) ||
            keccak256(abi.encodePacked(roleType)) == keccak256(abi.encodePacked("MANAGER")) ||
            keccak256(abi.encodePacked(roleType)) == keccak256(abi.encodePacked("OWNER"))) {
            return DEFAULT_ADMIN_ROLE;
        }
        revert InvalidRoleType();
    }



    function hasRole(bytes32 role, address account) public view override(AccessControl, IAccessControl) returns (bool) {
        return super.hasRole(role, account);
    }

    // --- Role Request Functions ---

    /**
     * @notice Solicita un rol en el sistema
     * @param role El hash del rol solicitado
     * @param signature Firma opcional del mensaje de solicitud
     */
    function requestRole(bytes32 role, string calldata signature) external {
        uint256 requestId = _roleRequestIdCounter++;
        roleRequests.push(RoleRequest({
            id: requestId,
            user: msg.sender,
            role: role,
            status: RequestStatus.PENDING,
            timestamp: block.timestamp,
            signature: signature
        }));

        emit RoleRequested(requestId, msg.sender, role);
    }

    /**
     * @notice Aprueba una solicitud de rol
     * @param requestId ID de la solicitud a aprobar
     */
    function approveRoleRequest(uint256 requestId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (requestId >= roleRequests.length) revert InvalidRequestID();
        RoleRequest storage request = roleRequests[requestId];
        if (request.status != RequestStatus.PENDING) revert RequestNotPending();

        request.status = RequestStatus.APPROVED;
        _grantRole(request.role, request.user);

        emit RoleRequestUpdated(requestId, RequestStatus.APPROVED);
    }

    /**
     * @notice Rechaza una solicitud de rol
     * @param requestId ID de la solicitud a rechazar
     */
    function rejectRoleRequest(uint256 requestId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (requestId >= roleRequests.length) revert InvalidRequestID();
        RoleRequest storage request = roleRequests[requestId];
        if (request.status != RequestStatus.PENDING) revert RequestNotPending();

        request.status = RequestStatus.REJECTED;

        emit RoleRequestUpdated(requestId, RequestStatus.REJECTED);
    }

    /**
     * @notice Obtiene el número total de solicitudes de roles
     */
    function getRoleRequestsCount() external view returns (uint256) {
        return roleRequests.length;
    }

    // --- Funciones de Escritura ---

    /// @notice Registers new netbooks in the supply chain
    /// @dev Only accounts with FABRICANTE_ROLE can call this function
    /// @param serials Array of unique serial numbers for the netbooks
    /// @param batches Array of batch identifiers corresponding to each netbook
    /// @param specs Array of initial model specifications for each netbook
    /// @custom:role FABRICANTE_ROLE
    /// @custom:emits NetbookRegistered event for each registered netbook
    /// @notice Registers new netbooks in the supply chain
    /// @dev Only accounts with FABRICANTE_ROLE can call this function
    /// @param serials Array of unique serial numbers for the netbooks
    /// @param batches Array of batch identifiers corresponding to each netbook
    /// @param specs Array of initial model specifications for each netbook
    /// @param metadata Array of JSON metadata strings for each netbook
    /// @custom:role FABRICANTE_ROLE
    /// @custom:emits NetbookRegistered event for each registered netbook
    /// @custom:emits TraceabilityDataUpdated event with initial data
    function registerNetbooks(
        string[] calldata serials,
        string[] calldata batches,
        string[] calldata specs,
        string[] memory metadata
    ) external {
        if (!hasRole(FABRICANTE_ROLE, msg.sender)) revert Unauthorized(FABRICANTE_ROLE);
        if (serials.length != batches.length || serials.length != specs.length || serials.length != metadata.length) {
            revert ArrayLengthMismatch();
        }

        for (uint i = 0; i < serials.length; i++) {
            if (bytes(serials[i]).length == 0) revert InvalidSerialNumber();
            if (netbooks[serials[i]].exists) revert NetbookAlreadyRegistered();

            // Incrementar y obtener el nuevo ID de token
            uint256 newTokenId = _tokenIdCounter;
            _tokenIdCounter++;
            
            // Crear el registro del netbook con el ID del token
            netbooks[serials[i]] = Netbook({
                serialNumber: serials[i],
                batchId: batches[i],
                initialModelSpecs: specs[i],
                hwAuditor: address(0),
                hwIntegrityPassed: false,
                hwReportHash: bytes32(0),
                swTechnician: address(0),
                osVersion: "",
                swValidationPassed: false,
                destinationSchoolHash: bytes32(0),
                studentIdHash: bytes32(0),
                distributionTimestamp: 0,
                currentState: State.FABRICADA,
                exists: true,
                tokenId: newTokenId
            });
            
            // Mapear el número de serie al ID del token
            serialToTokenId[serials[i]] = newTokenId;
            tokenIdToSerial[newTokenId] = serials[i];
            
            // Almacenar los metadata
            _tokenMetadata[newTokenId] = metadata[i];
            
            // Registrar en el historial de trazabilidad
            bytes32 txHash = keccak256(abi.encodePacked(msg.sender, block.timestamp, serials[i]));
            transactionToSerial[txHash] = serials[i];
            
            // Emitir eventos
            allSerialNumbers.push(serials[i]);
            emit NetbookRegistered(serials[i], batches[i], msg.sender);
            emit TraceabilityDataUpdated(txHash, serials[i], "initial_state", "FABRICADA");
            emit TraceabilityDataUpdated(txHash, serials[i], "metadata", metadata[i]);
        }
    }

    /// @notice Performs hardware audit on a netbook
    /// @dev Transitions netbook from FABRICADA to HW_APROBADO state if successful
    /// @notice Performs hardware audit on a netbook
    /// @dev Only accounts with AUDITOR_HW_ROLE can call this function
    /// @param serial Unique serial number of the netbook to audit
    /// @param passed Whether the hardware integrity passed inspection
    /// @param reportHash Cryptographic hash of the complete audit report (stored off-chain)
    /// @param metadata JSON string with additional hardware audit data
    /// @custom:role AUDITOR_HW_ROLE
    /// @custom:precondition Netbook must exist and be in FABRICADA state
    /// @custom:postcondition Netbook state advances to HW_APROBADO
    /// @custom:emits HardwareAudited event with audit details
    /// @custom:emits TraceabilityDataUpdated event with audit metadata
    function auditHardware(string calldata serial, bool passed, bytes32 reportHash, string memory metadata) external {
        if (!hasRole(AUDITOR_HW_ROLE, msg.sender)) revert Unauthorized(AUDITOR_HW_ROLE);
        Netbook storage nb = netbooks[serial];
        if (!nb.exists) revert NetbookNotFound();
        if (nb.currentState != State.FABRICADA) revert InvalidState(nb.currentState, State.FABRICADA);

        nb.hwAuditor = msg.sender;
        nb.hwIntegrityPassed = passed;
        nb.hwReportHash = reportHash;
        nb.currentState = State.HW_APROBADO;

        // Actualizar metadatos
        uint256 tokenId = nb.tokenId;
        _tokenMetadata[tokenId] = metadata;
        
        // Registrar en el historial de trazabilidad
        bytes32 txHash = keccak256(abi.encodePacked(msg.sender, block.timestamp, serial, "hardware_audit"));
        transactionToSerial[txHash] = serial;
        
        emit HardwareAudited(serial, msg.sender, passed);
        emit TraceabilityDataUpdated(txHash, serial, "hardware_audit", metadata);
        emit TraceabilityDataUpdated(txHash, serial, "state_transition", "FABRICADA -> HW_APROBADO");
    }

    /// @notice Validates software installation on a netbook
    /// @dev Transitions netbook from HW_APROBADO to SW_VALIDADO state if successful
    /// @dev Only accounts with TECNICO_SW_ROLE can call this function
    /// @param serial Unique serial number of the netbook to validate
    /// @param osVersion Version of the operating system installed
    /// @param passed Whether the software validation passed
    /// @param metadata JSON string with additional software validation data
    /// @custom:role TECNICO_SW_ROLE
    /// @custom:precondition Netbook must exist and be in HW_APROBADO state
    /// @custom:postcondition Netbook state advances to SW_VALIDADO
    /// @custom:emits SoftwareValidated event with validation details
    /// @custom:emits TraceabilityDataUpdated event with validation metadata
    function validateSoftware(string calldata serial, string calldata osVersion, bool passed, string memory metadata)
        external
    {
        if (!hasRole(TECNICO_SW_ROLE, msg.sender)) revert Unauthorized(TECNICO_SW_ROLE);
        Netbook storage nb = netbooks[serial];
        if (!nb.exists) revert NetbookNotFound();
        if (nb.currentState != State.HW_APROBADO) revert InvalidState(nb.currentState, State.HW_APROBADO);

        nb.swTechnician = msg.sender;
        nb.osVersion = osVersion;
        nb.swValidationPassed = passed;
        nb.currentState = State.SW_VALIDADO;

        // Actualizar metadatos
        uint256 tokenId = nb.tokenId;
        _tokenMetadata[tokenId] = metadata;
        
        // Registrar en el historial de trazabilidad
        bytes32 txHash = keccak256(abi.encodePacked(msg.sender, block.timestamp, serial, "software_validation"));
        transactionToSerial[txHash] = serial;
        
        emit SoftwareValidated(serial, msg.sender, osVersion);
        emit TraceabilityDataUpdated(txHash, serial, "software_validation", metadata);
        emit TraceabilityDataUpdated(txHash, serial, "state_transition", "HW_APROBADO -> SW_VALIDADO");
    }

    /// @notice Assigns a netbook to a student
    /// @dev Transitions netbook from SW_VALIDADO to DISTRIBUIDA state
    /// @dev Only accounts with ESCUELA_ROLE can call this function
    /// @param serial Unique serial number of the netbook to assign
    /// @param schoolHash Cryptographic hash of the school identifier (protects PII)
    /// @param studentHash Cryptographic hash of the student identifier (protects PII)
    /// @param metadata JSON string with additional assignment data
    /// @custom:role ESCUELA_ROLE
    /// @custom:precondition Netbook must exist and be in SW_VALIDADO state
    /// @custom:postcondition Netbook state advances to DISTRIBUIDA with timestamp
    /// @custom:emits NetbookAssigned event with assignment details
    /// @custom:emits TraceabilityDataUpdated event with assignment metadata
    function assignToStudent(string calldata serial, bytes32 schoolHash, bytes32 studentHash, string memory metadata)
        external
    {
        if (!hasRole(ESCUELA_ROLE, msg.sender)) revert Unauthorized(ESCUELA_ROLE);
        Netbook storage nb = netbooks[serial];
        if (!nb.exists) revert NetbookNotFound();
        if (nb.currentState != State.SW_VALIDADO) revert InvalidState(nb.currentState, State.SW_VALIDADO);

        nb.destinationSchoolHash = schoolHash;
        nb.studentIdHash = studentHash;
        nb.distributionTimestamp = block.timestamp;
        nb.currentState = State.DISTRIBUIDA;

        // Actualizar metadatos
        uint256 tokenId = nb.tokenId;
        _tokenMetadata[tokenId] = metadata;
        
        // Registrar en el historial de trazabilidad
        bytes32 txHash = keccak256(abi.encodePacked(msg.sender, block.timestamp, serial, "student_assignment"));
        transactionToSerial[txHash] = serial;
        
        emit NetbookAssigned(serial, schoolHash, studentHash);
        emit TraceabilityDataUpdated(txHash, serial, "student_assignment", metadata);
        emit TraceabilityDataUpdated(txHash, serial, "state_transition", "SW_VALIDADO -> DISTRIBUIDA");
    }

    // --- Read Functions ---

    /// @notice Gets the current state of a netbook
    /// @param serial Unique serial number of the netbook
    /// @return currentState The current state in the supply chain lifecycle
    /// @custom:requirements Netbook must exist in the system
    function getNetbookState(string calldata serial) external view returns (State) {
        if (!netbooks[serial].exists) revert NetbookNotFound();
        return netbooks[serial].currentState;
    }

    /// @notice Gets the complete tracking report for a netbook
    /// @param serial Unique serial number of the netbook
    /// @return report The complete netbook record with all lifecycle data
    /// @custom:requirements Netbook must exist in the system
    /// @custom:security All PII is stored as cryptographic hashes for privacy
    function getNetbookReport(string calldata serial) external view returns (Netbook memory) {
        if (!netbooks[serial].exists) revert NetbookNotFound();
        return netbooks[serial];
    }

    /// @notice Gets all registered serial numbers
    /// @return serials Array of all netbook serial numbers in the system
    /// @custom:view This function does not modify state
    function getAllSerialNumbers() external view returns (string[] memory) {
        return allSerialNumbers;
    }

    /// @notice Gets all accounts that have been granted a specific role
    /// @param role The role identifier to query
    /// @return members Array of addresses that have the specified role
    /// @custom:view This function does not modify state
    /// @custom:security Uses AccessControl's built-in enumeration functions
    function getAllMembers(bytes32 role) public view returns (address[] memory) {
        uint256 count = getRoleMemberCount(role);
        address[] memory members = new address[](count);

        for (uint256 i = 0; i < count; i++) {
            members[i] = getRoleMember(role, i);
        }

        return members;
    }

    /// @notice Gets the total number of registered netbooks
    /// @return count The total number of netbooks in the system
    /// @custom:view This function does not modify state
    function totalNetbooks() external view returns (uint) {
        return allSerialNumbers.length;
    }

    /// @notice Gets all netbooks in a specific state
    /// @param state The state to filter by
    /// @return serials Array of serial numbers for netbooks in the specified state
    /// @custom:view This function does not modify state
    /// @custom:efficiency Linear time complexity O(n) where n is the number of netbooks
    function getNetbooksByState(State state) external view returns (string[] memory) {
        uint count = 0;
        for (uint i = 0; i < allSerialNumbers.length; i++) {
            if (netbooks[allSerialNumbers[i]].currentState == state) {
                count++;
            }
        }

        string[] memory result = new string[](count);
        uint index = 0;
        for (uint i = 0; i < allSerialNumbers.length; i++) {
            if (netbooks[allSerialNumbers[i]].currentState == state) {
                result[index] = allSerialNumbers[i];
                index++;
            }
        }
        return result;
    }
}
