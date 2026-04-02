<template>
  <div class="crop-map-page">
    <!-- Sidebar -->
    <aside class="map-sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
        <el-icon :size="18"><ArrowLeft v-if="!sidebarCollapsed" /><ArrowRight v-else /></el-icon>
      </div>

      <template v-if="!sidebarCollapsed">
        <!-- Header -->
        <div class="sidebar-header">
          <h2 v-if="!selectedZone">🗺️ Bản đồ cây trồng</h2>
          <div v-else class="zone-back">
            <el-button text type="primary" @click="backToOverview">
              <el-icon class="mr-1"><ArrowLeft /></el-icon> Quay lại tổng quan
            </el-button>
          </div>
        </div>

        <!-- Filter -->
        <div v-if="!selectedZone" class="sidebar-filter">
          <el-input v-model="searchKeyword" placeholder="Tìm vùng trồng..." prefix-icon="Search" clearable size="default" />
        </div>

        <!-- Zone List (Overview) -->
        <el-scrollbar v-if="!selectedZone" class="sidebar-list">
          <div v-if="loading" class="sidebar-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>Đang tải...</span>
          </div>
          <div
            v-for="zone in filteredZones"
            :key="zone.id"
            class="zone-card"
            :class="{ hovered: hoveredZoneId === zone.id }"
            @click="selectZone(zone)"
            @mouseenter="hoveredZoneId = zone.id"
            @mouseleave="hoveredZoneId = null"
          >
            <div class="zone-name">{{ zone.name }}</div>
            <div class="zone-meta">
              <span v-if="zone.plantType">🌱 {{ zone.plantType }}</span>
              <span v-if="zone.province">📍 {{ [zone.ward, zone.province].filter(Boolean).join(', ') }}</span>
            </div>
            <div class="zone-stats">
              <div class="stat">
                <span class="stat-value">{{ zone.areaM2 ? (zone.areaM2 / 10000).toFixed(2) : '—' }}</span>
                <span class="stat-label">ha</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ zone.treeCount }}</span>
                <span class="stat-label">cây</span>
              </div>
              <div class="stat">
                <el-tag :type="zone.status === 'ACTIVE' ? 'success' : 'info'" size="small">{{ zone.status }}</el-tag>
              </div>
            </div>
          </div>
          <div v-if="!loading && filteredZones.length === 0" class="sidebar-empty">
            Không tìm thấy vùng trồng nào.
          </div>
        </el-scrollbar>

        <!-- Zone Detail + Tree List (Drill-down) -->
        <template v-if="selectedZone">
          <div class="zone-detail-card">
            <h3>{{ selectedZone.name }}</h3>
            <div class="detail-rows">
              <div v-if="selectedZone.code" class="detail-row">🔢 Mã: <b>{{ selectedZone.code }}</b></div>
              <div v-if="selectedZone.plantType" class="detail-row">🌱 Loại cây: <b>{{ selectedZone.plantType }}</b></div>
              <div v-if="selectedZone.areaM2" class="detail-row">📐 Diện tích: <b>{{ selectedZone.areaM2?.toLocaleString() }} m²</b></div>
              <div class="detail-row">🌳 Số cây: <b>{{ selectedZone.treeCount }}</b></div>
              <div v-if="selectedZone.managerName" class="detail-row">👤 Quản lý: <b>{{ selectedZone.managerName }}</b></div>
              <div v-if="selectedZone.province" class="detail-row">📍 {{ [selectedZone.ward, selectedZone.province].filter(Boolean).join(', ') }}</div>
            </div>
          </div>

          <div class="tree-list-header">
            <span>Danh sách cây ({{ trees.length }})</span>
          </div>
          <el-scrollbar class="sidebar-list">
            <div v-if="treesLoading" class="sidebar-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>Đang tải cây...</span>
            </div>
            <div
              v-for="tree in trees"
              :key="tree.id"
              class="tree-card"
              @click="focusTree(tree)"
            >
              <div class="tree-name">{{ tree.assetName }}</div>
              <div class="tree-meta">
                <el-tag :type="treeStatusType(tree.status)" size="small" effect="plain">{{ treeStatusLabel(tree.status) }}</el-tag>
                <span v-if="tree.assetType?.name" class="tree-type">{{ tree.assetType.name }}</span>
              </div>
              <div v-if="tree.plantedAt" class="tree-planted">
                🗓️ Trồng: {{ formatDate(tree.plantedAt) }}
              </div>
            </div>
            <div v-if="!treesLoading && trees.length === 0" class="sidebar-empty">
              Vùng trồng chưa có cây nào.
            </div>
          </el-scrollbar>
        </template>
      </template>
    </aside>

    <!-- Map Area -->
    <main class="map-main">
      <div ref="mapContainer" class="map-container"></div>
      <div v-if="mapLoading" class="map-overlay-loading">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <span>Đang tải bản đồ...</span>
      </div>
      <!-- Legend -->
      <div class="map-legend">
        <template v-if="!selectedZone">
          <span class="legend-item"><span class="legend-polygon"></span> Vùng trồng</span>
          <span class="legend-item"><span class="legend-point"></span> Tâm vùng</span>
        </template>
        <template v-else>
          <span class="legend-item"><span class="legend-polygon"></span> Vùng trồng</span>
          <span class="legend-item"><span class="leg-tree leg-healthy"></span> Khỏe mạnh</span>
          <span class="legend-item"><span class="leg-tree leg-pending"></span> Chờ trồng</span>
          <span class="legend-item"><span class="leg-tree leg-dead"></span> Đã chết</span>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { ArrowLeft, ArrowRight, Loading } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { assetApi } from '../api/asset.api';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import dayjs from 'dayjs';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// State
