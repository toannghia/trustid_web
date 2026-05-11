<template>
  <el-drawer v-model="drawerVisible" size="100%" :with-header="false" :close-on-press-escape="true" :destroy-on-close="true" class="map3d-drawer" @opened="onDrawerOpened" @closed="onDrawerClosed">
    <div class="drawer-layout">
      <!-- Header -->
      <div class="drawer-header">
        <div class="header-left">
          <div class="logo"><i>T</i>TrustID</div>
          <div class="bc">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M9 18l6-6-6-6"/></svg>
            <span>{{ headerTitle }}</span>
          </div>
        </div>
        <div class="header-right">
          <div class="tog">
            <button :class="{ on: !is3D }" @click="toggle2D">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>2D
            </button>
            <button :class="{ on: is3D }" @click="toggle3D">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>3D Terrain
            </button>
          </div>
          <button class="close-btn" @click="drawerVisible = false">✕</button>
        </div>
      </div>

      <!-- Body -->
      <div class="drawer-body">
        <div class="map-area">
          <div ref="mapContainer" class="map-container"></div>

          <!-- Mode indicator -->
          <div :class="['mode-indicator', mode === 'draw' ? 'mode-indicator-bottom' : '']"
          >
            <div :class="['dot', is3D ? 'd3' : 'd2']"></div>
            <span>{{ is3D ? 'Chế độ 3D — Địa hình thực tế' : 'Chế độ 2D — Hình chiếu phẳng' }}</span>
          </div>

          <!-- Draw toolbar -->
          <MapDrawToolbar v-if="mode === 'draw'" ref="toolbarRef" :visible="true" :has-polygon="drawState.hasPolygon" :area-m2="drawState.areaM2" :vertex-count="drawState.vertices.length" :can-undo="undoStack.length > 0" @mode-change="onDrawModeChange" @delete="onDeletePolygon" @undo="drawComposable.undo()" />

          <!-- Terrain controls -->
          <div class="terrain-ctrl" v-if="is3D">
            <div class="ctrl-label">Phóng đại địa hình</div>
            <div class="ctrl-row">
              <span>1×</span>
              <input type="range" v-model.number="exaggeration" min="0.5" max="3" step="0.1" @input="updateExaggeration">
              <span class="ctrl-val">{{ exaggeration.toFixed(1) }}×</span>
            </div>
          </div>

          <!-- Coord display -->
          <div class="coord-display" v-if="is3D">{{ coordText }}</div>

          <!-- Save bar (draw mode) -->
          <div class="save-bar" v-if="mode === 'draw' && drawState.hasPolygon">
            <el-button type="primary" size="large" @click="saveBoundary">
              <el-icon class="mr-1"><Check /></el-icon> Lưu ranh giới
            </el-button>
            <el-button size="large" @click="drawComposable.deletePolygon()">Hủy bỏ</el-button>
          </div>
        </div>

        <!-- Sidebar -->
        <MapInfoSidebar :location="location" :locations="locations" :current-area2-d="drawState.areaM2 || existingArea" :mode="mode" :is3-d="is3D" :terrain-info="terrainInfo" />
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount, shallowRef } from 'vue';
import { Check } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type { Location } from '../api/farmApi';
import { useMapDraw } from '../composables/useMapDraw';
import MapDrawToolbar from './MapDrawToolbar.vue';
import MapInfoSidebar from './MapInfoSidebar.vue';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  location?: Location | null;
  locations?: Location[];
  mode?: 'view' | 'draw' | 'eudr';
}>(), { mode: 'view' });

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'boundary-drawn', data: { coordinates: number[][][]; areaM2: number }): void;
}>();

const drawerVisible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const mapContainer = ref<HTMLElement | null>(null);
const mapRef = shallowRef<maplibregl.Map | null>(null);
const toolbarRef = ref<any>(null);
const is3D = ref(false);
const exaggeration = ref(1.5);
const coordText = ref('');

const drawComposable = useMapDraw(mapRef);
const { state: drawState, undoStack } = drawComposable;

const terrainInfo = ref<any>(null);

const headerTitle = computed(() => {
  if (props.location) return `${props.location.code || ''} — ${props.location.name || 'Vùng trồng'}`;
  return 'Tổng quan vùng trồng';
});

const existingArea = computed(() => {
  if (props.location?.areaM2) return props.location.areaM2;
  if (props.locations) return props.locations.reduce((s, l) => s + (l.areaM2 || 0), 0);
  return 0;
});

const CTR: [number, number] = [108.2772, 14.0583];

