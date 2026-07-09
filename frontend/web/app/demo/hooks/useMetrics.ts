/**
 * Hook for metrics state management with WebSocket updates
 */

import { useState, useEffect } from 'react';
import { MetricsResponse, WebSocketMessage } from '../types';
import { useWebSocket } from './useWebSocket';

export function useMetrics(sessionId: string) {
    const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch initial metrics
    useEffect(() => {
        if (!sessionId) return;

        const fetchMetrics = async () => {
            try {
                const response = await fetch(`/v1/demo/metrics?session_id=${sessionId}`);
                if (response.ok) {
                    const data = await response.json();
                    setMetrics(data);
                } else if (response.status === 404) {
                    // Session not found - initialize empty metrics
                    setMetrics({
                        session_id: sessionId,
                        protection_off: {
                            attack_count: 0,
                            blocked_count: 0,
                            success_count: 0,
                            block_rate: 0,
                            success_rate: 0,
                            avg_time_ms: 0,
                        },
                        protection_on: {
                            attack_count: 0,
                            blocked_count: 0,
                            success_count: 0,
                            block_rate: 0,
                            success_rate: 0,
                            avg_time_ms: 0,
                        },
                        improvement_percentage: 0,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch metrics:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMetrics();
    }, [sessionId]);

    // Subscribe to WebSocket updates
    useWebSocket(sessionId, {
        onMessage: (message: WebSocketMessage) => {
            if (message.type === 'metrics_update') {
                setMetrics(message.data);
            }
        },
    });

    return { metrics, isLoading };
}
