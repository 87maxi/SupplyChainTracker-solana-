export interface RoleRequest {
  id: string;
  address: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  timestamp: Date;
  updatedAt?: Date;
  signature?: string;
  transactionHash?: string;
  _id?: string; // MongoDB ObjectId
}