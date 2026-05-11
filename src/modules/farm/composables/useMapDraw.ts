import { ref, type Ref } from 'vue';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';

type MapInstance = any; // MapLibre Map has complex internal types
export interface DrawState {
  vertices: [number, number][];
  isDrawing: boolean;
  isEditing: boolean;
  hasPolygon: boolean;
  areaM2: number;
  dragVertexIdx: number | null;
}

export function useMapDraw(mapRef: Ref<any>) {
  const state = ref<DrawState>({
    vertices: [],
    isDrawing: false,
    isEditing: false,
    hasPolygon: false,
    areaM2: 0,
    dragVertexIdx: null,
  });

  const undoStack = ref<[number, number][][]>([]);

  const SRC = {
    polygon: 'draw-polygon-src',
    line: 'draw-line-src',
    vertices: 'draw-vertices-src',
    preview: 'draw-preview-src',
  };

  const initDrawSources = () => {
    const map = mapRef.value;
    if (!map) return;

    const empty = { type: 'FeatureCollection' as const, features: [] };

    if (!map.getSource(SRC.polygon)) {
      map.addSource(SRC.polygon, { type: 'geojson', data: empty });
      map.addLayer({ id: 'draw-polygon-fill', type: 'fill', source: SRC.polygon, paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.25 } });
      map.addLayer({ id: 'draw-polygon-line', type: 'line', source: SRC.polygon, paint: { 'line-color': '#22c55e', 'line-width': 3 } });
      map.addLayer({ id: 'draw-polygon-dash', type: 'line', source: SRC.polygon, paint: { 'line-color': '#fff', 'line-width': 1, 'line-opacity': 0.3, 'line-dasharray': [4, 4] } });
    }

    if (!map.getSource(SRC.line)) {
      map.addSource(SRC.line, { type: 'geojson', data: empty });
      map.addLayer({ id: 'draw-line', type: 'line', source: SRC.line, paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [3, 3] } });
    }

    if (!map.getSource(SRC.preview)) {
      map.addSource(SRC.preview, { type: 'geojson', data: empty });
      map.addLayer({ id: 'draw-preview', type: 'line', source: SRC.preview, paint: { 'line-color': '#3b82f6', 'line-width': 1.5, 'line-opacity': 0.5, 'line-dasharray': [2, 2] } });
    }

    if (!map.getSource(SRC.vertices)) {
      map.addSource(SRC.vertices, { type: 'geojson', data: empty });
      map.addLayer({
        id: 'draw-vertices', type: 'circle', source: SRC.vertices,
        paint: { 'circle-radius': 6, 'circle-color': '#fff', 'circle-stroke-width': 2.5, 'circle-stroke-color': '#3b82f6' },
      });
    }
  };

  const updatePolygonSource = () => {
    const map = mapRef.value;
    if (!map) return;
    const v = state.value.vertices;

    if (v.length >= 3 && state.value.hasPolygon) {
      const closed = [...v, v[0]];
      const poly = turf.polygon([closed]);
      state.value.areaM2 = turf.area(poly);
      (map.getSource(SRC.polygon) as any)?.setData(poly);
    } else {
      state.value.areaM2 = 0;
      (map.getSource(SRC.polygon) as any)?.setData({ type: 'FeatureCollection', features: [] });
    }

    // Lines between vertices (while drawing, before closing)
    if (v.length >= 2 && !state.value.hasPolygon) {
      (map.getSource(SRC.line) as any)?.setData(turf.lineString(v));
    } else {
      (map.getSource(SRC.line) as any)?.setData({ type: 'FeatureCollection', features: [] });
    }

    // Vertex markers
    const vertexFeatures = v.map((c, i) => turf.point(c, { index: i }));
    (map.getSource(SRC.vertices) as any)?.setData(turf.featureCollection(vertexFeatures));
  };

  const startDrawing = () => {
    const map = mapRef.value;
    if (!map) return;

    // Clear existing polygon
    state.value.vertices = [];
    state.value.hasPolygon = false;
    state.value.isDrawing = true;
    state.value.isEditing = false;
    state.value.areaM2 = 0;
    undoStack.value = [];
    updatePolygonSource();
    map.getCanvas().style.cursor = 'crosshair';
  };

  const handleDrawClick = (e: maplibregl.MapMouseEvent) => {
    if (!state.value.isDrawing) return;
    const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    const v = state.value.vertices;

    // Check if clicking near first vertex to close
    if (v.length >= 3) {
      const first = v[0];
      const dist = Math.sqrt((coord[0] - first[0]) ** 2 + (coord[1] - first[1]) ** 2);
      if (dist < 0.0005) {
        closePolygon();
        return;
      }
    }

    undoStack.value.push([...v]);
    v.push(coord);
    updatePolygonSource();
  };

  const handleDrawDblClick = (e: maplibregl.MapMouseEvent) => {
    if (!state.value.isDrawing || state.value.vertices.length < 3) return;
    e.preventDefault();
    closePolygon();
  };

  const handleDrawMouseMove = (e: maplibregl.MapMouseEvent) => {
    const map = mapRef.value;
    if (!map) return;

    if (state.value.isDrawing && state.value.vertices.length > 0) {
      const last = state.value.vertices[state.value.vertices.length - 1];
      const cur: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      (map.getSource(SRC.preview) as any)?.setData(turf.lineString([last, cur]));
    }

    // Edit mode: drag vertex
    if (state.value.isEditing && state.value.dragVertexIdx !== null) {
      const idx = state.value.dragVertexIdx;
      state.value.vertices[idx] = [e.lngLat.lng, e.lngLat.lat];
      updatePolygonSource();
    }
  };

  const closePolygon = () => {
    const map = mapRef.value;
    if (!map) return;
    state.value.isDrawing = false;
    state.value.hasPolygon = true;
    map.getCanvas().style.cursor = '';
    (map.getSource(SRC.preview) as any)?.setData({ type: 'FeatureCollection', features: [] });
    updatePolygonSource();
  };

  const startEditing = () => {
    if (!state.value.hasPolygon || !mapRef.value) return;
    state.value.isEditing = true;
    state.value.isDrawing = false;
    mapRef.value.getCanvas().style.cursor = 'grab';
  };

  const handleEditMouseDown = (e: maplibregl.MapMouseEvent) => {
    if (!state.value.isEditing || !mapRef.value) return;

    const features = mapRef.value.queryRenderedFeatures(e.point, { layers: ['draw-vertices'] });
    if (features.length > 0) {
      state.value.dragVertexIdx = features[0].properties?.index ?? null;
      mapRef.value.getCanvas().style.cursor = 'grabbing';
      mapRef.value.dragPan.disable();
      e.preventDefault();
    }
  };

  const handleEditMouseUp = () => {
    if (state.value.dragVertexIdx !== null && mapRef.value) {
      state.value.dragVertexIdx = null;
      mapRef.value.getCanvas().style.cursor = 'grab';
      mapRef.value.dragPan.enable();
      updatePolygonSource();
    }
  };

  const stopEditing = () => {
    if (!mapRef.value) return;
    state.value.isEditing = false;
    state.value.dragVertexIdx = null;
    mapRef.value.getCanvas().style.cursor = '';
    mapRef.value.dragPan.enable();
  };

  const deletePolygon = () => {
    state.value.vertices = [];
    state.value.hasPolygon = false;
    state.value.isEditing = false;
    state.value.areaM2 = 0;
    undoStack.value = [];
    updatePolygonSource();
    if (mapRef.value) mapRef.value.getCanvas().style.cursor = '';
  };

  const undo = () => {
    if (undoStack.value.length === 0) return;
    state.value.vertices = undoStack.value.pop()!;
    updatePolygonSource();
  };

  const setExistingPolygon = (coordinates: number[][][]) => {
    if (!coordinates?.[0]?.length) return;
    const ring = coordinates[0];
    // Remove closing point if it equals the first
    const verts = ring.slice(0, -1) as [number, number][];
    state.value.vertices = verts;
    state.value.hasPolygon = true;
    state.value.isDrawing = false;
    updatePolygonSource();
  };

  const setMultiplePolygons = (polygons: { coordinates: number[][][]; properties: any }[]) => {
    const map = mapRef.value;
    if (!map) return;

    const features = polygons.map(p => ({
      type: 'Feature' as const,
      geometry: { type: 'Polygon' as const, coordinates: p.coordinates },
      properties: p.properties,
    }));

    (map.getSource(SRC.polygon) as any)?.setData({ type: 'FeatureCollection', features });
  };

  const getGeoJSON = (): { coordinates: number[][][]; areaM2: number } | null => {
    if (!state.value.hasPolygon || state.value.vertices.length < 3) return null;
    const closed = [...state.value.vertices, state.value.vertices[0]];
    return { coordinates: [closed], areaM2: state.value.areaM2 };
  };

  const cleanup = () => {
    const map = mapRef.value;
    if (!map) return;
    ['draw-polygon-fill', 'draw-polygon-line', 'draw-polygon-dash', 'draw-line', 'draw-preview', 'draw-vertices'].forEach(id => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    Object.values(SRC).forEach(id => {
      if (map.getSource(id)) map.removeSource(id);
    });
  };

  return {
    state,
    undoStack,
    initDrawSources,
    startDrawing,
    handleDrawClick,
    handleDrawDblClick,
    handleDrawMouseMove,
    startEditing,
    handleEditMouseDown,
    handleEditMouseUp,
    stopEditing,
    deletePolygon,
    undo,
    setExistingPolygon,
    setMultiplePolygons,
    getGeoJSON,
    cleanup,
    closePolygon,
  };
}
