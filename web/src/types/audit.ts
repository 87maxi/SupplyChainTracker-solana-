export interface AuditLog {
  id?: string;
  action: string;
  actor: string;
  timestamp: string;
  transactionHash: string;
  details?: Record<string, any>;
}