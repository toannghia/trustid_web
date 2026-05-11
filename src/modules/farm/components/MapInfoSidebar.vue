<template>
  <div class="info-sidebar">
    <!-- Section: Thông tin vùng trồng -->
    <div class="sec" v-if="location">
      <div class="sec-t">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        Thông tin vùng trồng
      </div>
      <div class="row"><span class="rl">Mã số</span><span class="rv">{{ location.code || '—' }}</span></div>
      <div class="row"><span class="rl">Loại cây</span><span class="rv">{{ location.plantType || '—' }}</span></div>
      <div class="row"><span class="rl">Người quản lý</span><span class="rv">{{ location.managerName || '—' }}</span></div>
      <div class="row"><span class="rl">Tỉnh / Xã</span><span class="rv">{{ locationAddress }}</span></div>
    </div>

    <!-- Section: Danh sách thửa (multi mode) -->
    <div class="sec" v-if="locations && locations.length > 0 && !location">
      <div class="sec-t">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        Tổng quan vùng trồng
      </div>
      <div class="row"><span class="rl">Số thửa</span><span class="rv bl">{{ locations.length }}</span></div>
      <div class="row"><span class="rl">Tổng diện tích</span><span class="rv bl">{{ totalAreaHa }} ha</span></div>
    </div>

    <!-- Section: So sánh diện tích -->
    <div class="sec" v-if="currentArea2D > 0">
      <div class="sec-t">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 5-6"/>
        </svg>
        So sánh diện tích
      </div>
      <div class="cmp">
        <div class="cb f">
          <div class="cl">Hình chiếu 2D</div>
          <div class="cv">{{ area2DHa }}</div>
          <div class="cu">ha</div>
        </div>
        <div class="cb s">
          <div class="cl">Bề mặt 3D</div>
          <div class="cv">{{ area3DHa }}</div>
          <div class="cu">ha</div>
        </div>
      </div>
      <div class="diff" v-if="Number(areaDiffPercent) > 0">
        ↑ Chênh lệch: +{{ areaDiffPercent }}% (~{{ areaDiffHa }} ha)
      </div>
    </div>

    <!-- Section: Thông tin địa hình -->
    <div class="sec" v-if="is3D && terrainInfo">
      <div class="sec-t">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M8 21l4-10 4 10"/><path d="M2 21h20"/><path d="M12 3v8"/>
        </svg>
        Thông tin địa hình
      </div>
      <div class="row"><span class="rl">Cao độ thấp nhất</span><span class="rv bl">{{ terrainInfo.minElevation }} m</span></div>
      <div class="row"><span class="rl">Cao độ cao nhất</span><span class="rv bl">{{ terrainInfo.maxElevation }} m</span></div>
      <div class="row"><span class="rl">Chênh lệch</span><span class="rv yl">{{ terrainInfo.elevationDiff }} m</span></div>
      <div class="row"><span class="rl">Độ dốc trung bình</span><span class="rv yl">{{ terrainInfo.avgSlope }}°</span></div>
      <div class="row" style="border-bottom:0"><span class="rl">Độ dốc tối đa</span><span class="rv rd">{{ terrainInfo.maxSlope }}°</span></div>
      <div class="ebar">
        <span>{{ terrainInfo.minElevation }}m</span>
        <div class="evis"><div class="efill"></div></div>
        <span>{{ terrainInfo.maxElevation }}m</span>
      </div>
      <div class="slope"><canvas ref="slopeCanvas"></canvas></div>
    </div>

    <!-- Section: Kiểm tra EUDR -->
    <div class="sec" v-if="location && location.eudrStatus">
      <div class="sec-t">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Kiểm tra EUDR
      </div>

      <!-- Compliant -->
      <div v-if="location.eudrStatus === 'COMPLIANT'" class="badge compliant">
        <div class="badge-i compliant-i">✓</div>
        <div>
          <div class="badge-s compliant-s">COMPLIANT</div>
          <div class="badge-d">Vùng trồng tuân thủ EUDR</div>
        </div>
      </div>

      <!-- Non-Compliant -->
      <div v-else-if="location.eudrStatus === 'NON_COMPLIANT'" class="badge">
        <div class="badge-i">⚠</div>
        <div>
          <div class="badge-s">NOT COMPLIANT</div>
          <div class="badge-d">Tỷ lệ vi phạm: {{ location.violationRate || 0 }}%</div>
        </div>
      </div>

      <!-- Pending -->
      <div v-else-if="location.eudrStatus === 'PENDING'" class="badge pending">
        <div class="badge-i pending-i">⏳</div>
        <div>
          <div class="badge-s pending-s">ĐANG KIỂM TRA</div>
          <div class="badge-d">Đang phân tích dữ liệu vệ tinh...</div>
        </div>
      </div>

      <!-- Not checked -->
      <div v-else class="badge unchecked">
        <div class="badge-i unchecked-i">○</div>
        <div>
          <div class="badge-s unchecked-s">CHƯA KIỂM TRA</div>
          <div class="badge-d">Cần vẽ polygon để kiểm tra EUDR</div>
        </div>
      </div>

      <div style="margin-top:14px" v-if="location.checkLog">
        <div class="row" v-if="location.checkLog.treeCoverLossHa != null">
          <span class="rl">Mất rừng phát hiện</span>
          <span class="rv rd">{{ location.checkLog.treeCoverLossHa?.toFixed(3) }} ha</span>
        </div>
        <div class="row" v-if="location.lastCheckDate">
          <span class="rl">Kiểm tra lần cuối</span>
          <span class="rv">{{ formatDate(location.lastCheckDate) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue';
import type { Location } from '../api/farmApi';

interface TerrainInfo {
  minElevation: number;
  maxElevation: number;
  elevationDiff: number;
  avgSlope: number;
  maxSlope: number;
  elevationProfile: number[];
}

const props = defineProps<{
  location?: Location | null;
  locations?: Location[];
  currentArea2D: number;
  mode: 'view' | 'draw' | 'eudr';
  is3D: boolean;
  terrainInfo?: TerrainInfo | null;
}>();

const slopeCanvas = ref<HTMLCanvasElement | null>(null);

const locationAddress = computed(() => {
  if (!props.location) return '—';
  return [props.location.ward, props.location.province].filter(Boolean).join(', ') || '—';
});

const totalAreaHa = computed(() => {
  if (!props.locations) return '0';
  const total = props.locations.reduce((sum, l) => sum + (l.areaM2 || 0), 0);
  return (total / 10000).toFixed(2);
});

const area2DHa = computed(() => (props.currentArea2D / 10000).toFixed(2));

// Estimate 3D surface area based on average slope
const area3DM2 = computed(() => {
  if (!props.terrainInfo || props.terrainInfo.avgSlope === 0) return props.currentArea2D;
  const slopeRad = (props.terrainInfo.avgSlope * Math.PI) / 180;
  return props.currentArea2D / Math.cos(slopeRad);
});
const area3DHa = computed(() => (area3DM2.value / 10000).toFixed(2));

const areaDiffPercent = computed(() => {
  if (props.currentArea2D === 0) return '0.0';
  return (((area3DM2.value - props.currentArea2D) / props.currentArea2D) * 100).toFixed(1);
});
const areaDiffHa = computed(() => ((area3DM2.value - props.currentArea2D) / 10000).toFixed(2));

const formatDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
};

// Slope profile chart
const drawSlopeProfile = () => {
  const c = slopeCanvas.value;
  if (!c || !props.terrainInfo?.elevationProfile?.length) return;

  const ctx = c.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const r = c.getBoundingClientRect();
  c.width = r.width * dpr;
  c.height = 80 * dpr;
  ctx.scale(dpr, dpr);

  const w = r.width;
  const h = 80;
  const profile = props.terrainInfo.elevationProfile;
  const minE = props.terrainInfo.minElevation;
  const maxE = props.terrainInfo.maxElevation;
  const range = maxE - minE || 1;

  const pts = profile.map((elev, i) => ({
    x: (i / (profile.length - 1)) * w,
    y: h - 10 - ((elev - minE) / range) * (h - 20),
  }));

  // Gradient fill
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(59,130,246,.3)');
  g.addColorStop(1, 'rgba(59,130,246,.02)');
  ctx.beginPath();
  ctx.moveTo(0, h);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();

  // Line
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = 'rgba(59,130,246,.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
};

watch(() => props.terrainInfo, async () => {
  await nextTick();
  drawSlopeProfile();
}, { deep: true });

onMounted(() => {
  if (props.terrainInfo) drawSlopeProfile();
});
</script>

<style scoped>
.info-sidebar {
  width: 370px;
  background: #1a1f2e;
  border-left: 1px solid #2a3148;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}

.sec {
  background: #0f1219;
  border: 1px solid #2a3148;
  border-radius: 12px;
  padding: 18px;
}

.sec-t {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #8892a8;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sec-t svg { color: #3b82f6; }

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid #2a3148;
}
.row:last-child { border-bottom: 0; }

.rl { font-size: 13px; color: #8892a8; }
.rv { font-size: 13px; font-weight: 600; color: #e8ecf4; }
.bl { color: #3b82f6; }
.gn { color: #22c55e; }
.rd { color: #ef4444; }
.yl { color: #f59e0b; }

/* Area comparison */
.cmp { display: flex; gap: 12px; margin-top: 8px; }
.cb {
  flex: 1;
  text-align: center;
  padding: 14px 8px;
  border-radius: 10px;
  border: 1px solid #2a3148;
}
.cb.f { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.2); }
.cb.s { background: rgba(34, 197, 94, 0.08); border-color: rgba(34, 197, 94, 0.2); }
.cl { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #8892a8; margin-bottom: 6px; }
.cv { font-size: 20px; font-weight: 700; }
.cb.f .cv { color: #3b82f6; }
.cb.s .cv { color: #22c55e; }
.cu { font-size: 11px; color: #8892a8; margin-top: 2px; }

.diff {
  text-align: center;
  margin-top: 10px;
  padding: 8px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 8px;
  font-size: 13px;
  color: #f59e0b;
  font-weight: 600;
}

/* EUDR badges */
.badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.08);
}
.badge.compliant {
  border-color: rgba(34, 197, 94, 0.25);
  background: rgba(34, 197, 94, 0.08);
}
.badge.pending {
  border-color: rgba(245, 158, 11, 0.25);
  background: rgba(245, 158, 11, 0.08);
}
.badge.unchecked {
  border-color: rgba(136, 146, 168, 0.25);
  background: rgba(136, 146, 168, 0.08);
}

.badge-i {
  width: 40px; height: 40px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
  background: rgba(239, 68, 68, 0.15);
}
.badge-i.compliant-i { background: rgba(34, 197, 94, 0.15); }
.badge-i.pending-i { background: rgba(245, 158, 11, 0.15); }
.badge-i.unchecked-i { background: rgba(136, 146, 168, 0.15); }

.badge-s { font-weight: 600; color: #ef4444; font-size: 13px; }
.badge-s.compliant-s { color: #22c55e; }
.badge-s.pending-s { color: #f59e0b; }
.badge-s.unchecked-s { color: #8892a8; }
.badge-d { color: #8892a8; margin-top: 2px; font-size: 13px; }

/* Elevation bar */
.ebar { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.ebar span { font-size: 11px; color: #8892a8; }
.evis { flex: 1; height: 8px; background: #2a3148; border-radius: 4px; overflow: hidden; }
.efill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444); width: 100%; }

.slope canvas {
  width: 100%;
  height: 80px;
  border-radius: 8px;
  border: 1px solid #2a3148;
  margin-top: 12px;
}

@media (max-width: 768px) {
  .info-sidebar {
    display: none;
  }
}
</style>
