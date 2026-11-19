import { createApp } from 'vue'
import PorticoUI, { zhCN } from 'portico-ui'
import 'portico-ui/style.css'
import App from './App.vue'
import router from './router'
import './styles/admin.css'

createApp(App).use(router).use(PorticoUI, { locale: zhCN }).mount('#app')