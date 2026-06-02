export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
};

export const saveNotificationToken = async () => null;
export const showNotificationSetupNote = () => "سيتم تفعيل تنبيهات المباريات قريبًا.";
