<template>
    <div class="export-fulfill-view p-6 bg-gray-50 min-h-screen">
        
        <!-- DASHBOARD VIEW -->
        <div v-if="!selectedOrder" class="space-y-6">
            <!-- KHỐI LỆNH CHỜ XUẤT -->
            <el-card class="rounded-xl shadow-sm">
                <template #header>
                    <h3 class="font-bold text-gray-700 flex items-center gap-2">
                        <el-icon class="text-orange-500"><Loading v-if="loading" /><Van v-else /></el-icon>
                        Lệnh chờ xuất kho ({{ pendingOrders.length }})
                    </h3>
                </template>
                <el-table :data="pendingOrders" v-loading="loading">
                     <el-table-column label="Số lệnh" prop="orderCode" width="160">
                         <template #default="{row}">
                             <div class="font-bold text-blue-600 cursor-pointer hover:underline" @click="openReadonlyDetail(row)">
                                 {{ row.orderCode }}
                             </div>
                             <div class="text-[10px] text-gray-400">{{ new Date(row.createdAt).toLocaleString('vi-VN') }}</div>
                         </template>
                     </el-table-column>
                     <el-table-column label="Đại lý">
                         <template #default="{row}">{{ getDealerName(row.dealerId) }}</template>
                     </el-table-column>
                     <el-table-column width="120" align="center">
                         <template #default="{row}">
                             <el-button type="primary" size="small" @click="viewDetail(row)">Xuất kho</el-button>
                         </template>
                     </el-table-column>
                </el-table>
            </el-card>

            <!-- KHỐI LỆNH ĐÃ XUẤT KHO -->
            <el-card class="rounded-xl shadow-sm">
                <template #header>
                    <h3 class="font-bold text-gray-700 flex items-center gap-2">
                        <el-icon class="text-green-500"><Check /></el-icon>
                        Lệnh đã xuất kho ({{ exportedOrders.length }})
                    </h3>
                </template>
                <el-table :data="exportedOrders" v-loading="loading">
                     <el-table-column label="Số Phiếu Xuất (PXK)" width="200">
                         <template #default="{row}">
                             <div class="font-bold text-green-600 cursor-pointer hover:underline" @click="openReadonlyDetail(row)">
                                 {{ getPXKCode(row.orderCode) }}
                             </div>
                         </template>
                     </el-table-column>
                     <el-table-column label="Số lệnh (LXH)" prop="orderCode" width="160">
                         <template #default="{row}">
                             <div class="text-gray-500 text-sm">{{ row.orderCode }}</div>
                         </template>
                     </el-table-column>
                     <el-table-column label="Đại lý">
                         <template #default="{row}">{{ getDealerName(row.dealerId) }}</template>
                     </el-table-column>
                     <el-table-column label="Ngày xuất">
                        <template #default="{row}">{{ new Date(row.updatedAt).toLocaleDateString('vi-VN') }}</template>
                     </el-table-column>
                     <el-table-column label="Giao hàng" width="200" align="center">
                        <template #default="{row}">
                            <template v-if="shipmentsMap[row.id]">
                                <el-tag type="success" effect="dark" size="small">
                                    {{ shipmentsMap[row.id].trackingCode }}
                                </el-tag>
                                <div class="text-xs text-gray-400 mt-1">{{ {'WAITING_DRIVER':'Chờ tài xế nhận','READY_FOR_PICKUP':'Sẵn sàng giao','IN_TRANSIT':'Đang giao','PENDING_DEALER_CONFIRM':'Chờ đại lý xác nhận','DELIVERED':'Đã giao'}[shipmentsMap[row.id].status] || shipmentsMap[row.id].status }}</div>
                            </template>
                            <el-button v-else type="primary" size="small" @click="openManualDeliveryDialog(row)">
                                <el-icon class="mr-1"><Van /></el-icon> Tạo PGH
                            </el-button>
                        </template>
                     </el-table-column>
                </el-table>
            </el-card>
        </div>

        <!-- FULFILLMENT / PRINT VIEW -->
        <div v-else class="print-container">
            <el-card class="rounded-xl shadow-md min-h-[calc(100vh-100px)] border-blue-100 bg-blue-50/10 flex flex-col items-stretch no-print">
                <template #header>
                    <div class="flex flex-col gap-4">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-3">
                                <el-button icon="ArrowLeft" circle @click="selectedOrder = null" />
                                <div>
                                    <span class="text-xs text-gray-400 block mb-1">MÀN HÌNH THỰC THI XUẤT KHO</span>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <el-button type="info" plain icon="Printer" @click="printTicket">In Phiếu</el-button>
                                <el-button 
                                    v-if="selectedOrder.status !== 'EXPORTED'"
                                    type="danger" 
                                    plain
                                    icon="Close" 
                                    @click="cancelOrder(selectedOrder)"
                                >
                                    Hủy Lệnh
                                </el-button>
                                <el-button 
                                    v-if="selectedOrder.status !== 'EXPORTED'"
                                    type="success" 
                                    icon="Check" 
                                    @click="showFinishDialog = true"
                                >
                                    Hoàn Tất Xuất Kho
                                </el-button>
                            </div>
                        </div>

                        <!-- 8 THÔNG TIN CHI TIẾT -->
                        <div class="grid grid-cols-4 gap-4 bg-white p-4 rounded border border-blue-100">
                            <div>
                                <div class="text-xs text-gray-500">Số Phiếu Xuất (PXK)</div>
                                <div class="font-bold text-green-700">{{ getPXKCode(selectedOrder.orderCode) }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500">Số Lệnh Xuất (LXH)</div>
                                <div class="font-semibold text-gray-700">{{ selectedOrder.orderCode }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500">Ngày xuất</div>
                                <div class="font-semibold">{{ new Date().toLocaleDateString('vi-VN') }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500">Người xuất kho</div>
                                <div class="font-semibold">{{ authStore.user?.fullName || authStore.user?.username || 'Hệ thống' }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500">Kho xuất</div>
                                <div class="font-semibold">{{ getWarehouseName(selectedOrder.sourceWarehouseId) }}</div>
                            </div>
                            <div class="col-span-3 grid grid-cols-3 gap-2">
                                <div>
                                    <div class="text-xs text-gray-500">Tên Đại lý</div>
                                    <div class="font-semibold">{{ getDealerName(selectedOrder.dealerId) }}</div>
                                </div>
                                <div class="col-span-2">
                                    <div class="text-xs text-gray-500">Người nhận & Địa chỉ</div>
                                    <div class="font-semibold text-sm truncate" :title="getDealerAddress(selectedOrder.dealerId)">
                                        {{ getDealerAddress(selectedOrder.dealerId) }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>

                <div class="flex-1 overflow-auto pr-2 mt-4">
                    <!-- SCAN INPUT -->
                    <div v-if="selectedOrder.status !== 'EXPORTED'" class="bg-white p-4 rounded-xl border border-gray-100 mb-6 shadow-sm">
                        <h4 class="font-bold mb-2 flex items-center gap-2 text-blue-700">
                            <el-icon><Camera /></el-icon> Quét QR Code
                        </h4>
                        <el-input 
                            v-model="scanInput" 
                            ref="scanInputRef"
                            size="large" 
                            placeholder="Quét mã Thùng hoặc mã Sản Phẩm..." 
                            clearable
                            @keyup.enter="handleScan"
                            :disabled="scanning"
                        >
                            <template #append>
                                <el-button icon="Search" @click="handleScan" :loading="scanning">Quét</el-button>
                            </template>
                        </el-input>
                    </div>
                    <!-- Trạng thái hoàn thành -->
                    <div v-else class="bg-green-50 p-4 rounded-xl border border-green-200 mb-6 text-green-700 font-bold flex items-center gap-2">
                        <el-icon><Check /></el-icon> Lệnh xuất kho này đã hoàn tất.
                    </div>

                    <el-row :gutter="20">
                        <!-- EXPECTED ITEMS -->
                        <el-col :span="10">
                            <h4 class="font-bold mb-3 flex items-center gap-2 text-gray-700">
                                <el-icon class="text-orange-500"><Warning /></el-icon> Danh sách hàng cần lấy
                            </h4>
                            <el-table :data="selectedOrder.items || []" border size="small" class="rounded-lg overflow-hidden mb-6 bg-white">
                                <el-table-column prop="product.name" label="Sản phẩm" />
                                <el-table-column prop="expectedQuantity" label="Yêu cầu" width="80" align="center" />
                                <el-table-column label="Đã quét" width="80" align="center">
                                    <template #default="{row}">
                                        <b :class="row.scannedQuantity >= row.expectedQuantity ? 'text-green-600' : 'text-orange-600'">
                                            {{ row.scannedQuantity }}
                                        </b>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </el-col>

                        <!-- SCANNED LOGS -->
                        <el-col :span="14">
                            <h4 class="font-bold mb-3 flex items-center gap-2 text-gray-700">
                                <el-icon class="text-green-500"><Check /></el-icon> Mã đã quét
                            </h4>
                            
                            <el-tabs type="border-card" class="bg-white">
                                <el-tab-pane label="Mã lẻ (Sản phẩm)">
                                    <el-table :data="logsData.individual" size="small" height="300" empty-text="Chưa có mã lẻ">
                                        <el-table-column type="index" label="STT" width="60" align="center" />
                                        <el-table-column label="Mã QR" min-width="150" show-overflow-tooltip>
                                            <template #default="{row}">{{ formatQR(row.fullQrCode) }}</template>
                                        </el-table-column>
                                        <el-table-column label="Sản phẩm" min-width="180" show-overflow-tooltip>
                                            <template #default="{row}">{{ getProductName(row.productId) }}</template>
                                        </el-table-column>
                                        <el-table-column prop="itemSerial" label="Serial" width="120" />
                                        <el-table-column width="60" align="center" v-if="selectedOrder.status !== 'EXPORTED'">
                                            <template #default="{row}">
                                                <el-button type="danger" link icon="Close" @click="unscanItem(row.itemSerial)"></el-button>
                                            </template>
                                        </el-table-column>
                                    </el-table>
                                </el-tab-pane>
                                <el-tab-pane label="Mã Thùng">
                                    <el-table :data="logsData.boxes" size="small" height="300" empty-text="Chưa có thùng">
                                        <el-table-column prop="parentCode" label="Mã Thùng" />
                                        <el-table-column label="Số lượng" width="100" align="center">
                                            <template #default="{row}">{{ row.items?.length }} SP</template>
                                        </el-table-column>
                                        <el-table-column width="60" align="center" v-if="selectedOrder.status !== 'EXPORTED'">
                                            <template #default="{row}">
                                                <el-button type="danger" link icon="Close" @click="unscanBox(row.parentCode)"></el-button>
                                            </template>
                                        </el-table-column>
                                    </el-table>
                                </el-tab-pane>
                            </el-tabs>
                        </el-col>
                    </el-row>
                </div>
            </el-card>

            <!-- PRINT LAYOUT (HIDDEN ON SCREEN, SHOWS ON WINDOW.PRINT) -->
            <div class="print-only">
                <div class="text-center mb-6">
                    <h1 class="text-2xl font-bold uppercase mb-1">Phiếu Xuất Kho</h1>
                    <p class="text-sm">Ngày In: {{ new Date().toLocaleDateString('vi-VN') }} - {{ new Date().toLocaleTimeString('vi-VN') }}</p>
                </div>
                
                <div class="flex justify-between items-start mb-6">
                    <div class="w-2/3 border rounded p-4">
                        <table class="w-full text-sm">
                            <tr><td class="w-1/3 py-1 text-gray-600">Đơn vị nhận hàng:</td> <td class="font-bold">{{ getDealerName(selectedOrder.dealerId) }}</td></tr>
                            <tr><td class="py-1 text-gray-600">Địa chỉ:</td> <td class="italic">{{ getDealerAddress(selectedOrder.dealerId) }}</td></tr>
                            <tr><td class="py-1 text-gray-600">Kho xuất:</td> <td>{{ getWarehouseName(selectedOrder.sourceWarehouseId) }}</td></tr>
                            <tr><td class="py-1 text-gray-600">Người xuất:</td> <td>{{ authStore.user?.fullName || authStore.user?.username || 'Thủ kho' }}</td></tr>
                        </table>
                    </div>
                    <div class="w-1/3 text-right">
                        <div><b>Số Phiếu:</b> <span class="text-lg font-bold">{{ getPXKCode(selectedOrder.orderCode) }}</span></div>
                        <div class="text-sm mt-1 mb-2">Số Lệnh(LXH): {{ selectedOrder.orderCode }}</div>
                        <canvas id="qrCanvas" class="ml-auto block border"></canvas>
                    </div>
                </div>

                <div class="mb-2 font-bold uppercase text-sm border-b pb-1">Chi tiết hàng hóa xuất kho</div>
                <table class="w-full text-sm border-collapse mb-8">
                    <thead>
                        <tr>
                            <th class="border p-2 text-left w-12">STT</th>
                            <th class="border p-2 text-left">Tên hàng hóa, quy cách</th>
                            <th class="border p-2 text-center w-24">Yêu cầu</th>
                            <th class="border p-2 text-center w-24">Thực xuất</th>
                            <th class="border p-2 text-center">Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(item, idx) in (selectedOrder.items || [])" :key="idx">
                            <td class="border p-2 text-center">{{ idx + 1 }}</td>
                            <td class="border p-2">{{ item.product?.name }}</td>
                            <td class="border p-2 text-center">{{ item.expectedQuantity }}</td>
                            <td class="border p-2 text-center font-bold">{{ item.scannedQuantity }}</td>
                            <td class="border p-2"></td>
                        </tr>
                    </tbody>
                </table>

                <div class="flex justify-between mt-10 text-center">
                    <div class="w-1/3">
                        <p class="font-bold">Người lập phiếu</p>
                        <p class="italic text-xs">(Ký, ghi rõ họ tên)</p>
                    </div>
                    <div class="w-1/3">
                        <p class="font-bold">Thủ kho</p>
                        <p class="italic text-xs">(Ký, ghi rõ họ tên)</p>
                    </div>
                    <div class="w-1/3">
                        <p class="font-bold">Đại diện nhận hàng</p>
                        <p class="italic text-xs">(Ký, ghi rõ họ tên)</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- READONLY DIALOG TỪ DASHBOARD -->
        <el-dialog v-model="showReadonlyDialog" :title="`Chi tiết Lệnh: ${readonlyOrder?.orderCode}`" width="800px">
            <div v-if="readonlyOrder" class="mb-4">
                <el-descriptions border :column="2">
                    <el-descriptions-item v-if="readonlyOrder.status === 'EXPORTED'" label="Số PXK"><b>{{ getPXKCode(readonlyOrder.orderCode) }}</b></el-descriptions-item>
                    <el-descriptions-item label="Số Lệnh"><b>{{ readonlyOrder.orderCode }}</b></el-descriptions-item>
                    <el-descriptions-item label="Ngày tạo">{{ new Date(readonlyOrder.createdAt).toLocaleDateString('vi-VN') }}</el-descriptions-item>
                    <el-descriptions-item label="Đại lý">{{ getDealerName(readonlyOrder.dealerId) }}</el-descriptions-item>
                    <el-descriptions-item label="Trạng thái">
                        <el-tag :type="readonlyOrder.status === 'EXPORTED' ? 'success' : 'warning'">{{ readonlyOrder.status === 'EXPORTED' ? 'Đã Xuất Kho' : 'Chờ lấy hàng' }}</el-tag>
                    </el-descriptions-item>
                </el-descriptions>
                
                <h4 class="font-bold mt-6 mb-2">Danh sách Sản phẩm Yêu cầu</h4>
                <el-table :data="readonlyOrder.items" border size="small">
                    <el-table-column prop="product.name" label="Sản phẩm" />
                    <el-table-column prop="expectedQuantity" label="Yêu cầu" width="120" />
                    <el-table-column prop="scannedQuantity" label="Đã lấy" width="120" />
                </el-table>
            </div>
            <template #footer>
                <el-button @click="showReadonlyDialog = false">Đóng</el-button>
                <el-button type="primary" @click="viewDetail(readonlyOrder)">Đi tới Thực thi Xuất Kho</el-button>
            </template>
        </el-dialog>

        <!-- FINISH PICKING DIALOG -->
        <el-dialog v-model="showFinishDialog" title="Hoàn tất xuất kho & Tạo phiếu giao hàng" width="500px">
            <div class="space-y-4">
                <el-alert type="info" :closable="false" show-icon>
                    Hệ thống sẽ trừ tồn kho và đánh dấu đã xuất.
                </el-alert>

                <el-checkbox v-model="autoCreateDelivery" size="large">
                    <span class="font-bold">Tạo Phiếu Giao Hàng (PGH) luôn</span>
                </el-checkbox>

                <div v-if="autoCreateDelivery" class="border rounded p-4 bg-gray-50 space-y-3">
                    <div class="mb-2 font-bold text-sm">Chọn xe giao hàng:</div>
                    <el-select v-model="selectedVehicleId" placeholder="Chọn xe..." class="w-full" filterable>
                        <el-option
                            v-for="v in vehicles"
                            :key="v.id"
                            :label="`${v.licensePlate} (${v.type || 'Xe tải'}) - ${v.defaultDriver?.fullName || 'Chưa gán lái xe'}`"
                            :value="v.id"
                        />
                    </el-select>

                    <el-checkbox v-model="useExternalDriver">
                        <span class="text-sm">Lái xe thuê ngoài (không có tài khoản)</span>
                    </el-checkbox>

                    <template v-if="useExternalDriver">
                        <el-input v-model="extDriverName" placeholder="Tên lái xe" />
                        <el-input v-model="extDriverPhone" placeholder="Số điện thoại" />
                        <el-alert type="warning" :closable="false" class="!py-1">
                            Lái xe thuê ngoài → đại lý sẽ nhận hàng trực tiếp (không cần lái xe quét)
                        </el-alert>
                    </template>

                    <div v-else-if="selectedVehicleId" class="text-xs text-green-600">
                        → Lái xe: {{ vehicles.find(v => v.id === selectedVehicleId)?.defaultDriver?.fullName || '(Chưa gán)' }}
                    </div>
                </div>
            </div>
            <template #footer>
                <el-button @click="showFinishDialog = false">Đóng</el-button>
                <el-button 
                    type="success" 
                    @click="confirmFinishPicking" 
                    :disabled="autoCreateDelivery && !selectedVehicleId"
                >
                    Xác nhận Xuất Kho
                </el-button>
            </template>
        </el-dialog>

        <!-- MANUAL DELIVERY DIALOG (for existing exported orders) -->
        <el-dialog v-model="showManualDeliveryDialog" title="Tạo Phiếu Giao Hàng (PGH)" width="480px">
            <div v-if="manualDeliveryOrder" class="space-y-4">
                <el-descriptions border :column="1" size="small">
                    <el-descriptions-item label="Lệnh">{{ manualDeliveryOrder.orderCode }}</el-descriptions-item>
                    <el-descriptions-item label="Đại lý">{{ getDealerName(manualDeliveryOrder.dealerId) }}</el-descriptions-item>
                </el-descriptions>
                <div class="border rounded p-4 bg-gray-50 space-y-3">
                    <div class="mb-2 font-bold text-sm">Chọn xe giao hàng:</div>
                    <el-select v-model="manualVehicleId" placeholder="Chọn xe..." class="w-full" filterable>
                        <el-option
                            v-for="v in vehicles"
                            :key="v.id"
                            :label="`${v.licensePlate} (${v.type || 'Xe tải'}) - ${v.defaultDriver?.fullName || 'Chưa gán lái xe'}`"
                            :value="v.id"
                        />
                    </el-select>

                    <el-checkbox v-model="manualUseExternalDriver">
                        <span class="text-sm">Lái xe thuê ngoài (không có tài khoản)</span>
                    </el-checkbox>

                    <template v-if="manualUseExternalDriver">
                        <el-input v-model="manualExtDriverName" placeholder="Tên lái xe" />
                        <el-input v-model="manualExtDriverPhone" placeholder="Số điện thoại" />
                        <el-alert type="warning" :closable="false" class="!py-1">
                            Lái xe thuê ngoài → đại lý sẽ nhận hàng trực tiếp
                        </el-alert>
                    </template>
                </div>
            </div>
            <template #footer>
                <el-button @click="showManualDeliveryDialog = false">Đóng</el-button>
                <el-button type="primary" :disabled="!manualVehicleId" @click="confirmManualDelivery">
                    Tạo Phiếu Giao Hàng
                </el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { exportOrderApi } from '../api/exportOrderApi';
import { dealerApi } from '../api/dealerApi';
import { transportApi } from '../api/transportApi';
import api from '@/common/utils/api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Box, Van, Check, Search, Loading, Warning, Camera, Close, ArrowLeft, Printer } from '@element-plus/icons-vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/core/store/auth';
import QRCode from 'qrcode';

const authStore = useAuthStore();

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const pendingOrders = ref<any[]>([]);
const exportedOrders = ref<any[]>([]);

const selectedOrder = ref<any>(null);
const scanInput = ref('');
const scanInputRef = ref<any>(null);
const scanning = ref(false);

const showReadonlyDialog = ref(false);
const readonlyOrder = ref<any>(null);

const showFinishDialog = ref(false);
const autoCreateDelivery = ref(true);
const selectedVehicleId = ref('');
const vehicles = ref<any[]>([]);

const showManualDeliveryDialog = ref(false);
const manualDeliveryOrder = ref<any>(null);
const manualVehicleId = ref('');
const shipmentsMap = ref<Record<string, any>>({});

const useExternalDriver = ref(false);
const extDriverName = ref('');
const extDriverPhone = ref('');
const manualUseExternalDriver = ref(false);
const manualExtDriverName = ref('');
const manualExtDriverPhone = ref('');

const dealers = ref<any[]>([]);
const warehouseMap = ref<Record<string, string>>({}); // UUID -> Name 

const logsData = ref({ individual: [] as any[], boxes: [] as any[] });

const getPXKCode = (lxh: string) => lxh ? lxh.replace('LXH', 'PXK') : 'PXK-XXX';

const loadMasterData = async () => {
    try {
        const { data } = await dealerApi.getList();
        dealers.value = Array.isArray(data) ? data : (data?.items || []);
    } catch (e) { console.warn('Load dealers failed', e); }
    try {
        const wrRes = await api.get('/supply/warehouses');
        const wrArr = Array.isArray(wrRes.data) ? wrRes.data : (wrRes.data?.items || []);
        wrArr.forEach((w: any) => warehouseMap.value[w.id] = w.name);
    } catch (e) { console.warn('Load warehouses failed', e); }
    try {
        const { data } = await transportApi.getVehicles();
        vehicles.value = Array.isArray(data) ? data : [];
    } catch (e) { console.warn('Load vehicles failed', e); }
};

const getDealerName = (id: string) => {
    const d = dealers.value.find(x => x.id === id);
    return d ? d.name : id;
};

const getDealerAddress = (id: string) => {
    const d = dealers.value.find(x => x.id === id);
    return d ? `${d.contactPerson || ''} - ${d.address || 'Không có địa chỉ'}` : 'Không có thông tin';
};

const getWarehouseName = (id: string) => {
    if (!id) return '(Chưa gán kho)';
    return warehouseMap.value[id] || id;
};

const formatQR = (qr: string) => {
    if (!qr) return '';
    try {
        if (qr.startsWith('http')) {
            const url = new URL(qr);
            return url.searchParams.get('Code') || url.searchParams.get('id') || qr;
        }
    } catch(e) {}
    return qr;
};

const getProductName = (productId: string) => {
    if (!selectedOrder.value || !selectedOrder.value.items) return '';
    const it = selectedOrder.value.items.find((i: any) => i.productId === productId);
    return it?.product?.name || '---';
};

const loadOrders = async () => {
    loading.value = true;
    try {
        const [{ data: confirmed }, { data: picking }, { data: exported }] = await Promise.all([
            exportOrderApi.getOrders({ status: 'CONFIRMED' }),
            exportOrderApi.getOrders({ status: 'PICKING' }),
            exportOrderApi.getOrders({ status: 'EXPORTED' })
        ]);
        
        pendingOrders.value = [...(confirmed.items||confirmed), ...(picking.items||picking)];
        exportedOrders.value = exported.items || exported;

        // Load existing shipments to check which orders already have PGH
        try {
            const { data: shipments } = await transportApi.getShipments({ type: 'DEALER_EXPORT' });
            const map: Record<string, any> = {};
            (Array.isArray(shipments) ? shipments : []).forEach((s: any) => {
                if (s.exportOrderId) map[s.exportOrderId] = s;
            });
            shipmentsMap.value = map;
        } catch (e) {}
    } catch (e) {
        ElMessage.error('Lỗi tải danh sách lệnh');
    } finally {
        loading.value = false;
    }
};

const openReadonlyDetail = async (row: any) => {
    try {
        const res = await exportOrderApi.getDetail(row.id);
        readonlyOrder.value = res.data;
        showReadonlyDialog.value = true;
    } catch(e) { ElMessage.error('Lỗi tải'); }
};

const viewDetail = async (row: any) => {
    try {
        if (!row) return;
        showReadonlyDialog.value = false;
        const res = await exportOrderApi.getDetail(row.id);
        selectedOrder.value = res.data;
        refreshLogs(row.id);
        nextTick(() => {
            scanInputRef.value?.focus();
        });
    } catch (e) {
        ElMessage.error('Lỗi tải chi tiết lệnh');
    }
};

const refreshLogs = async (id: string) => {
    try {
        const { data } = await exportOrderApi.getScanLogs(id);
        logsData.value = data;
    } catch (err) {}
};

const handleScan = async () => {
    if (!scanInput.value.trim() || !selectedOrder.value) return;
    scanning.value = true;
    try {
        const res = await exportOrderApi.scanItem(selectedOrder.value.id, scanInput.value.trim());
        if (res.data.invalidCount > 0) {
           ElMessage.warning(`Quét thành công ${res.data.validCount} mã. Lỗi ${res.data.invalidCount} mã: ${res.data.invalidReasons.join(', ')}`);
        } else {
           ElMessage.success(`Quét xong. Đã ghi nhận ${res.data.validCount} mã sản phẩm.`);
        }
        await viewDetail({ id: selectedOrder.value.id });
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || 'Có lỗi khi quét');
    } finally {
        scanInput.value = '';
        scanning.value = false;
        nextTick(() => { scanInputRef.value?.focus(); });
    }
};

const unscanItem = async (serial: string) => {
    if (!selectedOrder.value) return;
    try {
        await ElMessageBox.confirm(`Bạn có chắc muốn bỏ mã khỏi lệnh?`, 'Cảnh báo', { type: 'error' });
        await exportOrderApi.unscanItem(selectedOrder.value.id, serial);
        await viewDetail({ id: selectedOrder.value.id });
    } catch (err: any) { if (err !== 'cancel') ElMessage.error('Lỗi hủy'); }
};

const unscanBox = async (parentCode: string) => {
    if (!selectedOrder.value) return;
    try {
        await ElMessageBox.confirm(`Bạn có chắc muốn bỏ thùng khỏi lệnh?`, 'Cảnh báo', { type: 'error' });
        await exportOrderApi.unscanBox(selectedOrder.value.id, parentCode);
        await viewDetail({ id: selectedOrder.value.id });
    } catch (err: any) { if (err !== 'cancel') ElMessage.error('Lỗi hủy'); }
};

const finishPicking = async (order: any) => {
    try {
        await ElMessageBox.confirm(`Hoàn tất xuất kho?`, 'Xác nhận', { type: 'warning' });
        await exportOrderApi.finishPicking(order.id);
        ElMessage.success('Xuất kho thành công');
        selectedOrder.value = null;
        loadOrders();
    } catch (e: any) { if (e !== 'cancel') ElMessage.error('Lỗi: ' + e.message); }
};

const confirmFinishPicking = async () => {
    if (!selectedOrder.value) return;
    try {
        const body: any = {};
        if (autoCreateDelivery.value && selectedVehicleId.value) {
            body.vehicleId = selectedVehicleId.value;
            if (useExternalDriver.value && extDriverName.value) {
                body.externalDriverName = extDriverName.value;
                body.externalDriverPhone = extDriverPhone.value;
            }
        }
        const res = await exportOrderApi.finishPicking(selectedOrder.value.id, body);
        
        if (res.data.shipmentId) {
            ElMessage.success('Xuất kho thành công! Đã tự động tạo Phiếu Giao Hàng (PGH).');
        } else {
            ElMessage.success('Xuất kho thành công!');
        }

        showFinishDialog.value = false;
        selectedVehicleId.value = '';
        useExternalDriver.value = false;
        extDriverName.value = '';
        extDriverPhone.value = '';
        selectedOrder.value = null;
        loadOrders();
    } catch (e: any) {
        ElMessage.error('Lỗi xuất kho: ' + (e.response?.data?.message || e.message));
    }
};

const openManualDeliveryDialog = (order: any) => {
    manualDeliveryOrder.value = order;
    manualVehicleId.value = '';
    showManualDeliveryDialog.value = true;
};

const confirmManualDelivery = async () => {
    if (!manualDeliveryOrder.value || !manualVehicleId.value) return;
    try {
        const body: any = { vehicleId: manualVehicleId.value };
        if (manualUseExternalDriver.value && manualExtDriverName.value) {
            body.externalDriverName = manualExtDriverName.value;
            body.externalDriverPhone = manualExtDriverPhone.value;
        }
        const res = await exportOrderApi.createDelivery(manualDeliveryOrder.value.id, body);
        ElMessage.success(`Đã tạo Phiếu Giao Hàng: ${res.data.trackingCode}`);
        showManualDeliveryDialog.value = false;
        manualDeliveryOrder.value = null;
        manualUseExternalDriver.value = false;
        manualExtDriverName.value = '';
        manualExtDriverPhone.value = '';
        loadOrders();
    } catch (e: any) {
        ElMessage.error(e.response?.data?.message || 'Lỗi tạo phiếu giao hàng');
    }
};

const cancelOrder = async (order: any) => {
    try {
        await ElMessageBox.confirm(`Xác nhận hủy lệnh xuất kho?`, 'Cảnh báo', { type: 'error', confirmButtonText: 'Hủy' });
        await exportOrderApi.cancel(order.id);
        selectedOrder.value = null;
        loadOrders();
    } catch (e: any) { if (e !== 'cancel') ElMessage.error('Lỗi Hủy'); }
};

const getProgress = (order: any) => {
    if (!order?.items || order.items.length === 0) return 0;
    const expected = order.items.reduce((s: number, i: any) => s + i.expectedQuantity, 0);
    const scanned = order.items.reduce((s: number, i: any) => s + i.scannedQuantity, 0);
    return expected === 0 ? 0 : Math.min(Math.round((scanned / expected) * 100), 100);
};

const printTicket = async () => {
    if (!selectedOrder.value) return;
    // Tạo link cho Receiver quét nhận hàng
    const receiveLink = `https://app.trustid.com.vn/receive?pxk=${getPXKCode(selectedOrder.value.orderCode)}`;
    
    // Tạo QR code dán vào canvas Print
    const canvas = document.getElementById('qrCanvas') as HTMLCanvasElement;
    if (canvas) {
        await QRCode.toCanvas(canvas, receiveLink, { width: 100, margin: 1 });
    }
    
    window.print();
};

onMounted(() => {
    loadMasterData().then(() => {
        loadOrders().then(() => {
            if (route.query.orderId) {
                const order = [...pendingOrders.value, ...exportedOrders.value].find(o => o.id === route.query.orderId);
                if (order) viewDetail(order);
            }
        });
    });
});
</script>

<style scoped>
.print-only {
    display: none;
}

@media print {
    body * {
        visibility: hidden;
    }
    .no-print, .el-dialog {
        display: none !important;
    }
    .print-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
    }
    .print-only, .print-only * {
        visibility: visible;
        color: #000 !important;
    }
    .print-only {
        display: block !important;
        position: relative;
        padding: 20px 40px;
        background: white;
        height: auto;
    }
}
</style>
