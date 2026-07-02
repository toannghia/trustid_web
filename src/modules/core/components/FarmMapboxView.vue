<template>
  <div class="farm-mapbox-container">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="loading" class="map-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>Đang tải bản đồ...</span>
    </div>
    <!-- Map Style Switcher -->
    <div v-if="showStyleSwitcher" class="map-style-switcher">
      <el-select
        v-model="currentStyle"
        size="small"
        @change="handleStyleChange"
        class="style-select"
        placeholder="Bản đồ nền"
      >
        <el-option
          v-for="s in mapStyles"
          :key="s.value"
          :label="s.label"
          :value="s.value"
        >
          <span class="flex items-center gap-2">
            <span>{{ s.icon }}</span>
            <span>{{ s.label }}</span>
          </span>
        </el-option>
      </el-select>
    </div>
    <div class="map-legend">
      <span class="legend-item">
        <span class="legend-polygon"></span> Vùng trồng (polygon)
      </span>
      <span class="legend-item">
        <span class="legend-point"></span> Vùng trồng (điểm)
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Loading } from '@element-plus/icons-vue';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapLocation {
  id: string;
  code?: string;
  name: string;
  coordinate: any;
  boundary: any;
  address?: string;
  areaM2?: number;
  plantType?: string;
  managerName?: string;
  province?: string;
  ward?: string;
  status?: string;
  tenantId?: string;
  tenantName?: string;
}

const props = withDefaults(defineProps<{
  locations: MapLocation[];
  scans?: any[];
  height?: string;
  autoFitBounds?: boolean;
  centerCoordinate?: { lat: number; lng: number } | null;
  mapStyle?: string;
  showStyleSwitcher?: boolean;
  selectedProvince?: string;
}>(), {
  autoFitBounds: true,
  centerCoordinate: null,
  mapStyle: 'mapbox://styles/mapbox/satellite-streets-v12',
  showStyleSwitcher: true,
  selectedProvince: ''
});

const mapStyles = [
  { value: 'mapbox://styles/mapbox/satellite-streets-v12', label: 'Vệ tinh', icon: '🛰️' },
  { value: 'mapbox://styles/mapbox/streets-v12', label: 'Đường phố', icon: '🗺️' },
  { value: 'mapbox://styles/mapbox/outdoors-v12', label: 'Địa hình', icon: '⛰️' },
  { value: 'mapbox://styles/mapbox/light-v11', label: 'Nền sáng', icon: '☀️' },
];

const currentStyle = ref(props.mapStyle);

const emit = defineEmits<{
  (e: 'select', location: MapLocation): void;
  (e: 'change-province', province: string): void;
}>();

const mapContainer = ref<HTMLElement | null>(null);
const loading = ref(true);
let map: mapboxgl.Map | null = null;
let popup: mapboxgl.Popup | null = null;
let mapListenersAdded = false;
let provincesGeoJson: any = null;

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const loadProvincesGeoJson = async () => {
  if (provincesGeoJson) return provincesGeoJson;
  try {
    const res = await fetch('/data/vietnam_provinces.geojson');
    provincesGeoJson = await res.json();
    return provincesGeoJson;
  } catch (err) {
    console.error('Failed to load vietnam provinces GeoJSON:', err);
    return null;
  }
};

const getFeatureBounds = (coordinates: any): mapboxgl.LngLatBounds => {
  const bounds = new mapboxgl.LngLatBounds();
  const processCoords = (coords: any) => {
    if (typeof coords[0] === 'number') {
      bounds.extend(coords as [number, number]);
    } else {
      coords.forEach(processCoords);
    }
  };
  processCoords(coordinates);
  return bounds;
};

const extractCoords = (loc: MapLocation): [number, number] | null => {
  try {
    if (loc.coordinate && typeof loc.coordinate === 'object' && loc.coordinate.coordinates) {
      return [loc.coordinate.coordinates[0], loc.coordinate.coordinates[1]];
    }
    if (typeof loc.coordinate === 'string' && loc.coordinate.startsWith('{')) {
      const geo = JSON.parse(loc.coordinate);
      if (geo.coordinates) return [geo.coordinates[0], geo.coordinates[1]];
    }
  } catch (e) { /* ignore */ }
  return null;
};

