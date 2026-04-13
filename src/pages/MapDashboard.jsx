import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet requires a bit of custom CSS for div icons
const createCustomIcon = (color) => {
    return L.divIcon({
        className: 'custom-icon',
        html: `<div class="w-4 h-4 rounded-full border-2 border-base shadow-[0_0_10px_rgba(0,0,0,0.5)]" style="background-color: ${color};"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
};

// Define our three status colors (matching your Tailwind config)
const icons = {
    critical: createCustomIcon('#e11d48'), // Rose-600 (Primary)
    warning: createCustomIcon('#eab308'),  // Yellow-500
    good: createCustomIcon('#22c55e')      // Green-500
};

export default function MapDashboard({ isDarkMode }) {
    const centerOfIndia = [20.5937, 78.9629];

    // Choose tile layer based on theme
    const tileUrl = isDarkMode 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    // Mock data: Simulating damaged signs on the highway
    const mockData = [
        { id: 1, lat: 28.6139, lng: 77.2090, status: 'critical', city: 'Delhi - NH44' },
        { id: 2, lat: 19.0760, lng: 72.8777, status: 'warning', city: 'Mumbai - NH48' },
        { id: 3, lat: 13.0827, lng: 80.2707, status: 'good', city: 'Chennai - NH16' }
    ];

    return (
        <div className="flex flex-col h-full p-6 max-w-4xl mx-auto w-full mt-4">
            <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Deterioration Heatmap</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Live retroreflectivity data from field scans.</p>
            </div>

            {/* Map Container */}
            <div className="flex-grow w-full rounded-2xl overflow-hidden border-2 border-surface shadow-lg relative min-h-[400px] z-0">
                <MapContainer
                    center={centerOfIndia}
                    zoom={4}
                    style={{ height: '500px', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        url={tileUrl}
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />

                    {/* Plotting the data points */}
                    {mockData.map((point) => (
                        <Marker
                            key={point.id}
                            position={[point.lat, point.lng]}
                            icon={icons[point.status]}
                        >
                            <Popup className="text-base">
                                <div className="p-1">
                                    <h3 className="font-bold text-gray-900">{point.city}</h3>
                                    <p className="text-sm text-gray-600">Status: <span className="font-semibold uppercase">{point.status}</span></p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}