import '@fontsource-variable/manrope/index.css'
import '@fontsource/jetbrains-mono/index.css'
import 'vue-sonner/style.css'
import '../tailwind.css'

import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { pinia } from './stores'
import { useSessionStore } from './stores/session'
import { useUiStore } from './stores/ui'

const session = useSessionStore(pinia)
const ui = useUiStore(pinia)

session.restore()
ui.restore()

const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')
