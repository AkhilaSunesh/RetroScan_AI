import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Custom colored icons for classification
const createCustomIcon = (color) => {
    return L.divIcon({
        className: 'custom-icon',
        html: `<div class="w-4 h-4 rounded-full border-2 border-base shadow-[0_0_10px_rgba(0,0,0,0.5)]" style="background-color: ${color};"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
};

const classificationIcons = {
    'High': createCustomIcon('#22c55e'),      // green
    'Medium': createCustomIcon('#eab308'),     // amber
    'Degraded': createCustomIcon('#e11d48'),   // red
    'Pass': createCustomIcon('#22c55e'),       // legacy compatibility
    'Fail': createCustomIcon('#e11d48'),       // legacy compatibility
};

function getIconForScan(scan) {
    if (scan.classification) {
        return classificationIcons[scan.classification] || classificationIcons['Degraded'];
    }
    return classificationIcons[scan.status] || classificationIcons['Degraded'];
}

export default function MapDashboard({ isDarkMode }) {
    const [scans, setScans] = useState([]);
    const [filter, setFilter] = useState('all');
    const centerOfIndia = [20.5937, 78.9629];

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('retroscan_history') || '[]');
        setScans(stored);
    }, []);

    const filteredScans = scans.filter(scan => {
        if (filter === 'all') return true;
        return (scan.classification || '').toLowerCase() === filter;
    });

    // Stats
    const stats = {
        high: scans.filter(s => s.classification === 'High').length,
        medium: scans.filter(s => s.classification === 'Medium').length,
        degraded: scans.filter(s => s.classification === 'Degraded').length,
    };

    // Choose tile layer based on theme
    const tileUrl = isDarkMode 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    return (
        <div className="flex flex-col h-full p-6 max-w-4xl mx-auto w-full mt-4">
            <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Compliance Map</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {scans.length > 0 
                        ? `${scans.length} scans recorded • Showing ${filteredScans.length}`
                        : 'Live retroreflectivity data from field scans.'
                    }
                </p>
            </div>

            {/* Stats Bar */}
            {scans.length > 0 && (
                <div className="flex gap-3 mb-4">
                    <button 
                        onClick={() => setFilter('all')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            filter === 'all' ? 'bg-primary/20 text-accent border border-primary/30' : 'bg-gray-500/10 text-gray-500 border border-transparent'
                        }`}
                    >
                        All ({scans.length})
                    </button>
                    <button 
                        onClick={() => setFilter('high')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            filter === 'high' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-gray-500/10 text-gray-500 border border-transparent'
                        }`}
                    >
                        🟢 {stats.high}
                    </button>
                    <button 
                        onClick={() => setFilter('medium')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            filter === 'medium' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-gray-500/10 text-gray-500 border border-transparent'
                        }`}
                    >
                        🟠 {stats.medium}
                    </button>
                    <button 
                        onClick={() => setFilter('degraded')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            filter === 'degraded' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-gray-500/10 text-gray-500 border border-transparent'
                        }`}
                    >
                        🔴 {stats.degraded}
                    </button>
                </div>
            )}

            {/* Map Container */}
            <div className="flex-grow w-full rounded-2xl overflow-hidden border-2 border-surface shadow-lg relative min-h-[400px] z-0">
                <MapContainer
                    center={centerOfIndia}
                    zoom={scans.length > 0 ? 6 : 4}
                    style={{ height: '500px', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url={tileUrl}
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />

                    {filteredScans.map((scan) => {
                        const lat = parseFloat(scan.lat);
                        const lng = parseFloat(scan.lng);
                        if (isNaN(lat) || isNaN(lng)) return null;

                        return (
                            <Marker
                                key={scan.id}
                                position={[lat, lng]}
                                icon={getIconForScan(scan)}
                            >
                                <Popup className="text-base">
                                    <div className="p-1 min-w-[150px]">
                                        <h3 className="font-bold text-gray-900">
                                            {scan.classification || scan.status}
                                        </h3>
                                        {scan.confidence && (
                                            <p className="text-sm text-gray-600">
                                                Confidence: {scan.confidence}%
                                            </p>
                                        )}
                                        <p className="text-sm text-gray-600">
                                            RA: {scan.estimatedRA || scan.score} cd/lux/m²
                                        </p>
                                        {scan.complianceLabel && (
                                            <p className={`text-sm font-semibold ${
                                                scan.complianceLabel === 'PASS' ? 'text-green-600' :
                                                scan.complianceLabel === 'MARGINAL' ? 'text-amber-600' : 'text-red-600'
                                            }`}>
                                                {scan.complianceIcon} {scan.complianceLabel}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {scan.date} {scan.time}
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
}