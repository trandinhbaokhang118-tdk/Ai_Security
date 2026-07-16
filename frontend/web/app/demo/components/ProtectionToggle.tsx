'use client';

import { Shield, ShieldOff } from 'lucide-react';

interface Props {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

export default function ProtectionToggle({ enabled, onChange }: Props) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={`
        flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-lg
        transition-all duration-200 transform hover:scale-105
        ${enabled
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/50'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/50'
                }
      `}
            aria-label={enabled ? 'Protection enabled - click to disable' : 'Protection disabled - click to enable'}
        >
            {enabled ? (
                <>
                    <Shield className="w-6 h-6" />
                    <span>PROTECTION ON</span>
                </>
            ) : (
                <>
                    <ShieldOff className="w-6 h-6" />
                    <span>PROTECTION OFF</span>
                </>
            )}
        </button>
    );
}
