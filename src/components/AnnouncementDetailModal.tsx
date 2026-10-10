import React, { useState } from 'react';
import { Announcement, Language } from '../types';
import { getTranslation } from '../locales/translations';
import { StorageService } from '../services/storage';

interface AnnouncementDetailModalProps {
  announcement: Announcement;
  currentLanguage: Language;
  onClose: () => void;
  onSelectOtherNotice?: (ann: Announcement) => void;
  allAnnouncements?: Announcement[];
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  announcement,
  currentLanguage,
  onClose,
  onSelectOtherNotice,
  allAnnouncements = [],
}) => {
  const { t } = getTranslation(currentLanguage);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFavorited, setIsFavorited] = useState(() =>
    StorageService.getFavorites().includes(announcement.id)
  );
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);

  const title = announcement.title[currentLanguage] || announcement.title.ru;
  const description = announcement.description[currentLanguage] || announcement.description.ru;
  const location = announcement.location[currentLanguage] || announcement.location.ru;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleToggleFav = () => {
    StorageService.toggleFavorite(announcement.id);
    setIsFavorited(!isFavorited);
  };

  const handleAddToCalendar = () => {
    const titleEncoded = encodeURIComponent(title);
    const locEncoded = encodeURIComponent(location);
    const detailsEncoded = encodeURIComponent(description);
    const startIso = new Date(announcement.startDate).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endIso = new Date(announcement.endDate).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleEncoded}&dates=${startIso}/${endIso}&details=${detailsEncoded}&location=${locEncoded}`;
    window.open(url, '_blank');
  };

  // Nearby notices in the same city
  const nearbyItems = allAnnouncements
    .filter((a) => a.id !== announcement.id && a.city === announcement.city)
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-[1240px] my-4 shadow-2xl border border-gray-100 overflow-hidden relative text-[#0f1b33]">
        {/* Top Operational Bar */}
        <div className="bg-[#f8fafc] px-4 sm:px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 overflow-hidden">
            <span className="material-symbols-outlined text-[16px] text-gray-400">home</span>
            <span>{t('nav.home')}</span>
            <span>/</span>
            <span>{t('nav.alerts')}</span>
            <span>/</span>
            <span className="text-[#12327A] font-semibold truncate max-w-[160px] sm:max-w-xs">
              {location}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Protocol Code Badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-gray-200 text-[#12327A] font-mono text-xs font-bold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626]" />
              <span>{announcement.protocolCode}</span>
            </span>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Main Header Content */}
        <div className="p-4 sm:p-6 md:p-8">
          {/* Status Badges & Calendar Sync Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-[#fee2e2] text-[#dc2626] text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>
                  {announcement.urgency === 'emergency'
                    ? 'ВНИМАНИЕ: ПЕРЕКРЫТИЕ ДВИЖЕНИЯ'
                    : 'ГОРОДСКОЕ ПРЕДУПРЕЖДЕНИЕ'}
                </span>
              </span>

              {announcement.status === 'active' && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t('details.statusActive')}</span>
                </span>
              )}
              {announcement.status === 'scheduled' && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#12327A] text-xs font-bold flex items-center gap-1 border border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-[#12327A]" />
                  <span>{t('details.statusScheduled')}</span>
                </span>
              )}
              {announcement.status === 'rescheduled' && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold flex items-center gap-1 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{t('details.statusRescheduled')}</span>
                </span>
              )}
              {announcement.status === 'completed' && (
                <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold flex items-center gap-1 border border-gray-200">
                  <span className="w-2 h-2 rounded-full bg-gray-500" />
                  <span>{t('details.statusCompleted')}</span>
                </span>
              )}
              {announcement.status === 'cancelled' && (
                <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-bold flex items-center gap-1 border border-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>{t('details.statusCancelled')}</span>
                </span>
              )}

              {announcement.isVerified && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#12327A] text-xs font-bold flex items-center gap-1 border border-blue-200">
                  <span className="material-symbols-outlined text-[16px] text-[#20C7B5]">verified</span>
                  <span>{t('details.verifiedBadge')}</span>
                </span>
              )}
            </div>

            {/* Sync Button */}
            <button
              onClick={handleAddToCalendar}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d2459] hover:bg-[#12327A] text-white text-xs font-bold shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <div className="text-left">
                <div>{t('details.syncCalendar')}</div>
                <div className="text-[10px] text-[#20C7B5] font-normal">{t('details.syncReminder')}</div>
              </div>
            </button>
          </div>

          {/* Main Title */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0f1b33] mb-3 leading-snug">
            {title}
          </h1>

          {/* Publication Metadata */}
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500 mb-6 pb-4 border-b border-gray-100">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>
                {t('details.published')} {announcement.publishedAt.replace('T', ' ')}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">update</span>
              <span>
                {t('details.updated')} {announcement.updatedAt.replace('T', ' ')}
              </span>
            </span>
            <span className="flex items-center gap-1 text-[#12327A] font-semibold">
              <span className="material-symbols-outlined text-[16px]">account_balance</span>
              <span>
                {t('details.sourceLabel')} {announcement.sourceName}
              </span>
            </span>
          </div>

          {/* 3 Parameter Cards (КОГДА, ГДЕ, ЧТО) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Card 1: КОГДА / КАЧАН */}
            <div className="p-4 rounded-2xl bg-[#f8fafc] border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#12327A]">
                    <span className="material-symbols-outlined text-[#00897b] text-[18px]">schedule</span>
                    <span>{t('details.timeCardTitle')}</span>
                  </div>
                  {announcement.durationBadge && (
                    <span className="px-2 py-0.5 rounded bg-red-100 text-[#dc2626] font-bold text-xs">
                      {announcement.durationBadge}
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      {t('details.workStart')}
                    </span>
                    <span className="text-xs font-bold text-[#0f1b33]">
                      {new Date(announcement.startDate).toLocaleDateString(
                        currentLanguage === 'en' ? 'en-US' : 'ru-RU',
                        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                      )}{' '}
                      •{' '}
                      {new Date(announcement.startDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      {t('details.workEnd')}
                    </span>
                    <span className="text-xs font-bold text-[#0f1b33]">
                      {new Date(announcement.endDate).toLocaleDateString(
                        currentLanguage === 'en' ? 'en-US' : 'ru-RU',
                        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                      )}{' '}
                      •{' '}
                      {new Date(announcement.endDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
                <span className="text-gray-500">
                  {announcement.workMode
                    ? announcement.workMode[currentLanguage] || announcement.workMode.ru
                    : 'Режим: круглосуточно (3 смены)'}
                </span>
                {announcement.status === 'completed' ? (
                  <span className="inline-flex items-center gap-1 font-bold text-gray-600">
                    <span className="material-symbols-outlined text-[16px] text-gray-500">task_alt</span>
                    <span>{t('details.statusCompleted')}</span>
                  </span>
                ) : announcement.status === 'cancelled' ? (
                  <span className="inline-flex items-center gap-1 font-bold text-red-600">
                    <span className="material-symbols-outlined text-[16px] text-red-500">cancel</span>
                    <span>{t('details.statusCancelled')}</span>
                  </span>
                ) : announcement.status === 'rescheduled' ? (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                    <span className="material-symbols-outlined text-[16px] text-amber-500">update</span>
                    <span>{t('details.statusRescheduled')}</span>
                  </span>
                ) : announcement.status === 'scheduled' ? (
                  <span className="inline-flex items-center gap-1 font-bold text-[#12327A]">
                    <span className="material-symbols-outlined text-[16px] text-[#12327A]">event</span>
                    <span>{t('details.statusScheduled')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-[#dc2626]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-ping" />
                    <span>Идут работы</span>
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: ГДЕ / КАЙДА */}
            <div className="p-4 rounded-2xl bg-[#f8fafc] border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#12327A]">
                    <span className="material-symbols-outlined text-[#00897b] text-[18px]">location_on</span>
                    <span>{t('details.locationCardTitle')}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-[#12327A] font-bold text-xs">
                    {t(`cities.${announcement.city}`)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      {t('details.adminDistrict')}
                    </span>
                    <span className="text-xs font-bold text-[#0f1b33]">
                      {announcement.district || 'Первомайский район г. Бишкек'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      {t('details.closedSegment')}
                    </span>
                    <span className="text-xs font-bold text-[#0f1b33]">{location}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 text-xs text-gray-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#dc2626]">block</span>
                <span className="truncate">
                  {announcement.intersectionsNote
                    ? announcement.intersectionsNote[currentLanguage] || announcement.intersectionsNote.ru
                    : 'Включая прилегающие перекрестки'}
                </span>
              </div>
            </div>

            {/* Card 3: ЧТО / ЭМНЕ */}
            <div className="p-4 rounded-2xl bg-[#f8fafc] border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#12327A]">
                    <span className="material-symbols-outlined text-[#00897b] text-[18px]">build</span>
                    <span>{t('details.workCardTitle')}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-xs">
                    {t(`categories.${announcement.category}`)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      {t('details.workTypeLabel')}
                    </span>
                    <span className="text-xs font-medium text-[#0f1b33]">
                      {announcement.workType
                        ? announcement.workType[currentLanguage] || announcement.workType.ru
                        : announcement.summary[currentLanguage] || announcement.summary.ru}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      {t('details.workGoalLabel')}
                    </span>
                    <span className="text-xs font-medium text-[#0f1b33]">
                      {announcement.workGoal
                        ? announcement.workGoal[currentLanguage] || announcement.workGoal.ru
                        : 'Безопасность и стабильное обеспечение инфраструктуры города.'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 text-xs text-gray-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00897b]">engineering</span>
                <span className="truncate">
                  {announcement.contractor
                    ? `${t('details.contractorLabel')} ${
                        announcement.contractor[currentLanguage] || announcement.contractor.ru
                      }`
                    : `Ответственная служба: ${announcement.sourceName}`}
                </span>
              </div>
            </div>
          </div>

          {/* Grid Layout: Left Content (Map + Transit + Quote) & Right Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 8 Cols: Map, Transit, Statement */}
            <div className="lg:col-span-8 space-y-8">
              {/* Schematic Interactive Closure & Detour Map */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#00897b] block">
                      {t('details.interactiveMapTitle')}
                    </span>
                    <h3 className="text-lg font-bold text-[#0f1b33]">
                      {t('details.interactiveMapSubtitle')}
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsFullscreenMap(!isFullscreenMap)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">fullscreen</span>
                    <span>{t('details.fullscreen')}</span>
                  </button>
                </div>

                {/* SVG Schematic Map Canvas */}
                <div
                  className={`w-full rounded-2xl overflow-hidden bg-[#eef2f9] relative border border-gray-200 ${
                    isFullscreenMap ? 'h-[500px]' : 'h-[320px]'
                  }`}
                >
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 800 400"
                    preserveAspectRatio="xMidYMid slice"
                  >
                    {/* Background Grid Roads */}
                    <rect width="800" height="400" fill="#f1f5f9" />
                    
                    {/* City blocks representation */}
                    <rect x="50" y="50" width="180" height="80" rx="8" fill="#e2e8f0" />
                    <rect x="260" y="50" width="220" height="80" rx="8" fill="#e2e8f0" />
                    <rect x="510" y="50" width="240" height="80" rx="8" fill="#e2e8f0" />
                    <rect x="50" y="160" width="180" height="80" rx="8" fill="#e2e8f0" />
                    <rect x="260" y="160" width="220" height="80" rx="8" fill="#e2e8f0" />
                    <rect x="510" y="160" width="240" height="80" rx="8" fill="#e2e8f0" />
                    <rect x="50" y="270" width="180" height="80" rx="8" fill="#e2e8f0" />
                    <rect x="260" y="270" width="220" height="80" rx="8" fill="#e2e8f0" />
                    <rect x="510" y="270" width="240" height="80" rx="8" fill="#e2e8f0" />

                    {/* Street Labels */}
                    <text x="130" y="42" fill="#64748b" fontSize="12" fontWeight="600" textAnchor="middle">
                      пр. Чуй / Chuy Ave
                    </text>
                    <text x="130" y="152" fill="#0f1b33" fontSize="13" fontWeight="700" textAnchor="middle">
                      ул. Киевская / Kyiv St
                    </text>
                    <text x="130" y="262" fill="#047857" fontSize="12" fontWeight="600" textAnchor="middle">
                      ул. Токтогула / Toktogul St
                    </text>
                    <text x="130" y="372" fill="#047857" fontSize="12" fontWeight="600" textAnchor="middle">
                      ул. Московская / Moskovskaya St
                    </text>

                    {/* Avenue lines */}
                    {/* North-South Avenues: Manas (x=240), Isanova (x=380), Togolok Moldo (x=490), Logvinenko (x=680) */}
                    <line x1="240" y1="20" x2="240" y2="380" stroke="#cbd5e1" strokeWidth="16" />
                    <line x1="380" y1="20" x2="380" y2="380" stroke="#cbd5e1" strokeWidth="12" />
                    <line x1="500" y1="20" x2="500" y2="380" stroke="#cbd5e1" strokeWidth="12" />
                    <line x1="680" y1="20" x2="680" y2="380" stroke="#cbd5e1" strokeWidth="16" />

                    {/* East-West Streets: Kyiv street (y=145) */}
                    <line x1="40" y1="145" x2="760" y2="145" stroke="#cbd5e1" strokeWidth="14" />
                    {/* Chuy Ave (y=35) */}
                    <line x1="40" y1="35" x2="760" y2="35" stroke="#cbd5e1" strokeWidth="14" />
                    {/* Toktogul St (y=255) */}
                    <line x1="40" y1="255" x2="760" y2="255" stroke="#cbd5e1" strokeWidth="14" />
                    {/* Moskovskaya St (y=365) */}
                    <line x1="40" y1="365" x2="760" y2="365" stroke="#cbd5e1" strokeWidth="16" />

                    {/* Detour Green Loop (Toktogul / Moskovskaya) */}
                    <rect
                      x="230"
                      y="140"
                      width="460"
                      height="230"
                      rx="16"
                      fill="none"
                      stroke="#059669"
                      strokeWidth="3.5"
                      strokeDasharray="6 4"
                    />

                    {/* RED CLOSED SECTION on Kyiv Street (between Manas x=240 and Logvinenko x=680) */}
                    <line
                      x1="240"
                      y1="145"
                      x2="680"
                      y2="145"
                      stroke="#dc2626"
                      strokeWidth="10"
                      strokeLinecap="round"
                    />

                    {/* Excavation Warning Box */}
                    <rect x="400" y="125" width="140" height="38" rx="6" fill="#dc2626" />
                    <text x="470" y="148" fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle">
                      Разрытие 500мм ⚠️
                    </text>

                    {/* Manas Intersection Icon */}
                    <rect x="220" y="130" width="40" height="30" rx="6" fill="#0f1b33" />
                    <text x="240" y="149" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">
                      пр. Манаса
                    </text>

                    {/* Logvinenko Intersection Icon */}
                    <rect x="655" y="130" width="55" height="30" rx="6" fill="#0f1b33" />
                    <text x="682" y="149" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">
                      ул. Логвиненко
                    </text>

                    {/* Coordinates & Zone Distance Pill */}
                    <rect x="520" y="70" width="220" height="32" rx="8" fill="#ffffff" opacity="0.9" stroke="#cbd5e1" />
                    <text x="630" y="86" fill="#0f1b33" fontSize="10" fontWeight="700" textAnchor="middle">
                      📍 42.8758° N, 74.5901° E
                    </text>
                    <text x="630" y="97" fill="#64748b" fontSize="9" textAnchor="middle">
                      Протяженность зоны ограничений: 680 м
                    </text>
                  </svg>

                  {/* Floating Map Legend */}
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-[#dc2626]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
                      <span>{t('details.closedRoute')} (Киевская)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <span>{t('details.detourRoute')} (Московская / Токтогула)</span>
                    </span>
                  </div>
                </div>

                {/* Detour Recommendation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-1.5 text-emerald-900 font-bold text-xs">
                      <span className="material-symbols-outlined text-[18px]">alt_route</span>
                      <span>{t('details.recommendedDetour')}</span>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Движение на восток организовано по ул. Московская. Светофорный режим на перекрестках Манаса/Московская переведен в адаптивный режим «зеленая волна».
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                    <div className="flex items-center gap-2 mb-1.5 text-blue-900 font-bold text-xs">
                      <span className="material-symbols-outlined text-[18px]">turn_left</span>
                      <span>{t('details.northDetour')}</span>
                    </div>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Движение на запад рекомендуется осуществлять по ул. Токтогула. Обратите внимание на повышенную загрузку перекрестка с ул. Исанова.
                    </p>
                  </div>
                </div>
              </div>

              {/* Public Transport & Resident Impact Section */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#0d2459] text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">directions_bus</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      {t('details.transportHeader')}
                    </span>
                    <h3 className="text-lg font-bold text-[#0f1b33]">
                      {t('details.transportTitle')}
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Transit Item 1: Buses */}
                  <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="px-2.5 py-1 rounded-lg bg-[#0d2459] text-white font-mono font-bold text-xs tracking-wider flex-shrink-0">
                        8 15 35
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0f1b33] mb-0.5">
                          Муниципальные автобусы №8, №15, №35
                        </h4>
                        <p className="text-xs text-gray-600">
                          Сняты с ул. Киевская и перенаправлены по ул. Московская в обоих направлениях. Временные остановки оборудованы у ТЦ «Caravan» и сквера Тоголока Молдо.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-teal-100 text-teal-800 text-[11px] font-bold flex-shrink-0">
                      Схема изменена
                    </span>
                  </div>

                  {/* Transit Item 2: Trolleybus */}
                  <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="px-2.5 py-1 rounded-lg bg-[#dc2626] text-white font-mono font-bold text-xs tracking-wider flex-shrink-0">
                        11
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0f1b33] mb-0.5">
                          Троллейбусный маршрут №11
                        </h4>
                        <p className="text-xs text-gray-600">
                          Движение троллейбусов временно приостановлено на 60 часов в связи с демонтажем контактной сети. Вместо них интервал автобуса №11 увеличен на 30%.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-800 text-[11px] font-bold flex-shrink-0">
                      Приостановлен
                    </span>
                  </div>

                  {/* Transit Item 3: Residents access */}
                  <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[16px]">lock</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0f1b33] mb-0.5">
                          Въезд во дворы жилых домов №114, 116, 120
                        </h4>
                        <p className="text-xs text-gray-600">
                          Сквозной въезд с ул. Киевская заблокирован. Для жителей и спецслужб организован временный двусторонний заезд со стороны ул. Токтогула через арку дома №118.
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-gray-200 text-gray-700 text-[11px] font-bold flex-shrink-0">
                      Спецпропуск не нужен
                    </span>
                  </div>

                  {/* Water supply status note */}
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs text-blue-900">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-blue-600">water_drop</span>
                      <span>
                        Водоснабжение: В жилых домах прилегающих кварталов подача холодной воды сохраняется в штатном режиме.
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  </div>
                </div>
              </div>

              {/* Official Statement from Mayor's Office */}
              <div className="bg-[#f8fafc] rounded-2xl border border-gray-200 p-6 relative">
                <span className="material-symbols-outlined text-5xl text-gray-300 absolute top-4 right-4 pointer-events-none">
                  format_quote
                </span>

                <h3 className="text-base sm:text-lg font-bold text-[#0f1b33] mb-3">
                  {t('details.officialStatementTitle')}
                </h3>

                <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed italic">
                  {announcement.officialStatement
                    ? announcement.officialStatement.text[currentLanguage] ||
                      announcement.officialStatement.text.ru
                    : '«Трубопровод на данном участке эксплуатируется с 1984 года. При гидравлических испытаниях выявлено истончение стенок трубы. Во избежание аварийных ситуаций в зимний период работы проводятся в безостановочном круглосуточном режиме на протяжении выходных дней. Мэрия просит автолюбителей заранее планировать маршруты передвижения.»\n\nУкладка нового защитного железобетонного лотка и последующее асфальтирование проезжей части завершатся строго к 20:00 понедельника, 12 октября 2026 года.'}
                </p>

                <div className="pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      {t('details.originalDoc')}
                    </span>
                    <a
                      href={announcement.officialStatement?.originalDocUrl || 'https://bishkek.gov.kg'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#12327A] font-bold hover:underline flex items-center gap-1"
                    >
                      <span>Официальный пресс-релиз на bishkek.gov.kg</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </div>
                  <span className="text-gray-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#00897b]" />
                    <span>Верифицировано DataNews Bot 09.10.2026 14:22</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Emergency Contacts, Social Sharing, Nearby Alerts */}
            <div className="lg:col-span-4 space-y-6">
              {/* Emergency Contacts Panel */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[#12327A] text-[20px]">
                    contact_phone
                  </span>
                  <h3 className="font-bold text-sm text-[#0f1b33]">
                    {t('details.emergencyHotlines')}
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">{t('details.emergencyDesc')}</p>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-[#f8fafc] border border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-gray-500 block">Единый колл-центр Мэрии</span>
                      <span className="text-base font-extrabold text-[#0f1b33]">1533</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-[#12327A] font-bold text-xs">
                      {t('details.callCenterFree')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#f8fafc] border border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-gray-500 block">МП «Бишкектеплосеть»</span>
                      <span className="text-sm font-bold text-[#0f1b33]">(0312) 61–11–69</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-400 text-[18px]">
                      open_in_new
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#f8fafc] border border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-gray-500 block">
                        Управление патрульной милиции
                      </span>
                      <span className="text-sm font-bold text-[#0f1b33]">(0312) 53–10–77</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-400 text-[18px]">
                      open_in_new
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 mt-3 italic">
                  При возникновении заторов на перекрестках регулирование обеспечивают инспекторы УПСМ Бишкека.
                </p>
              </div>

              {/* Share & Save Panel */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-[#0f1b33]">
                    {t('details.shareNotice')}
                  </h3>
                  <span className="text-xs text-gray-400 font-medium">
                    {t('details.sharesCount')}
                  </span>
                </div>

                <div className="space-y-2">
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(
                      window.location.href
                    )}&text=${encodeURIComponent(title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#e6f4fe] hover:bg-[#d0ebfd] text-[#0088cc] font-bold text-xs transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>{t('details.shareTelegram')}</span>
                    </span>
                    <span className="text-[11px]">1.4K</span>
                  </a>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      title + ' ' + window.location.href
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#e7f9ee] hover:bg-[#d4f5e0] text-[#059669] font-bold text-xs transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      <span>{t('details.shareWhatsApp')}</span>
                    </span>
                    <span className="material-symbols-outlined text-[16px]">share</span>
                  </a>

                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">link</span>
                      <span>{copiedLink ? 'Скопировано!' : t('details.copyLink')}</span>
                    </span>
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>

                  <button
                    onClick={handleToggleFav}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                      isFavorited
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">
                        {isFavorited ? 'bookmark' : 'bookmark_border'}
                      </span>
                      <span>{t('details.saveFavorite')}</span>
                    </span>
                    <span className="text-[11px] text-gray-400">DataNews Sync</span>
                  </button>

                  <button
                    onClick={handleAddToCalendar}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">event</span>
                      <span>{t('details.googleCalendar')}</span>
                    </span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* Nearby in this District */}
              {nearbyItems.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-[#0f1b33]">
                      {t('details.nearbyTitle')}
                    </h3>
                    <span className="text-xs text-gray-400">
                      {announcement.district || 'Первомайский р-н'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {nearbyItems.map((near) => (
                      <div
                        key={near.id}
                        onClick={() => onSelectOtherNotice && onSelectOtherNotice(near)}
                        className="p-3 rounded-xl bg-[#f8fafc] hover:bg-blue-50/50 border border-gray-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                          <span className="font-bold text-gray-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">
                              {near.category === 'water' ? 'water_drop' : 'construction'}
                            </span>
                            <span>{t(`categories.${near.category}`)}</span>
                          </span>
                          <span>
                            {new Date(near.startDate).toLocaleDateString([], {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-[#0f1b33] line-clamp-2">
                          {near.title[currentLanguage] || near.title.ru}
                        </h4>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer Card */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-blue-600 text-[18px] flex-shrink-0 mt-0.5">
                  info
                </span>
                <p className="leading-relaxed">
                  {t('admin.fictionalNoticeBadge')}. Все даты, номера маршрутов и схемы являются демонстрационным образцом цифровой платформы DataNews Кыргызстан.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
