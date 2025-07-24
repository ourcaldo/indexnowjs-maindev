import { Server } from 'socket.io'
import { supabaseAdmin } from '../../lib/supabase'
import { SocketIOBroadcaster } from '../../lib/socketio-broadcaster'

const SocketHandler = (req, res) => {
  if (res.socket.server.io) {
    console.log('WebSocket server is already running')
  } else {
    console.log('Initializing WebSocket server with Socket.io')
    
    const io = new Server(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      // Force WebSocket-only transport, completely disable polling
      transports: ['websocket'],
      // Disable all polling-related features
      upgrade: false,
      allowUpgrades: false,
      rememberUpgrade: false,
      // WebSocket-specific settings
      pingTimeout: 60000,
      pingInterval: 25000,
      // Enhanced CORS for WebSocket
      cors: {
        origin: ["http://localhost:5000", "https://*.replit.dev", "https://*.replit.app"],
        methods: ["GET", "POST"],
        credentials: true
      },
      // Disable HTTP long-polling fallback
      allowEIO3: false
    })
    
    res.socket.server.io = io
    
    // Connect the broadcaster to this Socket.IO instance
    const broadcaster = SocketIOBroadcaster.getInstance()
    broadcaster.setIO(io)
    
    // Also set it globally for background worker access
    global.socketIo = io

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token
        const userId = socket.handshake.auth.userId || socket.handshake.query.userId

        if (!token || !userId) {
          return next(new Error('Authentication failed: Missing token or userId'))
        }

        // Verify JWT token with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
        
        if (error || !user || user.id !== userId) {
          return next(new Error('Authentication failed: Invalid token'))
        }

        // Verify user exists in our user profiles table
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('indb_auth_user_profiles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (profileError || !profile) {
          return next(new Error('Authentication failed: User profile not found'))
        }

        socket.userId = userId
        socket.user = user
        next()
      } catch (authError) {
        next(new Error('Authentication failed'))
      }
    })

    // Set up connection handling
    io.on('connection', (socket) => {
      console.log(`✅ Socket.io client connected: ${socket.id} (user: ${socket.userId})`)
      
      // Send connection confirmation
      socket.emit('connection', {
        message: 'Connected to IndexNow Pro WebSocket',
        clientId: socket.id
      })

      // Handle job subscription
      socket.on('subscribe_job', (data) => {
        const jobRoom = `job-${data.jobId}`
        socket.join(jobRoom)
        socket.currentJobId = data.jobId
        console.log(`📡 Client ${socket.id} subscribed to job: ${data.jobId}`)
        socket.emit('subscribed', { jobId: data.jobId })
      })
      
      // Handle job unsubscription
      socket.on('unsubscribe_job', (data) => {
        if (socket.currentJobId) {
          const jobRoom = `job-${socket.currentJobId}`
          socket.leave(jobRoom)
          console.log(`📡 Client ${socket.id} unsubscribed from job: ${socket.currentJobId}`)
          socket.currentJobId = null
          socket.emit('unsubscribed')
        }
      })

      // Handle ping
      socket.on('ping', () => {
        socket.emit('pong')
      })

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`❌ Socket.io client disconnected: ${socket.id} (reason: ${reason})`)
      })
    })

    // Store the io instance globally for other parts of the app to use
    global.socketIo = io
    console.log('✅ WebSocket server initialized successfully')
  }
  res.end()
}

export default SocketHandler