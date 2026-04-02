<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
</script>

<template>
  <router-view v-slot="{ Component }">
    <component :is="Component" :key="route.fullPath" />
  </router-view>
</template>

<style>
/* Reset CSS cơ bản */
body {
  margin: 0;
  font-family: 'Inter', sans-serif;
}
</style>