const getCenter = (): [number, number] => {
  if (props.location?.coordinate?.coordinates) {
    return [props.location.coordinate.coordinates[0], props.location.coordinate.coordinates[1]];
  }
  if (props.location?.boundary?.coordinates?.[0]?.[0]) {
    const ring = props.location.boundary.coordinates[0];
    const fc = turf.featureCollection(ring.map((c: number[]) => turf.point(c)));
    const center = turf.center(fc);
    return center.geometry.coordinates as [number, number];
  }
  if (props.locations?.length) {
    for (const loc of props.locations) {
      if (loc.coordinate?.coordinates) return [loc.coordinate.coordinates[0], loc.coordinate.coordinates[1]];
      if (loc.boundary?.coordinates?.[0]?.[0]) return loc.boundary.coordinates[0][0];
    }
  }
  return CTR;
};

const initMap = () => {
  if (!mapContainer.value) return;
  const center = getCenter();

  const map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        satellite: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 18, attribution: '© Esri' },
        terrainDEM: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 15 },
        hillshadeSrc: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 15 },
      },
      layers: [
        { id: 'sat', type: 'raster', source: 'satellite' },
        { id: 'hills', type: 'hillshade', source: 'hillshadeSrc', paint: { 'hillshade-exaggeration': 0.5, 'hillshade-shadow-color': '#000', 'hillshade-illumination-direction': 315 } },
      ],
    },
    center,
    zoom: 13,
    pitch: 0,
    bearing: 0,
    maxPitch: 80,
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  mapRef.value = map;

  map.on('load', () => {
    drawComposable.initDrawSources();
    loadExistingData();
  });

  map.on('mousemove', (e) => {
    coordText.value = `${e.lngLat.lat.toFixed(5)}°N  ${e.lngLat.lng.toFixed(5)}°E`;
    drawComposable.handleDrawMouseMove(e);
  });

  map.on('click', (e) => {
    if (drawState.value.isDrawing) {
      drawComposable.handleDrawClick(e);
    }
  });

  map.on('dblclick', (e) => {
    if (drawState.value.isDrawing) {
      drawComposable.handleDrawDblClick(e);
    }
  });

  map.on('mousedown', (e) => {
    if (drawState.value.isEditing) {
      drawComposable.handleEditMouseDown(e);
    }
  });

  map.on('mouseup', () => {
    if (drawState.value.isEditing) {
      drawComposable.handleEditMouseUp();
    }
  });
};

const loadExistingData = () => {
  const map = mapRef.value;
  if (!map) return;

  // Single location mode
  if (props.location) {
    const bnd = (props.location.approvalStatus === 'PENDING' && props.location.pendingBoundary)
      ? props.location.pendingBoundary : props.location.boundary;

    if (bnd?.coordinates) {
      if (props.mode === 'draw') {
        drawComposable.setExistingPolygon(bnd.coordinates);
      } else {
        // View/EUDR mode - display as static polygon
        map.addSource('static-poly', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: bnd.coordinates }, properties: {} } });
        map.addLayer({ id: 'static-fill', type: 'fill', source: 'static-poly', paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.25 } });
        map.addLayer({ id: 'static-line', type: 'line', source: 'static-poly', paint: { 'line-color': '#22c55e', 'line-width': 3 } });
      }
      // Fit bounds
      const bounds = new maplibregl.LngLatBounds();
      bnd.coordinates[0].forEach((c: number[]) => bounds.extend([c[0], c[1]]));
      map.fitBounds(bounds, { padding: 80, duration: 1000 });
    }

    // Marker
    const center = getCenter();
    const mkEl = document.createElement('div');
    mkEl.innerHTML = `<svg width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="#3b82f6" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="6" fill="#fff"/></svg>`;
    mkEl.style.cursor = 'pointer';
    new maplibregl.Marker({ element: mkEl, anchor: 'bottom' }).setLngLat(center).addTo(map);
  }

  // Multi-location mode
  if (props.locations?.length) {
    const bounds = new maplibregl.LngLatBounds();
    const features: any[] = [];
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    props.locations.forEach((loc, i) => {
      const bnd = (loc.approvalStatus === 'PENDING' && loc.pendingBoundary) ? loc.pendingBoundary : loc.boundary;
      if (bnd?.coordinates) {
        features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: bnd.coordinates }, properties: { name: loc.name, farmer: loc.farmer?.fullName || '—', areaM2: loc.areaM2, colorIdx: i % colors.length } });
        bnd.coordinates[0].forEach((c: number[]) => bounds.extend([c[0], c[1]]));
      } else if (loc.coordinate?.coordinates) {
        bounds.extend([loc.coordinate.coordinates[0], loc.coordinate.coordinates[1]]);
      }
    });

    if (features.length) {
      map.addSource('multi-poly', { type: 'geojson', data: { type: 'FeatureCollection', features } });
      map.addLayer({ id: 'multi-fill', type: 'fill', source: 'multi-poly', paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.2 } });
      map.addLayer({ id: 'multi-line', type: 'line', source: 'multi-poly', paint: { 'line-color': '#22c55e', 'line-width': 2.5 } });
      map.addLayer({ id: 'multi-dash', type: 'line', source: 'multi-poly', paint: { 'line-color': '#fff', 'line-width': 1, 'line-opacity': 0.3, 'line-dasharray': [4, 4] } });

      // Popups on click
      map.on('click', 'multi-fill', (e) => {
        if (!e.features?.length) return;
        const p = e.features[0].properties as any;
        new maplibregl.Popup({ maxWidth: '280px' })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-family:sans-serif"><b>${p.name}</b><br/>Nông hộ: ${p.farmer}<br/>Diện tích: ${p.areaM2 ? Number(p.areaM2).toLocaleString() : 0} m²</div>`)
          .addTo(map);
      });
      map.on('mouseenter', 'multi-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'multi-fill', () => { map.getCanvas().style.cursor = ''; });
    }

    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60, duration: 1000 });
  }

  // Estimate terrain info (simplified)
  setTimeout(() => computeTerrainInfo(), 2000);
};

