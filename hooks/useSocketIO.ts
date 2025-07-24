import { useEffect, useRef, useState } from 'react';
import { authService, AuthUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import io, { Socket } from 'socket.io-client';

interface SocketMessage {
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

interface UseSocketIOOptions {
  jobId?: string;
  onJobUpdate?: (message: SocketMessage) => void;
  onJobCompleted?: (message: SocketMessage) => void;
  onJobProgress?: (message: SocketMessage) => void;
}

export function useSocketIO(options: UseSocketIOOptions = {}) {
  const { jobId, onJobUpdate, onJobCompleted, onJobProgress } = options;
  const [user, setUser] = useState<AuthUser | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<SocketMessage | null>(null);

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

    const connectSocket = async () => {
      try {
        // Get current JWT token for authentication
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.access_token) {
          console.error('No valid session for Socket.io connection');
          return;
        }

        // Initialize Socket.io endpoint first
        await fetch('/api/socket');

        console.log('🔌 Connecting to Socket.io with JWT authentication');
        
        // Create Socket.io connection with WebSocket-only transport
        const socket = io({
          path: '/api/socketio',
          // Force WebSocket-only transport, disable polling completely
          transports: ['websocket'],
          // Additional WebSocket-only settings
          upgrade: false,
          rememberUpgrade: false,
          // Connection timeout settings
          timeout: 20000,
          // Reconnection settings
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          // Force WebSocket protocol
          forceNew: true,
          auth: {
            token: session.access_token,
            userId: user.id
          },
          query: {
            token: session.access_token,
            userId: user.id,
            ...(jobId && { jobId })
          }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ Socket.io connected via WebSocket (no polling)', (socket as any).io?.engine?.transport?.name || 'websocket');
          setIsConnected(true);
          
          // Subscribe to specific job if provided
          if (jobId) {
            socket.emit('subscribe_job', { jobId });
            console.log(`📡 Subscribed to job updates for job: ${jobId}`);
          }
          
          // Send a ping to confirm connection
          socket.emit('ping');
        });

        socket.on('connection', (data) => {
          console.log('Socket.io connection confirmed:', data);
        });

        socket.on('subscribed', (data) => {
          console.log(`✅ Successfully subscribed to job: ${data.jobId}`);
        });

        socket.on('unsubscribed', () => {
          console.log('✅ Successfully unsubscribed from job updates');
        });

        socket.on('pong', () => {
          console.log('📡 Socket.io connection active (pong received)');
        });

        // Handle job updates
        socket.on('job_update', (message: SocketMessage) => {
          console.log('📨 Job update received:', message);
          setLastMessage(message);
          onJobUpdate?.(message);
        });

        socket.on('job_progress', (message: SocketMessage) => {
          console.log('📊 Job progress received:', message);
          setLastMessage(message);
          onJobProgress?.(message);
        });

        socket.on('job_progress_detailed', (message: SocketMessage) => {
          console.log('📊 Detailed job progress received:', message);
          setLastMessage(message);
          onJobProgress?.(message);
          // Dispatch custom event for enhanced progress tracking
          window.dispatchEvent(new CustomEvent('job-progress-detailed', { 
            detail: message 
          }));
        });

        socket.on('job_completed', (message: SocketMessage) => {
          console.log('✅ Job completed:', message);
          setLastMessage(message);
          onJobCompleted?.(message);
        });

        socket.on('dashboard_stats', (message: any) => {
          console.log('📊 Dashboard stats update:', message);
          if (message.stats) {
            window.dispatchEvent(new CustomEvent('dashboard-stats-update', { 
              detail: message.stats 
            }));
          }
        });

        socket.on('url_submission_update', (message: any) => {
          console.log('🔗 URL submission update:', message);
          if (message.submission) {
            window.dispatchEvent(new CustomEvent('url-submission-update', { 
              detail: message.submission 
            }));
          }
        });

        socket.on('url_status_change', (message: any) => {
          console.log('🔄 URL status change:', message);
          if (message.submission) {
            window.dispatchEvent(new CustomEvent('url-status-change', { 
              detail: { jobId: message.jobId, submission: message.submission }
            }));
          }
        });

        socket.on('job_list_update', (message: any) => {
          console.log('📋 Job list update:', message);
          if (message.jobs) {
            window.dispatchEvent(new CustomEvent('job-list-update', { 
              detail: message.jobs 
            }));
          }
        });

        socket.on('disconnect', (reason) => {
          console.log('❌ Socket.io disconnected:', reason);
          setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
          console.error('❌ Socket.io WebSocket connection error:', error);
          setIsConnected(false);
        });

        // Log transport upgrade (should not happen in WebSocket-only mode)
        socket.on('upgrade', () => {
          console.log('🔄 Socket.io transport upgraded to:', (socket as any).io?.engine?.transport?.name || 'unknown');
        });

        // Log when transport changes  
        (socket as any).io?.on('upgrade', (transport: any) => {
          console.log('🔄 Socket.io transport changed to:', transport.name);
        });

      } catch (error) {
        console.error('Failed to establish Socket.io connection:', error);
      }
    };

    connectSocket();

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id, jobId, onJobUpdate, onJobCompleted, onJobProgress]);

  // Send message to Socket.io
  const sendMessage = (event: string, data: any) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    }
  };

  // Subscribe to a specific job
  const subscribeToJob = (newJobId: string) => {
    sendMessage('subscribe_job', { jobId: newJobId });
  };

  // Unsubscribe from job updates
  const unsubscribeFromJob = () => {
    sendMessage('unsubscribe_job', {});
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribeToJob,
    unsubscribeFromJob
  };
}