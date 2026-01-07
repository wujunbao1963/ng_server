// NeighborGuard Service Worker
// 处理 Web Push 通知

const CACHE_VERSION = 'v2';  // ← 更新版本号
const CACHE_NAME = `ng-cache-${CACHE_VERSION}`;

// 安装事件 - 强制更新
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  self.skipWaiting();  // 立即激活新版本
});

// 激活事件 - 清除旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return clients.claim();  // 立即控制所有页面
    })
  );
});

// 推送事件 - 接收服务器推送的通知
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'NeighborGuard',
    body: '您有新的安全通知',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {}
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW] Failed to parse push data:', e);
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'ng-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || [
      { action: 'view', title: '查看详情' },
      { action: 'dismiss', title: '忽略' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();
  
  const data = event.notification.data || {};
  
  // 处理不同的动作
  if (event.action === 'dismiss') {
    return;
  }
  
  // 打开应用或聚焦到已打开的窗口
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 查找已打开的窗口
        for (const client of clientList) {
          if (client.url.includes('/app') && 'focus' in client) {
            // 发送消息给页面
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              action: event.action,
              data: data
            });
            return client.focus();
          }
        }
        
        // 没有找到已打开的窗口，打开新窗口
        let url = '/app.html';
        if (data.eventId) {
          url += `?event=${data.eventId}`;
        }
        
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// 通知关闭事件
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// Fetch 事件 - 网络优先，不缓存 HTML/JS
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') {
    return;
  }
  
  // API 请求直接走网络
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // HTML 和 JS 文件始终从网络获取（不缓存）
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  
  // 其他资源使用网络优先策略
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

console.log('[SW] Service Worker loaded, version:', CACHE_VERSION);
