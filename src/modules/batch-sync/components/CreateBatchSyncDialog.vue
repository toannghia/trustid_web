<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Box, ShoppingCart } from '@element-plus/icons-vue';
import api from '@/common/utils/api';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'saved']);

// --- State ---
const loading = ref(false);
const submitting = ref(false);

const harvests = ref<any[]>([]); // List of available harvests/batches
const products = ref<any[]>([]); // List of products

const form = reactive({
  harvestId: '',
  productId: '',
  gtin: '',
  quantity: 0,
  mfgDate: ''
});

// --- Computed ---
const selectedHarvest = computed(() => {
  return harvests.value.find(h => h.id === form.harvestId);
});

const selectedProduct = computed(() => {
  return products.value.find(p => p.id === form.productId);
});

// Auto-calculate quantity based on harvest weight and product spec
const suggestedQuantity = computed(() => {
  if (!selectedHarvest.value || !selectedProduct.value) return 0;
  
  const harvestWeight = selectedHarvest.value.quantityKg || 0;
  const productWeight = selectedProduct.value.netWeight || 1; // kg per unit
  
  if (productWeight <= 0) return 0;
  return Math.floor(harvestWeight / productWeight);
});

// --- Watch ---
watch(() => form.harvestId, () => {
  if (selectedHarvest.value) {
    form.mfgDate = selectedHarvest.value.harvestDate || new Date().toISOString().split('T')[0];
  }
});

watch(() => form.productId, () => {
  if (selectedProduct.value) {
    form.gtin = selectedProduct.value.gtinCode || '';
  }
  // Recalculate quantity
  form.quantity = suggestedQuantity.value;
});

watch(suggestedQuantity, (val) => {
  form.quantity = val;
});

// --- Methods ---
const fetchData = async () => {
  loading.value = true;
  try {
    // Fetch harvests and products in parallel using shared api util
    const [harvestRes, productRes] = await Promise.all([
      api.get('/farm/harvests'),
      api.get('/products')
    ]);
    
    harvests.value = harvestRes.data.data || harvestRes.data || [];
    products.value = productRes.data.data || productRes.data || [];
  } catch (e) {
    console.error(e);
    ElMessage.error('Không thể tải dữ liệu');
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  if (!form.gtin || !form.quantity || form.quantity <= 0) {
    ElMessage.warning('Vui lòng chọn sản phẩm và nhập số lượng');
    return;
  }

  submitting.value = true;
  try {
    // Call internal API to trigger sync-batch (Backend will call Gateway)
    await api.post('/supply/batches/sync-nda', {
      harvestId: form.harvestId,
      productId: form.productId,
      gtin: form.gtin,
      quantity: form.quantity,
      mfgDate: form.mfgDate
    });
    
    ElMessage.success('Đã gửi yêu cầu đồng bộ lô!');
    emit('saved');
  } catch (e: any) {
    console.error(e);
    ElMessage.error(e.response?.data?.message || 'Không thể gửi yêu cầu');
  } finally {
    submitting.value = false;
  }
};

const handleClose = () => {
  emit('update:modelValue', false);
};

const resetForm = () => {
  form.harvestId = '';
  form.productId = '';
  form.gtin = '';
  form.quantity = 0;
  form.mfgDate = '';
};

// --- Lifecycle ---
watch(() => props.modelValue, (val) => {
  if (val) {
    resetForm();
    fetchData();
  }
});
</script>

<template>
  <el-dialog 
    :model-value="modelValue" 
    title="Tạo lệnh đồng bộ Lô hàng" 
    width="600px"
    :close-on-click-modal="false"
    @update:model-value="handleClose"
  >
    <el-form :model="form" label-width="140px" v-loading="loading">
      <el-form-item label="Lô thu hoạch">
        <el-select v-model="form.harvestId" placeholder="Chọn lô thu hoạch" class="w-full" filterable>
          <el-option 
            v-for="h in harvests" 
            :key="h.id" 
            :label="`${h.batchCode} - ${h.quantityKg}kg (${h.harvestDate})`" 
            :value="h.id" 
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Sản phẩm">
        <el-select v-model="form.productId" placeholder="Chọn sản phẩm" class="w-full" filterable>
          <el-option 
            v-for="p in products" 
            :key="p.id" 
            :label="`${p.name} (${p.gtinCode})`" 
            :value="p.id" 
          />
        </el-select>
      </el-form-item>

      <!-- Auto-filled fields -->
      <el-divider content-position="left">Thông tin đồng bộ</el-divider>

      <el-form-item label="Mã GTIN">
        <el-input v-model="form.gtin" readonly>
          <template #prefix>
            <el-icon><ShoppingCart /></el-icon>
          </template>
        </el-input>
      </el-form-item>

      <el-form-item label="Số lượng tem">
        <el-input-number v-model="form.quantity" :min="1" :max="100000" class="w-full" />
        <div v-if="suggestedQuantity > 0" class="text-xs text-blue-600 mt-1">
          Gợi ý: {{ suggestedQuantity.toLocaleString() }} tem (dựa trên khối lượng thu hoạch)
        </div>
      </el-form-item>

      <el-form-item label="Ngày sản xuất">
        <el-date-picker 
          v-model="form.mfgDate" 
          type="date" 
          placeholder="Chọn ngày" 
          value-format="YYYY-MM-DD"
          class="w-full"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">Hủy</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          <el-icon class="mr-1"><Plus /></el-icon>
          Gửi yêu cầu
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>
