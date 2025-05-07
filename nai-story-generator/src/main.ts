import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// FontAwesome
import '@fortawesome/fontawesome-svg-core/styles.css' // FontAwesome CSS 명시적 임포트
import { library, config } from '@fortawesome/fontawesome-svg-core' // config 임포트 추가
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons' // 전체 solid 아이콘 가져오기

// import './styles/global.css'; // 전역 커스텀 스타일 추가 - 이 파일은 현재 생성되지 않아 주석 처리 또는 삭제

import './assets/main.css'

import { createPinia } from 'pinia'
import router from './router' // Vue Router

config.autoAddCss = true; // FontAwesome CSS 자동 추가 기능 활성화 (기본값이지만 명시)

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light'
  }
})

// FontAwesome 라이브러리에 아이콘 추가
library.add(fas) // solid 아이콘 전체를 라이브러리에 추가

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(vuetify)
app.component('font-awesome-icon', FontAwesomeIcon) // FontAwesomeIcon 컴포넌트 전역 등록
app.mount('#app')
