import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

import App from './App.vue';
import router from './router';
import './assets/main.css';
import './common/utils/leaflet-fix';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(ElementPlus);

// Thay vì app.use(component), ta sử dụng app.component(key, component)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component); // 
}

app.mount('#app');