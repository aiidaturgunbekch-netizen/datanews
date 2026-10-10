import React, { useState } from 'react';
import {
  Announcement,
  CategoryId,
  CityId,
  Language,
  AnnouncementStatus,
  UrgencyType,
} from '../types';
import { getTranslation } from '../locales/translations';
import { StorageService } from '../services/storage';

interface AdminPortalProps {
  currentLanguage: Language;
  announcements: Announcement[];
  onRefreshData: () => void;
  onClose: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentLanguage,
  announcements,
  onRefreshData,
  onClose,
}) => {
  const { t } = getTranslation(currentLanguage);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    StorageService.isAdminAuthenticated()
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Edit / Create Form State
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Form Fields State
  const [formProtocolCode, setFormProtocolCode] = useState('');
  const [formTitleRu, setFormTitleRu] = useState('');
  const [formTitleKg, setFormTitleKg] = useState('');
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formSummaryRu, setFormSummaryRu] = useState('');
  const [formDescRu, setFormDescRu] = useState('');
  const [formCategory, setFormCategory] = useState<CategoryId>('roads');
  const [formCity, setFormCity] = useState<CityId>('bishkek');
  const [formDistrict, setFormDistrict] = useState('');
  const [formLocationRu, setFormLocationRu] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formUrgency, setFormUrgency] = useState<UrgencyType>('planned');
  const [formStatus, setFormStatus] = useState<AnnouncementStatus>('active');
  const [formSourceName, setFormSourceName] = useState('');
  const [formSourceOrgType, setFormSourceOrgType] = useState('МБ');
  const [formIsTicker, setFormIsTicker] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (StorageService.loginAdmin(passwordInput.trim())) {
      setIsAuthenticated(true);
      setLoginError('');
      setPasswordInput('');
    } else {
      setLoginError('Неверный пароль. Для теста используйте admin123');
    }
  };

  const handleLogout = () => {
    StorageService.logoutAdmin();
    setIsAuthenticated(false);
  };

  const handleOpenCreate = () => {
    const defaultProto = '#KG-' + Math.floor(1000 + Math.random() * 9000);
    setFormProtocolCode(defaultProto);
    setFormTitleRu('');
    setFormTitleKg('');
    setFormTitleEn('');
    setFormSummaryRu('');
    setFormDescRu('');
    setFormCategory('roads');
    setFormCity('bishkek');
    setFormDistrict('Первомайский район');
    setFormLocationRu('ул. Киевская / ул. Манаса');
    setFormStartDate('2026-10-10T08:00');
    setFormEndDate('2026-10-12T20:00');
    setFormDuration('48 ч');
    setFormUrgency('emergency');
    setFormStatus('active');
    setFormSourceName('Мэрия г. Бишкек');
    setFormSourceOrgType('МБ');
    setFormIsTicker(false);
    setEditingItem(null);
    setIsCreatingNew(true);
  };

  const handleOpenEdit = (item: Announcement) => {
    setEditingItem(item);
    setFormProtocolCode(item.protocolCode);
    setFormTitleRu(item.title.ru);
    setFormTitleKg(item.title.kg || item.title.ru);
    setFormTitleEn(item.title.en || item.title.ru);
    setFormSummaryRu(item.summary.ru);
    setFormDescRu(item.description.ru);
    setFormCategory(item.category);
    setFormCity(item.city);
    setFormDistrict(item.district || '');
    setFormLocationRu(item.location.ru);
    setFormStartDate(item.startDate);
    setFormEndDate(item.endDate);
    setFormDuration(item.durationBadge || '');
    setFormUrgency(item.urgency);
    setFormStatus(item.status);
    setFormSourceName(item.sourceName);
    setFormSourceOrgType(item.sourceOrgType);
    setFormIsTicker(item.isUrgentTicker || false);
    setIsCreatingNew(false);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitleRu.trim()) {
      alert('Пожалуйста, заполните заголовок');
      return;
    }

    const payload = {
      protocolCode: formProtocolCode || '#KG-DEMO',
      title: {
        ru: formTitleRu,
        kg: formTitleKg || formTitleRu,
        en: formTitleEn || formTitleRu,
      },
      summary: {
        ru: formSummaryRu || formTitleRu,
        kg: formSummaryRu || formTitleRu,
        en: formSummaryRu || formTitleRu,
      },
      description: {
        ru: formDescRu || formSummaryRu || formTitleRu,
        kg: formDescRu || formSummaryRu || formTitleRu,
        en: formDescRu || formSummaryRu || formTitleRu,
      },
      category: formCategory,
      city: formCity,
      district: formDistrict,
      location: {
        ru: formLocationRu || 'Бишкек',
        kg: formLocationRu || 'Бишкек',
        en: formLocationRu || 'Bishkek',
      },
      startDate: formStartDate || new Date().toISOString(),
      endDate: formEndDate || new Date(Date.now() + 86400000).toISOString(),
      durationBadge: formDuration,
      urgency: formUrgency,
      status: formStatus,
      isUrgentTicker: formIsTicker,
      sourceName: formSourceName || 'Муниципалитет',
      sourceOrgType: formSourceOrgType || 'МБ',
      isVerified: true,
      isDemo: true,
    };

    if (editingItem) {
      StorageService.updateAnnouncement(editingItem.id, payload);
    } else {
      StorageService.createAnnouncement(payload);
    }

    onRefreshData();
    setEditingItem(null);
    setIsCreatingNew(false);
    setSaveSuccessMsg(t('admin.successSaved'));
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleDelete = (id: string) => {
    if (confirm('Вы действительно хотите удалить это объявление?')) {
      StorageService.deleteAnnouncement(id);
      onRefreshData();
    }
  };

  const handleStatusChange = (id: string, newStatus: AnnouncementStatus) => {
    StorageService.setStatus(id, newStatus);
    onRefreshData();
  };

  const handleResetDefaults = () => {
    if (confirm(t('admin.resetConfirm'))) {
      StorageService.resetToDefaults();
      onRefreshData();
    }
  };

  // Filter list
  const filteredAnnouncements = announcements.filter((a) => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-gray-100 overflow-hidden relative text-[#0f1b33] max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0d2459] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#20C7B5]">
              <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">{t('admin.title')}</h2>
              <p className="text-xs text-[#dbe1ff]">{t('admin.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>{t('admin.logoutBtn')}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {saveSuccessMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {!isAuthenticated ? (
            /* Login Box */
            <div className="max-w-md mx-auto py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#12327A] flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <span className="material-symbols-outlined text-3xl">lock</span>
              </div>
              <h3 className="text-xl font-bold mb-2">{t('admin.loginTitle')}</h3>
              <p className="text-xs text-gray-500 mb-6">{t('admin.loginDesc')}</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Введите пароль..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#20C7B5]"
                    autoFocus
                  />
                  {loginError && (
                    <p className="text-xs text-red-600 mt-1 font-semibold">{loginError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#12327A] text-white font-bold text-sm hover:bg-[#07173d] transition-colors shadow-sm"
                >
                  {t('admin.loginBtn')}
                </button>

                <p className="text-xs text-gray-400 mt-3">{t('admin.authNote')}</p>
              </form>
            </div>
          ) : isCreatingNew || editingItem ? (
            /* Form Modal (Create or Edit) */
            <form onSubmit={handleSaveForm} className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <h3 className="text-base font-bold text-[#12327A]">
                  {editingItem ? 'Редактирование объявления' : 'Новое объявление'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingItem(null);
                  }}
                  className="text-xs text-gray-500 hover:text-black font-semibold"
                >
                  {t('admin.cancelBtn')}
                </button>
              </div>

              {/* Protocol Code & Urgency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Протокол ID
                  </label>
                  <input
                    type="text"
                    value={formProtocolCode}
                    onChange={(e) => setFormProtocolCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs font-mono"
                    placeholder="#KG-BSH-8824"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    {t('admin.categoryLabel')}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as CategoryId)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                  >
                    <option value="roads">{t('categories.roads')}</option>
                    <option value="water">{t('categories.water')}</option>
                    <option value="electricity">{t('categories.electricity')}</option>
                    <option value="repairs">{t('categories.repairs')}</option>
                    <option value="concerts">{t('categories.concerts')}</option>
                    <option value="festivals">{t('categories.festivals')}</option>
                    <option value="education">{t('categories.education')}</option>
                    <option value="gov">{t('categories.gov')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    {t('admin.urgencyLabel')}
                  </label>
                  <select
                    value={formUrgency}
                    onChange={(e) => setFormUrgency(e.target.value as UrgencyType)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                  >
                    <option value="emergency">Срочно / Авария (Красный)</option>
                    <option value="planned">Плановые работы (Оранжевый)</option>
                    <option value="event">Культурное событие (Бирюзовый)</option>
                    <option value="regular">Обычное уведомление</option>
                  </select>
                </div>
              </div>

              {/* Title (RU, KG, EN) */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    {t('admin.titleRu')} *
                  </label>
                  <input
                    type="text"
                    value={formTitleRu}
                    onChange={(e) => setFormTitleRu(e.target.value)}
                    required
                    placeholder="Временное полное перекрытие движения по ул. Киевская..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      {t('admin.titleKg')}
                    </label>
                    <input
                      type="text"
                      value={formTitleKg}
                      onChange={(e) => setFormTitleKg(e.target.value)}
                      placeholder="Киев көчөсүнүн жабылышы..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      {t('admin.titleEn')}
                    </label>
                    <input
                      type="text"
                      value={formTitleEn}
                      onChange={(e) => setFormTitleEn(e.target.value)}
                      placeholder="Temporary road closure..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* City & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    {t('admin.cityLabel')}
                  </label>
                  <select
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value as CityId)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                  >
                    <option value="bishkek">{t('cities.bishkek')}</option>
                    <option value="osh">{t('cities.osh')}</option>
                    <option value="jalalabad">{t('cities.jalalabad')}</option>
                    <option value="karakol">{t('cities.karakol')}</option>
                    <option value="talas">{t('cities.talas')}</option>
                    <option value="naryn">{t('cities.naryn')}</option>
                    <option value="batken">{t('cities.batken')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Район / Округ
                  </label>
                  <input
                    type="text"
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    placeholder="Первомайский район"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    {t('admin.locationRu')}
                  </label>
                  <input
                    type="text"
                    value={formLocationRu}
                    onChange={(e) => setFormLocationRu(e.target.value)}
                    placeholder="ул. Киевская (от пр. Манаса до ул. Логвиненко)"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                  />
                </div>
              </div>

              {/* Dates & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    {t('admin.startDateLabel')}
                  </label>
                  <input
                    type="datetime-local"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    {t('admin.endDateLabel')}
                  </label>
                  <input
                    type="datetime-local"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Длительность (бейдж)
                  </label>
                  <input
                    type="text"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    placeholder="60 ч, 3 дня, и т.д."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                  />
                </div>
              </div>

              {/* Source & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    {t('admin.sourceNameLabel')}
                  </label>
                  <input
                    type="text"
                    value={formSourceName}
                    onChange={(e) => setFormSourceName(e.target.value)}
                    placeholder="Мэрия г. Бишкек"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Тип службы (МБ, ВК, НЭ)
                  </label>
                  <input
                    type="text"
                    value={formSourceOrgType}
                    onChange={(e) => setFormSourceOrgType(e.target.value)}
                    placeholder="МБ"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Статус публикации
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AnnouncementStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                  >
                    <option value="active">{t('details.statusActive')}</option>
                    <option value="scheduled">{t('details.statusScheduled')}</option>
                    <option value="rescheduled">{t('details.statusRescheduled')}</option>
                    <option value="completed">{t('details.statusCompleted')}</option>
                    <option value="cancelled">{t('details.statusCancelled')}</option>
                    <option value="archived">{t('details.statusArchived')}</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Подробное описание работ / событий
                </label>
                <textarea
                  value={formDescRu}
                  onChange={(e) => setFormDescRu(e.target.value)}
                  rows={3}
                  placeholder="Опишите характер работ, перекрытия или программу события..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs"
                />
              </div>

              {/* Ticker Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isTickerCheckbox"
                  checked={formIsTicker}
                  onChange={(e) => setFormIsTicker(e.target.checked)}
                  className="rounded text-[#12327A] focus:ring-[#20C7B5]"
                />
                <label htmlFor="isTickerCheckbox" className="text-xs text-gray-700 font-semibold cursor-pointer">
                  {t('admin.isTickerLabel')}
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700"
                >
                  {t('admin.cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#20C7B5] hover:bg-[#1bb3a2] text-[#002f29] text-xs font-bold shadow-sm"
                >
                  {t('admin.saveBtn')}
                </button>
              </div>
            </form>
          ) : (
            /* Announcements Table & Management */
            <div>
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenCreate}
                    className="px-4 py-2 rounded-xl bg-[#20C7B5] text-[#002f29] font-bold text-xs hover:bg-[#1bb3a2] transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    <span>{t('admin.newAnnouncement')}</span>
                  </button>

                  <button
                    onClick={handleResetDefaults}
                    className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
                    title="Сбросить к первоначальным демо-данным"
                  >
                    {t('admin.resetDefaults')}
                  </button>
                </div>

                {/* Status Tabs */}
                <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                  {(['all', 'active', 'scheduled', 'rescheduled', 'completed', 'cancelled', 'archived'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        statusFilter === st
                          ? 'bg-white text-[#12327A] shadow-2xs'
                          : 'text-gray-500 hover:text-black'
                      }`}
                    >
                      {st === 'all'
                        ? t('admin.filterAll')
                        : st === 'active'
                        ? t('admin.statusActive')
                        : st === 'scheduled'
                        ? t('admin.statusScheduled')
                        : st === 'rescheduled'
                        ? t('details.statusRescheduled')
                        : st === 'completed'
                        ? t('details.statusCompleted')
                        : st === 'cancelled'
                        ? t('details.statusCancelled')
                        : t('admin.statusArchived')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table / List */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fafc] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="p-3">ID / Протокол</th>
                        <th className="p-3">Заголовок / Город</th>
                        <th className="p-3">Категория</th>
                        <th className="p-3">Дата старта</th>
                        <th className="p-3">Статус</th>
                        <th className="p-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAnnouncements.map((ann) => (
                        <tr key={ann.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-[#12327A]">
                            {ann.protocolCode}
                            {ann.isUrgentTicker && (
                              <span className="block text-[10px] text-red-600 font-sans font-bold">
                                В бегущей строке
                              </span>
                            )}
                          </td>
                          <td className="p-3 max-w-xs">
                            <div className="font-bold text-[#0f1b33] line-clamp-1">
                              {ann.title.ru}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {t(`cities.${ann.city}`)} • {ann.sourceName}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-[#12327A]">
                              {t(`categories.${ann.category}`)}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500 whitespace-nowrap">
                            {new Date(ann.startDate).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            {new Date(ann.startDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                ann.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ann.status === 'scheduled'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {ann.status}
                            </span>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(ann)}
                                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600"
                                title="Редактировать"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>

                              {ann.status === 'active' ? (
                                <button
                                  onClick={() => handleStatusChange(ann.id, 'archived')}
                                  className="p-1.5 rounded-lg hover:bg-gray-200 text-amber-600"
                                  title="В архив"
                                >
                                  <span className="material-symbols-outlined text-[16px]">archive</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(ann.id, 'active')}
                                  className="p-1.5 rounded-lg hover:bg-gray-200 text-emerald-600"
                                  title="Опубликовать"
                                >
                                  <span className="material-symbols-outlined text-[16px]">publish</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleDelete(ann.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                                title="Удалить"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
