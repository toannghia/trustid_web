<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue';

defineProps<{
  title: string;
  breadcrumbs?: Array<{ title: string; path?: string }>;
}>();
</script>

<template>
  <div class="content-header mb-4 flex justify-between items-center">
    <div class="container-fluid w-full">
      <div class="flex justify-between items-center">
        <div class="col-sm-6">
          <h1 class="m-0 text-2xl font-normal text-gray-800">{{ title }}</h1>
        </div>
        <div class="col-sm-6">
          <el-breadcrumb :separator-icon="ArrowRight" class="float-sm-right">
            <el-breadcrumb-item :to="{ path: '/' }">Home</el-breadcrumb-item>
            <el-breadcrumb-item 
              v-for="(item, index) in breadcrumbs" 
              :key="index"
              :to="item.path ? { path: item.path } : undefined"
            >
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.el-breadcrumb__inner) {
  font-weight: 400;
  color: #6c757d;
}
:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #6c757d; /* Active item color in AdminLTE */
}
</style>
