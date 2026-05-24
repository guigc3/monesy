import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/monesy-extensions.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
