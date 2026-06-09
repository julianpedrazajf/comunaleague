import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getUnreadMessageCount } from '../services/messages';

interface MessagesContextValue {
  unreadMessageCount: number;
  refreshUnreadMessages: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextValue>({
  unreadMessageCount: 0,
  refreshUnreadMessages: async () => {},
});

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const refreshUnreadMessages = useCallback(async () => {
    try {
      const count = await getUnreadMessageCount();
      setUnreadMessageCount(count);
    } catch {}
  }, []);

  useEffect(() => { refreshUnreadMessages(); }, [refreshUnreadMessages]);

  return (
    <MessagesContext.Provider value={{ unreadMessageCount, refreshUnreadMessages }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  return useContext(MessagesContext);
}
