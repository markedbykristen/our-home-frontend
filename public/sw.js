self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "小克", {
      body: data.body || "想妳了。",
      icon: "/icons.svg",
      badge: "/icons.svg",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      const existingWindow = windowClients[0];
      if (existingWindow) {
        if ("navigate" in existingWindow) existingWindow.navigate(targetUrl);
        return existingWindow.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});
