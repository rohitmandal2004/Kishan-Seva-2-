import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Search, MapPin, Clock, Users, ArrowRight,
    Sparkles, Phone, ChevronLeft,
    CheckCircle2, ArrowLeftRight, X,
    Crosshair, LocateFixed
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useKishanData } from '@/context/DataContext';
import { ProcurementCentre, CentreRecommendation } from '@/types';
import { evaluateCentreRecommendations, getOsrmRoute } from '@/services/recommendationEngine';
import { SupabaseDataService } from '@/services/supabaseData.service';
import { useLanguage } from '@/services/i18n';
import {
    tLocation,
    getCoordinatesForVillage,
    POPULAR_VILLAGES
} from '@/services/locationNames';
import { useSupabase } from '@/context/SupabaseContext';
import { defaultMapIcon, greenMapIcon, orangeMapIcon } from '@/lib/leaflet-icons';
import { QueueAnalyticsChart } from '@/components/ui/QueueAnalyticsChart';

/**
 * Leaflet map camera controller for smooth transitions
 */
function MapController({
    center,
    zoom = 11,
    animKey
}: {
    center: [number, number];
    zoom?: number;
    animKey: string;
}) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom, { animate: true, duration: 1.2 });
    }, [center, zoom, animKey, map]);
    return null;
}

