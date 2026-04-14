import React, { useEffect, useState } from 'react';
import { Clock, Navigation, TrendingUp, TrendingDown, Minus, Shield } from 'lucide-react';

export default function History() {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('retroscan_history') || '[]');
        setHistory(stored);
    }, []);

    // Color mapping for classifications
    const classColors = {
        High: 'bg-green-500/20 text-green-600 dark:text-green-400',
        Medium: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
        Degraded: 'bg-red-500/20 text-red-600 dark:text-red-400',
        Pass: 'bg-green-500/20 text-green-600 dark:text-green-400',
        Fail: 'bg-red-500/20 text-red-600 dark:text-red-500',
    };

    return (
        <div className="p-6 max-w-md mx-auto w-full h-full pb-24 overflow-y-auto mt-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Scan History</h2>
            
            {history.length === 0 ? (
                <div className="text-center text-gray-600 dark:text-gray-500 mt-20">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No scans recorded yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {history.map((scan, index) => {
                        const prevScan = history[index + 1];
                        let trend = 'neutral';
                        if (prevScan) {
                            if (scan.score > prevScan.score) trend = 'up';
                            if (scan.score < prevScan.score) trend = 'down';
                        }

                        const displayClass = scan.classification || scan.status || 'Unknown';
                        const colorClass = classColors[displayClass] || classColors['Fail'];

                        return (
                            <div key={scan.id} className="bg-surface border border-gray-800 rounded-xl p-4 flex flex-col gap-3 shadow-md hover:border-primary/40 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Classification badge */}
                                        <div className={`px-2 py-0.5 rounded text-xs font-semibold ${colorClass}`}>
                                            {displayClass}
                                        </div>
                                        {/* Compliance badge */}
                                        {scan.complianceLabel && (
                                            <div className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                                                scan.complianceLabel === 'PASS' ? 'bg-green-500/10 text-green-500' :
                                                scan.complianceLabel === 'MARGINAL' ? 'bg-amber-500/10 text-amber-500' :
                                                'bg-red-500/10 text-red-500'
                                            }`}>
                                                <Shield className="w-3 h-3" />
                                                {scan.complianceLabel}
                                            </div>
                                        )}
                                        <span className="text-xs text-gray-600 dark:text-gray-500">{scan.date} {scan.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-lg font-bold text-accent">
                                            {scan.estimatedRA || scan.score}
                                        </span>
                                        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                                        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                                        {trend === 'neutral' && <Minus className="w-4 h-4 text-gray-400 dark:text-gray-600" />}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                        <Navigation className="w-3.5 h-3.5" />
                                        <span className="font-mono">{scan.lat}, {scan.lng}</span>
                                    </div>
                                    {scan.confidence && (
                                        <span className="text-xs text-gray-500">
                                            {scan.confidence}% confidence
                                            {scan.conditionIcon && ` • ${scan.conditionIcon}`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
