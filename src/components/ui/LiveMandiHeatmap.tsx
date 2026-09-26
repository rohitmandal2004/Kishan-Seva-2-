import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useKishanData } from '@/context/DataContext';

export function LiveMandiHeatmap() {
    const store = useKishanData();
    const centres = store.centres;

    // West Bengal center roughly
    const center: [number, number] = [23.5, 87.5];

    return (
        <div className="border border-slate-300 bg-white flex flex-col h-[400px]">
            <div className="p-4 border-b border-slate-300 bg-slate-50 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Live State Heatmap</h3>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 uppercase">GPS Active</span>
            </div>
            <div className="flex-1 relative z-0">
                <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    />
                    {centres.map((c) => {
                        const isOverloaded = c.current_queue_length > (c.daily_capacity_quintals * 0.05);
                        const radius = Math.max(8, c.current_queue_length / 2);
                        
                        return (
                            <CircleMarker
                                key={c.id}
                                center={[c.latitude, c.longitude]}
                                radius={radius}
                                pathOptions={{
                                    color: isOverloaded ? '#dc2626' : '#10b981',
                                    fillColor: isOverloaded ? '#ef4444' : '#34d399',
                                    fillOpacity: 0.6,
                                    weight: 2
                                }}
                            >
                                <Popup>
                                    <div className="font-sans text-xs">
                                        <h4 className="font-bold text-sm mb-1">{c.name}</h4>
                                        <p>Queue: <span className="font-bold">{c.current_queue_length}</span> vehicles</p>
                                        <p>Capacity: {c.daily_capacity_quintals} Q</p>
                                        {isOverloaded && <p className="text-red-600 font-bold mt-1">Status: OVERLOADED</p>}
                                    </div>
                                </Popup>
                            </CircleMarker>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
}
