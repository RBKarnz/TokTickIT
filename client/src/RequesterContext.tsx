import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

interface RequesterContextType {
  activeRequester: RequesterUser | null;
  setActiveRequester: (requester: RequesterUser | null) => void;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [activeRequester, setActiveRequesterState] = useState<RequesterUser | null>(() => {
    const saved = localStorage.getItem('activeRequester');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (activeRequester) {
      localStorage.setItem('activeRequester', JSON.stringify(activeRequester));
    } else {
      localStorage.removeItem('activeRequester');
    }
  }, [activeRequester]);

  const setActiveRequester = (requester: RequesterUser | null) => {
    setActiveRequesterState(requester);
  };

  return (
    <RequesterContext.Provider value={{ activeRequester, setActiveRequester }}>
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester() {
  const context = useContext(RequesterContext);
  if (context === undefined) {
    throw new Error('useRequester must be used within a RequesterProvider');
  }
  return context;
}
