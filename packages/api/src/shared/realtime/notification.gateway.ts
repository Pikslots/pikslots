import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { DefaultEventsMap, Server, Socket } from 'socket.io';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';

interface NotificationSocketData {
  userId: string;
  businessId: string | null;
}

type NotificationSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  NotificationSocketData
>;

@WebSocketGateway()
export class NotificationGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly sessionCacheService: SessionCacheService) {}

  async handleConnection(socket: NotificationSocket): Promise<void> {
    const sessionId = parseJidCookie(socket.handshake.headers.cookie);
    const session = sessionId
      ? await this.sessionCacheService.get(sessionId)
      : null;

    if (!session) {
      this.logger.debug(`Rejecting socket ${socket.id}: no valid session`);
      socket.disconnect(true);
      return;
    }

    socket.data.userId = session.userId;
    socket.data.businessId = session.businessId;

    await socket.join(`user:${session.userId}`);
    this.logger.log('Joined socket user:' + session.userId);
    if (session.businessId) await socket.join(`business:${session.businessId}`);
  }
}

/** The handshake runs on the raw upgrade request, not through Express's
 * cookie-parser middleware, so the `jid` cookie must be parsed manually
 * from the raw `Cookie` header. */
function parseJidCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;

    const name = part.slice(0, separatorIndex).trim();
    if (name !== 'jid') continue;

    const value = part.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}
