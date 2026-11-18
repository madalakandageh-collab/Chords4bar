import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomPresence, RoomSyncState } from '../types';

export type SyncConnectionStatus = 'connecting' | 'connected' | 'offline';

interface UseRoomSyncOptions {
  roomId: string;
  role: 'leader' | 'member';
  deviceName?: string;
  onRemoteState?: (state: RoomSyncState, serverTime: number) => void;
}

export function useRoomSync({ roomId, role, deviceName, onRemoteState }: UseRoomSyncOptions) {
  const [status, setStatus] = useState<SyncConnectionStatus>('connecting');
  const [presence, setPresence] = useState<RoomPresence>({
    roomId,
    memberCount: 0,
    leaderConnected: role === 'leader',
    members: [],
  });
  const [rttMs, setRttMs] = useState<number | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const clientIdRef = useRef<string>(
    `${role}-${Math.random().toString(36).slice(2, 10)}`
  );
  const onRemoteStateRef = useRef(onRemoteState);
  onRemoteStateRef.current = onRemoteState;

  const latestLeaderStateRef = useRef<RoomSyncState | null>(null);

  const sendState = useCallback(
    (state: RoomSyncState) => {
      if (role !== 'leader') return;
      latestLeaderStateRef.current = state;

      const payload = {
        type: 'leader:sync_state',
        roomId,
        state,
      };

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
      if (bcRef.current) {
        try {
          bcRef.current.postMessage({
            type: 'room:state',
            serverTime: Date.now(),
            state,
            senderId: clientIdRef.current,
          });
        } catch {
          // Ignore BroadcastChannel errors
        }
      }
    },
    [role, roomId]
  );

  const sendDelta = useCallback(
    (patch: Partial<RoomSyncState>) => {
      if (role !== 'leader') return;
      if (latestLeaderStateRef.current) {
        latestLeaderStateRef.current = { ...latestLeaderStateRef.current, ...patch, updatedAt: Date.now() };
      }

      const payload = {
        type: 'leader:delta',
        roomId,
        patch,
      };

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
      if (bcRef.current && latestLeaderStateRef.current) {
        try {
          bcRef.current.postMessage({
            type: 'room:state',
            serverTime: Date.now(),
            state: latestLeaderStateRef.current,
            senderId: clientIdRef.current,
          });
        } catch {
          // Ignore
        }
      }
    },
    [role, roomId]
  );

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: number | null = null;
    let pingTimer: number | null = null;

    // BroadcastChannel for zero-latency local / preview sync even without network
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(`chordbook-room-${roomId.toUpperCase()}`);
      bcRef.current = bc;
      bc.onmessage = (ev) => {
        const data = ev.data as Record<string, unknown>;
        if (!data || data.senderId === clientIdRef.current) return;
        if (data.type === 'room:state' && data.state && role === 'member') {
          onRemoteStateRef.current?.(data.state as RoomSyncState, (data.serverTime as number) || Date.now());
        } else if (data.type === 'member:hello' && role === 'leader' && latestLeaderStateRef.current) {
          bc.postMessage({
            type: 'room:state',
            serverTime: Date.now(),
            state: latestLeaderStateRef.current,
            senderId: clientIdRef.current,
          });
        }
      };

      if (role === 'member') {
        bc.postMessage({ type: 'member:hello', senderId: clientIdRef.current });
      }
    }

    function connect() {
      if (disposed) return;
      setStatus('connecting');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (disposed) {
            ws.close();
            return;
          }
          setStatus('connected');

          ws.send(
            JSON.stringify({
              type: 'room:join',
              roomId,
              clientId: clientIdRef.current,
              role,
              deviceName: deviceName || (role === 'leader' ? 'Band Leader' : 'Stage Phone'),
            })
          );

          // If leader already has state, push immediately upon connecting/reconnecting
          if (role === 'leader' && latestLeaderStateRef.current) {
            ws.send(
              JSON.stringify({
                type: 'leader:sync_state',
                roomId,
                state: latestLeaderStateRef.current,
              })
            );
          }

          // Start millisecond clock-offset ping/pong
          const sendPing = () => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'sync:ping', clientSendTime: Date.now() }));
            }
          };
          sendPing();
          pingTimer = window.setInterval(sendPing, 3000);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string) as Record<string, unknown>;
            if (msg.type === 'sync:pong') {
              const clientSendTime = Number(msg.clientSendTime);
              const serverTime = Number(msg.serverTime);
              const now = Date.now();
              const rtt = Math.max(0, now - clientSendTime);
              const offset = serverTime + rtt / 2 - now;
              setRttMs(rtt);
              setClockOffsetMs(offset);
            } else if (msg.type === 'room:presence' && msg.presence) {
              setPresence(msg.presence as RoomPresence);
            } else if (msg.type === 'room:state' && msg.state && role === 'member') {
              onRemoteStateRef.current?.(
                msg.state as RoomSyncState,
                Number(msg.serverTime) || Date.now()
              );
            }
          } catch {
            // Ignore malformed socket message
          }
        };

        ws.onclose = () => {
          if (pingTimer !== null) {
            clearInterval(pingTimer);
            pingTimer = null;
          }
          if (!disposed) {
            setStatus('offline');
            reconnectTimer = window.setTimeout(connect, 2000);
          }
        };

        ws.onerror = () => {
          if (!disposed) {
            setStatus('offline');
          }
        };
      } catch {
        setStatus('offline');
        reconnectTimer = window.setTimeout(connect, 2500);
      }
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      if (pingTimer !== null) clearInterval(pingTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (bcRef.current) {
        bcRef.current.close();
        bcRef.current = null;
      }
    };
  }, [roomId, role, deviceName]);

  return {
    status,
    presence,
    rttMs,
    clockOffsetMs,
    sendState,
    sendDelta,
  };
}
