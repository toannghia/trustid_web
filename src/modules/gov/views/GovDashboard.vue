<template>
  <div class="p-6 bg-gray-50 min-h-screen" ref="dashboardRef">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">Tổng quan Hệ thống Quản lý</h2>
      <div class="flex gap-4">
        <el-select v-model="selectedProvince" placeholder="Chọn Tỉnh/Thành phố" clearable @change="handleProvinceChange" class="w-48">
          <el-option v-for="p in provinces" :key="p.name" :label="p.name" :value="p.name" />
        </el-select>
        <el-select v-model="selectedWard" placeholder="Chọn Xã/Phường" clearable @change="fetchData" :disabled="!selectedProvince" class="w-48">
          <el-option v-for="w in filterWards" :key="w.name" :label="w.name" :value="w.name" />
        </el-select>
        <el-button type="danger" plain @click="openRecallDialog" class="font-semibold shadow-sm">
          <el-icon class="mr-1"><Warning /></el-icon> Cảnh báo / Thu hồi
        </el-button>
        <el-button type="primary" @click="exportReport" :loading="exporting" class="font-semibold shadow-sm">
          {{ exporting ? 'Đang xuất...' : 'Xuất Báo cáo' }}
        </el-button>
      </div>
    </div>

    <!-- Recall Dialog -->
    <el-dialog v-model="recallDialogVisible" title="🚨 Cảnh báo / Thu hồi sản phẩm" width="720px" @close="resetRecallDialog">
      <div class="space-y-4">
        <!-- Step 1: input code -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">Bước 1: Nhập mã QR / Serial của sản phẩm</label>
          <div class="flex gap-2">
            <el-input v-model="recallCode" placeholder="Quét hoặc nhập mã QR/serial..." @keyup.enter="lookupCode" clearable />
            <el-button type="primary" @click="lookupCode" :loading="lookupLoading" :disabled="!recallCode.trim()">
              Tra cứu
            </el-button>
          </div>
        </div>

        <!-- Step 2: result + batch selection -->
        <div v-if="lookupResult" class="border-t pt-4">
          <div class="bg-blue-50 rounded p-3 mb-3 text-sm">
            <div><span class="font-semibold">Sản phẩm:</span> {{ lookupResult.product.name }}</div>
            <div><span class="font-semibold">Doanh nghiệp:</span> {{ lookupResult.product.tenantName || '---' }}</div>
            <div><span class="font-semibold">Trạng thái:</span>
              <el-tag size="small" :type="getGovStatusType(lookupResult.product.govStatus)" class="ml-1">
                {{ getGovStatusText(lookupResult.product.govStatus) }}
              </el-tag>
            </div>
          </div>

          <label class="block text-sm font-semibold text-gray-700 mb-2">Bước 2: Chọn các lô cần thu hồi</label>
          <el-table
            ref="batchTableRef"
            :data="lookupResult.batches"
            @selection-change="handleBatchSelection"
            max-height="280"
            stripe
          >
            <el-table-column type="selection" width="48" :selectable="(row: any) => row.activeCount > 0" />
            <el-table-column label="Mã lô" prop="batchCode" min-width="140">
              <template #default="{ row }">
                <span class="font-mono text-sm">{{ row.batchCode }}</span>
                <el-tag v-if="row.isScannedItemBatch" type="warning" size="small" class="ml-2">Lô của mã đã quét</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Loại" prop="batchType" width="90" />
            <el-table-column label="Tem Active" width="100" align="center">
              <template #default="{ row }">
                <span :class="row.activeCount === 0 ? 'text-gray-400' : 'text-green-600 font-semibold'">
                  {{ row.activeCount }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="Đã thu hồi" width="100" align="center">
              <template #default="{ row }">
                <span :class="row.recalledCount > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'">
                  {{ row.recalledCount }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="Tổng" width="80" align="center" prop="totalCount" />
          </el-table>

          <!-- Step 3: reason -->
          <div class="mt-4">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Bước 3: Lý do thu hồi <span class="text-red-500">*</span></label>
            <el-input v-model="recallReason" type="textarea" :rows="3" placeholder="VD: Phát hiện vi phạm tiêu chuẩn chất lượng, lô sản xuất ngày..." />
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="recallDialogVisible = false">Hủy</el-button>
        <el-button
          type="danger"
          :disabled="!lookupResult || selectedBatchIds.length === 0 || !recallReason.trim()"
          :loading="recallSubmitting"
          @click="submitRecall"
        >
          Thu hồi {{ selectedBatchIds.length }} lô
        </el-button>
      </template>
    </el-dialog>

    <!-- KPIs compact -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-white px-5 py-3 rounded-lg shadow-sm border-l-4 border-blue-500 flex items-center justify-between">
        <div class="text-gray-500 text-sm font-medium">Doanh nghiệp/HTX</div>
        <div class="text-2xl font-bold text-gray-800">{{ stats.totalEnterprises }}</div>
      </div>
      <div class="bg-white px-5 py-3 rounded-lg shadow-sm border-l-4 border-orange-500 flex items-center justify-between">
        <div class="text-gray-500 text-sm font-medium">Sản phẩm Đăng ký</div>
        <div class="text-2xl font-bold text-gray-800">{{ stats.totalProducts }}</div>
      </div>
      <div class="bg-white px-5 py-3 rounded-lg shadow-sm border-l-4 border-green-500 flex items-center justify-between">
        <div class="text-gray-500 text-sm font-medium">Người dùng</div>
        <div class="text-2xl font-bold text-gray-800">{{ stats.totalUsers }}</div>
      </div>
    </div>

    <!-- Map (1/2) + Weekly Scan & Top Provinces stacked (1/2) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Map -->
      <div class="bg-white rounded-lg shadow-sm p-4 flex flex-col">
        <h3 class="font-bold text-gray-700 flex items-center gap-2 text-sm mb-3">
          <el-icon><MapLocation /></el-icon>
          Bản đồ Vùng trồng
        </h3>
        <FarmMapboxView
          :locations="farms"
          :scans="[]"
          :auto-fit-bounds="true"
          :center-coordinate="mapCenter"
          :selected-province="selectedProvince"
          @change-province="selectedProvince = $event; handleProvinceChange()"
          height="100%"
          class="flex-1 min-h-[780px]"
        />
        <div class="mt-2 text-xs text-gray-500">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500"></span> Vùng trồng: {{ farms.length }}</span>
        </div>
      </div>

      <!-- Weekly Scan + Top Scan Provinces stacked -->
      <div class="flex flex-col gap-6">
        <WeeklyScanChart :province="selectedProvince" :ward="selectedWard" />
        <TopScanProvincesChart :province="selectedProvince" :ward="selectedWard" />
      </div>
    </div>

    <!-- Blockchain + Diary -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <BlockchainReportCard />
      <ProductionDiaryReport :province="selectedProvince" :ward="selectedWard" />
    </div>

    <!-- QR Issuance + Seasonal Harvest -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <QrIssuanceChart :province="selectedProvince" :ward="selectedWard" />
      <SeasonalHarvestChart :province="selectedProvince" :ward="selectedWard" />
    </div>

    <!-- Top Products + Top Tenants by Scans -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <TopScanProductsChart :province="selectedProvince" :ward="selectedWard" />
      <TopScanTenantsChart :province="selectedProvince" :ward="selectedWard" />
    </div>

    <!-- Products & Enterprises -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-lg shadow-sm p-5">
        <h3 class="font-bold mb-3 text-gray-700 text-sm">Sản phẩm tiêu biểu (Top 10)</h3>
        <el-table :data="products" style="width: 100%" stripe size="small">
          <el-table-column prop="name" label="Tên SP" />
          <el-table-column prop="tenant.name" label="Doanh nghiệp">
             <template #default="scope">{{ scope.row.tenant?.name || '---' }}</template>
          </el-table-column>
          <el-table-column prop="status" label="Trạng thái" width="110">
            <template #default="{ row }">
              <el-tag :type="getGovStatusType(row.attributes?.govStatus)" size="small">
                {{ getGovStatusText(row.attributes?.govStatus || 'NORMAL') }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="bg-white rounded-lg shadow-sm p-5">
        <h3 class="font-bold mb-3 text-gray-700 text-sm">Doanh nghiệp hoạt động</h3>
        <el-table :data="enterprises" style="width: 100%" stripe size="small">
          <el-table-column prop="name" label="Doanh nghiệp" />
          <el-table-column prop="email" label="Email" />
          <el-table-column prop="status" label="Trạng thái" width="120">
             <template #default="{ row }">
              <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'danger'" size="small">
                {{ row.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động' }}
              </el-tag>
             </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- Hidden Print Container -->
    <div style="position: absolute; left: -9999px; top: -9999px; overflow: hidden; height: 0;">
      <!-- Page 1 -->
      <div ref="printPage1Ref" class="print-page">
        <div>
          <!-- Header -->
          <div class="print-header">
            <div class="brand-line">
              <span class="brand-accent"></span>
              <span class="brand-text">TRUSTID SYSTEM</span>
            </div>
            <h1 class="print-title">BÁO CÁO TỔNG QUAN HỆ THỐNG QUẢN LÝ</h1>
            <div class="print-meta">
              <span>Khu vực: <strong>{{ selectedProvince || 'Toàn quốc' }} {{ selectedWard ? ' - ' + selectedWard : '' }}</strong></span>
              <span>•</span>
              <span>Thời gian xuất: <strong>{{ formattedExportTime }}</strong></span>
            </div>
          </div>

          <!-- KPIs -->
          <div class="print-kpis">
            <div class="print-kpi border-blue">
              <span class="kpi-label">Doanh nghiệp / HTX</span>
              <span class="kpi-value">{{ stats.totalEnterprises }}</span>
            </div>
            <div class="print-kpi border-orange">
              <span class="kpi-label">Sản phẩm Đăng ký</span>
              <span class="kpi-value">{{ stats.totalProducts }}</span>
            </div>
            <div class="print-kpi border-green">
              <span class="kpi-label">Người dùng</span>
              <span class="kpi-value">{{ stats.totalUsers }}</span>
            </div>
          </div>

          <!-- Table 1: Products -->
          <div class="print-section">
            <h2 class="print-section-title">Danh sách Sản phẩm tiêu biểu (Top 10)</h2>
            <table class="print-table">
              <thead>
                <tr>
                  <th style="width: 8%; text-align: center;">STT</th>
                  <th style="width: 42%; text-align: left;">Tên sản phẩm</th>
                  <th style="width: 35%; text-align: left;">Doanh nghiệp</th>
                  <th style="width: 15%; text-align: center;">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, idx) in products" :key="p.id">
                  <td style="text-align: center;">{{ idx + 1 }}</td>
                  <td class="font-semibold" style="color: #1e293b;">{{ p.name }}</td>
                  <td>{{ p.tenant?.name || '---' }}</td>
                  <td style="text-align: center;">
                    <span class="print-badge" :class="getGovStatusType(p.attributes?.govStatus)">
                      {{ getGovStatusText(p.attributes?.govStatus || 'NORMAL') }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!products.length">
                  <td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px 0;">Không có dữ liệu</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Page 1 Footer -->
        <div class="print-footer">
          <span>Hệ thống Xác thực & Truy xuất Nguồn gốc TrustID</span>
          <span>Trang 1 / 2</span>
        </div>
      </div>

      <!-- Page 2 -->
      <div ref="printPage2Ref" class="print-page">
        <div>
          <!-- Header -->
          <div class="print-header">
            <div class="brand-line">
              <span class="brand-accent"></span>
              <span class="brand-text">TRUSTID SYSTEM</span>
            </div>
            <h1 class="print-title">BÁO CÁO TỔNG QUAN HỆ THỐNG QUẢN LÝ</h1>
            <div class="print-meta">
              <span>Khu vực: <strong>{{ selectedProvince || 'Toàn quốc' }} {{ selectedWard ? ' - ' + selectedWard : '' }}</strong></span>
              <span>•</span>
              <span>Thời gian xuất: <strong>{{ formattedExportTime }}</strong></span>
            </div>
          </div>

          <!-- Table 2: Enterprises -->
          <div class="print-section">
            <h2 class="print-section-title">Danh sách Doanh nghiệp hoạt động</h2>
            <table class="print-table">
              <thead>
                <tr>
                  <th style="width: 8%; text-align: center;">STT</th>
                  <th style="width: 47%; text-align: left;">Doanh nghiệp</th>
                  <th style="width: 30%; text-align: left;">Email</th>
                  <th style="width: 15%; text-align: center;">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(e, idx) in enterprises" :key="e.id">
                  <td style="text-align: center;">{{ idx + 1 }}</td>
                  <td class="font-semibold" style="color: #1e293b;">{{ e.name }}</td>
                  <td style="font-family: monospace; font-size: 11px;">{{ e.email }}</td>
                  <td style="text-align: center;">
                    <span class="print-badge" :class="e.status === 'ACTIVE' ? 'success' : 'danger'">
                      {{ e.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!enterprises.length">
                  <td colspan="4" style="text-align: center; color: #94a3b8; padding: 20px 0;">Không có dữ liệu</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Page 2 Footer -->
        <div class="print-footer">
          <span>Hệ thống Xác thực & Truy xuất Nguồn gốc TrustID</span>
          <span>Trang 2 / 2</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import api from '@/common/utils/api';
import { ElMessage, ElMessageBox } from 'element-plus';
import FarmMapboxView from '@/modules/core/components/FarmMapboxView.vue';
import BlockchainReportCard from '@/modules/gov/components/BlockchainReportCard.vue';
import ProductionDiaryReport from '@/modules/gov/components/ProductionDiaryReport.vue';
import WeeklyScanChart from '@/modules/gov/components/WeeklyScanChart.vue';
import SeasonalHarvestChart from '@/modules/gov/components/SeasonalHarvestChart.vue';
import QrIssuanceChart from '@/modules/gov/components/QrIssuanceChart.vue';
import TopScanProvincesChart from '@/modules/gov/components/TopScanProvincesChart.vue';
import TopScanProductsChart from '@/modules/gov/components/TopScanProductsChart.vue';
import TopScanTenantsChart from '@/modules/gov/components/TopScanTenantsChart.vue';
import { MapLocation, Warning } from '@element-plus/icons-vue';
import { vietnamUnits } from '@/common/data/vietnam-units';
import { provinceCoordinates } from '@/common/data/province-coordinates';
import { computed } from 'vue';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const selectedProvince = ref('');
const selectedWard = ref('');
const dashboardRef = ref<HTMLElement | null>(null);
const printPage1Ref = ref<HTMLElement | null>(null);
const printPage2Ref = ref<HTMLElement | null>(null);
const formattedExportTime = ref('');
const exporting = ref(false);

const provinces = ref([...vietnamUnits].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
const filterWards = ref<any[]>([]);

const mapCenter = computed(() => {
    if (selectedProvince.value && provinceCoordinates[selectedProvince.value]) {
        return provinceCoordinates[selectedProvince.value];
    }
    return null;
});

const handleProvinceChange = () => {
    selectedWard.value = '';
    const prov = provinces.value.find((p: any) => p.name === selectedProvince.value);
    filterWards.value = prov && prov.wards ? [...prov.wards].sort((a: any, b: any) => a.name.localeCompare(b.name, 'vi')) : [];
    fetchData();
};

const stats = ref({ totalEnterprises: 0, totalProducts: 0, totalUsers: 0 });
const products = ref<any[]>([]);
const enterprises = ref<any[]>([]);
const farms = ref([]);

const getGovStatusType = (status: string) => {
  if (status === 'RECALLED') return 'danger';
  if (status === 'PENDING_RECALL') return 'warning';
  return 'success';
}

const getGovStatusText = (status: string) => {
  if (status === 'RECALLED') return 'Đã thu hồi';
  if (status === 'PENDING_RECALL') return 'Chờ thu hồi';
  return 'Bình thường';
}

const fetchData = async () => {
    try {
        const params = new URLSearchParams();
        if (selectedProvince.value) params.append('province', selectedProvince.value);
        if (selectedWard.value) params.append('ward', selectedWard.value);
        const query = params.toString() ? `?${params.toString()}` : '';
        
        const [statsRes, productsRes, enterprisesRes, farmsRes] = await Promise.all([
            api.get(`/api/gov/stats${query}`),
            api.get(`/api/gov/products${query ? query + '&' : '?'}limit=10`),
            api.get(`/api/gov/enterprises${query}`),
            api.get(`/api/gov/farms${query}`)
        ]);

        stats.value = statsRes.data;
        products.value = productsRes.data.items || [];
        enterprises.value = enterprisesRes.data || [];
        farms.value = farmsRes.data || [];
    } catch (e) {
        ElMessage.error('Lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
    }
}

// ===== Recall by lookup =====
const recallDialogVisible = ref(false);
const recallCode = ref('');
const lookupLoading = ref(false);
const lookupResult = ref<any>(null);
const selectedBatchIds = ref<string[]>([]);
const recallReason = ref('');
const recallSubmitting = ref(false);

const openRecallDialog = () => {
    resetRecallDialog();
    recallDialogVisible.value = true;
};

const resetRecallDialog = () => {
    recallCode.value = '';
    lookupResult.value = null;
    selectedBatchIds.value = [];
    recallReason.value = '';
};

const lookupCode = async () => {
    if (!recallCode.value.trim()) return;
    lookupLoading.value = true;
    lookupResult.value = null;
    selectedBatchIds.value = [];
    try {
        const { data } = await api.get(`/api/gov/lookup-by-code`, { params: { code: recallCode.value.trim() } });
        lookupResult.value = data;
        if (!data.batches?.length) {
            ElMessage.warning('Sản phẩm không có lô nào');
        }
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Không tìm thấy sản phẩm');
    } finally {
        lookupLoading.value = false;
    }
};

const handleBatchSelection = (rows: any[]) => {
    selectedBatchIds.value = rows.map(r => r.id);
};

const submitRecall = async () => {
    if (!selectedBatchIds.value.length || !recallReason.value.trim()) return;
    try {
        await ElMessageBox.confirm(
            `Xác nhận thu hồi ${selectedBatchIds.value.length} lô đã chọn? Tất cả tem Active/At Dealer trong các lô này sẽ chuyển sang RECALLED.`,
            '⚠️ Xác nhận thu hồi',
            { confirmButtonText: 'Thu hồi', cancelButtonText: 'Hủy', type: 'error' }
        );
        recallSubmitting.value = true;
        const { data } = await api.post('/api/gov/recalls/by-batches', {
            batchIds: selectedBatchIds.value,
            reason: recallReason.value.trim(),
            initiatedBy: 'GOV',
        });
        ElMessage.success(data.message || 'Đã thu hồi thành công');
        recallDialogVisible.value = false;
        fetchData();
    } catch (e: any) {
        if (e === 'cancel' || e === 'close') return;
        ElMessage.error(e.response?.data?.message || 'Lỗi thu hồi');
    } finally {
        recallSubmitting.value = false;
    }
};

const exportReport = async () => {
    if (!printPage1Ref.value || !printPage2Ref.value) return;
    exporting.value = true;

    // Set current formatted export time
    const now = new Date();
    formattedExportTime.value = now.toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    try {
        // Wait for next tick so Vue renders the updated export time
        await nextTick();
        await new Promise(r => setTimeout(r, 400));

        // Create PDF A4 Landscape
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pdfWidth = 297;
        const pdfHeight = 210;

        // Render Page 1 (Header + KPIs + Products table)
        const canvas1 = await html2canvas(printPage1Ref.value, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false
        });
        const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData1, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

        // Render Page 2 (Header + Enterprises table)
        pdf.addPage();
        const canvas2 = await html2canvas(printPage2Ref.value, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false
        });
        const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData2, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

        const provinceLabel = selectedProvince.value || 'Toan_quoc';
        const fileName = `BaoCao_GovDashboard_${provinceLabel}_${now.toISOString().slice(0, 10)}.pdf`;
        pdf.save(fileName);

        ElMessage.success('Báo cáo PDF đã được tải xuống!');
    } catch (e: any) {
        console.error('Export PDF error:', e);
        ElMessage.error('Lỗi khi xuất báo cáo: ' + (e?.message || 'Unknown error'));
    } finally {
        exporting.value = false;
    }
}

onMounted(() => {
    fetchData();
});
</script>

<style scoped>
.print-page {
  width: 960px;
  height: 680px;
  background-color: #ffffff;
  color: #1e293b;
  padding: 40px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
.print-header {
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 16px;
  margin-bottom: 20px;
}
.brand-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.brand-accent {
  width: 12px;
  height: 12px;
  background-color: #00875a; /* TrustID verify green */
  border-radius: 2px;
}
.brand-text {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #0f2b46; /* TrustID navy */
}
.print-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f2b46;
  margin: 0 0 6px 0;
}
.print-meta {
  font-size: 11px;
  color: #64748b;
  display: flex;
  gap: 12px;
}
.print-kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.print-kpi {
  padding: 12px 16px;
  border-radius: 8px;
  background-color: #f8fafc;
  border-left: 4px solid #cbd5e1;
  display: flex;
  flex-direction: column;
}
.print-kpi.border-blue {
  border-left-color: #3b82f6;
}
.print-kpi.border-orange {
  border-left-color: #f97316;
}
.print-kpi.border-green {
  border-left-color: #22c55e;
}
.kpi-label {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 4px;
}
.kpi-value {
  font-size: 20px;
  font-weight: 800;
  color: #1e293b;
}
.print-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f2b46;
  margin: 0 0 12px 0;
}
.print-table {
  width: 100%;
  border-collapse: collapse;
}
.print-table th {
  background-color: #f1f5f9;
  color: #475569;
  font-weight: 600;
  font-size: 11px;
  padding: 8px 12px;
  border-bottom: 1px solid #cbd5e1;
  text-transform: uppercase;
}
.print-table td {
  padding: 8px 12px;
  font-size: 11px;
  border-bottom: 1px solid #e2e8f0;
  color: #475569;
}
.print-table tbody tr:nth-child(even) td {
  background-color: #f8fafc;
}
.print-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
}
.print-badge.success {
  background-color: #dcfce7;
  color: #15803d;
}
.print-badge.warning {
  background-color: #fef3c7;
  color: #b45309;
}
.print-badge.danger {
  background-color: #fee2e2;
  color: #b91c1c;
}
.print-footer {
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: #94a3b8;
}
</style>