const mapContainer = ref<HTMLElement | null>(null);
const mapLoading = ref(true);
const loading = ref(false);
const treesLoading = ref(false);
const sidebarCollapsed = ref(false);
const searchKeyword = ref('');
const hoveredZoneId = ref<string | null>(null);

const zones = ref<any[]>([]);
const trees = ref<any[]>([]);
const selectedZone = ref<any>(null);

let map: mapboxgl.Map | null = null;
let treeMarkers: mapboxgl.Marker[] = [];

// Computed
const filteredZones = computed(() => {
  if (!searchKeyword.value) return zones.value;
  const kw = searchKeyword.value.toLowerCase();
  return zones.value.filter(z =>
    z.name?.toLowerCase().includes(kw) ||
    z.code?.toLowerCase().includes(kw) ||
    z.plantType?.toLowerCase().includes(kw)
  );
});

// Helpers
const formatDate = (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '';

const treeStatusType = (s: string) => {
  const map: Record<string, string> = { PLANTED: 'success', GROWING: 'success', PENDING: 'warning', DEAD: 'danger', HARVESTED: 'info' };
  return (map[s] || 'info') as any;
};
const treeStatusLabel = (s: string) => {
  const map: Record<string, string> = { PLANTED: 'Đã trồng', GROWING: 'Đang lớn', PENDING: 'Chờ trồng', DEAD: 'Đã chết', HARVESTED: 'Thu hoạch' };
  return map[s] || s;
};

const treeColor = (status: string) => {
  const colors: Record<string, string> = { PLANTED: '#00875A', GROWING: '#00875A', PENDING: '#f59e0b', DEAD: '#ef4444', HARVESTED: '#6b7280' };
  return colors[status] || '#00875A';
};

// Data loading
const loadZones = async () => {
  loading.value = true;
  try {
    const { data } = await assetApi.getMapOverview();
    zones.value = data || [];
  } catch (err) {
    ElMessage.error('Không thể tải dữ liệu bản đồ');
  } finally {
    loading.value = false;
  }
};

const loadTrees = async (locationId: string) => {
  treesLoading.value = true;
  try {
    const { data } = await assetApi.getTreesByLocation(locationId);
    trees.value = data || [];
  } catch (err) {
    ElMessage.error('Không thể tải danh sách cây');
  } finally {
    treesLoading.value = false;
  }
};

// Map initialization
const initMap = () => {
  if (!mapContainer.value || !MAPBOX_TOKEN) {
    mapLoading.value = false;
    return;
  }
  mapboxgl.accessToken = MAPBOX_TOKEN;
  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    center: [108.2772, 14.0583],
    zoom: 5,
  });
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

  map.on('load', () => {
    mapLoading.value = false;
    renderOverview();
  });
};

