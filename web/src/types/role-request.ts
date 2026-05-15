/**
 * UI-level Role Request type for frontend display.
 * Renamed from RoleRequest to avoid collision with Codama-generated RoleRequest type.
 * The Codama RoleRequest represents the on-chain account; this represents the UI view model.
 */
export interface UiRoleRequest {
  id: string;
  address: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  timestamp: Date;
  updatedAt?: Date;
  signature?: string;
  transactionHash?: string;
}

/** Legacy alias — use UiRoleRequest going forward */
export type RoleRequest = UiRoleRequest;