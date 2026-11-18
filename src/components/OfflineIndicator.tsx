import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 right-4 z-40 flex items-center gap-2 rounded-full bg-[#251E14] border border-[#E5A958]/60 px-3 py-1.5 text-xs font-medium text-[#E5A958] shadow-lg">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline · Saved on device</span>
    </div>
  );
};
