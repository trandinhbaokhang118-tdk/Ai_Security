/**
 * Hook for managing demo session state
 */

import { useState, useEffect } from 'react';

export function useDemoSession() {
    const [sessionId, setSessionId] = useState<string>('');

    useEffect(() => {
        // Try to restore from sessionStorage
        const stored = sessionStorage.getItem('demo_session_id');
        if (stored) {
            setSessionId(stored);
        } else {
            // Generate new session ID
            const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            setSessionId(newId);
            sessionStorage.setItem('demo_session_id', newId);
        }
    }, []);

    const resetSession = () => {
        const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(newId);
        sessionStorage.setItem('demo_session_id', newId);
    };

    return { sessionId, resetSession };
}
