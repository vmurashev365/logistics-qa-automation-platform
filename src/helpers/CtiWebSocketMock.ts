/**
 * CtiWebSocketMock
 *
 * Uses Playwright's page.routeWebSocket() to mock the CTI WebSocket used by the web UI.
 */

import type { Page, WebSocketRoute } from 'playwright';

export interface IncomingCallEvent {
  event: 'incoming_call';
  caller_id: string;
  timestamp: number;
}

export class CtiWebSocketMock {
  private clientSocket: WebSocketRoute | null = null;
  private readonly connectionPromise: Promise<WebSocketRoute>;

  private constructor(private readonly page: Page, connectionPromise: Promise<WebSocketRoute>) {
    this.connectionPromise = connectionPromise;
  }

  /**
   * Install a WebSocket route and wait for the UI to open a matching socket.
   *
   * Pattern handling:
   * - If pattern looks like a JS regex literal (e.g. /wss:\/\/.*\/cti/), it will be parsed.
   * - Otherwise, '*' wildcards are supported.
   */
  static async install(page: Page, pattern: string): Promise<CtiWebSocketMock> {
    const matcher = buildMatcher(pattern);

    let resolveSocket: ((ws: WebSocketRoute) => void) | undefined;
    const connectionPromise = new Promise<WebSocketRoute>(resolve => {
      resolveSocket = resolve;
    });

    await page.routeWebSocket(matcher, ws => {
      // In mock mode we do not connectToServer(); this becomes the server.
      ws.onMessage(() => {
        // Intentionally ignore client-originated messages by default.
      });
      resolveSocket?.(ws);
    });

    return new CtiWebSocketMock(page, connectionPromise);
  }

  async waitForConnection(timeoutMs: number = 15000): Promise<WebSocketRoute> {
    if (this.clientSocket) return this.clientSocket;

    const timeout = new Promise<never>((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error(`Timed out waiting for CTI WebSocket connection after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    this.clientSocket = await Promise.race([this.connectionPromise, timeout]);
    return this.clientSocket;
  }

  async sendIncomingCall(callerId: string): Promise<void> {
    const ws = await this.waitForConnection();

    const event: IncomingCallEvent = {
      event: 'incoming_call',
      caller_id: callerId,
      timestamp: Date.now(),
    };

    ws.send(JSON.stringify(event));

    // Give the UI a short beat to react.
    await this.page.waitForTimeout(250);
  }
}

function buildMatcher(pattern: string): string | RegExp {
  const trimmed = pattern.trim();

  // Regex literal support: /.../flags
  if (trimmed.startsWith('/') && trimmed.lastIndexOf('/') > 0) {
    const lastSlash = trimmed.lastIndexOf('/');
    const body = trimmed.slice(1, lastSlash);
    const flags = trimmed.slice(lastSlash + 1);
    return new RegExp(body, flags);
  }

  // Wildcard support
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexBody = escaped.replace(/\*/g, '.*');
  return new RegExp(regexBody);
}
