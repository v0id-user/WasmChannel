import { Hono } from 'hono'
import { RPCHandler } from '@orpc/server/fetch'
import { router } from './routers'
import { cors } from 'hono/cors'

const app = new Hono()
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
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: '/rpc',
    context: {} // Provide initial context if needed
  })

  if (matched) {
    return c.newResponse(response.body, response)
  }

  await next()
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
