import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationSettings {
  newMessages: boolean;
  voucherAvailable: boolean;
  bookingReminders: boolean;
  emailNotifications: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  newMessages: true,
  voucherAvailable: true,
  bookingReminders: true,
  emailNotifications: false, // Email notifications disabled by default
};

export const useNotificationSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  const storageKey = `notification_settings_${user?.id}`;

  // Load settings from localStorage
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setSettings(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading notification settings:', error);
          setSettings(DEFAULT_SETTINGS);
        }
      }
    }
  }, [user, storageKey]);

  // Save settings to localStorage
  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: keyof NotificationSettings) => {
    await updateSettings({ [key]: !settings[key] });
  };

  return {
    settings,
    updateSettings,
    toggleSetting,
    loading,
  };
};