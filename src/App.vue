<script setup lang="ts">
</script>

<template>
  <router-view />
</template>

<style>
/* Reset CSS cơ bản */
html, body {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden; /* Cấm xuất hiện thanh cuộn ngoài cùng để chống giật màn hình (jitter) */
  font-family: 'Inter', sans-serif;
}
</style>