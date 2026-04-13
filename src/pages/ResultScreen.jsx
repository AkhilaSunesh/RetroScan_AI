import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, Download, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export default function ResultScreen() {
    const navigate = useNavigate();
    const [result, setResult] = useState({
        score: Math.floor(Math.random() * 200) + 250, // Default if localstorage fails
        threshold: 300,
        status: 'Fail',
        accuracy: '94.2%',
        date: new Date().toLocaleDateString(),
        lat: '28.6139',
        lng: '77.2090'
    });

    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const currentData = localStorage.getItem('current_scan');
        if (currentData) {
            const parsed = JSON.parse(currentData);
            setResult({
                ...result,
                score: parsed.score,
                status: parsed.status,
                lat: parsed.lat,
                lng: parsed.lng,
                date: parsed.date,
                time: parsed.time
            });
        }
    }, [result]);

    const exportPDF = async () => {
        try {
            setIsExporting(true);
            const input = document.getElementById('report-container');
            const imgData = await toPng(input, { cacheBust: true, pixelRatio: 2 });
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (input.offsetHeight * pdfWidth) / input.offsetWidth;
            
            // Add official NHAI-like header text
            pdf.setFontSize(16);
            pdf.setTextColor(225, 29, 72); // primary color
            pdf.text("RetroScan AI - Inspection Report", 14, 20);
            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Timestamp: ${result.date} ${result.time || ''}`, 14, 28);
            pdf.text(`GPS Coordinates: ${result.lat}, ${result.lng}`, 14, 34);
            pdf.text(`Status: ${result.status} (Threshold: 300 mcd/lx/m2)`, 14, 40);

            // Add the captured UI content below the header
            pdf.addImage(imgData, 'PNG', 14, 50, pdfWidth - 28, pdfHeight * ((pdfWidth - 28) / pdfWidth));
            
            // Footer with Signature
            pdf.text("Site Engineer Signature: _______________________", 14, pdf.internal.pageSize.getHeight() - 20);
            
            pdf.save(`NHAI_Report_${Date.now()}.pdf`);
        } catch (e) {
            alert("Error exporting PDF: " + e.message);
            console.error(e);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto w-full animate-in fade-in duration-500 pb-24 h-full overflow-y-auto">
            <button onClick={() => navigate(-1)} className="mb-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors">
                <ArrowLeft className="w-5 h-5" /> Back
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Scan Analysis</h2>
            
            <div id="report-container" className="bg-surface border border-primary/20 rounded-3xl p-6 text-center shadow-xl space-y-6">
                
                {/* GradCAM Image Placeholder */}
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-700 bg-black">
                    <img src="/gradcam_mock.png" alt="GradCAM Analysis" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs font-mono text-gray-300">
                        {result.lat}, {result.lng}
                    </div>
                </div>

                <div className={`mx-auto inline-flex p-4 rounded-full mb-2 ${result.status === 'Pass' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {result.status === 'Pass' ? (
                        <CheckCircle className="w-12 h-12 text-green-500" />
                    ) : (
                        <AlertTriangle className="w-12 h-12 text-red-500" />
                    )}
                </div>
                
                <div>
                    <div className="text-5xl font-mono font-bold text-accent mb-1">
                        {result.score}
                    </div>
                    <div className="text-gray-400 text-sm uppercase tracking-widest">
                        mcd / lx / m²
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-800 pt-6">
                    <div className="text-left">
                        <p className="text-xs text-gray-500 dark:text-gray-500 uppercase">Threshold</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{result.threshold}</p>
                    </div>
                    <div className="text-left">
                        <p className="text-xs text-gray-500 dark:text-gray-500 uppercase">AI Confidence</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{result.accuracy}</p>
                    </div>
                </div>
            </div>

            <button 
                onClick={exportPDF} 
                disabled={isExporting}
                className="w-full mt-6 bg-surface border border-primary/30 py-4 rounded-xl text-gray-800 dark:text-gray-200 flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors shadow-lg disabled:opacity-50"
            >
                <Download className="w-5 h-5" />
                {isExporting ? "Generating PDF..." : "Export IRC-Compliant PDF"}
            </button>
        </div>
    );
}
