import { os } from '@orpc/server'

export const ping = os.handler(async () => 'ping')
export const pong = os.handler(async () => 'pong')