// Render: Overview (zones)
const renderOverview = () => {
  if (!map || !map.isStyleLoaded()) return;
  clearMapLayers();
  clearTreeMarkers();

  const polygonFeatures: any[] = [];
  const pointFeatures: any[] = [];
  const bounds = new mapboxgl.LngLatBounds();
  let hasData = false;

  zones.value.forEach(zone => {
    const boundary = zone.boundary;
    const coord = zone.coordinate;

    if (boundary && boundary.type === 'Polygon') {
      polygonFeatures.push({
        type: 'Feature',
        geometry: boundary,
        properties: { id: zone.id, name: zone.name, areaM2: zone.areaM2, treeCount: zone.treeCount, plantType: zone.plantType },
      });
      boundary.coordinates[0].forEach((c: number[]) => bounds.extend([c[0], c[1]]));
      hasData = true;
    }

    if (coord && coord.type === 'Point') {
      pointFeatures.push({
        type: 'Feature',
        geometry: coord,
        properties: { id: zone.id, name: zone.name, areaM2: zone.areaM2, treeCount: zone.treeCount },
      });
      bounds.extend(coord.coordinates as [number, number]);
      hasData = true;
    }
  });

  // Polygon fill
  if (polygonFeatures.length) {
    map!.addSource('zones-src', { type: 'geojson', data: { type: 'FeatureCollection', features: polygonFeatures } });
    map!.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones-src', paint: { 'fill-color': '#00875A', 'fill-opacity': 0.25 } });
    map!.addLayer({ id: 'zones-outline', type: 'line', source: 'zones-src', paint: { 'line-color': '#00684A', 'line-width': 2.5 } });

    // Labels on polygons
    map!.addLayer({
      id: 'zones-label',
      type: 'symbol',
      source: 'zones-src',
      layout: {
        'text-field': ['concat', ['get', 'name'], '\n', ['to-string', ['get', 'treeCount']], ' cây'],
        'text-size': 12,
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-anchor': 'center',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#fff',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1.5,
      },
    });

    // Click polygon
    map!.on('click', 'zones-fill', (e) => {
      if (!e.features?.length) return;
      const id = e.features[0].properties?.id;
      const zone = zones.value.find(z => z.id === id);
      if (zone) selectZone(zone);
    });
    map!.on('mouseenter', 'zones-fill', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
    map!.on('mouseleave', 'zones-fill', () => { if (map) map.getCanvas().style.cursor = ''; });
  }

  // Point markers
  if (pointFeatures.length) {
    map!.addSource('zone-points-src', { type: 'geojson', data: { type: 'FeatureCollection', features: pointFeatures } });
    map!.addLayer({
      id: 'zone-points', type: 'circle', source: 'zone-points-src',
      paint: { 'circle-radius': 8, 'circle-color': '#00875A', 'circle-stroke-width': 2.5, 'circle-stroke-color': '#fff' },
    });

    map!.on('click', 'zone-points', (e) => {
      if (!e.features?.length) return;
      const id = e.features[0].properties?.id;
      const zone = zones.value.find(z => z.id === id);
      if (zone) selectZone(zone);
    });
    map!.on('mouseenter', 'zone-points', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
    map!.on('mouseleave', 'zone-points', () => { if (map) map.getCanvas().style.cursor = ''; });
  }

  if (hasData) map!.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1000 });
};