export default function CentreDiscovery() {
    const navigate = useNavigate();
    const store = useKishanData();
    const { farmer } = useSupabase();
    const { lang: language } = useLanguage();

    const [searchTerm, setSearchTerm] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [cropFilter] = useState('All');

    const [sortBy, setSortBy] = useState<'RECOMMENDED' | 'NEAREST'>('RECOMMENDED');
    const [viewMode, setViewMode] = useState<'MAP' | 'LIST'>('MAP');
    const [centresList, setCentresList] = useState<ProcurementCentre[]>(store.getCentres());
    const [showComparison, setShowComparison] = useState(false);

    // Address & Coordinate state
    const initialResolved = useMemo(() => {
        if (farmer?.latitude && farmer?.longitude) {
            return {
                latitude: farmer.latitude,
                longitude: farmer.longitude,
                district: farmer.district || 'North 24 Parganas',
                village: farmer.village || 'Basirhat',
            };
        }
        return getCoordinatesForVillage(farmer?.village || 'Basirhat', farmer?.district);
    }, [farmer]);

    const [activeVillage, setActiveVillage] = useState<string>(initialResolved.village);
    const [activeDistrict, setActiveDistrict] = useState<string>(initialResolved.district);
    const [farmerLocation, setFarmerLocation] = useState<[number, number]>([
        initialResolved.latitude,
        initialResolved.longitude,
    ]);
    const [focusedCentre, setFocusedCentre] = useState<[number, number] | null>(null);
    const [cameraKey, setCameraKey] = useState<string>('init');
    const [isLocating, setIsLocating] = useState(false);

    const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
    const [routeStats, setRouteStats] = useState<{ distanceKm: number, durationMins: number } | null>(null);

    // Sync when farmer profile loads
    useEffect(() => {
        if (farmer?.village || farmer?.latitude) {
            const resolved = (farmer.latitude && farmer.longitude)
                ? { latitude: farmer.latitude, longitude: farmer.longitude, district: farmer.district, village: farmer.village }
                : getCoordinatesForVillage(farmer.village, farmer.district);
            setActiveVillage(resolved.village);
            setActiveDistrict(resolved.district);
            setFarmerLocation([resolved.latitude, resolved.longitude]);
            setFocusedCentre(null);
            setCameraKey(`farmer-${resolved.village}-${Date.now()}`);
        }
    }, [farmer]);

    useEffect(() => {
        SupabaseDataService.getCentres().then(data => {
            if (data && data.length > 0) {
                setCentresList(data);
            }
        });
    }, []);

    // Quick switch address handler
    const handleSelectVillage = (villageName: string) => {
        const coords = getCoordinatesForVillage(villageName);
        setActiveVillage(coords.village);
        setActiveDistrict(coords.district);
        setFarmerLocation([coords.latitude, coords.longitude]);
        setFocusedCentre(null);
        setSelectedRecId(null);
        setCameraKey(`select-${coords.village}-${Date.now().toString()}`);
    };

    // Browser GPS fallback handler
    const handleUseDeviceGps = () => {
        if (!('geolocation' in navigator)) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                setFarmerLocation([lat, lon]);
                setActiveVillage('Current GPS');
                setFocusedCentre(null);
                setSelectedRecId(null);
                setCameraKey(`gps-${Date.now()}`);
                setIsLocating(false);
            },
            (error) => {
                console.warn('Geolocation failed:', error.message);
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 6000 }
        );
    };

    // Run Smart Multi-factor Recommendation Engine with dynamic farmer coordinates
    const evaluatedRecommendations: CentreRecommendation[] = useMemo(() => {
        return evaluateCentreRecommendations(
            centresList,
            { latitude: farmerLocation[0], longitude: farmerLocation[1] },
            cropFilter === 'All' ? (farmer?.crop_name || 'Paddy (Grade A)') : cropFilter
        );
    }, [centresList, farmerLocation, cropFilter, farmer?.crop_name]);

    // Filter and sort candidates
    const filteredRecs = useMemo(() => {
        let list = evaluatedRecommendations.filter((item) => {
            const matchesSearch = item.centre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.centre.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.centre.district.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCrop = cropFilter === 'All' || item.centre.accepted_crops.some(cr => cr.toLowerCase().includes(cropFilter.toLowerCase()));
            return matchesSearch && matchesCrop;
        });

        if (sortBy === 'NEAREST') {
            return [...list].sort((a, b) => a.distance_km - b.distance_km);
        }
        // Default RECOMMENDED: sort by journey_score desc
        return [...list].sort((a, b) => b.journey_score - a.journey_score);
    }, [evaluatedRecommendations, searchTerm, cropFilter, sortBy]);

    const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
    const selectedRec = useMemo(() => {
        return (selectedRecId ? filteredRecs.find(r => r.centre.id === selectedRecId) : null) || filteredRecs[0] || null;
    }, [selectedRecId, filteredRecs]);

    const optimalMatch = evaluatedRecommendations.find(r => r.is_optimal) || evaluatedRecommendations[0];
    const nearestMatch = evaluatedRecommendations.find(r => r.is_nearest) || evaluatedRecommendations[0];

    useEffect(() => {
        if (selectedRecId && farmerLocation) {
            const centre = centresList.find(c => c.id === selectedRecId);
            if (centre) {
                getOsrmRoute(farmerLocation[0], farmerLocation[1], centre.latitude, centre.longitude)
                    .then(route => {
                        if (route) {
                            setRouteCoords(route.coordinates);
                            setRouteStats({ distanceKm: route.distanceKm, durationMins: route.durationMins });
                        } else {
                            setRouteCoords(null);
                            setRouteStats(null);
                        }
                    });
            }
        } else {
            setRouteCoords(null);
            setRouteStats(null);
        }
    }, [selectedRecId, farmerLocation, centresList]);

    const handleCentreCardClick = (item: CentreRecommendation) => {
        setSelectedRecId(item.centre.id);
        setFocusedCentre([item.centre.latitude, item.centre.longitude]);
        setCameraKey(`centre-${item.centre.id}-${Date.now().toString()}`);
    };

    const handleRecenterOnFarm = () => {
        setFocusedCentre(null);
        setCameraKey(`farm-${activeVillage}-${Date.now()}`);
    };

    return (
        <div className="flex flex-col h-[calc(100dvh-4.5rem)] md:h-screen w-full relative font-sans">
            {/* Top Header & Smart Action Bar */}
            <div className="bg-white px-4 sm:px-6 py-2.5 border-b border-zinc-200 z-10 shrink-0 flex flex-col gap-2 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/farmer/dashboard')}
                            className="p-2 bg-zinc-50 hover:bg-zinc-100 rounded-full border border-zinc-200 text-zinc-600 transition-colors shrink-0 shadow-xs"
                            title="Back to Dashboard"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-semibold text-zinc-900 leading-tight">
                                    Smart Centre Locator
                                </h1>
                                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    <Sparkles className="w-3 h-3 text-emerald-600" /> Dynamic Geo Engine
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-500">
                                Calculates real road distance & live queue times from your farm in <strong className="text-zinc-700">{activeVillage}</strong>.
                            </p>
                        </div>
                    </div>

                    {/* Controls: Search, Filters & View Toggle */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {optimalMatch && nearestMatch && optimalMatch.centre.id !== nearestMatch.centre.id && (
                            <Button
                                onClick={() => setShowComparison(true)}
                                variant="outline"
                                size="sm"
                                className="rounded-full text-[11px] font-bold border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 h-8 gap-1.5 shadow-xs shrink-0"
                            >
                                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700" />
                                <span>Compare</span>
                            </Button>
                        )}

                        <div className="relative flex-1 min-w-[130px] sm:flex-initial">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search mandi..."
                                className="pl-8 pr-3 py-1 bg-zinc-50 border border-zinc-200 rounded-full text-xs w-full sm:w-40 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium h-8"
                            />
                        </div>

                        {/* Sort Filter */}
                        <div className="flex rounded-full border border-zinc-200 p-0.5 bg-zinc-50 text-xs shrink-0">
                            <button
                                onClick={() => setSortBy('RECOMMENDED')}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${sortBy === 'RECOMMENDED' ? 'bg-emerald-700 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                                    }`}
                                title="Sort by AI Smart Score"
                            >
                                Recommended
                            </button>
                            <button
                                onClick={() => setSortBy('NEAREST')}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${sortBy === 'NEAREST' ? 'bg-emerald-700 text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                                    }`}
                                title="Sort strictly by nearest distance"
                            >
                                Nearest
                            </button>
                        </div>

                        <div className="md:hidden flex rounded-full border border-zinc-200 p-0.5 bg-zinc-50 text-xs shrink-0 ml-auto">
                            <button
                                onClick={() => setViewMode('MAP')}
                                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${viewMode === 'MAP' ? 'bg-emerald-700 text-white' : 'text-zinc-600'}`}
                            >
                                Map
                            </button>
                            <button
                                onClick={() => setViewMode('LIST')}
                                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${viewMode === 'LIST' ? 'bg-emerald-700 text-white' : 'text-zinc-600'}`}
                            >
                                List
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dedicated Farm Address & Quick Village Selector Bar */}
                <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 shrink-0">
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>Farm Village:</span>
                            <span className="font-semibold text-emerald-950 underline">{activeVillage}</span>
                        </span>
                    </div>

                    <div className="h-4 w-[1px] bg-slate-200 shrink-0" />

                    {/* Quick select village chips */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase shrink-0">Quick Select:</span>
                        {POPULAR_VILLAGES.slice(0, 7).map((v) => {
                            const isCurrent = activeVillage.toLowerCase() === v.name.toLowerCase();
                            return (
                                <button
                                    key={v.name}
                                    onClick={() => handleSelectVillage(v.name)}
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition shrink-0 border ${isCurrent
                                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs font-bold'
                                            : 'bg-white hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                                        }`}
                                >
                                    {v.name}
                                </button>
                            );
                        })}

                        {/* Device GPS button */}
                        <button
                            onClick={handleUseDeviceGps}
                            disabled={isLocating}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 hover:bg-slate-200 text-zinc-700 border border-zinc-200 shrink-0 transition-colors"
                            title="Use Device GPS"
                        >
                            <LocateFixed className={`w-3 h-3 text-zinc-600 ${isLocating ? 'animate-spin' : ''}`} />
                            <span>{isLocating ? 'Locating...' : 'GPS'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Map View Area */}
                <div className={`flex-1 relative bg-slate-200 z-0 ${viewMode === 'LIST' ? 'hidden md:block' : 'block h-[45vh] md:h-auto'}`}>
                    <MapContainer
                        center={farmerLocation}
                        zoom={11}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Smooth Camera Controller */}
                        <MapController
                            center={focusedCentre || farmerLocation}
                            zoom={focusedCentre ? 13 : 11}
                            animKey={cameraKey}
                        />

                        {/* Farmer Farm Marker (Red Pin) */}
                        <Marker
                            position={farmerLocation}
                            icon={new L.Icon({
                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                                iconSize: [28, 45],
                                iconAnchor: [14, 45]
                            })}
                        >
                            <Popup>
                                <div className="p-1 text-center font-sans">
                                    <span className="bg-red-100 text-red-800 text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase">
                                        Your Farm Origin
                                    </span>
                                    <p className="font-semibold text-xs text-zinc-900 mt-1">
                                        {activeVillage} ({activeDistrict})
                                    </p>
                                    <p className="text-[10px] text-zinc-500">
                                        GPS: {farmerLocation[0].toFixed(4)}°N, {farmerLocation[1].toFixed(4)}°E
                                    </p>
                                </div>
                            </Popup>
                        </Marker>

                        {/* Procurement Centre Markers */}
                        {filteredRecs.map((item) => {
                            const icon = item.is_optimal ? greenMapIcon : item.is_nearest ? orangeMapIcon : defaultMapIcon;
                            return (
                                <Marker
                                    key={item.centre.id}
                                    position={[item.centre.latitude, item.centre.longitude]}
                                    icon={icon}
                                    eventHandlers={{
                                        click: () => handleCentreCardClick(item),
                                    }}
                                >
                                    <Popup>
                                        <div className="font-sans p-1 text-left min-w-44">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.is_optimal ? 'bg-emerald-100 text-emerald-900' : item.is_nearest ? 'bg-amber-100 text-amber-900' : 'bg-zinc-100 text-zinc-700'
                                                    }`}>
                                                    {item.is_optimal ? '★ BEST MATCH' : item.is_nearest ? '⚡ NEAREST MANDI' : `${item.journey_score}/100 SCORE`}
                                                </span>
                                                <span className="text-[10px] font-semibold text-zinc-800">
                                                    {item.distance_km} km
                                                </span>
                                            </div>
                                            <p className="font-bold text-xs text-zinc-900 leading-tight">
                                                {tLocation(item.centre.name, language, 'city')}
                                            </p>
                                            <p className="text-[10px] text-zinc-500 mt-0.5">
                                                {item.distance_km} km away from {activeVillage}
                                            </p>
                                            <p className="text-[10px] font-bold text-emerald-700 mt-1">
                                                {item.current_queue} vehicles • ~{item.predicted_wait_mins} min wait
                                            </p>
                                            <button
                                                onClick={() => navigate(`/farmer/book?centre=${item.centre.id}`)}
                                                className="mt-2 w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] py-1.5 rounded cursor-pointer text-center transition-colors"
                                            >
                                                Book Slot Here ({item.distance_km} km)
                                            </button>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}

                        {/* Route Polyline */}
                        {routeCoords && (
                            <Polyline
                                positions={routeCoords}
                                color="#059669"
                                weight={4}
                                opacity={0.8}
                                dashArray="10, 10"
                            />
                        )}
                    </MapContainer>

                    {/* Floating Map Re-center Overlay Button */}
                    <div className="absolute bottom-4 left-4 z-[400] flex gap-2">
                        <button
                            onClick={handleRecenterOnFarm}
                            className="bg-white/95 hover:bg-white text-zinc-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-zinc-200 flex items-center gap-1.5 backdrop-blur-xs transition-transform active:scale-[0.97]"
                        >
                            <Crosshair className="w-3.5 h-3.5 text-red-600" />
                            <span>Center on Farm ({activeVillage})</span>
                        </button>
                    </div>

                    {/* Map Legend Overlay */}
                    <div className="absolute top-3 right-3 z-[400] bg-white/95 p-2 rounded-md shadow-md border border-zinc-200 text-[10px] font-medium space-y-1 backdrop-blur-xs hidden sm:block">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                            <span className="font-bold text-zinc-800">Your Farm ({activeVillage})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                            <span>Optimal Mandi</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                            <span>Nearest Mandi</span>
                        </div>
                    </div>
                </div>

                {/* Sidebar Recommended Centres List */}
                <div className={`w-full md:w-80 lg:w-[440px] bg-zinc-50 border-l border-zinc-200 flex flex-col ${viewMode === 'MAP' ? 'h-[55vh] md:h-auto' : 'h-full md:h-auto'} shrink-0 z-10`}>
                    <div className="p-3 bg-white border-b border-zinc-200 shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-800 text-xs sm:text-sm">
                                Mandis from {activeVillage}
                            </span>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px] font-bold">
                                {filteredRecs.length} Found
                            </Badge>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-medium">
                            {sortBy === 'NEAREST' ? 'Sorted by Distance' : 'Sorted by Efficiency'}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
                        {filteredRecs.map((item) => {
                            const isSelected = selectedRec?.centre.id === item.centre.id;

                            return (
                                <Card
                                    key={item.centre.id}
                                    className={`p-0 overflow-hidden cursor-pointer transition border-2 rounded-lg ${isSelected ? 'border-emerald-600 shadow-md ring-1 ring-emerald-600/20' : 'border-zinc-200/80 hover:border-slate-300 shadow-xs'
                                        }`}
                                    onClick={() => handleCentreCardClick(item)}
                                >
                                    {/* Top Recommendation Badge Banner */}
                                    {item.is_optimal && (
                                        <div className="bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider py-1.5 px-4 flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Optimal Mandi (Fastest Turnaround)
                                            </span>
                                            <span className="bg-emerald-900/60 px-2 py-0.5 rounded text-amber-200 font-mono">
                                                {item.journey_score}/100 SCORE
                                            </span>
                                        </div>
                                    )}

                                    {!item.is_optimal && item.is_nearest && (
                                        <div className="bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider py-1.5 px-4 flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-white" /> Nearest Centre to {activeVillage}
                                            </span>
                                            <span className="bg-amber-800/60 px-2 py-0.5 rounded text-white font-mono">
                                                {item.journey_score}/100 SCORE
                                            </span>
                                        </div>
                                    )}

                                    <div className="p-4 bg-white">
                                        <div className="flex justify-between items-start gap-2 mb-1.5">
                                            <div>
                                                <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">
                                                    {item.centre.centre_code}
                                                </span>
                                                <h4 className="font-bold text-zinc-900 leading-tight">
                                                    {tLocation(item.centre.name, language, 'city')}
                                                </h4>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full inline-block">
                                                    {item.distance_km} km away
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {tLocation(item.centre.district, language, 'district')} •
                                            <span className="truncate">{item.centre.address}</span>
                                        </p>

                                        {/* Metric Pills */}
                                        <div className="grid grid-cols-2 gap-2 text-xs my-3">
                                            <div className={`p-2 rounded-md font-semibold flex items-center gap-2 ${item.predicted_wait_mins <= 40 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                                                }`}>
                                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                                <div>
                                                    <p className="text-[9px] uppercase font-bold text-zinc-500">Est. Wait</p>
                                                    <p className="text-xs font-bold">~{item.predicted_wait_mins} mins</p>
                                                </div>
                                            </div>

                                            <div className="p-2 rounded-md bg-zinc-50 text-zinc-800 font-semibold flex items-center gap-2 border border-zinc-100">
                                                <Users className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                                <div>
                                                    <p className="text-[9px] uppercase font-bold text-zinc-500">In Queue</p>
                                                    <p className="text-xs font-bold">{item.current_queue} Vehicles</p>
                                                </div>
                                            </div>
                                        </div>

                                        <QueueAnalyticsChart centreId={item.centre.id} />

                                        {/* Route Stats */}
                                        {isSelected && routeStats && (
                                            <div className="flex items-center gap-2 mt-2 p-2 bg-emerald-50 rounded-lg text-emerald-800 text-[10px] font-bold border border-emerald-100">
                                                <MapPin className="w-3.5 h-3.5" />
                                                Actual Driving Route: {routeStats.distanceKm} km ({routeStats.durationMins} mins)
                                            </div>
                                        )}

                                        {/* Explainable Trade-off Note */}
                                        <div className="p-2.5 rounded-md bg-emerald-50/50 border border-emerald-100 text-[11px] text-emerald-900 mb-2">
                                            <p className="font-bold text-emerald-950 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                Why Recommended?
                                            </p>
                                            <p className="text-[10px] text-emerald-800/90 mt-0.5">
                                                {item.explanation.tradeoff || item.explanation.reasons[0]}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-2 border-t border-zinc-100 flex gap-2">
                                            <Button
                                                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold h-9 shadow-xs gap-1.5"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/farmer/book?centre=${item.centre.id}`);
                                                }}
                                            >
                                                Book Slot Here ({item.distance_km} km) <ArrowRight className="w-3.5 h-3.5" />
                                            </Button>
                                            <a
                                                href={`tel:${item.centre.contact_number}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 border border-zinc-200 rounded-md hover:bg-zinc-50 text-zinc-600 flex items-center justify-center"
                                                title="Call Mandi"
                                            >
                                                <Phone className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Side-by-Side Nearest vs Optimal Comparison Modal */}
            {showComparison && optimalMatch && nearestMatch && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white rounded-md max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowComparison(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                                Algorithmic Mandi Comparison
                            </span>
                            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-900 mt-2">
                                Nearest vs Optimal Mandi Trade-off
                            </h2>
                            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
                                Comparing Mandis from your farm in <strong>{activeVillage}</strong>.
                            </p>
                        </div>

                        {/* Comparison Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            {/* Nearest Card */}
                            <div className="p-4 rounded-lg border-2 border-amber-200 bg-amber-50/40 text-zinc-800">
                                <div className="flex justify-between items-center mb-2">
                                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                                        Nearest Centre
                                    </Badge>
                                    <span className="font-mono text-xs font-semibold text-amber-900">
                                        {nearestMatch.journey_score}/100 Score
                                    </span>
                                </div>
                                <h3 className="font-semibold text-sm text-zinc-900 mb-1">{nearestMatch.centre.name}</h3>
                                <p className="text-[11px] text-zinc-500 mb-3">{nearestMatch.centre.address}</p>

                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between py-1 border-b border-amber-200/60">
                                        <span className="text-zinc-500">Distance from {activeVillage}:</span>
                                        <span className="font-bold text-zinc-900">{nearestMatch.distance_km} km</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-amber-200/60">
                                        <span className="text-zinc-500">Vehicles in Queue:</span>
                                        <span className="font-bold text-red-600">{nearestMatch.current_queue} Vehicles</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-amber-200/60">
                                        <span className="text-zinc-500">Predicted Wait Time:</span>
                                        <span className="font-bold text-red-600">~{nearestMatch.predicted_wait_mins} mins</span>
                                    </div>
                                </div>
                            </div>

                            {/* Optimal Match Card */}
                            <div className="p-4 rounded-lg border-2 border-emerald-500 bg-emerald-50/70 text-zinc-800 relative overflow-hidden">
                                <div className="flex justify-between items-center mb-2">
                                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                        ★ Recommended Best Match
                                    </Badge>
                                    <span className="font-mono text-xs font-semibold text-emerald-800">
                                        {optimalMatch.journey_score}/100 Score
                                    </span>
                                </div>
                                <h3 className="font-semibold text-sm text-zinc-900 mb-1">{optimalMatch.centre.name}</h3>
                                <p className="text-[11px] text-zinc-500 mb-3">{optimalMatch.centre.address}</p>

                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between py-1 border-b border-emerald-200">
                                        <span className="text-zinc-500">Distance from {activeVillage}:</span>
                                        <span className="font-bold text-zinc-900">{optimalMatch.distance_km} km</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-emerald-200">
                                        <span className="text-zinc-500">Vehicles in Queue:</span>
                                        <span className="font-bold text-emerald-700">{optimalMatch.current_queue} Vehicles</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-emerald-200">
                                        <span className="text-zinc-500">Predicted Wait Time:</span>
                                        <span className="font-bold text-emerald-700">~{optimalMatch.predicted_wait_mins} mins</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Recommendation Summary Callout */}
                        <div className="p-4 rounded-lg bg-emerald-900 text-white flex flex-col sm:flex-row justify-between items-center gap-3">
                            <div className="text-xs">
                                <p className="font-bold text-emerald-300">Smart Recommendation Conclusion:</p>
                                <p className="text-emerald-100 text-[11px] mt-0.5">
                                    {optimalMatch.centre.id === nearestMatch.centre.id
                                        ? `The nearest Mandi (${optimalMatch.centre.name}) is also the most optimal option with minimal congestion.`
                                        : `Travelling ${parseFloat((optimalMatch.distance_km - nearestMatch.distance_km).toFixed(1))} km farther will save you approximately ${Math.round((nearestMatch.predicted_wait_mins - optimalMatch.predicted_wait_mins) / 60)} hours in the queue yard.`}
                                </p>
                            </div>
                            <Button
                                onClick={() => {
                                    setShowComparison(false);
                                    navigate(`/farmer/book?centre=${optimalMatch.centre.id}`);
                                }}
                                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs px-5 h-10 rounded-md shrink-0"
                            >
                                Book Recommended Mandi
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
