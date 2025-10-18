// Service Worker for Push Notifications
// This file handles push notifications for CastCue

const CACHE_NAME = 'castcue-v1';

// Grace timer management
// Map<notificationTag, timerId>
const graceTimers = new Map();

/**
 * Start grace timer for auto-action
 * @param {string} notificationTag - Unique notification tag
 * @param {string} draftId - Draft ID
 * @param {number} graceTimer - Grace timer in seconds
 * @param {string} autoAction - Auto action ('post' or 'skip')
 */
function startGraceTimer(notificationTag, draftId, graceTimer, autoAction) {
  console.log(`[Service Worker] Starting grace timer: ${graceTimer}s, action: ${autoAction}`);

  // Cancel existing timer if any
  if (graceTimers.has(notificationTag)) {
    clearTimeout(graceTimers.get(notificationTag));
  }

  // Start new timer
  const timerId = setTimeout(() => {
    console.log(`[Service Worker] Grace timer expired, executing: ${autoAction}`);
    executeAutoAction(draftId, autoAction, notificationTag);
  }, graceTimer * 1000);

  graceTimers.set(notificationTag, timerId);
}

/**
 * Cancel grace timer
 * @param {string} notificationTag - Unique notification tag
 */
function cancelGraceTimer(notificationTag) {
  if (graceTimers.has(notificationTag)) {
    console.log(`[Service Worker] Canceling grace timer for: ${notificationTag}`);
    clearTimeout(graceTimers.get(notificationTag));
    graceTimers.delete(notificationTag);
  }
}

/**
 * Execute auto action when grace timer expires
 * @param {string} draftId - Draft ID
 * @param {string} autoAction - Auto action ('post' or 'skip')
 * @param {string} notificationTag - Unique notification tag
 */