// Render: Drill-down (trees)
const renderDrilldown = () => {
  if (!map || !selectedZone.value) return;
  clearMapLayers();
  clearTreeMarkers();

  const zone = selectedZone.value;
  const bounds = new mapboxgl.LngLatBounds();

  // Re-render selected zone polygon
  if (zone.boundary && zone.boundary.type === 'Polygon') {
    map!.addSource('selected-zone-src', {
      type: 'geojson',
      data: { type: 'Feature', geometry: zone.boundary, properties: {} } as any,
    });
    map!.addLayer({ id: 'selected-zone-fill', type: 'fill', source: 'selected-zone-src', paint: { 'fill-color': '#00875A', 'fill-opacity': 0.15 } });
    map!.addLayer({ id: 'selected-zone-outline', type: 'line', source: 'selected-zone-src', paint: { 'line-color': '#00684A', 'line-width': 3, 'line-dasharray': [2, 1] } });

    zone.boundary.coordinates[0].forEach((c: number[]) => bounds.extend([c[0], c[1]]));
  }

  // Add tree markers
  trees.value.forEach(tree => {
    if (!tree.locationLat || !tree.locationLong) return;
    const color = treeColor(tree.status);

    const el = document.createElement('div');
    el.className = 'tree-marker';
    el.style.width = '14px';
    el.style.height = '14px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = color;
    el.style.border = '2.5px solid #fff';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    el.style.cursor = 'pointer';
    el.style.transition = 'transform 0.15s';
    el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.4)'; });
    el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([Number(tree.locationLong), Number(tree.locationLat)])
      .setPopup(
        new mapboxgl.Popup({ maxWidth: '280px', closeButton: true, offset: 12 })
          .setHTML(buildTreePopup(tree))
      )
      .addTo(map!);

    treeMarkers.push(marker);
    bounds.extend([Number(tree.locationLong), Number(tree.locationLat)]);
  });

  if (!bounds.isEmpty()) {
    map!.fitBounds(bounds, { padding: 80, maxZoom: 18, duration: 800 });
  }
};

const buildTreePopup = (tree: any): string => {
  const lines: string[] = [];
  lines.push(`<div class="mapbox-popup-content">`);
  lines.push(`<div class="popup-title">🌳 ${tree.assetName}</div>`);
  if (tree.qrCode) lines.push(`<div class="popup-row">🔢 <b>Mã QR:</b> ${tree.qrCode}</div>`);
  if (tree.assetType?.name) lines.push(`<div class="popup-row">🏷️ <b>Loại:</b> ${tree.assetType.name}</div>`);
  lines.push(`<div class="popup-row">📊 <b>Trạng thái:</b> ${treeStatusLabel(tree.status)}</div>`);
  if (tree.plantedAt) lines.push(`<div class="popup-row">🗓️ <b>Ngày trồng:</b> ${formatDate(tree.plantedAt)}</div>`);
  lines.push(`</div>`);
  return lines.join('');
};

// Actions
const selectZone = async (zone: any) => {
  selectedZone.value = zone;
  await loadTrees(zone.id);
  await nextTick();
  renderDrilldown();
};

const backToOverview = () => {
  selectedZone.value = null;
  trees.value = [];
  nextTick(() => renderOverview());
};

const focusTree = (tree: any) => {
  if (!map || !tree.locationLat || !tree.locationLong) return;
  map.flyTo({ center: [Number(tree.locationLong), Number(tree.locationLat)], zoom: 19, duration: 600 });

  // Open popup
  const marker = treeMarkers.find(m => {
    const lngLat = m.getLngLat();
    return Math.abs(lngLat.lng - Number(tree.locationLong)) < 0.00001 && Math.abs(lngLat.lat - Number(tree.locationLat)) < 0.00001;
  });
  if (marker) marker.togglePopup();
};

// Cleanup
const clearMapLayers = () => {
  if (!map) return;
  ['zones-fill', 'zones-outline', 'zones-label', 'zone-points', 'selected-zone-fill', 'selected-zone-outline'].forEach(id => {
    if (map!.getLayer(id)) map!.removeLayer(id);
  });
  ['zones-src', 'zone-points-src', 'selected-zone-src'].forEach(id => {
    if (map!.getSource(id)) map!.removeSource(id);
  });
};

const clearTreeMarkers = () => {
  treeMarkers.forEach(m => m.remove());
  treeMarkers = [];
};

// Lifecycle
onMounted(async () => {
  await loadZones();
  nextTick(() => initMap());
});

onUnmounted(() => {
  clearTreeMarkers();
  if (map) { map.remove(); map = null; }
});

// Watch hovered zone to highlight polygon
watch(hoveredZoneId, (id) => {
  if (!map || !map.getLayer('zones-fill')) return;
  if (id) {
    map.setPaintProperty('zones-fill', 'fill-opacity', ['case', ['==', ['get', 'id'], id], 0.45, 0.25]);
  } else {
    map.setPaintProperty('zones-fill', 'fill-opacity', 0.25);
  }
});
</script>

