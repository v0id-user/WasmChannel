import { Hono } from 'hono'
import { RPCHandler } from '@orpc/server/fetch'
import { router } from './routers'
import { cors } from 'hono/cors'
import { createDb } from './db'
import { createAuthWithD1 } from '../auth'

const app = new Hono<{ Bindings: CloudflareBindings }>()
const handler = new RPCHandler(router)

// Enable CORS for all routes
app.use('/rpc/*', cors({
  origin: 'http://localhost:3000',
  allowMethods: ['GET', 'POST','OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

app.use('/rpc/*', async (c, next) => {
  const db = createDb(c.env.DB)
  console.log('DB created for RPC:', !!db)
  
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: '/rpc',
    context: { db }
  })

  if (matched) {
    return c.newResponse(response.body, response)
  }

  await next()
})

app.get('/', (c) => {
  const db = createDb(c.env.DB)
  console.log('DB initialized:', !!db)
  return c.text('Hello Hono!')
})

// Test auth endpoint
app.get('/auth/test', async (c) => {
  try {
    const db = createDb(c.env.DB)
    const auth = createAuthWithD1(c.env.DB)
    console.log('Auth initialized:', !!auth)
    console.log('DB initialized:', !!db)
    
    return c.json({ 
      success: true, 
      message: 'Database and Auth bindings working!',
      dbReady: !!db,
      authReady: !!auth
    })
  } catch (error) {
    console.error('Auth test error:', error)
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

export default app
