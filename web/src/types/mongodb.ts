export interface RoleData {
  _id?: string;
  transactionHash: `0x${string}`;
  role: string;
  userAddress: string;
  data: Record<string, unknown>;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NetbookData {
  _id?: string;
  serialNumber: string;
  transactionHash: `0x${string}`;
  role: string;
  userAddress: string;
  data: Record<string, unknown>;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}