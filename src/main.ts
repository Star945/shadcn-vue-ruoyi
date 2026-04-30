import '@fontsource-variable/manrope/index.css'
import '@fontsource/jetbrains-mono/index.css'
import 'vue-sonner/style.css'
import '../tailwind.css'

import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { pinia } from './stores'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')
