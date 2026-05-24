import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Trash2, CheckCircle, AlertCircle, Crown, LogIn, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ActivityEntry, ActivityType, getActivityLog, clearActivityLog } from '@/lib/activityLog';

interface ActivityLogProps {
  userId: string;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const ICON_MAP: Record<ActivityType, { icon: React.ReactNode; color: string }> = {
  upload_success:   { icon: <Upload className="h-4 w-4" />,       color: 'bg-blue-50 text-[#0B3D91] border-blue-200' },
  upload_failed:    { icon: <Upload className="h-4 w-4" />,       color: 'bg-red-50 text-red-700 border-red-200' },
  verify_success:   { icon: <CheckCircle className="h-4 w-4" />,  color: 'bg-green-50 text-[#138808] border-green-200' },
  verify_failed:    { icon: <AlertCircle className="h-4 w-4" />,  color: 'bg-red-50 text-red-700 border-red-200' },
  document_deleted: { icon: <Trash2 className="h-4 w-4" />,       color: 'bg-slate-50 text-slate-600 border-slate-200' },
  plan_upgraded:    { icon: <Crown className="h-4 w-4" />,        color: 'bg-amber-50 text-amber-700 border-amber-200' },
  login:            { icon: <LogIn className="h-4 w-4" />,        color: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export default function ActivityLog({ userId }: ActivityLogProps) {
  const { t } = useTranslation('common');
  const [entries, setEntries] = useState<ActivityEntry[]>(() => getActivityLog(userId));

  const refresh = () => setEntries(getActivityLog(userId));

  const handleClear = () => {
    clearActivityLog(userId);
    setEntries([]);
  };

  const getActivityLabel = (type: ActivityType) => {
    const map: Record<ActivityType, string> = {
      upload_success:   t('actions.upload'),
      upload_failed:    t('errors.upload_failed'),
      verify_success:   t('status.verified'),
      verify_failed:    t('status.rejected'),
      document_deleted: t('actions.delete'),
      plan_upgraded:    t('actions.upgrade'),
      login:            t('auth.sign_in'),
    };
    return map[type] || type;
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-10 px-4">
        <RefreshCw className="h-8 w-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600">{t('dashboard.no_documents')}</p>
        <p className="text-xs text-slate-400 mt-1">{t('dashboard.activity_subtitle')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-5 py-2 border-b border-slate-100">
        <p className="text-xs text-slate-500">{entries.length} {t('dashboard.activity_log').toLowerCase()}</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-slate-500" onClick={refresh}>
            <RefreshCw className="h-3 w-3 mr-1" /> {t('actions.view')}
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-red-500 hover:text-red-600" onClick={handleClear}>
            {t('actions.delete')}
          </Button>
        </div>
      </div>
      <ul className="divide-y divide-slate-100">
        {entries.map((entry) => {
          const meta = ICON_MAP[entry.type];
          return (
            <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
              <div className={`mt-0.5 flex items-center justify-center w-7 h-7 rounded-full border shrink-0 ${meta.color}`}>
                {meta.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-900 truncate">{entry.title}</span>
                  <Badge variant="outline" className={`text-xs shrink-0 ${meta.color}`}>
                    {getActivityLabel(entry.type)}
                  </Badge>
                </div>
                {entry.description && (
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{entry.description}</p>
                )}
              </div>
              <span className="text-xs text-slate-400 shrink-0 mt-0.5 tabular-nums">
                {formatRelative(entry.timestamp)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
