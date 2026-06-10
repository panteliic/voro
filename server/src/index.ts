import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env'
import { authRoutes } from './api/routes/authRoutes'
import { systemRoutes } from './api/routes/systemRoutes'

const app = express()
const server = http.createServer(app)

app.use(helmet())
app.use(cors({ origin: env.clientUrls }))
app.use(express.json())
app.use(morgan('dev'))

app.use('/', systemRoutes)
app.use('/auth', authRoutes)

server.listen(env.port, () => {
  console.log(`Server radi na http://localhost:${env.port}`)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${env.port} je vec zauzet. Promeni PORT u .env fajlu.`)
    process.exit(1)
  }

  throw error
})
