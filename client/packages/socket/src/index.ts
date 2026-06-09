import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client'

export type SocketClientOptions = Partial<ManagerOptions & SocketOptions>

export function createSocketClient(
  url: string,
  options: SocketClientOptions = {},
): Socket {
  return io(url, {
    autoConnect: false,
    ...options,
  })
}