const extractBoundary = (loc: MapLocation): any | null => {
  try {
    if (loc.boundary && typeof loc.boundary === 'object' && loc.boundary.type === 'Polygon') {
      return loc.boundary;
    }
    if (typeof loc.boundary === 'string' && loc.boundary.startsWith('{')) {
      const geo = JSON.parse(loc.boundary);
      if (geo.type === 'Polygon') return geo;
    }
  } catch (e) { /* ignore */ }
  return null;
};

const buildPopupHTML = (loc: MapLocation): string => {
  const lines: string[] = [];
  lines.push(`<div class="mapbox-popup-content">`);
  lines.push(`<div class="popup-title">${loc.name}</div>`);
  if (loc.tenantName) lines.push(`<div class="popup-row">🏢 <b>Doanh nghiệp:</b> ${loc.tenantName}</div>`);
  if (loc.code) lines.push(`<div class="popup-row">🔢 <b>Mã vùng:</b> ${loc.code}</div>`);
  if (loc.plantType) lines.push(`<div class="popup-row">🌱 <b>Loại cây:</b> ${loc.plantType}</div>`);
  if (loc.areaM2) lines.push(`<div class="popup-row">📐 <b>Diện tích:</b> ${loc.areaM2.toLocaleString()} m²</div>`);
  if (loc.managerName) lines.push(`<div class="popup-row">👤 <b>Người phụ trách:</b> ${loc.managerName}</div>`);

  const addressParts = [loc.address, loc.ward, loc.province].filter(Boolean);
  if (addressParts.length) lines.push(`<div class="popup-row popup-address">📍 ${addressParts.join(', ')}</div>`);

  if (loc.status) {
    const statusColor = loc.status === 'ACTIVE' ? '#00875A' : '#94a3b8';
    lines.push(`<div class="popup-row"><span class="popup-status" style="background:${statusColor}">${loc.status}</span></div>`);
  }
  lines.push(`</div>`);
  return lines.join('');
};

const setMapLanguageToVietnamese = () => {
  if (!map) return;
  try {
    const style = map.getStyle();
    if (!style || !style.layers) return;

    style.layers.forEach((layer: any) => {
      if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
        try {
          map!.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name_vi'],
            ['get', 'name_local'],
            ['get', 'name']
          ]);
        } catch (e) { /* ignore */ }
      }
    });
  } catch (err) {
    console.error('Error setting map language to Vietnamese:', err);
  }
};

const handleStyleChange = (newStyle: string) => {
  if (!map) return;
  currentStyle.value = newStyle;
  map.setStyle(newStyle);
  // After style change, re-render layers once new style loads
  map.once('style.load', () => {
    mapListenersAdded = false;
    setMapLanguageToVietnamese();
    renderLocations();
  });
};

const initMap = async () => {
  if (!mapContainer.value || !MAPBOX_TOKEN) {
    loading.value = false;
    return;
  }

  await loadProvincesGeoJson();

  mapboxgl.accessToken = MAPBOX_TOKEN;

  const VIETNAM_BOUNDS: mapboxgl.LngLatBoundsLike = [
    [100.0, 6.0],
    [118.0, 24.0]
  ];

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: currentStyle.value,
    center: [108.2772, 14.0583], // Vietnam center
    zoom: 5.0,
    minZoom: 4.8,
    maxZoom: 16,
    maxBounds: VIETNAM_BOUNDS,
    attributionControl: true,
  });

  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

  map.on('load', () => {
    loading.value = false;
    setMapLanguageToVietnamese();
    renderLocations();
  });
};

