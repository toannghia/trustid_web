export interface CodePool {
  id: string;
  tenant_id: string;
  name: string;
  source: 'INTERNAL' | 'C12_IMPORTED'; // tự sinh hoặc nhập từ bộ công an [cite: 361]
  prefix: string;
  quantity: number;
  start_serial: number;
  end_serial: number;
  status: 'AVAILABLE' | 'EXPORTED' | 'USED';
}