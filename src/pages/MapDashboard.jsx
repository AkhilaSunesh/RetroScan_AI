import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';

// Custom colored icons for classification
const createCustomIcon = (color) => {
    return L.divIcon({
        className: 'custom-icon',
        html: `<div class="w-4 h-4 rounded-full border-2 border-base shadow-[0_0_10px_rgba(0,0,0,0.5)]" style="background-color: ${color};"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
};

const userLocationIcon = L.divIcon({
    className: 'custom-icon',
    html: `<div style="width:14px;height:14px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 3px rgba(59,130,246,0.3), 0 0 12px rgba(59,130,246,0.5);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
});

const classificationIcons = {
    'High': createCustomIcon('#22c55e'),
    'Medium': createCustomIcon('#eab308'),
    'Degraded': createCustomIcon('#e11d48'),
    'Pass': createCustomIcon('#22c55e'),
    'Fail': createCustomIcon('#e11d48'),
};

function getIconForScan(scan) {
    if (scan.classification) {
        return classificationIcons[scan.classification] || classificationIcons['Degraded'];
    }
    return classificationIcons[scan.status] || classificationIcons['Degraded'];
}

/**
 * Component that flies the map to a target position.
 * react-leaflet's MapContainer center is immutable after mount,
 * so we need useMap() to programmatically move it.
 */
function FlyToLocation({ position, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, zoom, { duration: 1.5 });
        }
    }, [position, zoom, map]);
    return null;
}

export default function MapDashboard({ isDarkMode }) {
    const [scans, setScans] = useState([]);
    const [filter, setFilter] = useState('all');
    const [userLocation, setUserLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // fallback: center of India
    const [mapZoom, setMapZoom] = useState(4);

    useEffect(() => {
        // Load scan history
        const stored = JSON.parse(localStorage.getItem('retroscan_history') || '[]');
        setScans(stored);

        // Get user's current GPS location
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = [position.coords.latitude, position.coords.longitude];
                    setUserLocation(loc);
                    setMapCenter(loc);
                    setMapZoom(14); // Street-level zoom
                },
                (err) => {
                    console.warn('GPS not available for map:', err);
                    // Fall back to scan locations if available
                    if (stored.length > 0) {
                        const latest = stored[0];
                        const lat = parseFloat(latest.lat);
                        const lng = parseFloat(latest.lng);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            setMapCenter([lat, lng]);
                            setMapZoom(13);
                        }
                    }
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        }
    }, []);

    const filteredScans = scans.filter(scan => {
        if (filter === 'all') return true;
        return (scan.classification || '').toLowerCase() === filter;
    });

    const stats = {
        high: scans.filter(s => s.classification === 'High').length,
        medium: scans.filter(s => s.classification === 'Medium').length,
        degraded: scans.filter(s => s.classification === 'Degraded').length,
    };

    const tileUrl = isDarkMode 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    const recenterToUser = () => {
        if (userLocation) {
            setMapCenter([...userLocation]); // spread to create new ref and trigger FlyTo
            setMapZoom(14);
        }
    };

    return (
        <div className="flex flex-col h-full p-6 max-w-4xl mx-auto w-full mt-4">
            <div className="mb-4 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Compliance Map</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {scans.length > 0 
                            ? `${scans.length} scans recorded • Showing ${filteredScans.length}`
                            : 'Live retroreflectivity data from field scans.'
                        }
                    </p>
                </div>
                {/* Re-center button */}
                {userLocation && (
                    <button
                        onClick={recenterToUser}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                        title="Center on my location"
                    >
                        <Crosshair className="w-3.5 h-3.5" />
                        My Location
                    </button>
                )}
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
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '500px', width: '100%' }}
                    zoomControl={false}
                >
                    <FlyToLocation position={mapCenter} zoom={mapZoom} />

                    <TileLayer
                        url={tileUrl}
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />

                    {/* User's current location — blue dot with pulse */}
                    {userLocation && (
                        <>
                            <Circle
                                center={userLocation}
                                radius={50}
                                pathOptions={{
                                    color: '#3b82f6',
                                    fillColor: '#3b82f6',
                                    fillOpacity: 0.1,
                                    weight: 1,
                                }}
                            />
                            <Marker position={userLocation} icon={userLocationIcon}>
                                <Popup>
                                    <div className="p-1 text-center">
                                        <p className="font-bold text-gray-900">📍 Your Location</p>
                                        <p className="text-xs text-gray-500 font-mono">
                                            {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>
                        </>
                    )}

                    {/* Scan markers */}
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