const renderLocations = () => {
  if (!map || !map.isStyleLoaded()) return;

  // Clean up existing sources/layers
  ['vietnam-provinces-fill', 'vietnam-provinces-outline', 'farm-polygons-fill', 'farm-polygons-outline', 'farm-points', 'farm-scans'].forEach(id => {
    if (map!.getLayer(id)) map!.removeLayer(id);
  });
  ['vietnam-provinces-source', 'farm-polygons-source', 'farm-points-source', 'farm-scans-source'].forEach(id => {
    if (map!.getSource(id)) map!.removeSource(id);
  });

  // Remove existing markers
  document.querySelectorAll('.farm-marker').forEach(el => el.remove());

  const polygonFeatures: any[] = [];
  const pointFeatures: any[] = [];
  const scanFeatures: any[] = [];
  const bounds = new mapboxgl.LngLatBounds();
  let hasValidData = false;

  props.locations.forEach((loc) => {
    const boundary = extractBoundary(loc);
    const coords = extractCoords(loc);

    if (boundary) {
      // Polygon feature
      polygonFeatures.push({
        type: 'Feature',
        geometry: boundary,
        properties: { ...loc, boundary: undefined, coordinate: undefined },
      });

      // Extend bounds with all polygon coordinates
      boundary.coordinates[0].forEach((coord: number[]) => {
        bounds.extend([coord[0], coord[1]]);
      });
      hasValidData = true;
    }

    if (coords) {
      // Point feature (circle marker)
      pointFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: { ...loc, boundary: undefined, coordinate: undefined },
      });
      bounds.extend(coords);
      hasValidData = true;
    }
  });

  if (props.scans && props.scans.length) {
    props.scans.forEach((scan) => {
      if (scan.lat && scan.lng) {
        scanFeatures.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [scan.lng, scan.lat] },
          properties: { ...scan }
        });
        bounds.extend([scan.lng, scan.lat]);
        hasValidData = true;
      }
    });
  }

  // Add Vietnam Provinces layer
  if (provincesGeoJson) {
    map!.addSource('vietnam-provinces-source', {
      type: 'geojson',
      data: provincesGeoJson,
    });

    map!.addLayer({
      id: 'vietnam-provinces-fill',
      type: 'fill',
      source: 'vietnam-provinces-source',
      paint: {
        'fill-color': [
          'case',
          ['==', ['coalesce', ['get', 'adm1_name1'], ['get', 'adm1_name']], props.selectedProvince || ''],
          '#f39c12',
          '#3498db'
        ],
        'fill-opacity': [
          'case',
          ['==', ['coalesce', ['get', 'adm1_name1'], ['get', 'adm1_name']], props.selectedProvince || ''],
          0.3,
          0.08
        ]
      }
    });

    map!.addLayer({
      id: 'vietnam-provinces-outline',
      type: 'line',
      source: 'vietnam-provinces-source',
      paint: {
        'line-color': [
          'case',
          ['==', ['coalesce', ['get', 'adm1_name1'], ['get', 'adm1_name']], props.selectedProvince || ''],
          '#d35400',
          '#ffffff'
        ],
        'line-width': [
          'case',
          ['==', ['coalesce', ['get', 'adm1_name1'], ['get', 'adm1_name']], props.selectedProvince || ''],
          2.5,
          1.0
        ]
      }
    });
  }

  // Add Polygon layer
  if (polygonFeatures.length) {
    map!.addSource('farm-polygons-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: polygonFeatures },
    });

    map!.addLayer({
      id: 'farm-polygons-fill',
      type: 'fill',
      source: 'farm-polygons-source',
      paint: {
        'fill-color': '#00875A',
        'fill-opacity': 0.25,
      },
    });

    map!.addLayer({
      id: 'farm-polygons-outline',
      type: 'line',
      source: 'farm-polygons-source',
      paint: {
        'line-color': '#00684A',
        'line-width': 2.5,
      },
    });
  }

  // Add Point layer
  if (pointFeatures.length) {
    map!.addSource('farm-points-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: pointFeatures },
    });

    map!.addLayer({
      id: 'farm-points',
      type: 'circle',
      source: 'farm-points-source',
      paint: {
        'circle-radius': 8,
        'circle-color': '#00875A',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.9,
      },
    });
  }

  // Add Scan layer
  if (scanFeatures.length) {
    map!.addSource('farm-scans-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: scanFeatures },
    });

    map!.addLayer({
      id: 'farm-scans',
      type: 'circle',
      source: 'farm-scans-source',
      paint: {
        'circle-radius': 6,
        'circle-color': '#ef4444',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.9,
      },
    });
  }

  if (!mapListenersAdded) {
    // Click and hover on province boundaries
    map!.on('click', 'vietnam-provinces-fill', (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const name = feature.properties?.adm1_name1 || feature.properties?.adm1_name || '';
      if (name) {
        emit('change-province', name);
      }
    });

    map!.on('mouseenter', 'vietnam-provinces-fill', () => {
      if (map) map.getCanvas().style.cursor = 'pointer';
    });
    map!.on('mouseleave', 'vietnam-provinces-fill', () => {
      if (map) map.getCanvas().style.cursor = '';
    });

    // Click on polygon
      map!.on('click', 'farm-polygons-fill', (e) => {
        if (!e.features?.length) return;
        const props_data = e.features[0].properties;
        const loc = rebuildLocation(props_data);

        if (popup) popup.remove();
        popup = new mapboxgl.Popup({ maxWidth: '320px', closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(buildPopupHTML(loc))
          .addTo(map!);

        emit('select', loc);
      });

      map!.on('mouseenter', 'farm-polygons-fill', () => {
        if (map) map.getCanvas().style.cursor = 'pointer';
      });
      map!.on('mouseleave', 'farm-polygons-fill', () => {
        if (map) map.getCanvas().style.cursor = '';
      });
      map!.on('click', 'farm-points', (e) => {
        if (!e.features?.length) return;
        const props_data = e.features[0].properties;
        const loc = rebuildLocation(props_data);
        const coordinates = (e.features[0].geometry as any).coordinates.slice();

        if (popup) popup.remove();
        popup = new mapboxgl.Popup({ maxWidth: '320px', closeButton: true })
          .setLngLat(coordinates)
          .setHTML(buildPopupHTML(loc))
          .addTo(map!);

        emit('select', loc);
      });

      map!.on('mouseenter', 'farm-points', () => {
        if (map) map.getCanvas().style.cursor = 'pointer';
      });
      map!.on('mouseleave', 'farm-points', () => {
        if (map) map.getCanvas().style.cursor = '';
      });
      map!.on('click', 'farm-scans', (e) => {
        if (!e.features?.length) return;
        const scan = e.features[0].properties as any;
        const coordinates = (e.features[0].geometry as any).coordinates.slice();

        if (popup) popup.remove();
        
        const scanDate = new Date(scan.createdAt).toLocaleDateString() + ' ' + new Date(scan.createdAt).toLocaleTimeString();
        const codeString = scan.codeString || scan.code_string || 'N/A';
        
        const popupHtml = `
          <div class="mapbox-popup-content">
            <div class="popup-title text-red-600">Quét mã: ${codeString}</div>
            ${scan.address ? `<div class="popup-row popup-address">📍 ${scan.address}</div>` : ''}
            <div class="popup-row mt-2 text-gray-500">🕒 ${scanDate}</div>
          </div>
        `;

        popup = new mapboxgl.Popup({ maxWidth: '320px', closeButton: true })
          .setLngLat(coordinates as [number, number])
          .setHTML(popupHtml)
          .addTo(map!);
      });

      map!.on('mouseenter', 'farm-scans', () => {
        if (map) map.getCanvas().style.cursor = 'pointer';
      });
      map!.on('mouseleave', 'farm-scans', () => {
        if (map) map.getCanvas().style.cursor = '';
      });
    
    mapListenersAdded = true;
  }

  // Add Archipelago Labels
  const islands = [
    { pos: [112.4743021, 16.5839161], text: 'Quần đảo<br/>Hoàng Sa' },
    { pos: [115.7505101, 10.6921803], text: 'Quần đảo<br/>Trường Sa' },
  ];

  islands.forEach(island => {
    const el = document.createElement('div');
    el.innerHTML = island.text;
    el.style.color = '#FFF04D';
    el.style.fontSize = '12px';
    el.style.fontWeight = 'bold';
    el.style.textAlign = 'center';
    el.style.lineHeight = '1.2';
    el.style.textShadow = '1px 1px 3px black, -1px -1px 3px black';
    el.style.pointerEvents = 'none'; // so it doesn't block map clicks

    new mapboxgl.Marker({ element: el })
      .setLngLat(island.pos as [number, number])
      .addTo(map!);
    // We optionally don't add these to bounds so it focuses on user data
  });

  // Fit bounds
  try {
    if (hasValidData && props.autoFitBounds !== false) {
      // Mapbox LngLatBounds is empty if both _sw and _ne are undefined.
      // isEmpty() will check this safely.
      if (!bounds.isEmpty()) {
        map!.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1000 });
      }
    } else if (!hasValidData && props.centerCoordinate) {
      map!.flyTo({ center: [props.centerCoordinate.lng, props.centerCoordinate.lat], zoom: 9, duration: 1000 });
    } else if (!hasValidData && !props.centerCoordinate) {
      // Zoom out to whole country if no location selected and no data
      map!.flyTo({ center: [108.2772, 14.0583], zoom: 5, duration: 1000 });
    }
  } catch (err) {
    console.error('Error fitting bounds in mapbox:', err);
  }
};

