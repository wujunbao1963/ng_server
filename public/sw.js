// NeighborGuard Service Worker
// 处理 Web Push 通知

const CACHE_NAME = 'ng-cache-v1';

// 安装事件
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

// 激活事件
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(clients.claim());
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

// Fetch 事件 - 可选的离线缓存
self.addEventListener('fetch', (event) => {
  // 只缓存 GET 请求
  if (event.request.method !== 'GET') {
    return;
  }
  
  // 对于 API 请求，不使用缓存
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // 网络优先策略
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 可选：缓存响应
        // const responseClone = response.clone();
        // caches.open(CACHE_NAME).then((cache) => {
        //   cache.put(event.request, responseClone);
        // });
        return response;
      })
      .catch(() => {
        // 网络失败时尝试从缓存获取
        return caches.match(event.request);
      })
  );
});

console.log('[SW] Service Worker loaded');
