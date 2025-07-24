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

// Singleton WebSocket connection manager to prevent multiple connections
class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private isConnecting = false;
  private connectionPromise: Promise<Socket> | null = null;
  private subscribers = new Set<string>();
  private lastUserId: string | null = null;
  private isInitialized = false;
  private subscribedJobs = new Set<string>();
  private endpointInitialized = false;

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  async getConnection(userId: string, token: string): Promise<Socket> {
    // If we already have a valid connection for the same user, return it immediately
    if (this.socket && this.socket.connected && this.lastUserId === userId) {
      console.log('🔄 Reusing existing Socket.io connection for user:', userId);
      return this.socket;
    }

    // If user changed, disconnect old connection
    if (this.socket && this.lastUserId && this.lastUserId !== userId) {
      console.log('👤 User changed, disconnecting old connection');
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
    }

    // If we're already connecting for this user, wait for the existing connection attempt
    if (this.connectionPromise && this.lastUserId === userId) {
      console.log('⏳ Waiting for existing connection attempt');
      return this.connectionPromise;
    }

    // Create new connection promise
    this.lastUserId = userId;
    this.connectionPromise = this.createConnection(userId, token);
    return this.connectionPromise;
  }

  private async createConnection(userId: string, token: string): Promise<Socket> {
    // Cleanup existing socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('🔌 Creating Socket.io connection with WebSocket-only transport');
    
    // Create Socket.io connection with WebSocket-only transport - NO POLLING
    const socket = io({
      path: '/api/socketio',
      // CRITICAL: Force WebSocket-only transport to eliminate polling
      transports: ['websocket'],
      // Disable all polling-related features
      upgrade: false,
      rememberUpgrade: false,
      // Connection settings
      timeout: 20000,
      // Reconnection settings
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      // IMPORTANT: Do NOT force new connection to reuse existing ones
      forceNew: false,
      // Authentication
      auth: {
        token,
        userId
      },
      query: {
        token,
        userId
      }
    });

    this.socket = socket;

    // Setup connection handlers
    socket.on('connect', () => {
      console.log('✅ Socket.io connected via WebSocket-only (transport:', (socket as any).io?.engine?.transport?.name || 'websocket', ')');
      this.isConnecting = false;
    });

    socket.on('disconnect', (reason: string) => {
      console.log(`❌ Socket.io disconnected: ${reason}`);
      this.isConnecting = false;
      this.connectionPromise = null;
      
      // Don't immediately reconnect if it was a deliberate disconnect
      if (reason === 'io client disconnect' || reason === 'io server disconnect') {
        console.log('🔌 Connection was deliberately closed, not reconnecting');
        this.socket = null;
      }
    });

    socket.on('connect_error', (error: any) => {
      console.error('❌ Socket.io connection error:', error);
      this.isConnecting = false;
      this.connectionPromise = null;
    });

    // Wait for connection to establish
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 20000);

      socket.once('connect', () => {
        clearTimeout(timeout);
        this.connectionPromise = null;
        resolve(socket);
      });

      socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        this.connectionPromise = null;
        reject(error);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.connectionPromise = null;
      this.subscribers.clear();
      this.subscribedJobs.clear();
    }
  }

  addSubscriber(id: string) {
    this.subscribers.add(id);
  }

  hasSubscriber(id: string): boolean {
    return this.subscribers.has(id);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  setInitialized(value: boolean): void {
    this.isInitialized = value;
  }

  removeSubscriber(id: string) {
    this.subscribers.delete(id);
    console.log(`📤 Hook ${id} unsubscribed. Active subscribers: ${this.subscribers.size}`);
    
    // Keep connection alive if there are any subscribers, disconnect after delay if none
    if (this.subscribers.size === 0) {
      console.log('🔌 No more subscribers, scheduling disconnect in 5 seconds');
      setTimeout(() => {
        if (this.subscribers.size === 0 && this.socket) {
          console.log('🔌 Disconnecting Socket.io after timeout');
          this.disconnect();
        }
      }, 5000);
    }
  }

  // Track job subscriptions to prevent duplicates
  isJobSubscribed(jobId: string): boolean {
    return this.subscribedJobs.has(jobId);
  }

  addJobSubscription(jobId: string) {
    this.subscribedJobs.add(jobId);
  }

  removeJobSubscription(jobId: string) {
    this.subscribedJobs.delete(jobId);
  }

  clearJobSubscriptions() {
    this.subscribedJobs.clear();
  }

  isEndpointInitialized(): boolean {
    return this.endpointInitialized;
  }

  setEndpointInitialized(value: boolean) {
    this.endpointInitialized = value;
  }
}