const rebuildLocation = (props: any): MapLocation => {
  // GeoJSON properties serialize objects as strings
  const loc = { ...props };
  if (typeof loc.areaM2 === 'string') loc.areaM2 = parseFloat(loc.areaM2);
  return loc;
};

watch(() => [props.locations, props.scans, props.centerCoordinate], () => {
  if (map && map.isStyleLoaded()) {
    renderLocations();
  }
}, { deep: true });

watch(() => props.selectedProvince, (newProvince) => {
  if (!map || !map.isStyleLoaded()) return;

  if (map.getLayer('vietnam-provinces-fill')) {
    map.setPaintProperty('vietnam-provinces-fill', 'fill-color', [
      'case',
      ['==', ['coalesce', ['get', 'adm1_name1'], ['get', 'adm1_name']], newProvince || ''],
      '#f39c12',
      '#3498db'
    ]);
    map.setPaintProperty('vietnam-provinces-fill', 'fill-opacity', [
      'case',
      ['==', ['coalesce', ['get', 'adm1_name1'], ['get', 'adm1_name']], newProvince || ''],
      0.3,
      0.08
    ]);
  }
  if (map.getLayer('vietnam-provinces-outline')) {
    map.setPaintProperty('vietnam-provinces-outline', 'line-color', [
      'case',
      ['==', ['coalesce', ['get', 'adm1_name1'], ['get', 'adm1_name']], newProvince || ''],
      '#d35400',
      '#ffffff'
    ]);
    map.setPaintProperty('vietnam-provinces-outline', 'line-width', [
      'case',
      ['==', ['coalesce', ['get', 'adm1_name1'], ['get', 'adm1_name']], newProvince || ''],
      2.5,
      1.0
    ]);
  }

  if (newProvince && provincesGeoJson) {
    const feature = provincesGeoJson.features.find((f: any) => {
      const name = f.properties?.adm1_name1 || f.properties?.adm1_name || '';
      return name.toLowerCase() === newProvince.toLowerCase();
    });
    if (feature && feature.geometry) {
      const bounds = getFeatureBounds(feature.geometry.coordinates);
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 10, duration: 1500 });
      }
    }
  } else {
    map.flyTo({ center: [108.2772, 14.0583], zoom: 5, duration: 1500 });
  }
});

