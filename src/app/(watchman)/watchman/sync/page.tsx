'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw, WifiOff, Wifi, Database } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

export default function WatchmanSyncPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingRecords, setPendingRecords] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    // Mock detecting network status
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check IndexedDB/LocalStorage for pending offline records (mock)
    setPendingRecords(Math.floor(Math.random() * 5));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || pendingRecords === 0) return;
    
    setIsSyncing(true);
    
    try {
      // Mock API call to sync offline records
      const res = await apiClient('/api/watchman/visitors/sync', {
        method: 'POST',
        body: JSON.stringify({ records: [] }), // Mock payload
      });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setPendingRecords(0);
      setLastSync(new Date().toLocaleTimeString());
      alert('All offline records synchronized successfully.');
    } catch (err) {
      alert('Failed to sync. Please try again later.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="animate-in fade-in p-4 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Data Sync</h1>
        <p className="text-slate-500 text-sm">Manage offline visitor records.</p>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {/* Network Status Card */}
        <Card className={`border-2 ${isOnline ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-full ${isOnline ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
            <div>
              <h3 className={`font-bold text-lg ${isOnline ? 'text-emerald-800' : 'text-red-800'}`}>
                {isOnline ? 'Online Mode' : 'Offline Mode'}
              </h3>
              <p className={`text-sm ${isOnline ? 'text-emerald-600' : 'text-red-600'}`}>
                {isOnline ? 'Connected to server' : 'Running on local storage'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sync Status Card */}
        <Card>
          <CardContent className="p-6 text-center space-y-6">
            <div className="relative inline-block">
              <Database className="w-16 h-16 text-slate-300 mx-auto" />
              {pendingRecords > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
                  {pendingRecords}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {pendingRecords} pending records
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Last synced: {lastSync}
              </p>
            </div>

            <Button 
              size="lg" 
              className="w-full gap-2" 
              disabled={!isOnline || pendingRecords === 0 || isSyncing}
              onClick={handleSync}
            >
              <RefreshCcw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            
            {!isOnline && pendingRecords > 0 && (
              <p className="text-xs text-amber-600 font-medium">
                Connect to internet to sync pending records.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
