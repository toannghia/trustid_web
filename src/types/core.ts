export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  LOCKED = 'LOCKED'
}

export interface Tenant {
  id: string;
  name: string;
  tax_code: string;
  gcp_prefix?: string; // mã doanh nghiệp gs1 [cite: 289]
  codeQuota?: number;
  status: TenantStatus;
  isTrustedPartner?: boolean;
  trustedPartnerOrder?: number | null;
  is_trusted_partner?: boolean;
  trusted_partner_order?: number | null;
  module_config: {
    iot?: boolean;
    farm?: boolean;
    supply?: boolean;
    retail?: boolean;
  };
  created_at: string;
}

export interface Regulator {
  id: string;
  name: string;
  province_code: string;
  district_code?: string;
  type: 'DEPARTMENT' | 'SUB_DEPT'; // sở hoặc chi cục [cite: 301]
}
