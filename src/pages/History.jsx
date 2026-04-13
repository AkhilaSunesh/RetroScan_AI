import React, { useEffect, useState } from 'react';
import { Clock, Navigation, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function History() {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('retroscan_history') || '[]');
        setHistory(stored);
    }, []);

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
                        // Compare with the next scan in history (which is the previous scan chronologically since unshift was used)
                        const prevScan = history[index + 1];
                        let trend = 'neutral';
                        if (prevScan) {
                            if (scan.score > prevScan.score) trend = 'up';
                            if (scan.score < prevScan.score) trend = 'down';
                        }

                        return (
                            <div key={scan.id} className="bg-surface border border-gray-800 rounded-xl p-4 flex flex-col gap-3 shadow-md hover:border-primary/40 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className={`px-2 py-0.5 rounded text-xs font-semibold ${scan.status === 'Pass' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-500'}`}>
                                            {scan.status}
                                        </div>
                                        <span className="text-xs text-gray-600 dark:text-gray-500">{scan.date} {scan.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-lg font-bold text-accent">{scan.score}</span>
                                        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                                        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                                        {trend === 'neutral' && <Minus className="w-4 h-4 text-gray-400 dark:text-gray-600" />}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                    <Navigation className="w-3.5 h-3.5" />
                                    <span className="font-mono">{scan.lat}, {scan.lng}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
