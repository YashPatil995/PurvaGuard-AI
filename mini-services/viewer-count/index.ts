import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Live viewer tracking — real connections only, no dummy numbers.
const connectedClients = new Map<string, { joinedAt: number }>()

function broadcastCount() {
  const count = connectedClients.size
  io.emit('viewer-count', { count, timestamp: Date.now() })
  console.log(`[viewer-count] ${count} viewer(s) online`)
}

io.on('connection', (socket) => {
  connectedClients.set(socket.id, { joinedAt: Date.now() })
  // Send current count to the new client immediately
  socket.emit('viewer-count', { count: connectedClients.size, timestamp: Date.now() })
  // Broadcast updated count to everyone
  broadcastCount()

  socket.on('disconnect', () => {
    connectedClients.delete(socket.id)
    broadcastCount()
  })

  socket.on('error', (err) => {
    console.error('[viewer-count] socket error:', err)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[viewer-count] WebSocket service running on port ${PORT}`)
})

process.on('SIGTERM', () => httpServer.close(() => process.exit(0)))
process.on('SIGINT', () => httpServer.close(() => process.exit(0)))
