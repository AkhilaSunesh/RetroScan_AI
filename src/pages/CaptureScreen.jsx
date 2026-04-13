import React, { useRef, useState, useEffect } from 'react';
import { Camera, MapPin, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CaptureScreen() {
    const videoRef = useRef(null);
    const [location, setLocation] = useState(null);
    const [error, setError] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // 1. Initialize Camera Stream (defaults to rear camera on mobile)
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                setError('Camera access denied or unavailable.');
                console.error(err);
            }
        };

        startCamera();

        // 2. Fetch GPS Coordinates
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude.toFixed(5),
                        lng: position.coords.longitude.toFixed(5)
                    });
                },
                (err) => {
                    console.warn('GPS access denied', err);
                }
            );
        }

        // Cleanup: Stop camera when leaving the page
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto h-full mt-8">

            {/* Video Feed Container */}
            <div className="relative w-full aspect-[3/4] bg-surface rounded-2xl overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/10">
                {error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 dark:text-gray-400 p-4 text-center">
                        <AlertCircle className="w-12 h-12 mb-2 text-primary" />
                        <p>{error}</p>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                )}

                {/* HUD Overlay for GPS */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    <div className="bg-base/80 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 text-sm border border-primary/20">
                        <MapPin className="w-4 h-4 text-accent" />
                        {location ? (
                            <span className="text-gray-800 dark:text-gray-200 font-mono tracking-wider">{location.lat}, {location.lng}</span>
                        ) : (
                            <span className="text-gray-600 dark:text-gray-400 animate-pulse">Locating...</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Capture Button */}
            <button 
                onClick={() => {
                    setIsAnalyzing(true);
                    
                    // Mock analyzing time
                    setTimeout(() => {
                        // Store mock scan in localStorage history
                        const history = JSON.parse(localStorage.getItem('retroscan_history') || '[]');
                        const newScan = {
                            id: Date.now(),
                            date: new Date().toLocaleDateString(),
                            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                            score: Math.floor(Math.random() * (450 - 250) + 250), // Random score between 250 and 450
                            lat: location ? location.lat : '28.6139',
                            lng: location ? location.lng : '77.2090'
                        };
                        newScan.status = newScan.score >= 300 ? 'Pass' : 'Fail';
                        
                        history.unshift(newScan);
                        localStorage.setItem('retroscan_history', JSON.stringify(history));
                        
                        // Pass current scan data to result screen
                        localStorage.setItem('current_scan', JSON.stringify(newScan));
                        
                        navigate('/result');
                    }, 2000);
                }}
                className="mt-8 bg-primary hover:bg-primary-hover text-white rounded-full p-4 shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all transform active:scale-95 flex items-center gap-3 font-semibold text-lg w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isAnalyzing}
            >
                <Camera className="w-6 h-6" />
                {isAnalyzing ? "Processing AI Pipeline..." : "Analyze Retroreflectivity"}
            </button>

        </div>
    );
}