import { createApp } from 'vue'
import { createPinia } from 'pinia'
// import './style.css'

import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'   // ← пресет
import 'primeicons/primeicons.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    // опції за потреби
    // options: { darkModeSelector: 'system', cssLayer: false }
  }
})

app.mount('#app')
