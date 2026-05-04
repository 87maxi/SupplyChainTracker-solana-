export type NetbookState = 'FABRICADA' | 'HW_APROBADO' | 'SW_VALIDADO' | 'DISTRIBUIDA' | 'UNKNOWN';

export interface Netbook {
  serialNumber: string;
  batchId: string;
  initialModelSpecs: string;
  hwAuditor: string;
  hwIntegrityPassed: boolean;
  hwReportHash: string;
  swTechnician: string;
  osVersion: string;
  swValidationPassed: boolean;
  destinationSchoolHash: string;
  studentIdHash: string;
  distributionTimestamp: string;
  currentState: string;
}

export interface AllRolesSummary {
  [key: string]: {
    count: number;
    members: string[];
  };
}
