// DFD 2.0 - Report Civic Grievance Page (Camera Capture, Draggable GPS, Duplicate Check)
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { issuesApi } from '../services/api';
import { LeafletLocationPicker } from '../components/LeafletLocationPicker';
import { DuplicateWarningModal } from '../components/DuplicateWarningModal';
import { Camera, Upload, Trash2, ShieldAlert, CheckCircle2, Clock, AlertTriangle, Sparkles } from 'lucide-react';

const CATEGORIES = [
  { id: 'Water leakage', label: 'Water Leakage', sla: '24 hrs', icon: '💧', dept: 'Water Supply' },
  { id: 'Open manhole', label: 'Open Manhole', sla: '24 hrs', icon: '🕳️', dept: 'Water Supply' },
  { id: 'Garbage / Waste', label: 'Garbage / Waste Dump', sla: '48 hrs', icon: '🗑️', dept: 'Sanitation' },
  { id: 'Streetlight / Electricity', label: 'Broken Streetlight', sla: '48 hrs', icon: '💡', dept: 'Electrical' },
  { id: 'Pothole / Road damage', label: 'Pothole / Road Damage', sla: '5 days', icon: '🚧', dept: 'Roads & Infra' },
  { id: 'Other', label: 'Other Civic Issue', sla: '7 days', icon: '📋', dept: 'General Admin' },
];

const detectSmartTriage = (text) => {
  if (!text || text.trim().length < 4) return null;
  const lower = text.toLowerCase();

  if (lower.match(/manhole|gutter cover|drain cover|open drain|sewer open/)) {
    return {
      categoryId: 'Open manhole',
      categoryLabel: 'Open Manhole',
      severity: lower.match(/urgent|danger|accident|school|deep|fall/) ? 'emergency' : 'high',
      confidence: 'High (Safety Hazard)',
      icon: '🕳️',
      sla: '24 hrs',
      reason: 'Drain/manhole safety hazard detected'
    };
  }
  if (lower.match(/water|leak|pipe|burst|tap|contamination|pipeline|flooding/)) {
    return {
      categoryId: 'Water leakage',
      categoryLabel: 'Water Leakage',
      severity: lower.match(/burst|flood|torrent|gushing/) ? 'high' : 'medium',
      confidence: 'High (Hydraulic Infra)',
      icon: '💧',
      sla: '24 hrs',
      reason: 'Water supply & hydraulic infrastructure keywords detected'
    };
  }
  if (lower.match(/garbage|trash|waste|dump|litter|debris|stench|smell|bin|refuse/)) {
    return {
      categoryId: 'Garbage / Waste',
      categoryLabel: 'Garbage / Waste Dump',
      severity: lower.match(/huge|toxic|hospital|rotting/) ? 'high' : 'medium',
      confidence: 'High (Sanitation)',
      icon: '🗑️',
      sla: '48 hrs',
      reason: 'Sanitation & waste dump keywords detected'
    };
  }
  if (lower.match(/street\s*light|streetlight|lamp|light|dark|wire|spark|blackout|electricity/)) {
    return {
      categoryId: 'Streetlight / Electricity',
      categoryLabel: 'Broken Streetlight',
      severity: lower.match(/spark|shock|live wire|hanging wire/) ? 'emergency' : 'medium',
      confidence: 'High (Electrical Grid)',
      icon: '💡',
      sla: '48 hrs',
      reason: 'Public illumination & electrical grid keywords detected'
    };
  }
  if (lower.match(/pothole|crater|road|crack|asphalt|tarmac|divider|speed\s*breaker|pavement/)) {
    return {
      categoryId: 'Pothole / Road damage',
      categoryLabel: 'Pothole / Road Damage',
      severity: lower.match(/accident|huge|deep|bike fall|damage/) ? 'high' : 'medium',
      confidence: 'High (Roads & Infra)',
      icon: '🚧',
      sla: '5 days',
      reason: 'Road surface & pavement keywords detected'
    };
  }
  return null;
};

