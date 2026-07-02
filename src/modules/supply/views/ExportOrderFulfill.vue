<template>
    <div class="export-fulfill-view p-6 bg-gray-50 min-h-screen">
        
        <!-- DASHBOARD VIEW -->
        <div v-if="!selectedOrder" class="space-y-6">
            <!-- KHỐI LỆNH CHỜ XUẤT -->
            <el-card class="rounded-xl shadow-sm">
                <template #header>
                    <h3 class="font-bold text-gray-700 flex items-center gap-2">
                        <el-icon class="text-orange-500"><Loading v-if="loading" /><Van v-else /></el-icon>
                        Lệnh chờ xuất kho ({{ pendingTotal }})
                    </h3>
                </template>
                <el-table :data="pendingOrders" v-loading="loading">
                     <el-table-column label="STT" width="60" align="center">
                          <template #default="{ $index }">
                              {{ (pendingCurrentPage - 1) * pendingPageSize + $index + 1 }}
                          </template>
                     </el-table-column>
                     <el-table-column label="Số lệnh" prop="orderCode" width="160">
                         <template #default="{row}">
                             <div class="font-bold text-blue-600 cursor-pointer hover:underline" @click="openReadonlyDetail(row)">
                                 {{ row.orderCode }}
                             </div>
                             <div class="text-[10px] text-gray-400">{{ new Date(row.createdAt).toLocaleString('vi-VN') }}</div>
                         </template>
                     </el-table-column>
                     <el-table-column label="Đại lý" min-width="120">
                         <template #default="{row}">{{ getDealerName(row.dealerId) }}</template>
                     </el-table-column>
                     <el-table-column label="Kho xuất" min-width="120">
                          <template #default="{row}">{{ getWarehouseName(row.sourceWarehouseId) }}</template>
                     </el-table-column>
                     <el-table-column label="Số lượng hàng" width="150">
                          <template #default="{row}">
                              <div class="text-xs text-gray-700">Số loại SP: <span class="font-bold">{{ row.items ? row.items.length : 0 }}</span></div>
                              <div class="text-xs text-gray-500 mt-1">Tổng yêu cầu: <span class="font-bold text-blue-600">{{ row.items ? row.items.reduce((acc: number, cur: any) => acc + (cur.expectedQuantity || 0), 0) : 0 }}</span></div>
                          </template>
                     </el-table-column>
                     <el-table-column label="Mức ưu tiên" width="110" align="center">
                          <template #default="{row}">
                              <el-tag
                                  :type="row.priority === 'HIGH' ? 'danger' : row.priority === 'MEDIUM' ? 'warning' : 'info'"
                                  size="small"
                              >
                                  {{ row.priority }}
                              </el-tag>
                          </template>
                     </el-table-column>
                     <el-table-column label="Trạng thái" width="120" align="center">
                          <template #default="{row}">
                              <el-tag :type="getStatusTag(row.status).type" effect="dark" size="small">
                                  {{ getStatusTag(row.status).label }}
                              </el-tag>
                          </template>
                     </el-table-column>
                     <el-table-column width="120" align="center">
                         <template #default="{row}">
                             <el-button type="primary" size="small" @click="viewDetail(row)">Xuất kho</el-button>
                         </template>
                     </el-table-column>
                </el-table>
                <div class="flex justify-end p-4 bg-white border-t border-gray-100">
                    <el-pagination
                        v-model:current-page="pendingCurrentPage"
                        v-model:page-size="pendingPageSize"
                        :total="pendingTotal"
                        :page-sizes="[10, 50, 100, 500]"
                        layout="total, sizes, prev, pager, next, jumper"
                        background
                        @size-change="handlePendingSizeChange"
                        @current-change="handlePendingPageChange"
                    />
                </div>
            </el-card>

            <!-- KHỐI LỆNH ĐÃ XUẤT KHO -->
            <el-card class="rounded-xl shadow-sm">
                <template #header>
                    <h3 class="font-bold text-gray-700 flex items-center gap-2">
                        <el-icon class="text-green-500"><Check /></el-icon>
                        Lệnh đã xuất kho ({{ exportedTotal }})
                    </h3>
                </template>
                <el-table :data="exportedOrders" v-loading="loading">
                     <el-table-column label="STT" width="60" align="center">
                          <template #default="{ $index }">
                              {{ (exportedCurrentPage - 1) * exportedPageSize + $index + 1 }}
                          </template>
                     </el-table-column>
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
                     <el-table-column label="Đại lý" min-width="120">
                         <template #default="{row}">{{ getDealerName(row.dealerId) }}</template>
                     </el-table-column>
                     <el-table-column label="Kho xuất" min-width="120">
                          <template #default="{row}">{{ getWarehouseName(row.sourceWarehouseId) }}</template>
                     </el-table-column>
                     <el-table-column label="Số lượng hàng" width="150">
                          <template #default="{row}">
                              <div class="text-xs text-gray-700">Số loại SP: <span class="font-bold">{{ row.items ? row.items.length : 0 }}</span></div>
                              <div class="text-xs text-gray-500 mt-1">Tổng yêu cầu: <span class="font-bold text-blue-600">{{ row.items ? row.items.reduce((acc: number, cur: any) => acc + (cur.expectedQuantity || 0), 0) : 0 }}</span></div>
                          </template>
                     </el-table-column>
                     <el-table-column label="Ngày xuất">
                        <template #default="{row}">{{ new Date(row.updatedAt).toLocaleDateString('vi-VN') }}</template>
                     </el-table-column>
                     <el-table-column label="Vận chuyển" width="180">
                         <template #default="{row}">
                             <template v-if="shipmentsMap[row.id]">
                                 <div v-if="shipmentsMap[row.id].vehiclePlate" class="text-xs text-gray-700 font-semibold flex items-center gap-1">
                                     <el-icon><Van /></el-icon>
                                     {{ shipmentsMap[row.id].vehiclePlate }}
                                 </div>
                                 <div v-if="shipmentsMap[row.id].externalDriverName || shipmentsMap[row.id].sender?.fullName" class="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                     <el-icon><User /></el-icon>
                                     {{ shipmentsMap[row.id].externalDriverName || shipmentsMap[row.id].sender?.fullName }}
                                 </div>
                             </template>
                             <span v-else class="text-xs text-gray-400">---</span>
                         </template>
                      </el-table-column>
                     <el-table-column label="Giao hàng" width="160" align="center">
                        <template #default="{row}">
                            <template v-if="shipmentsMap[row.id]">
                                <el-tag
                                    type="success"
                                    effect="dark"
                                    size="small"
                                    class="cursor-pointer hover:opacity-85"
                                    @click="showShipmentDetail(shipmentsMap[row.id].id)"
                                >
                                    {{ shipmentsMap[row.id].trackingCode }}
                                </el-tag>
                                <div class="text-xs text-gray-400 mt-1">{{ ({'WAITING_DRIVER':'Chờ tài xế nhận','READY_FOR_PICKUP':'Sẵn sàng giao','IN_TRANSIT':'Đang giao','PENDING_DEALER_CONFIRM':'Chờ đại lý xác nhận','DELIVERED':'Đã giao'} as Record<string, string>)[shipmentsMap[row.id].status] || shipmentsMap[row.id].status }}</div>
                            </template>
                            <el-button v-else type="primary" size="small" @click="openManualDeliveryDialog(row)">
                                <el-icon class="mr-1"><Van /></el-icon> Tạo PGH
                            </el-button>
                        </template>
                     </el-table-column>
                </el-table>
                <div class="flex justify-end p-4 bg-white border-t border-gray-100">
                    <el-pagination
                        v-model:current-page="exportedCurrentPage"
                        v-model:page-size="exportedPageSize"
                        :total="exportedTotal"
                        :page-sizes="[10, 50, 100, 500]"
                        layout="total, sizes, prev, pager, next, jumper"
                        background
                        @size-change="handleExportedSizeChange"
                        @current-change="handleExportedPageChange"
                    />
                </div>
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
                        <div class="flex items-center gap-3 mb-4">
                            <el-input 
                                v-model="scanInput" 
                                ref="scanInputRef"
                                size="large" 
                                :placeholder="unscanMode ? 'Quét mã cần XÓA khỏi phiếu...' : 'Quét mã qr sản phẩm, mã bao, mã pallet, mã thùng...'" 
                                clearable
                                @keyup.enter="handleScan"
                                :disabled="scanning"
                                :class="{ 'unscan-input': unscanMode }"
                            >
                                <template #append>
                                    <el-button :icon="unscanMode ? 'Delete' : 'Search'" @click="handleScan" :loading="scanning">{{ unscanMode ? 'Xóa' : 'Quét' }}</el-button>
                                </template>
                            </el-input>
                            <el-switch 
                                v-model="unscanMode" 
                                active-text="Quét xóa" 
                                inactive-text=""
                                style="--el-switch-on-color: #ef4444;"
                                size="large"
                            />
                        </div>
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
                            <div class="flex items-center justify-between mb-3">
                                <h4 class="font-bold flex items-center gap-2 text-gray-700">
                                    <el-icon class="text-green-500"><Check /></el-icon> Mã đã quét ({{ scannedItems.length }} gói)
                                </h4>
                            </div>

                            <!-- BAG SUMMARY TAGS -->
                            <div v-if="scannedBags.length > 0 && selectedOrder.status !== 'EXPORTED'" class="flex flex-wrap gap-2 mb-3">
                                <el-tag 
                                    v-for="bag in scannedBags" 
                                    :key="bag.bagCode"
                                    type="success" 
                                    size="default"
                                    closable
                                    effect="dark"
                                    @close="removeBag(bag.bagCode)"
                                >
                                    🛍️ {{ bag.bagCode }} ({{ bag.count }} gói)
                                </el-tag>
                            </div>
                            
                            <el-table :data="scannedItems" size="small" height="320" empty-text="Chưa quét mã nào" border class="rounded-lg overflow-hidden bg-white">
                                <el-table-column type="index" label="STT" width="50" align="center" />
                                <el-table-column label="Serial" width="120" show-overflow-tooltip>
                                    <template #default="{row}">{{ row.serialCode || '—' }}</template>
                                </el-table-column>
                                <el-table-column label="Mã QR gói" min-width="160" show-overflow-tooltip>
                                    <template #default="{row}">{{ row.itemSerial }}</template>
                                </el-table-column>
                                <el-table-column label="Mã bao" width="180" show-overflow-tooltip>
                                    <template #default="{row}">
                                        <el-tag v-if="row.bagCode" type="success" size="small" effect="plain">{{ row.bagCode }}</el-tag>
                                        <span v-else class="text-gray-300">—</span>
                                    </template>
                                </el-table-column>
                                <el-table-column width="60" align="center" v-if="selectedOrder.status !== 'EXPORTED'">
                                    <template #default="{row}">
                                        <el-button type="danger" link icon="Close" @click="removeScannedItem(row)"></el-button>
                                    </template>
                                </el-table-column>
                            </el-table>
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
                            <td class="border p-2 text-center">{{ Number(idx) + 1 }}</td>
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

        <!-- SHIPMENT DETAIL DIALOG -->
        <el-dialog v-model="shipmentDetailVisible" title="Chi tiết Phiếu Giao Hàng (PGH)" width="680px" destroy-on-close>
            <div v-if="selectedShipment" v-loading="shipmentDetailLoading" class="space-y-4">
                <el-descriptions border :column="2" size="small">
                    <el-descriptions-item label="Mã vận đơn">
                        <span class="font-bold text-blue-700">{{ selectedShipment.trackingCode }}</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="Trạng thái">
                        <el-tag :type="getShipmentStatusTag(selectedShipment.status).type" effect="dark" size="small">
                            {{ getShipmentStatusTag(selectedShipment.status).label }}
                        </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="Xe vận chuyển">
                        {{ selectedShipment.vehiclePlate || '---' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Lái xe">
                        <template v-if="selectedShipment.externalDriverName">
                            {{ selectedShipment.externalDriverName }}
                            <span v-if="selectedShipment.externalDriverPhone" class="text-gray-400 text-xs"> ({{ selectedShipment.externalDriverPhone }})</span>
                            <el-tag size="small" type="warning" class="ml-1">Thuê ngoài</el-tag>
                        </template>
                        <template v-else>
                            {{ selectedShipment.sender?.fullName || '---' }}
                        </template>
                    </el-descriptions-item>
                    <el-descriptions-item label="Kho xuất">
                        {{ selectedShipment.sourceWarehouse?.name || '---' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Đích đến">
                        {{ selectedShipment.dealer?.name || '---' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Ngày tạo">
                        {{ selectedShipment.createdAt ? new Date(selectedShipment.createdAt).toLocaleString('vi-VN') : '---' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="Hoàn thành lúc">
                        {{ selectedShipment.endTime ? new Date(selectedShipment.endTime).toLocaleString('vi-VN') : 'Chưa hoàn thành' }}
                    </el-descriptions-item>
                </el-descriptions>

                <div v-if="selectedShipment.expectedItems && selectedShipment.expectedItems.length > 0">
                    <div class="font-bold text-sm mb-2 mt-4 flex items-center gap-1">
                        <el-icon><Box /></el-icon>
                        Danh mục hàng hóa dự kiến:
                    </div>
                    <el-table :data="selectedShipment.expectedItems" size="small" border>
                        <el-table-column type="index" label="STT" width="60" align="center" />
                        <el-table-column label="Tên sản phẩm" prop="productName" />
                        <el-table-column label="Số lượng" prop="quantity" width="120" align="center">
                            <template #default="{row}">
                                <span class="font-bold text-blue-600">{{ row.quantity }}</span>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </div>
            <template #footer>
                <el-button @click="shipmentDetailVisible = false">Đóng</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { exportOrderApi } from '../api/exportOrderApi';
import { dealerApi } from '../api/dealerApi';
import { transportApi } from '../api/transportApi';
import api from '@/common/utils/api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Box, Van, Check, Search, Loading, Warning, Camera, Close, ArrowLeft, Printer, User } from '@element-plus/icons-vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/core/store/auth';
import QRCode from 'qrcode';

const authStore = useAuthStore();

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const pendingOrders = ref<any[]>([]);
const exportedOrders = ref<any[]>([]);

const pendingCurrentPage = ref(1);
const pendingPageSize = ref(10);
const pendingTotal = ref(0);

const exportedCurrentPage = ref(1);
const exportedPageSize = ref(10);
const exportedTotal = ref(0);

const selectedOrder = ref<any>(null);
const scanInput = ref('');
const scanInputRef = ref<any>(null);
const scanning = ref(false);
const unscanMode = ref(false);

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

const shipmentDetailVisible = ref(false);
const shipmentDetailLoading = ref(false);
const selectedShipment = ref<any>(null);

const useExternalDriver = ref(false);
const extDriverName = ref('');
const extDriverPhone = ref('');
const manualUseExternalDriver = ref(false);
const manualExtDriverName = ref('');
const manualExtDriverPhone = ref('');

const dealers = ref<any[]>([]);
const warehouseMap = ref<Record<string, string>>({}); // UUID -> Name 



const getPXKCode = (lxh: string) => lxh ? lxh.replace('LXH', 'PXK') : 'PXK-XXX';

const showShipmentDetail = async (shipmentId: string) => {
    shipmentDetailVisible.value = true;
    shipmentDetailLoading.value = true;
    try {
        const res = await transportApi.getShipmentDetail(shipmentId);
        selectedShipment.value = res.data;
    } catch (e) {
        ElMessage.error('Lỗi tải chi tiết phiếu giao hàng');
    } finally {
        shipmentDetailLoading.value = false;
    }
};

const getShipmentStatusTag = (status: string) => {
    switch (status) {
        case 'CREATED': return { type: 'info', label: 'Chờ quét hàng' };
        case 'WAITING_DRIVER': return { type: 'warning', label: 'Chờ tài xế nhận' };
        case 'READY_FOR_PICKUP': return { type: 'warning', label: 'Sẵn sàng giao' };
        case 'IN_TRANSIT': return { type: 'primary', label: 'Đang vận chuyển' };
        case 'PENDING_DEALER_CONFIRM': return { type: 'info', label: 'Chờ đại lý xác nhận' };
        case 'DELIVERED': return { type: 'success', label: 'Đã hoàn thành' };
        case 'CANCELLED': return { type: 'danger', label: 'Đã hủy' };
        default: return { type: '', label: status };
    }
};

const getStatusTag = (status: string) => {
  switch (status) {
    case 'DRAFT': return { type: 'info', label: 'Bản nháp' };
    case 'CONFIRMED': return { type: 'primary', label: 'Đã xác nhận' };
    case 'PICKING': return { type: 'warning', label: 'Đang lấy' };
    case 'EXPORTED': return { type: 'success', label: 'Đã xuất kho' };
    case 'CANCELLED': return { type: 'danger', label: 'Đã hủy' };
    default: return { type: 'info', label: status };
  }
};

const loadMasterData = async () => {
    try {
        const { data } = await dealerApi.getList();
        dealers.value = Array.isArray(data) ? data : ((data as any)?.items || []);
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

const loadPendingOrders = async () => {
    loading.value = true;
    try {
        const { data } = await exportOrderApi.getOrders({
            status: 'CONFIRMED,PICKING',
            page: pendingCurrentPage.value,
            limit: pendingPageSize.value
        });
        if (data && Array.isArray(data)) {
            pendingOrders.value = data;
            pendingTotal.value = data.length;
        } else {
            pendingOrders.value = data.items || [];
            pendingTotal.value = data.pagination?.total || 0;
        }
    } catch (e) {
        ElMessage.error('Lỗi tải danh sách lệnh chờ xuất');
    } finally {
        loading.value = false;
    }
};

const loadExportedOrders = async () => {
    loading.value = true;
    try {
        const { data } = await exportOrderApi.getOrders({
            status: 'EXPORTED',
            page: exportedCurrentPage.value,
            limit: exportedPageSize.value
        });
        if (data && Array.isArray(data)) {
            exportedOrders.value = data;
            exportedTotal.value = data.length;
        } else {
            exportedOrders.value = data.items || [];
            exportedTotal.value = data.pagination?.total || 0;
        }
    } catch (e) {
        ElMessage.error('Lỗi tải danh sách lệnh đã xuất');
    } finally {
        loading.value = false;
    }
};

const handlePendingSizeChange = (val: number) => {
    pendingPageSize.value = val;
    pendingCurrentPage.value = 1;
    loadPendingOrders();
};

const handlePendingPageChange = (val: number) => {
    pendingCurrentPage.value = val;
    loadPendingOrders();
};

const handleExportedSizeChange = (val: number) => {
    exportedPageSize.value = val;
    exportedCurrentPage.value = 1;
    loadExportedOrders();
};

const handleExportedPageChange = (val: number) => {
    exportedCurrentPage.value = val;
    loadExportedOrders();
};

const loadOrders = async () => {
    await Promise.all([
        loadPendingOrders(),
        loadExportedOrders()
    ]);

    // Load existing shipments to check which orders already have PGH
    try {
        const { data: shipments } = await transportApi.getShipments({ type: 'DEALER_EXPORT' });
        const map: Record<string, any> = {};
        (Array.isArray(shipments) ? shipments : []).forEach((s: any) => {
            if (s.exportOrderId) map[s.exportOrderId] = s;
        });
        shipmentsMap.value = map;
    } catch (e) {}
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

const logsData = ref<any>({ items: [] });

const scannedItems = computed(() => logsData.value.items || []);

const scannedBags = computed(() => {
    const bagMap = new Map<string, number>();
    for (const item of scannedItems.value) {
        if (item.bagCode) {
            bagMap.set(item.bagCode, (bagMap.get(item.bagCode) || 0) + 1);
        }
    }
    return Array.from(bagMap.entries()).map(([bagCode, count]) => ({ bagCode, count }));
});

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
        if (unscanMode.value) {
            // UNSCAN MODE: tìm mã trong logs rồi gọi unscan
            const code = scanInput.value.trim();
            const matchedBag = scannedItems.value.find((i: any) => i.bagCode === code || i.bagSerial === code);
            if (matchedBag) {
                await exportOrderApi.unscanBox(selectedOrder.value.id, matchedBag.bagCode);
                ElMessage.success(`🗑️ Đã xóa bao ${matchedBag.bagCode} khỏi phiếu`);
            } else {
                const matchedItem = scannedItems.value.find((i: any) => i.itemSerial === code || i.fullQrCode === code);
                if (matchedItem) {
                    if (matchedItem.bagCode) {
                        await exportOrderApi.unscanBox(selectedOrder.value.id, matchedItem.bagCode);
                        ElMessage.success(`🗑️ Đã xóa bao ${matchedItem.bagCode} khỏi phiếu`);
                    } else {
                        await exportOrderApi.unscanItem(selectedOrder.value.id, matchedItem.itemSerial);
                        ElMessage.success(`🗑️ Đã xóa mã ${code} khỏi phiếu`);
                    }
                } else {
                    ElMessage.warning(`Không tìm thấy mã ${code} trong danh sách đã quét`);
                }
            }
            await viewDetail({ id: selectedOrder.value.id });
        } else {
            // NORMAL SCAN MODE
            const res = await exportOrderApi.scanItem(selectedOrder.value.id, scanInput.value.trim());
            await viewDetail({ id: selectedOrder.value.id });
            const overItems = (selectedOrder.value?.items || []).filter((i: any) => i.scannedQuantity > i.expectedQuantity);
            
            if (overItems.length > 0) {
                ElMessage.warning(`⚠️ Vượt số lượng yêu cầu: ${overItems.map((i: any) => `${i.product?.name}: ${i.scannedQuantity}/${i.expectedQuantity}`).join(', ')}`);
            } else if (res.data.invalidCount > 0) {
               ElMessage.warning(`Quét thành công ${res.data.validCount} mã. Lỗi ${res.data.invalidCount} mã: ${res.data.invalidReasons.join(', ')}`);
            } else {
               const palletInfo = res.data.palletInfo;
               const bagInfo = res.data.bagInfo;
               if (palletInfo) {
                   ElMessage.success(`📦 Pallet ${palletInfo.palletCode}: ${palletInfo.scannedBags}/${palletInfo.totalBags} bao (${palletInfo.totalPackets} gói)${palletInfo.skippedBags ? `, bỏ qua ${palletInfo.skippedBags} bao đã quét` : ''}`);
               } else if (bagInfo) {
                   ElMessage.success(`✅ Quét bao ${bagInfo.bagSerial} thành công (${bagInfo.packetCount} gói)`);
               } else {
                   ElMessage.success(`Quét xong. Đã ghi nhận ${res.data.validCount} mã sản phẩm.`);
               }
            }
        }
    } catch (err: any) {
        ElMessage.error(err.response?.data?.message || 'Có lỗi khi quét');
    } finally {
        scanInput.value = '';
        scanning.value = false;
        nextTick(() => { scanInputRef.value?.focus(); });
    }
};

const removeScannedItem = async (row: any) => {
    if (!selectedOrder.value) return;
    try {
        if (row.bagCode) {
            await ElMessageBox.confirm(
                `Xóa toàn bộ bao ${row.bagCode}? Sẽ trả lại tồn kho và xóa tất cả gói trong bao.`,
                'Xác nhận xóa bao',
                { type: 'warning' }
            );
            await exportOrderApi.unscanBox(selectedOrder.value.id, row.bagCode);
        } else {
            await ElMessageBox.confirm('Bạn có chắc muốn bỏ mã khỏi lệnh?', 'Cảnh báo', { type: 'error' });
            await exportOrderApi.unscanItem(selectedOrder.value.id, row.itemSerial);
        }
        await viewDetail({ id: selectedOrder.value.id });
    } catch (err: any) {
        if (err !== 'cancel') ElMessage.error(err.response?.data?.message || 'Lỗi xóa');
    }
};

const removeBag = async (bagCode: string) => {
    if (!selectedOrder.value) return;
    try {
        await ElMessageBox.confirm(
            `Xóa toàn bộ bao ${bagCode} khỏi phiếu? Sẽ trả lại tồn kho.`,
            'Xác nhận xóa bao',
            { type: 'warning' }
        );
        await exportOrderApi.unscanBox(selectedOrder.value.id, bagCode);
        ElMessage.success(`Đã xóa bao ${bagCode}`);
        await viewDetail({ id: selectedOrder.value.id });
    } catch (err: any) {
        if (err !== 'cancel') ElMessage.error(err.response?.data?.message || 'Lỗi xóa bao');
    }
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
        await ElMessageBox.confirm(
            'Hành động này sẽ Hủy lệnh xuất kho và giải phóng (trả lại) toàn bộ sản phẩm đã quét về kho khả dụng. Bạn có chắc chắn muốn hủy lệnh này?',
            'Cảnh báo hủy lệnh',
            { 
                type: 'warning', 
                confirmButtonText: 'Đồng ý hủy',
                cancelButtonText: 'Bỏ qua'
            }
        );
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
