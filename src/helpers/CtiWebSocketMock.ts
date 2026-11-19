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

/**
 * A regex literal is "/body/flags" where the body has no unescaped "/" and the flags are valid
 * JavaScript regex flags, e.g. /wss:\/\/.*\/cti/. Anything else is a URL fragment with optional
 * "*" wildcards, e.g. /ws/cti or wss://*\/cti, matched anywhere in the WebSocket URL.
 * (Before, "/ws/cti" was read as the regex /ws/ with flags "cti" and threw a SyntaxError.)
 */
const REGEX_LITERAL = /^\/((?:\\.|[^\\/])+)\/([dgimsuvy]*)$/;

export function buildMatcher(pattern: string): RegExp {
  const trimmed = pattern.trim();
  if (!trimmed) {
    throw new Error('CTI_WS_PATTERN is empty');
  }

  const literal = REGEX_LITERAL.exec(trimmed);
  if (literal) {
    const [, body, flags] = literal;
    if (new Set(flags).size === flags.length) {
      return new RegExp(body, flags);
    }
  }

  // URL fragment with wildcards
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexBody = escaped.replace(/\\\*/g, '.*');
  return new RegExp(regexBody);
}