const computeTerrainInfo = () => {
  const map = mapRef.value;
  if (!map || !is3D.value) {
    terrainInfo.value = null;
    return;
  }

  // Generate a simulated profile based on region (real elevation query requires terrain loaded)
  const center = getCenter();
  const baseElev = Math.max(100, Math.abs(center[1] - 10) * 80);
  const range = 200 + Math.random() * 400;
  const minE = Math.round(baseElev);
  const maxE = Math.round(baseElev + range);
  const profile: number[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    profile.push(minE + range * (0.3 * Math.sin(t * Math.PI) + 0.4 * t + 0.3 * Math.sin(t * 3) * (1 - t)));
  }

  const slopes: number[] = [];
  for (let i = 1; i < profile.length; i++) {
    slopes.push(Math.abs(Math.atan2(profile[i] - profile[i - 1], 50) * 180 / Math.PI));
  }

  terrainInfo.value = {
    minElevation: minE,
    maxElevation: maxE,
    elevationDiff: maxE - minE,
    avgSlope: +(slopes.reduce((a, b) => a + b, 0) / slopes.length).toFixed(1),
    maxSlope: +Math.max(...slopes).toFixed(1),
    elevationProfile: profile,
  };
};

const toggle2D = () => {
  is3D.value = false;
  const map = mapRef.value;
  if (!map) return;
  map.setTerrain(null);
  map.easeTo({ pitch: 0, bearing: 0, duration: 1200 });
  terrainInfo.value = null;
};

const toggle3D = () => {
  is3D.value = true;
  const map = mapRef.value;
  if (!map) return;
  map.setTerrain({ source: 'terrainDEM', exaggeration: exaggeration.value });
  const center = getCenter();
  map.easeTo({ pitch: 60, bearing: -30, zoom: Math.max(map.getZoom(), 13), center: [center[0] + 0.005, center[1] - 0.008], duration: 1500 });
  setTimeout(() => computeTerrainInfo(), 1500);
};

const updateExaggeration = () => {
  if (is3D.value && mapRef.value) {
    mapRef.value.setTerrain({ source: 'terrainDEM', exaggeration: exaggeration.value });
  }
};

const onDrawModeChange = (mode: 'draw' | 'edit' | 'none') => {
  if (mode === 'draw') {
    drawComposable.startDrawing();
  } else if (mode === 'edit') {
    drawComposable.startEditing();
  } else {
    drawComposable.stopEditing();
    if (mapRef.value) mapRef.value.getCanvas().style.cursor = '';
  }
};

const onDeletePolygon = async () => {
  try {
    await ElMessageBox.confirm('Xóa polygon đã vẽ?', 'Xác nhận', { confirmButtonText: 'Xóa', cancelButtonText: 'Hủy', type: 'warning' });
    drawComposable.deletePolygon();
    toolbarRef.value?.resetMode();
  } catch { /* cancelled */ }
};

const saveBoundary = () => {
  const result = drawComposable.getGeoJSON();
  if (!result) return;
  emit('boundary-drawn', result);
  drawerVisible.value = false;
};

