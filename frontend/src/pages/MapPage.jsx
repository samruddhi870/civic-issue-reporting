// DFD 4.0 & 5.0 - Interactive Leaflet Public Issues Map
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { issuesApi, analyticsApi } from '../services/api';
import { SlaCountdownBadge } from '../components/SlaCountdownBadge';
import { 
  MapPin, 
  Layers, 
  Navigation, 
  Filter, 
  Search, 
  ThumbsUp, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Flame,
  X
} from 'lucide-react';

const CATEGORY_META = {
  'Water leakage': { icon: '💧', color: 'bg-blue-600', ring: 'ring-blue-400', label: 'Water Leakage' },
  'Open manhole': { icon: '🕳️', color: 'bg-rose-600', ring: 'ring-rose-400', label: 'Open Manhole' },
  'Garbage / Waste': { icon: '🗑️', color: 'bg-emerald-600', ring: 'ring-emerald-400', label: 'Garbage & Waste' },
  'Streetlight / Electricity': { icon: '💡', color: 'bg-amber-500', ring: 'ring-amber-300', label: 'Street Lighting' },
  'Pothole / Road damage': { icon: '🚧', color: 'bg-orange-600', ring: 'ring-orange-400', label: 'Pothole & Roads' },
  'Other': { icon: '📋', color: 'bg-slate-700', ring: 'ring-slate-400', label: 'Other Issue' }
};