export function useSocketIO(options: UseSocketIOOptions = {}) {
  const { jobId, onJobUpdate, onJobCompleted, onJobProgress } = options;
  const [user, setUser] = useState<AuthUser | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<SocketMessage | null>(null);
  const hookId = useRef(Math.random().toString(36).substr(2, 9));
  const socketManager = SocketManager.getInstance();

  // Get current user once
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

  // Single effect for socket connection management
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    const currentHookId = hookId.current;

    const connectSocket = async () => {
      try {
        // Get current JWT token for authentication
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.access_token) {
          console.error('No valid session for Socket.io connection');
          return;
        }

        // Initialize Socket.io endpoint to ensure server is running (only once globally)
        if (!socketManager.isEndpointInitialized()) {
          console.log('🔌 Initializing Socket.io endpoint...');
          await fetch('/api/socket');
          socketManager.setEndpointInitialized(true);
          console.log('✅ Socket.io endpoint initialized');
        }

        // Register this hook as a subscriber (avoid duplicates)
        if (!socketManager.hasSubscriber(currentHookId)) {
          socketManager.addSubscriber(currentHookId);
        }

        // Get shared socket connection (singleton pattern)
        const socket = await socketManager.getConnection(user.id, session.access_token);
        
        if (!isMounted) return;

        socketRef.current = socket;
        setIsConnected(socket.connected);

        // Setup event handlers for this specific hook instance
        const handleConnect = () => {
          if (isMounted) {
            setIsConnected(true);
            
            // Subscribe to specific job if provided (prevent duplicate subscriptions)
            if (jobId && !socketManager.isJobSubscribed(jobId)) {
              socket.emit('subscribe_job', { jobId });
              socketManager.addJobSubscription(jobId);
              console.log(`📡 Subscribed to job updates for job: ${jobId}`);
            }
          }
        };

        const handleDisconnect = () => {
          if (isMounted) {
            setIsConnected(false);
          }
        };

        const handleJobUpdate = (message: SocketMessage) => {
          if (isMounted) {
            console.log('📨 Job update received:', message);
            setLastMessage(message);
            onJobUpdate?.(message);
          }
        };

        const handleJobProgress = (message: SocketMessage) => {
          if (isMounted) {
            console.log('📊 Job progress received:', message);
            setLastMessage(message);
            onJobProgress?.(message);
          }
        };

        const handleJobCompleted = (message: SocketMessage) => {
          if (isMounted) {
            console.log('✅ Job completed:', message);
            setLastMessage(message);
            onJobCompleted?.(message);
          }
        };

        // Attach event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('job_update', handleJobUpdate);
        socket.on('job_progress', handleJobProgress);
        socket.on('job_completed', handleJobCompleted);

        // If already connected, trigger connect handler
        if (socket.connected) {
          handleConnect();
        }

        // Cleanup function
        return () => {
          socket.off('connect', handleConnect);
          socket.off('disconnect', handleDisconnect);
          socket.off('job_update', handleJobUpdate);
          socket.off('job_progress', handleJobProgress);
          socket.off('job_completed', handleJobCompleted);
        };

      } catch (error) {
        console.error('Failed to connect Socket.io:', error);
      }
    };

    connectSocket();

    return () => {
      isMounted = false;
      // Unregister this hook as a subscriber
      socketManager.removeSubscriber(currentHookId);
      
      // Remove job subscription if this was the subscribing hook
      if (jobId && socketManager.isJobSubscribed(jobId)) {
        socketManager.removeJobSubscription(jobId);
        console.log(`📤 Removed job subscription for: ${jobId}`);
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