const onDrawerOpened = async () => {
  await nextTick();
  setTimeout(() => initMap(), 100);
};

const onDrawerClosed = () => {
  drawComposable.cleanup();
  if (mapRef.value) { mapRef.value.remove(); mapRef.value = null; }
  is3D.value = false;
  terrainInfo.value = null;
};

onBeforeUnmount(() => {
  if (mapRef.value) { mapRef.value.remove(); mapRef.value = null; }
});
</script>

<style scoped>
.drawer-layout { display:flex; flex-direction:column; height:100vh; background:#0f1219; color:#e8ecf4; font-family:'Be Vietnam Pro','Inter',system-ui,sans-serif; }

.drawer-header { display:flex; align-items:center; justify-content:space-between; padding:12px 24px; background:#1a1f2e; border-bottom:1px solid #2a3148; flex-shrink:0; }
.header-left { display:flex; align-items:center; gap:16px; }
.header-right { display:flex; align-items:center; gap:16px; }
.logo { display:flex; align-items:center; gap:8px; font-weight:700; font-size:18px; }
.logo i { width:32px; height:32px; background:linear-gradient(135deg,#3b82f6,#8b5cf6); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:#fff; font-style:normal; }
.bc { display:flex; align-items:center; gap:8px; font-size:13px; color:#8892a8; }
.bc span { color:#e8ecf4; font-weight:500; }

.tog { display:flex; background:#0f1219; border-radius:10px; padding:3px; gap:2px; }
.tog button { padding:8px 18px; border:none; border-radius:8px; font-family:inherit; font-size:13px; font-weight:500; cursor:pointer; color:#8892a8; background:0; display:flex; align-items:center; gap:6px; transition:.3s; }
.tog button.on { background:#3b82f6; color:#fff; box-shadow:0 2px 12px rgba(59,130,246,.25); }
.tog button:hover:not(.on) { color:#e8ecf4; background:#222840; }

.close-btn { width:36px; height:36px; border:1px solid #2a3148; border-radius:8px; background:#0f1219; color:#8892a8; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.2s; }
.close-btn:hover { color:#e8ecf4; border-color:#3b82f6; }

.drawer-body { display:flex; flex:1; overflow:hidden; }
.map-area { flex:1; position:relative; }
.map-container { width:100%; height:100%; }

.mode-indicator { position:absolute; top:16px; left:16px; z-index:4; background:rgba(15,18,25,.88); backdrop-filter:blur(12px); border:1px solid #2a3148; border-radius:10px; padding:10px 16px; display:flex; align-items:center; gap:8px; font-size:12px; font-weight:500; pointer-events:none; transition:all .3s; }
.mode-indicator-bottom { top:auto; bottom:16px; left:auto; right:16px; }

.dot { width:8px; height:8px; border-radius:50%; }
.dot.d2 { background:#3b82f6; }
.dot.d3 { background:#22c55e; animation:pls 2s infinite; }
@keyframes pls { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.4)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0)} }

.terrain-ctrl { position:absolute; bottom:80px; left:24px; z-index:5; background:rgba(15,18,25,.92); backdrop-filter:blur(12px); border:1px solid #2a3148; border-radius:12px; padding:14px 18px; }
.ctrl-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:#8892a8; margin-bottom:8px; }
.ctrl-row { display:flex; align-items:center; gap:10px; }
.ctrl-row span { font-size:11px; color:#8892a8; }
.ctrl-row input { width:140px; accent-color:#3b82f6; }
.ctrl-val { font-size:14px; font-weight:700; color:#3b82f6; min-width:36px; text-align:center; }

.coord-display { position:absolute; bottom:24px; left:24px; z-index:5; background:rgba(15,18,25,.92); backdrop-filter:blur(12px); border:1px solid #2a3148; border-radius:10px; padding:10px 14px; font-size:11px; color:#8892a8; pointer-events:none; }

.save-bar { position:absolute; bottom:24px; right:394px; z-index:5; display:flex; gap:12px; background:rgba(15,18,25,.92); backdrop-filter:blur(12px); border:1px solid #2a3148; border-radius:12px; padding:12px 16px; }
</style>

<style>
/* Global overrides for drawer */
.map3d-drawer .el-drawer__body { padding:0!important; overflow:hidden; }
.maplibregl-ctrl-attrib { font-size:10px!important; background:rgba(0,0,0,.6)!important; color:#aaa!important; }
.maplibregl-ctrl-attrib a { color:#8af!important; }
.maplibregl-popup-content { border-radius:10px!important; padding:12px!important; box-shadow:0 4px 20px rgba(0,0,0,.3)!important; }
</style>