export const MapPage = ({ onNavigate }) => {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('pins'); // 'pins' | 'heatmap'
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [upvotingIds, setUpvotingIds] = useState(new Set());

  // Fetch all issues for mapping
  const fetchMapIssues = async () => {
    setLoading(true);
    try {
      const res = await issuesApi.getIssues({ limit: 200 });
      setIssues(res.issues || []);
    } catch (err) {
      console.error('Failed to load issues for map:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapIssues();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [18.5204, 73.8567], // Default Pune center
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Invalidate size after mount for perfect rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      // Map cleanup handled on unmount
    };
  }, []);

  // Filter issues based on active selectors
  const filteredIssues = issues.filter((iss) => {
    if (selectedCategory !== 'All' && iss.category !== selectedCategory) return false;
    if (selectedStatus === 'Active' && ['Resolved', 'Closed'].includes(iss.status)) return false;
    if (selectedStatus === 'Resolved' && iss.status !== 'Resolved') return false;
    if (selectedStatus === 'Closed' && iss.status !== 'Closed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        iss.title?.toLowerCase().includes(q) ||
        iss.ticket_number?.toLowerCase().includes(q) ||
        iss.address?.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Fetch heatmap points when switching to heatmap mode
  useEffect(() => {
    if (viewMode === 'heatmap' && heatmapPoints.length === 0) {
      const fetchHeatmap = async () => {
        try {
          const res = await analyticsApi.getHeatmap();
          setHeatmapPoints(res.points || []);
        } catch (err) {
          console.error('Failed to load heatmap data:', err);
        }
      };
      fetchHeatmap();
    }
  }, [viewMode, heatmapPoints.length]);

  // Render Category Pins or Density Heatmap on the Map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    const latLngs = [];

    if (viewMode === 'heatmap') {
      heatmapPoints.forEach((pt) => {
        if (!pt.latitude || !pt.longitude) return;

        const color = pt.intensity >= 1.0 ? '#ef4444' : pt.intensity >= 0.8 ? '#f97316' : pt.intensity >= 0.6 ? '#eab308' : '#0284c7';
        const radius = pt.intensity >= 1.0 ? 32 : pt.intensity >= 0.8 ? 24 : pt.intensity >= 0.6 ? 18 : 14;

        // Outer glow halo
        const halo = L.circleMarker([pt.latitude, pt.longitude], {
          radius: radius * 1.6,
          color: color,
          fillColor: color,
          fillOpacity: 0.18,
          stroke: false
        });
        halo.addTo(markersLayerRef.current);

        // Core intensity bubble
        const circle = L.circleMarker([pt.latitude, pt.longitude], {
          radius: radius,
          color: color,
          fillColor: color,
          fillOpacity: 0.65,
          weight: 2
        });

        circle.bindPopup(`
          <div class="p-1 font-sans space-y-1 text-slate-800">
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
              <span class="font-mono text-[10px] font-bold text-civic-700 bg-civic-50 px-1.5 py-0.5 rounded border border-civic-200">
                ${pt.ticket_number}
              </span>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                pt.intensity >= 1.0 ? 'bg-rose-100 text-rose-800' :
                pt.intensity >= 0.8 ? 'bg-orange-100 text-orange-800' :
                'bg-amber-100 text-amber-800'
              }">
                ${Math.round(pt.intensity * 100)}% Density
              </span>
            </div>
            <h4 class="font-bold text-xs text-slate-900">${pt.category}</h4>
            <p class="text-[10px] text-slate-500">Spatial grievance concentration zone</p>
          </div>
        `);

        circle.addTo(markersLayerRef.current);
        latLngs.push([pt.latitude, pt.longitude]);
      });
    } else {
      // Pins view
      filteredIssues.forEach((issue) => {
        if (!issue.latitude || !issue.longitude) return;

        const meta = CATEGORY_META[issue.category] || CATEGORY_META['Other'];
        const isCritical = issue.is_critical_overdue || issue.is_overdue;
        const isResolved = ['Resolved', 'Closed'].includes(issue.status);

        // Create Custom Animated DivIcon
        const pinHtml = `
          <div class="relative group cursor-pointer">
            ${
              isCritical
                ? `<div class="absolute -inset-1 rounded-full bg-rose-500 opacity-75 animate-ping"></div>`
                : ''
            }
            <div class="relative w-9 h-9 rounded-full ${meta.color} text-white flex items-center justify-center text-sm shadow-lg ring-2 ${
              isResolved ? 'ring-emerald-400' : isCritical ? 'ring-rose-500' : 'ring-white'
            } hover:scale-110 transition-transform">
              <span>${meta.icon}</span>
            </div>
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 ${meta.color} rotate-45"></div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: pinHtml,
          iconSize: [36, 42],
          iconAnchor: [18, 42],
          popupAnchor: [0, -42],
        });

        const marker = L.marker([issue.latitude, issue.longitude], { icon: customIcon });

        // Interactive Popup
        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 font-sans space-y-2 text-slate-800 max-w-[240px]';
        popupContent.innerHTML = `
          <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
            <span class="font-mono text-[10px] font-bold text-civic-700 bg-civic-50 px-1.5 py-0.5 rounded border border-civic-200">
              ${issue.ticket_number}
            </span>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              issue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
              issue.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
              'bg-slate-100 text-slate-700'
            }">
              ${issue.status}
            </span>
          </div>
          <div>
            <h4 class="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">${issue.title}</h4>
            <p class="text-[10px] text-slate-500 line-clamp-1 mt-0.5">${issue.address || 'Location registered'}</p>
          </div>
          <div class="flex items-center justify-between text-[11px] pt-1 text-slate-600">
            <span>Priority: <strong>${issue.priority_score}</strong></span>
            <span class="font-semibold text-amber-600">${issue.upvote_count || 0} Upvotes</span>
          </div>
          <button id="view-detail-btn-${issue.id}" class="w-full mt-2 py-1.5 px-3 rounded-lg bg-civic-600 hover:bg-civic-700 text-white font-bold text-[11px] text-center shadow-sm transition-colors flex items-center justify-center gap-1">
            <span>Inspect Details & Comments</span>
          </button>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          setSelectedIssue(issue);
          setTimeout(() => {
            const btn = document.getElementById(`view-detail-btn-${issue.id}`);
            if (btn) {
              btn.onclick = () => onNavigate('issue-detail', issue.id);
            }
          }, 100);
        });

        marker.addTo(markersLayerRef.current);
        latLngs.push([issue.latitude, issue.longitude]);
      });
    }

    // Auto-fit bounds if issues exist
    if (latLngs.length > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(latLngs, { padding: [50, 50], maxZoom: 15 });
    }
  }, [filteredIssues, viewMode, heatmapPoints]);

  // Center on User GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { animate: true });
        }
      },
      (err) => {
        alert('Could not determine your GPS location: ' + err.message);
      }
    );
  };

  const handleToggleUpvote = async (issueId, e) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated) {
      alert('Please sign in to upvote civic grievances.');
      onNavigate('login');
      return;
    }

    setUpvotingIds((prev) => new Set(prev).add(issueId));
    try {
      const res = await issuesApi.toggleUpvote(issueId);
      setIssues((prev) =>
        prev.map((iss) =>
          iss.id === issueId
            ? { ...iss, upvote_count: res.upvote_count, priority_score: res.priority_score, has_upvoted: res.upvoted }
            : iss
        )
      );
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue((prev) => ({
          ...prev,
          upvote_count: res.upvote_count,
          priority_score: res.priority_score,
          has_upvoted: res.upvoted
        }));
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
    } finally {
      setUpvotingIds((prev) => {
        const next = new Set(prev);
        next.delete(issueId);
        return next;
      });
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden animate-fade-in">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket, title, or street..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-civic-500 text-xs text-slate-800 placeholder-slate-400 bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-civic-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            {/* Heatmap Layer Toggle */}
            <button
              onClick={() => setViewMode((prev) => (prev === 'pins' ? 'heatmap' : 'pins'))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border ${
                viewMode === 'heatmap'
                  ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white border-transparent shadow-orange-500/25 ring-2 ring-orange-400/30'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Toggle Municipal Density Heatmap"
            >
              <Flame className={`w-3.5 h-3.5 ${viewMode === 'heatmap' ? 'text-white animate-pulse' : 'text-orange-500'}`} />
              <span className="hidden sm:inline">{viewMode === 'heatmap' ? 'Heatmap' : 'Density'}</span>
            </button>

            {/* GPS Locate Button */}
            <button
              onClick={handleLocateMe}
              className="p-2 rounded-xl bg-civic-600 hover:bg-civic-700 text-white shadow-md transition-colors"
              title="Center on my location"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pointer-events-auto no-scrollbar">
          {['All', ...Object.keys(CATEGORY_META)].map((cat) => {
            const isSelected = selectedCategory === cat;
            const meta = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm shrink-0 border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105'
                    : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {meta && <span>{meta.icon}</span>}
                <span>{cat === 'All' ? 'All Issues' : meta?.label || cat}</span>
                <span className="text-[10px] opacity-75">
                  ({cat === 'All' ? issues.length : issues.filter((i) => i.category === cat).length})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Full-Height Leaflet Map */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-2.5 text-xs font-bold text-slate-700">
            <RefreshCw className="w-4 h-4 animate-spin text-civic-600" />
            Loading municipal issue map...
          </div>
        </div>
      )}

      {/* Bottom Floating Issue Preview Card */}
      {selectedIssue && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-200 space-y-3 animate-slide-up">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-civic-700 bg-civic-50 px-2 py-0.5 rounded border border-civic-200">
                {selectedIssue.ticket_number}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {selectedIssue.category}
              </span>
            </div>
            <button
              onClick={() => setSelectedIssue(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{selectedIssue.title}</h4>
            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{selectedIssue.description}</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="line-clamp-1">{selectedIssue.address || 'Location registered'}</span>
            </div>

            <SlaCountdownBadge
              slaDeadline={selectedIssue.sla_deadline}
              status={selectedIssue.status}
              resolvedAt={selectedIssue.resolved_at}
              isCriticalOverdue={selectedIssue.is_critical_overdue}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={(e) => handleToggleUpvote(selectedIssue.id, e)}
              disabled={upvotingIds.has(selectedIssue.id)}
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                selectedIssue.has_upvoted
                  ? 'bg-civic-600 text-white border-civic-600'
                  : 'bg-civic-50 text-civic-700 border-civic-200 hover:bg-civic-100'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Me Too ({selectedIssue.upvote_count || 0})</span>
            </button>

            <button
              onClick={() => onNavigate('issue-detail', selectedIssue.id)}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
