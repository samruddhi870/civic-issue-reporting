// DFD 2.0 - Draggable Geolocation Pin & Leaflet Map Component
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, MapPin, Loader2 } from 'lucide-react';

// Fix leaflet default icon issue in React bundlers
const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const LeafletLocationPicker = ({ latitude, longitude, onLocationChange }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [locationName, setLocationName] = useState('');

  // Default coordinates (Pune/Central location fallback)
  const defaultLat = latitude || 18.5204;
  const defaultLng = longitude || 73.8567;

  // Reverse geocode to get street address
  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      if (res.ok) {
        const data = await res.json();
        const addr = data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        setLocationName(addr);
        if (onLocationChange) {
          onLocationChange({ latitude: lat, longitude: lng, address: addr });
        }
      }
    } catch {
      const fallback = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
      setLocationName(fallback);
      if (onLocationChange) {
        onLocationChange({ latitude: lat, longitude: lng, address: fallback });
      }
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Create draggable marker
      const marker = L.marker([defaultLat, defaultLng], {
        draggable: true,
        icon: customIcon,
      }).addTo(map);

      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        await fetchAddress(pos.lat, pos.lng);
      });

      map.on('click', async (e) => {
        marker.setLatLng(e.latlng);
        await fetchAddress(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Initial address fetch
      fetchAddress(defaultLat, defaultLng);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleAutoGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
          markerRef.current.setLatLng([lat, lng]);
        }
        await fetchAddress(lat, lng);
        setDetectingGps(false);
      },
      (err) => {
        console.warn('GPS location detection failed:', err);
        setDetectingGps(false);
        alert('Could not retrieve current location. Please drag the pin on the map.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-civic-600" />
          Location & Geotag
        </label>
        <button
          type="button"
          onClick={handleAutoGps}
          disabled={detectingGps}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-civic-50 text-civic-700 hover:bg-civic-100 border border-civic-200 transition-colors shadow-sm active:scale-95"
        >
          {detectingGps ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-civic-600" />
          ) : (
            <Navigation className="w-3.5 h-3.5 text-civic-600" />
          )}
          Auto-Detect GPS
        </button>
      </div>

      <div className="relative w-full h-56 rounded-xl overflow-hidden border border-slate-300 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute top-2 left-2 z-[400] bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-600 border border-slate-200 shadow-sm pointer-events-none">
          Click or drag pin to exact location
        </div>
      </div>

      {locationName && (
        <div className="p-2.5 bg-slate-100 rounded-lg text-xs text-slate-700 flex items-start gap-2 border border-slate-200">
          <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-relaxed font-medium">{locationName}</span>
        </div>
      )}
    </div>
  );
};
