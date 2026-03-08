/**
 * System Types - Connection and WebSocket throttling types
 */

/**
 * Connection status for the WebSocket connection
 */
export type ConnectionStatus = 'connected' | 'reconnecting' | 'failed';

/**
 * Payload emitted when a WebSocket request is throttled
 */
export interface WsThrottledPayload {
  /** The event name that was throttled */
  event: string;
  /** Time in ms before the client can retry */
  retryAfter: number;
}