onMounted(() => {
  nextTick(() => initMap());
});

onUnmounted(() => {
  if (popup) popup.remove();
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style scoped>
.farm-mapbox-container {
  position: relative;
  width: 100%;
  height: v-bind("props.height || '450px'");
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.map-container {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.map-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 14px;
  z-index: 10;
}

.map-style-switcher {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
}

.map-style-switcher .style-select {
  width: 150px;
}

.map-style-switcher :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  border-radius: 6px;
}

.map-legend {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.65);
  padding: 6px 12px;
  border-radius: 6px;
  display: flex;
  gap: 16px;
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
  width: 14px;
  height: 10px;
  background: rgba(0, 135, 90, 0.4);
  border: 2px solid #00684A;
  border-radius: 2px;
}

.legend-point {
  width: 12px;
  height: 12px;
  background: var(--tid-success);
  border: 2px solid #fff;
  border-radius: 50%;
}
</style>

<style>
/* Mapbox popup global styles - not scoped so they apply inside the map's shadow DOM */
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

.mapbox-popup-content .popup-address {
  color: #6b7280;
  margin-top: 4px;
}

.mapbox-popup-content .popup-status {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  margin-top: 4px;
}

.mapboxgl-popup-content {
  border-radius: 10px !important;
  padding: 14px !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25) !important;
}
</style>
