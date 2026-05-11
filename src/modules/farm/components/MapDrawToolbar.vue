<template>
  <div class="draw-toolbar" v-if="visible">
    <div class="toolbar-group">
      <button
        class="tb-btn"
        :class="{ active: currentMode === 'draw' }"
        @click="toggleMode('draw')"
        title="Vẽ polygon"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        <span>Vẽ</span>
      </button>

      <button
        class="tb-btn"
        :class="{ active: currentMode === 'edit' }"
        :disabled="!hasPolygon"
        @click="toggleMode('edit')"
        title="Sửa polygon"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M4 20h4L18.5 9.5a2.12 2.12 0 00-3-3L5 17v3z"/>
        </svg>
        <span>Sửa</span>
      </button>

      <button
        class="tb-btn danger"
        :disabled="!hasPolygon"
        @click="$emit('delete')"
        title="Xóa polygon"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
        <span>Xóa</span>
      </button>

      <button
        class="tb-btn"
        :disabled="!canUndo"
        @click="$emit('undo')"
        title="Hoàn tác"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M3 7v6h6M3 13a9 9 0 016.8-6.8A9 9 0 0121 12a9 9 0 01-9 9 9 9 0 01-6.2-2.5"/>
        </svg>
        <span>Undo</span>
      </button>
    </div>

    <!-- Area display -->
    <div class="area-display" v-if="areaM2 > 0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 3v18"/>
      </svg>
      <span class="area-value">{{ formattedArea }}</span>
    </div>

    <!-- Drawing hint -->
    <div class="draw-hint" v-if="currentMode === 'draw'">
      <span v-if="vertexCount === 0">Click để đặt điểm đầu tiên</span>
      <span v-else-if="vertexCount < 3">Click thêm điểm (tối thiểu 3)</span>
      <span v-else>Double-click hoặc click điểm đầu để hoàn thành</span>
    </div>
    <div class="draw-hint" v-else-if="currentMode === 'edit'">
      Kéo thả các điểm để chỉnh sửa
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  hasPolygon: boolean;
  areaM2: number;
  vertexCount: number;
  canUndo: boolean;
}>();

const emit = defineEmits<{
  (e: 'mode-change', mode: 'draw' | 'edit' | 'none'): void;
  (e: 'delete'): void;
  (e: 'undo'): void;
}>();

const currentMode = ref<'draw' | 'edit' | 'none'>('none');

const toggleMode = (mode: 'draw' | 'edit') => {
  currentMode.value = currentMode.value === mode ? 'none' : mode;
  emit('mode-change', currentMode.value);
};

const formattedArea = computed(() => {
  if (props.areaM2 >= 10000) {
    return `${(props.areaM2 / 10000).toFixed(2)} ha`;
  }
  return `${Math.round(props.areaM2).toLocaleString()} m²`;
});

// Reset mode when polygon is deleted
watch(() => props.hasPolygon, (val) => {
  if (!val && currentMode.value === 'edit') {
    currentMode.value = 'none';
    emit('mode-change', 'none');
  }
});

defineExpose({ resetMode: () => { currentMode.value = 'none'; } });
</script>

<style scoped>
.draw-toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(15, 18, 25, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid #2a3148;
  border-radius: 12px;
  padding: 6px;
}

.tb-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #8892a8;
  font-family: 'Be Vietnam Pro', 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tb-btn:hover:not(:disabled) {
  background: #222840;
  color: #e8ecf4;
}

.tb-btn.active {
  background: #3b82f6;
  color: #fff;
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.3);
}

.tb-btn.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.tb-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.area-display {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(15, 18, 25, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid #2a3148;
  border-radius: 10px;
  padding: 10px 14px;
  color: #22c55e;
  font-size: 13px;
  font-weight: 600;
}

.area-value {
  font-variant-numeric: tabular-nums;
}

.draw-hint {
  background: rgba(59, 130, 246, 0.9);
  backdrop-filter: blur(12px);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  max-width: 200px;
  line-height: 1.4;
}
</style>
