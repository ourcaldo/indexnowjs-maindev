'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, RefreshCw, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function JobProcessorTest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  const triggerJobProcessing = async () => {
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      const response = await fetch('/api/jobs/trigger-processing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error triggering job processing:', error);
      setResults({ error: 'Failed to trigger processing' });
    } finally {
      setLoading(false);
    }
  };

  const getSystemStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system/status');
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      console.error('Error getting system status:', error);
      setSystemStatus({ error: 'Failed to get status' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border-[#E0E6ED]">
        <CardHeader>
          <CardTitle className="text-lg text-[#1A1A1A] flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Backend Processing Test
          </CardTitle>
          <p className="text-sm text-[#1A1A1A]">
            Test the job processing system and view system status
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={triggerJobProcessing}
              disabled={loading}
              className="bg-[#1C2331] text-white hover:bg-[#0d1b2a] hover:text-white flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Trigger Job Processing
            </Button>
            
            <Button
              onClick={getSystemStatus}
              disabled={loading}
              variant="outline"
              className="border-[#E0E6ED] text-[#1A1A1A] hover:bg-[#F7F9FC] hover:text-[#1A1A1A] flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              System Status
            </Button>
          </div>

          {results && (
            <div className="mt-4 p-4 bg-[#F7F9FC] border border-[#E0E6ED] rounded-lg">
              <h4 className="font-semibold text-[#1A1A1A] mb-2">Processing Results:</h4>
              <pre className="text-sm text-[#1A1A1A] whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}

          {systemStatus && (
            <div className="mt-4 p-4 bg-[#F7F9FC] border border-[#E0E6ED] rounded-lg">
              <h4 className="font-semibold text-[#1A1A1A] mb-2">System Status:</h4>
              <pre className="text-sm text-[#1A1A1A] whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(systemStatus, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}