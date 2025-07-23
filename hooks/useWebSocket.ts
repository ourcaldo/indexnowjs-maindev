import { useEffect, useRef, useState } from 'react';
import { authService, AuthUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface WebSocketMessage {
  type: string;
  jobId?: string;
  status?: string;
  progress?: {
    total_urls: number;
    processed_urls: number;
    successful_urls: number;
    failed_urls: number;
    progress_percentage: number;
  };
  current_url?: string;
  error_message?: string;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Effect to get current user and set up auth listener
  useEffect(() => {
    let isMounted = true;

    const getCurrentUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((authUser) => {
      if (isMounted) {
        setUser(authUser);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const connectWebSocket = async () => {
      try {
        // Get current JWT token for authentication
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.access_token) {
          console.error('No valid session for WebSocket connection');
          return;
        }

        // Create WebSocket connection with JWT token
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}&token=${session.access_token}${jobId ? `&jobId=${jobId}` : ''}`;
        
        console.log('🔌 Connecting to WebSocket with JWT authentication');
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ WebSocket connected with JWT authentication');
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
            console.log('📨 WebSocket message received:', message);
            
            setLastMessage(message);

            // Handle different message types
            switch (message.type) {
              case 'job_update':
                onJobUpdate?.(message);
                break;
              case 'job_progress':
                onJobProgress?.(message);
                break;
              case 'job_completed':
                onJobCompleted?.(message);
                break;
              case 'connection':
                console.log('WebSocket connection confirmed');
                break;
              case 'dashboard_stats':
                // Handle real-time dashboard stats updates
                if (message.stats) {
                  window.dispatchEvent(new CustomEvent('dashboard-stats-update', { 
                    detail: message.stats 
                  }));
                }
                break;
              case 'url_submission_update':
                // Handle real-time URL submission updates
                if (message.submission) {
                  window.dispatchEvent(new CustomEvent('url-submission-update', { 
                    detail: message.submission 
                  }));
                }
                break;
              case 'job_list_update':
                // Handle real-time job list updates for manage jobs page
                if (message.jobs) {
                  window.dispatchEvent(new CustomEvent('job-list-update', { 
                    detail: message.jobs 
                  }));
                }
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('❌ WebSocket disconnected:', event.code, event.reason);
          setIsConnected(false);
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
      }
    };

    connectWebSocket();

    // Cleanup function
    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
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