<style scoped>
.crop-map-page {
  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;
}

/* === SIDEBAR === */
.map-sidebar {
  width: 360px;
  min-width: 360px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: width 0.3s, min-width 0.3s;
  z-index: 10;
}
.map-sidebar.collapsed {
  width: 0;
  min-width: 0;
  overflow: hidden;
  border-right: none;
}
.sidebar-toggle {
  position: absolute;
  right: -32px;
  top: 12px;
  width: 32px;
  height: 32px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-left: none;
  border-radius: 0 8px 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  box-shadow: 2px 0 8px rgba(0,0,0,0.06);
  transition: background 0.2s;
}
.sidebar-toggle:hover { background: #f3f4f6; }

.sidebar-header {
  padding: 16px 16px 8px;
  flex-shrink: 0;
}
.sidebar-header h2 {
  font-size: 18px;
  font-weight: 700;
  color: #111;
  margin: 0;
}

.sidebar-filter { padding: 0 16px 12px; }

.sidebar-list {
  flex: 1;
  min-height: 0;
}

.sidebar-loading, .sidebar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: #9ca3af;
  font-size: 14px;
}

/* Zone Cards */
.zone-card {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.15s;
}
.zone-card:hover, .zone-card.hovered { background: #f0fdf4; }
.zone-name { font-weight: 600; font-size: 14px; color: #111; }
.zone-meta { font-size: 12px; color: #6b7280; margin-top: 4px; display: flex; gap: 12px; }
.zone-stats {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  align-items: center;
}
.stat { display: flex; align-items: baseline; gap: 4px; }
.stat-value { font-weight: 700; font-size: 16px; color: var(--tid-success); }
.stat-label { font-size: 11px; color: #9ca3af; }

/* Zone Detail */
.zone-detail-card {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f0fdf4;
}
.zone-detail-card h3 { margin: 0 0 10px; font-size: 16px; font-weight: 700; color: #111; }
.detail-rows { display: flex; flex-direction: column; gap: 4px; }
.detail-row { font-size: 13px; color: #374151; }

.tree-list-header {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}

/* Tree Cards */
.tree-card {
  padding: 10px 16px;
  border-bottom: 1px solid #f9fafb;
  cursor: pointer;
  transition: background 0.15s;
}
.tree-card:hover { background: #fefce8; }
.tree-name { font-weight: 600; font-size: 13px; color: #111; }
.tree-meta { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
.tree-type { font-size: 11px; color: #6b7280; }
.tree-planted { font-size: 11px; color: #9ca3af; margin-top: 3px; }

.zone-back { margin-bottom: 4px; }

/* === MAP === */
.map-main {
  flex: 1;
  position: relative;
  min-width: 0;
}
.map-container {
  width: 100%;
  height: 100%;
}
.map-overlay-loading {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 14px;
  z-index: 10;
}

.map-legend {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0,0,0,0.65);
  padding: 6px 14px;
  border-radius: 8px;
  display: flex;
  gap: 14px;
  z-index: 10;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  font-size: 11px;
}
.legend-polygon {
  width: 14px; height: 10px;
  background: rgba(0,135,90,0.4);
  border: 2px solid #00684A;
  border-radius: 2px;
}
.legend-point {
  width: 10px; height: 10px;
  background: var(--tid-success);
  border: 2px solid #fff;
  border-radius: 50%;
}
.leg-tree {
  width: 10px; height: 10px;
  border-radius: 50%;
  border: 2px solid #fff;
}
.leg-healthy { background: var(--tid-success); }
.leg-pending { background: #f59e0b; }
.leg-dead { background: #ef4444; }
</style>

<style>
/* Mapbox popup global styles */
.mapbox-popup-content {
  padding: 4px 0;
}
.mapbox-popup-content .popup-title {
  font-size: 15px;
  font-weight: 700;
  color: #111;
  margin-bottom: 6px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 6px;
}
.mapbox-popup-content .popup-row {
  font-size: 12px;
  color: #374151;
  line-height: 1.6;
}
.mapboxgl-popup-content {
  border-radius: 10px !important;
  padding: 14px !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.25) !important;
}
</style>
