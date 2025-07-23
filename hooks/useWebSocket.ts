import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

interface WebSocketMessage {
  type: string;
  jobId?: string;
  status?: string;
  progress?: number;
  processedUrls?: number;
  successfulUrls?: number;
  failedUrls?: number;
  totalUrls?: number;
  completedAt?: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  jobId?: string;
  onJobUpdate?: (message: WebSocketMessage) => void;
  onJobCompleted?: (message: WebSocketMessage) => void;
  onJobProgress?: (message: WebSocketMessage) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { jobId, onJobUpdate, onJobCompleted, onJobProgress } = options;
  const { user } = useSupabaseUser();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}${jobId ? `&jobId=${jobId}` : ''}`;
    
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      
      // Subscribe to specific job if provided
      if (jobId) {
        ws.send(JSON.stringify({
          type: 'subscribe_job',
          jobId: jobId
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('📨 WebSocket message:', message);
        
        setLastMessage(message);

        // Call specific handlers based on message type
        if (message.type === 'job_update' || message.type === 'job_progress') {
          onJobUpdate?.(message);
          if (message.type === 'job_progress') {
            onJobProgress?.(message);
          }
        } else if (message.type === 'job_completed') {
          onJobCompleted?.(message);
          onJobUpdate?.(message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [user?.id, jobId, onJobUpdate, onJobCompleted, onJobProgress]);

  // Send message to WebSocket
  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  // Subscribe to a specific job
  const subscribeToJob = (newJobId: string) => {
    sendMessage({
      type: 'subscribe_job',
      jobId: newJobId
    });
  };

  // Unsubscribe from job updates
  const unsubscribeFromJob = () => {
    sendMessage({
      type: 'unsubscribe_job'
    });
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribeToJob,
    unsubscribeFromJob
  };
}