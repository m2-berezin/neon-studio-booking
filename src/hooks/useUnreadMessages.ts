import { useState } from 'react';

export const useUnreadMessages = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    setUnreadCount(0);
  };

  // Messages table doesn't exist - always returns 0
  return { unreadCount, refetch: fetchUnreadCount };
};
