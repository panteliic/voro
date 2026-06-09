import express from 'express'
import http from 'http'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true })
dotenv.config({ quiet: true })

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 3000
const CLIENT_URLS = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean)

app.use(helmet())
app.use(cors({ origin: CLIENT_URLS }))
app.use(express.json())
app.use(morgan('dev'))

app.get('/', (_req, res) => {
  res.json({
    name: 'voro-server',
    status: 'ok',
    health: '/health',
    clients: CLIENT_URLS,
  })
})

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    port: Number(PORT),
  })
})

server.listen(PORT, () => {
  console.log(`Server radi na http://localhost:${PORT}`)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} je vec zauzet. Promeni PORT u .env fajlu.`)
    process.exit(1)
  }

  throw error
})