export const ReportIssuePage = ({ onNavigate }) => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [severity, setSeverity] = useState('medium');
  const [latitude, setLatitude] = useState(18.5204);
  const [longitude, setLongitude] = useState(73.8567);
  const [address, setAddress] = useState('FC Road, Deccan, Pune');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [createdResult, setCreatedResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // AI Smart Triage prediction
  const suggestedTriage = React.useMemo(() => {
    return detectSmartTriage(`${title} ${description}`);
  }, [title, description]);

  // Handle Photo Selection
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (photos.length + files.length > 3) {
      alert('You can upload a maximum of 3 evidence photos.');
      return;
    }

    const newPhotos = [...photos, ...files].slice(0, 3);
    setPhotos(newPhotos);

    // Create browser preview URLs
    const newPreviews = newPhotos.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const removePhoto = (index) => {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    setPreviews(updatedPreviews);
  };

  // Check 50m spatial duplicates before submitting
  const handleSubmitClick = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please provide a title and detailed description.');
      return;
    }

    // Step 1: Spatial duplicate check (< 50 meters)
    try {
      const dupeRes = await issuesApi.checkDuplicates(category, latitude, longitude);
      if (dupeRes.duplicates && dupeRes.duplicates.length > 0) {
        setDuplicateWarning(dupeRes.duplicates[0]);
        return;
      }
    } catch (err) {
      console.warn('Duplicate check skipped:', err);
    }

    // If no duplicate, proceed to report
    await executeSubmission();
  };

  // Submit multipart issue to backend
  const executeSubmission = async () => {
    setSubmitting(true);
    setDuplicateWarning(null);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('severity', severity);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('address', address);
      formData.append('is_anonymous', isAnonymous ? 'true' : 'false');

      photos.forEach((file) => {
        formData.append('photos', file);
      });

      const res = await issuesApi.createIssue(formData);
      setCreatedResult(res.issue);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit grievance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // If issue successfully created, show confirmation card
  if (createdResult) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 animate-fade-in">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-100 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Grievance Registered
            </span>
            <h2 className="text-2xl font-heading font-extrabold text-slate-900">
              Ticket Logged Successfully
            </h2>
            <p className="text-sm text-slate-600">
              Your issue has been routed to the department and SLA countdown has started.
            </p>
          </div>

          {/* Ticket Information Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs text-slate-500 font-medium">Ticket Number:</span>
              <span className="font-mono font-bold text-civic-700 text-base">{createdResult.ticket_number}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs text-slate-500 font-medium">Category:</span>
              <span className="font-semibold text-slate-800 text-sm">{createdResult.category}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs text-slate-500 font-medium">Resolution SLA:</span>
              <span className="font-semibold text-emerald-700 text-sm flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {createdResult.sla_hours} Hours Guaranteed
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs text-slate-500 font-medium">Assigned Officer:</span>
              <span className="font-semibold text-slate-800 text-sm">{createdResult.assigned_officer_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {createdResult.status}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => onNavigate('my-reports')}
              className="flex-1 py-3 px-4 rounded-xl bg-civic-600 hover:bg-civic-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
            >
              Track in My Reports
            </button>
            <button
              onClick={() => {
                setCreatedResult(null);
                setTitle('');
                setDescription('');
                setPhotos([]);
                setPreviews([]);
              }}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors"
            >
              Report Another Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedCategoryObj = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-heading font-extrabold text-slate-900 flex items-center gap-2">
          <span>{t('report')}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-civic-100 text-civic-800">
            DFD 2.0
          </span>
        </h2>
        <p className="text-xs text-slate-500">
          Upload photos, adjust your exact GPS pin, and our system will auto-route to the municipal department with a binding SLA timer.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmitClick} className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-6">
        {/* 1. Evidence Photos (Max 3) */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-civic-600" />
              Evidence Photos (Max 3)
            </span>
            <span className="text-[11px] font-normal text-slate-400">EXIF data stripped for privacy</span>
          </label>

          {/* Photo Previews & Upload Box */}
          <div className="grid grid-cols-3 gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-300 shadow-sm group">
                <img src={src} alt="Evidence preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {photos.length < 3 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-civic-300 hover:border-civic-500 bg-civic-50/50 hover:bg-civic-50 transition-colors flex flex-col items-center justify-center cursor-pointer p-3 text-center group active:scale-95">
                <Camera className="w-6 h-6 text-civic-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-civic-700 leading-tight">Camera / Upload</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{photos.length}/3 photos</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* 2. Interactive Draggable Location Pin */}
        <LeafletLocationPicker
          latitude={latitude}
          longitude={longitude}
          onLocationChange={({ latitude: lat, longitude: lng, address: addr }) => {
            setLatitude(lat);
            setLongitude(lng);
            setAddress(addr);
          }}
        />

        {/* AI Smart Triage Alert Banner */}
        {suggestedTriage && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/60 border border-amber-200 shadow-sm flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-base shadow-sm">
                ✨
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">AI Smart Triage Recommended</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {suggestedTriage.confidence}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Detected <strong>{suggestedTriage.categoryLabel}</strong> ({suggestedTriage.sla} SLA) &bull; Priority: <span className="capitalize font-semibold text-slate-800">{suggestedTriage.severity}</span>
                </p>
              </div>
            </div>
            {category !== suggestedTriage.categoryId || severity !== suggestedTriage.severity ? (
              <button
                type="button"
                onClick={() => {
                  setCategory(suggestedTriage.categoryId);
                  setSeverity(suggestedTriage.severity);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 shrink-0"
              >
                Apply
              </button>
            ) : (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                Applied ✓
              </span>
            )}
          </div>
        )}

        {/* 3. Category Selector with SLA indicator */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            {t('category')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'border-civic-600 bg-civic-50/70 ring-2 ring-civic-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{cat.icon}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-civic-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {cat.sla} SLA
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">{cat.label}</h4>
                    <p className="text-[10px] text-slate-400">{cat.dept}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Issue Title */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800">
            {t('title')}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('title_placeholder')}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500 text-sm"
          />
        </div>

        {/* 5. Severity & Anonymous Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              {t('severity')}
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500 text-sm bg-white"
            >
              <option value="low">Low (Minor inconvenience)</option>
              <option value="medium">Medium (Standard priority)</option>
              <option value="high">High (Traffic or public hazard)</option>
              <option value="emergency">Emergency (Imminent life danger)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70">
            <div>
              <span className="text-xs font-bold text-slate-800 block">{t('anonymous')}</span>
              <span className="text-[10px] text-slate-500 block leading-tight">{t('anonymous_subtext')}</span>
            </div>
            <input
              type="checkbox"
              id="anonymous_toggle"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-civic-600 rounded focus:ring-civic-500 cursor-pointer"
            />
          </div>
        </div>

        {/* 6. Detailed Description */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800">
            {t('description')}
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('desc_placeholder')}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-civic-500 text-sm"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-civic-700 to-civic-600 hover:from-civic-800 hover:to-civic-700 text-white font-heading font-bold text-base shadow-lg shadow-civic-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <span>{t('submitting')}</span>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>{t('submit_report')} ({selectedCategoryObj.sla} SLA)</span>
            </>
          )}
        </button>
      </form>

      {/* Duplicate Warning Modal if spatial duplicate detected */}
      {duplicateWarning && (
        <DuplicateWarningModal
          duplicate={duplicateWarning}
          onClose={() => setDuplicateWarning(null)}
          onUpvoted={(dupeIssue) => {
            alert(`Thank you! You upvoted ticket ${dupeIssue.ticket_number}. Its municipal priority has been increased.`);
            onNavigate('feed');
          }}
          onProceedAnyway={() => executeSubmission()}
        />
      )}
    </div>
  );
};