async function executeAutoAction(draftId, autoAction, notificationTag) {
  try {
    // Close the notification first
    const notifications = await self.registration.getNotifications({ tag: notificationTag });
    notifications.forEach(notification => notification.close());

    // Execute action
    if (autoAction === 'post') {
      // Auto-post
      // SECURITY: Include credentials to send authentication cookies
      const response = await fetch('/api/drafts/auto-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId }),
        credentials: 'same-origin',
      });

      if (response.ok) {
        console.log('[Service Worker] Auto-post successful');
        await self.registration.showNotification('自動投稿完了', {
          body: 'タイマーが満了したため、自動的に投稿しました',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'auto-post-success',
        });
      } else {
        console.error('[Service Worker] Auto-post failed:', response.status);
        const errorData = await response.json().catch(() => ({}));
        await self.registration.showNotification('自動投稿失敗', {
          body: errorData.details || '投稿に失敗しました',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'auto-post-error',
        });
      }
    } else {
      // Auto-skip
      // SECURITY: Include credentials to send authentication cookies
      const response = await fetch('/api/drafts/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId }),
        credentials: 'same-origin',
      });

      if (response.ok) {
        console.log('[Service Worker] Auto-skip successful');
        await self.registration.showNotification('自動スキップ完了', {
          body: 'タイマーが満了したため、投稿をスキップしました',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'auto-skip-success',
        });
      } else {
        console.error('[Service Worker] Auto-skip failed:', response.status);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Error executing auto action:', error);
  } finally {
    // Clean up timer
    graceTimers.delete(notificationTag);
  }
}

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Push event - show notification
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  let data = {
    title: '配信開始',
    body: '配信が開始されました',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'stream-notification',
    data: {
      url: '/approve',
    },
  };

  // Parse push notification data
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        ...data,
        ...payload,
      };
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
    }
  }

  // Determine action buttons based on notification type
  const notificationType = data.data?.type || 'stream_start';
  const actions = notificationType === 'game_change'
    ? [
        {
          action: 'template',
          title: 'テンプレートで投稿',
        },
        {
          action: 'edit',
          title: '編集して投稿',
        },
        {
          action: 'dismiss',
          title: '閉じる',
        },
      ]
    : [
        {
          action: 'template',
          title: 'テンプレートで投稿',
        },
        {
          action: 'edit',
          title: '編集して投稿',
        },
        {
          action: 'dismiss',
          title: '閉じる',
        },
      ];

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: actions,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).then(() => {
      // Start grace timer if graceTimer and autoAction are provided
      const graceTimer = data.data?.graceTimer;
      const autoAction = data.data?.autoAction;
      const draftId = data.data?.draftId;

      if (graceTimer && autoAction && draftId) {
        startGraceTimer(data.tag, draftId, graceTimer, autoAction);
      }
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);

  // Cancel grace timer when user interacts with notification
  cancelGraceTimer(event.notification.tag);

  event.notification.close();

  const draftId = event.notification.data?.draftId;

  if (event.action === 'template') {
    // Auto-post with template
    if (!draftId) {
      console.error('[Service Worker] No draftId provided for template action');
      return;
    }

    // UX: Show loading notification immediately for user feedback
    event.waitUntil(
      self.registration.showNotification('投稿中...', {
        body: '投稿を処理しています。しばらくお待ちください。',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'posting-inprogress',
        requireInteraction: false,
      }).then(() => {
        // Proceed with auto-post request
        return fetch('/api/drafts/auto-post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ draft_id: draftId }),
          credentials: 'same-origin',
        });
      }).then((response) => {
        // UX: Close loading notification
        return self.registration.getNotifications({ tag: 'posting-inprogress' })
          .then(notifications => {
            notifications.forEach(n => n.close());
            return response;
          });
      }).then((response) => {
        if (response.ok) {
          console.log('[Service Worker] Auto-post successful');
          // Show success notification
          return self.registration.showNotification('投稿完了', {
            body: 'テンプレートで投稿しました',
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: 'post-success',
          });
        } else {
          console.error('[Service Worker] Auto-post failed:', response.status);
          // Parse error details if available
          return response.json().then((errorData) => {
            let errorBody = '投稿に失敗しました。もう一度お試しください。';

            // Show specific error message for X connection issue
            if (response.status === 400 && errorData.error === 'X連携が見つかりません') {
              errorBody = 'Xアカウントを連携してから、もう一度お試しください。';
            } else if (response.status === 404 && errorData.error?.includes('Draft not found')) {
              errorBody = 'テスト通知のため投稿できません。実際の配信時にお試しください。';
            } else if (response.status === 409) {
              errorBody = 'この投稿は既に処理されています。';
            } else if (errorData.details) {
              errorBody = errorData.details;
            }

            // Show error notification
            return self.registration.showNotification('投稿失敗', {
              body: errorBody,
              icon: '/icon-192x192.png',
              badge: '/badge-72x72.png',
              tag: 'post-error',
            });
          }).catch(() => {
            // Fallback if JSON parsing fails
            return self.registration.showNotification('投稿失敗', {
              body: '投稿に失敗しました。もう一度お試しください。',
              icon: '/icon-192x192.png',
              badge: '/badge-72x72.png',
              tag: 'post-error',
            });
          });
        }
      }).catch((error) => {
        console.error('[Service Worker] Auto-post error:', error);
        // Close loading notification on error
        return self.registration.getNotifications({ tag: 'posting-inprogress' })
          .then(notifications => {
            notifications.forEach(n => n.close());
            // Show error notification
            return self.registration.showNotification('投稿失敗', {
              body: '投稿に失敗しました。もう一度お試しください。',
              icon: '/icon-192x192.png',
              badge: '/badge-72x72.png',
              tag: 'post-error',
            });
          });
      })
    );
  } else if (event.action === 'edit') {
    // Open edit/approve page
    const url = event.notification.data?.url || (draftId ? `/approve/${draftId}` : '/approve');
    event.waitUntil(
      clients.openWindow(url)
    );
  } else if (event.action === 'dismiss') {
    // Skip the draft when user dismisses
    if (!draftId) {
      console.error('[Service Worker] No draftId provided for dismiss action');
      return;
    }

    event.waitUntil(
      fetch('/api/drafts/skip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draft_id: draftId }),
        credentials: 'same-origin',
      })
        .then((response) => {
          if (response.ok) {
            console.log('[Service Worker] Draft skipped');
          } else {
            console.error('[Service Worker] Failed to skip draft:', response.status);
          }
        })
        .catch((error) => {
          console.error('[Service Worker] Error skipping draft:', error);
        })
    );
  } else {
    // Default click - open edit/approve page
    const url = event.notification.data?.url || (draftId ? `/approve/${draftId}` : '/approve');
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

// Fetch event - network-first strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fall back to cache
        return caches.match(event.request);
      })
  );
});
