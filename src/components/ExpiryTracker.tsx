import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle, Clock, Calendar, Edit3, Check, X, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getExpiry, saveExpiry, getExpiryStatus, formatExpiryDate, daysUntilExpiry,
  ExpiryStatus,
} from '@/lib/documentExpiry';

interface Document {
  id: string;
  document_type: string;
  document_name: string;
  verification_status: string;
}

interface ExpiryTrackerProps {
  documents: Document[];
  userId: string;
  onExpiryUpdated?: () => void;
}

interface DocWithExpiry {
  doc: Document;
  expiryDate: string | null;
  status: ExpiryStatus;
  days: number | null;
}

export default function ExpiryTracker({ documents, userId, onExpiryUpdated }: ExpiryTrackerProps) {
  const { t } = useTranslation('common');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [showNoExpiry, setShowNoExpiry] = useState(false);

  const rows: DocWithExpiry[] = useMemo(() =>
    documents.map((doc) => {
      const rec = getExpiry(userId, doc.id);
      const expiryDate = rec?.expiryDate ?? null;
      const status = getExpiryStatus(expiryDate);
      const days = expiryDate ? daysUntilExpiry(expiryDate) : null;
      return { doc, expiryDate, status, days };
    }), [documents, userId]);

  const expired  = rows.filter((r) => r.status === 'expired');
  const critical = rows.filter((r) => r.status === 'critical');
  const warning  = rows.filter((r) => r.status === 'warning');
  const ok       = rows.filter((r) => r.status === 'ok');
  const none     = rows.filter((r) => r.status === 'none');

  const urgent = [...expired, ...critical, ...warning];

  const handleEdit = (docId: string, current: string | null) => {
    setEditingId(docId);
    setEditDate(current ?? '');
  };

  const handleSave = (docId: string) => {
    const rec = getExpiry(userId, docId);
    saveExpiry(userId, docId, {
      expiryDate: editDate || null,
      documentNumber: rec?.documentNumber ?? null,
      storedAt: new Date().toISOString(),
    });
    setEditingId(null);
    setEditDate('');
    onExpiryUpdated?.();
  };

  const handleCancel = () => { setEditingId(null); setEditDate(''); };

  if (documents.length === 0) return null;

  const statusBadge = (r: DocWithExpiry) => {
    if (r.status === 'expired')  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-red-50 text-red-700 border border-red-200">Expired {formatExpiryDate(r.expiryDate!)}</span>;
    if (r.status === 'critical') return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-red-50 text-red-600 border border-red-200">{r.days}d left</span>;
    if (r.status === 'warning')  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">{r.days}d left</span>;
    if (r.status === 'ok')       return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-green-50 text-green-700 border border-green-200">Valid · {formatExpiryDate(r.expiryDate!)}</span>;
    return null;
  };

  const DocRow = ({ r }: { r: DocWithExpiry }) => (
    <li className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/60 gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 bg-[#e8eef8] rounded-sm shrink-0">
          <FileText className="h-3.5 w-3.5 text-[#003580]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate max-w-[160px] sm:max-w-[260px]">{r.doc.document_name}</p>
          <p className="text-[11px] text-slate-400 capitalize">{r.doc.document_type.replace(/_/g, ' ')}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {editingId === r.doc.id ? (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="text-xs border border-slate-300 rounded-sm px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#003580]"
            />
            <button onClick={() => handleSave(r.doc.id)} className="p-1 rounded-sm text-green-600 hover:bg-green-50">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleCancel} className="p-1 rounded-sm text-slate-400 hover:bg-slate-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            {statusBadge(r)}
            <button
              onClick={() => handleEdit(r.doc.id, r.expiryDate)}
              title="Edit expiry date"
              className="p-1 rounded-sm text-slate-400 hover:text-[#003580] hover:bg-blue-50 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </li>
  );

  return (
    <div className="bg-white border border-[#cdd3da] rounded-sm shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 bg-[#f0f4fa] flex items-center justify-between flex-wrap gap-2">
        <div className="border-l-4 border-[#FF6200] pl-2">
          <p className="font-bold text-slate-900 text-sm">Document Expiry Tracker</p>
          <p className="text-[11px] text-slate-500">Monitor and manage expiry dates for all your documents</p>
        </div>
        {/* Summary pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold">
          {expired.length  > 0 && <span className="px-2 py-0.5 rounded-sm bg-red-100 text-red-700 border border-red-200">{expired.length} Expired</span>}
          {critical.length > 0 && <span className="px-2 py-0.5 rounded-sm bg-red-50 text-red-600 border border-red-200">{critical.length} Critical</span>}
          {warning.length  > 0 && <span className="px-2 py-0.5 rounded-sm bg-amber-50 text-amber-700 border border-amber-200">{warning.length} Expiring Soon</span>}
          {ok.length       > 0 && <span className="px-2 py-0.5 rounded-sm bg-green-50 text-green-700 border border-green-200">{ok.length} Valid</span>}
        </div>
      </div>

      {/* Urgent: expired + critical + warning */}
      {urgent.length > 0 && (
        <div>
          <div className={`px-4 py-1.5 border-b text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 ${
            expired.length > 0 || critical.length > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'
          }`}>
            <AlertCircle className="h-3 w-3" /> Action Required
          </div>
          <ul className="divide-y divide-slate-100">
            {urgent.map((r) => <DocRow key={r.doc.id} r={r} />)}
          </ul>
        </div>
      )}

      {/* Valid documents */}
      {ok.length > 0 && (
        <div>
          <div className="px-4 py-1.5 border-b border-slate-100 bg-green-50 text-[11px] font-semibold uppercase tracking-wide text-green-700 flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3" /> Valid
          </div>
          <ul className="divide-y divide-slate-100">
            {ok.map((r) => <DocRow key={r.doc.id} r={r} />)}
          </ul>
        </div>
      )}

      {/* No expiry data */}
      {none.length > 0 && (
        <div>
          <button
            onClick={() => setShowNoExpiry((v) => !v)}
            className="w-full px-4 py-1.5 border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5 hover:bg-slate-100 transition-colors"
          >
            <Clock className="h-3 w-3" /> No Expiry Recorded ({none.length})
            {showNoExpiry ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
          </button>
          {showNoExpiry && (
            <ul className="divide-y divide-slate-100">
              {none.map((r) => <DocRow key={r.doc.id} r={r} />)}
            </ul>
          )}
        </div>
      )}

      {urgent.length === 0 && ok.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-500">
          <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p>No expiry data yet. Upload documents — AI will extract expiry dates automatically.</p>
          <p className="text-xs mt-1">You can also set dates manually using the edit button.</p>
        </div>
      )}

      <div className="px-5 py-2 border-t border-slate-100 bg-[#f8f9fb] text-[11px] text-slate-400 flex items-center gap-1">
        <Edit3 className="h-3 w-3 text-[#003580]" /> Click the pencil icon on any document to manually set or correct its expiry date
      </div>
    </div>
  );
}
