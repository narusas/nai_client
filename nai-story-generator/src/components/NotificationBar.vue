<template>
  <div class="notification-container" v-if="notifications.length > 0">
    <transition-group name="notification">
      <div 
        v-for="notification in notifications" 
        :key="notification.id" 
        class="notification"
        :class="notification.type"
      >
        <div class="notification-content">
          <span class="notification-icon">
            <span v-if="notification.type === 'success'">✅</span>
            <span v-else-if="notification.type === 'error'">❌</span>
            <span v-else-if="notification.type === 'info'">ℹ️</span>
            <span v-else>🔔</span>
          </span>
          <span class="notification-message">{{ notification.message }}</span>
        </div>
        <button class="close-button" @click="removeNotification(notification.id)">×</button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timeout?: number;
}

const notifications = ref<Notification[]>([]);

// 알림 추가
function addNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', timeout: number = 5000) {
  const id = Date.now();
  notifications.value.push({ id, message, type, timeout });
  
  if (timeout > 0) {
    setTimeout(() => {
      removeNotification(id);
    }, timeout);
  }
  
  return id;
}

// 알림 제거
function removeNotification(id: number) {
  const index = notifications.value.findIndex(n => n.id === id);
  if (index !== -1) {
    notifications.value.splice(index, 1);
  }
}

// 모든 알림 제거
function clearNotifications() {
  notifications.value = [];
}

// 이벤트 버스를 통해 전역에서 알림 추가 가능하도록 설정
onMounted(() => {
  window.addEventListener('add-notification', ((event: CustomEvent) => {
    const { message, type, timeout } = event.detail;
    addNotification(message, type, timeout);
  }) as EventListener);
});

// 컴포넌트 API 노출
defineExpose({
  addNotification,
  removeNotification,
  clearNotifications
});
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 350px;
}

.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  background-color: white;
  animation: slide-in 0.3s ease-out;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notification-icon {
  font-size: 1.2rem;
}

.notification-message {
  font-size: 0.9rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-button:hover {
  opacity: 1;
}

.success {
  border-left: 4px solid #4caf50;
}

.error {
  border-left: 4px solid #f44336;
}

.info {
  border-left: 4px solid #2196f3;
}

.warning {
  border-left: 4px solid #ff9800;
}

/* 애니메이션 */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

@keyframes slide-in {
  from {
    transform: translateX(30px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
