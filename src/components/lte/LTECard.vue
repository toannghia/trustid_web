<script setup lang="ts">
defineProps<{
  title?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  outline?: boolean;
}>();
</script>

<template>
  <div 
    class="bg-white rounded-lg shadow-sm mb-4 border border-gray-200 relative"
    :class="[
      variant ? `border-t-3 border-t-${variant}` : '',
      outline ? '' : ''
    ]"
  >
    <!-- Card Header -->
    <div v-if="title || $slots.header" class="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
      <h3 class="card-title text-lg font-medium text-gray-800 m-0">
        <slot name="header">{{ title }}</slot>
      </h3>
      <div class="card-tools flex gap-2">
        <slot name="tools"></slot>
      </div>
    </div>

    <!-- Card Body -->
    <div class="p-4">
      <slot></slot>
    </div>

    <!-- Card Footer -->
    <div v-if="$slots.footer" class="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-100">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style scoped>
.card-title {
  font-size: 1.1rem;
  font-weight: 500;
}
</style>
