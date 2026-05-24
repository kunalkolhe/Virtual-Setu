import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  Trash2,
  Loader2,
  Search,
  X,
  QrCode,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activityLog';
import { useAuth } from '@/hooks/useAuth';
import {
  getExpiry,
  removeExpiry,
  getExpiryStatus,
  formatExpiryDate,
  daysUntilExpiry,
} from '@/lib/documentExpiry';
import ShareDocModal from '@/components/ShareDocModal';

interface Document {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  verification_status: string;
  created_at: string;
}

interface DocumentListProps {
  documents: Document[];
  onDelete?: () => void;
}

const STATUS_FILTERS = ['all', 'verified', 'pending', 'rejected'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function DocumentList({ documents, onDelete }: DocumentListProps) {
  const { t } = useTranslation('common');
  const { t: tDocs } = useTranslation('documents');
  const { user } = useAuth();
  const [confirmDoc, setConfirmDoc] = useState<Document | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [shareDoc, setShareDoc] = useState<Document | null>(null);

  const getDocTypeLabel = (type: string) =>
    tDocs(`${type}.name`, type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()));

  const filtered = useMemo(() => {
    let list = documents;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.document_name.toLowerCase().includes(q) ||
          getDocTypeLabel(d.document_type).toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((d) => d.verification_status === statusFilter);
    }
    return list;
  }, [documents, search, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-3.5 w-3.5 text-[#138808]" />;
      case 'rejected': return <AlertCircle className="h-3.5 w-3.5 text-red-600" />;
      default:         return <Clock className="h-3.5 w-3.5 text-amber-600" />;
    }
  };

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'verified': return 'status-pill status-verified';
      case 'rejected': return 'status-pill status-rejected';
      default:         return 'status-pill status-pending';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'verified': return t('status.verified');
      case 'rejected': return t('status.rejected');
      default:         return t('status.pending');
    }
  };

  const normalizePath = (urlOrPath: string) => {
    if (!urlOrPath) return urlOrPath;
    if (urlOrPath.startsWith('http')) {
      const pubMarker = '/object/public/documents/';
      const pubIdx = urlOrPath.indexOf(pubMarker);
      if (pubIdx !== -1) return urlOrPath.slice(pubIdx + pubMarker.length);
      const anyIdx = urlOrPath.indexOf('/documents/');
      if (anyIdx !== -1) return urlOrPath.slice(anyIdx + '/documents/'.length);
    }
    return urlOrPath.replace(/^\/+/, '');
  };

  const handleView = async (document: Document) => {
    try {
      if (!document.file_url) { toast.error('Document URL not available'); return; }
      const path = normalizePath(document.file_url);
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60 * 10);
      if (error || !data?.signedUrl) throw error || new Error('No signed URL');
      window.open(data.signedUrl, '_blank');
    } catch {
      toast.error('Failed to open document');
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      if (!document.file_url) { toast.error('Document URL not available'); return; }
      const path = normalizePath(document.file_url);
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60 * 10);
      if (error || !data?.signedUrl) throw error || new Error('No signed URL');
      const link = window.document.createElement('a');
      link.href = data.signedUrl;
      link.download = document.document_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      toast.success('Download started');
    } catch {
      toast.error('Failed to download document');
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDoc) return;
    setDeletingId(confirmDoc.id);
    setConfirmDoc(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const res = await fetch('/api/delete-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: confirmDoc.id,
          userId,
          filePath: normalizePath(confirmDoc.file_url),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');

      toast.success(`"${confirmDoc.document_name}" deleted successfully`);
      removeExpiry(userId, confirmDoc.id);
      logActivity(userId, {
        type: 'document_deleted',
        title: confirmDoc.document_name,
        description: `${confirmDoc.document_type.replace(/_/g, ' ')} removed from your vault.`,
      });
      onDelete?.();
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Failed to delete document. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white border border-[#cdd3da] rounded-sm shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 bg-[#f0f4fa]">
          <div className="border-l-4 border-[#003580] pl-2">
            <p className="font-bold text-slate-900 text-sm">{t('doclist.title')}</p>
            <p className="text-[11px] text-slate-500">{t('dashboard.no_documents')}</p>
          </div>
        </div>
        <div className="text-center py-12 px-4">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 mb-1">{t('dashboard.no_documents')}</h3>
          <p className="text-sm text-slate-500">{t('dashboard.upload_first')}</p>
        </div>
      </div>
    );
  }

  const statusColors: Record<StatusFilter, string> = {
    all:      'bg-slate-100 text-slate-700 border-slate-300',
    verified: 'bg-green-50 text-[#138808] border-green-300',
    pending:  'bg-amber-50 text-amber-700 border-amber-300',
    rejected: 'bg-red-50 text-red-700 border-red-300',
  };

  const statusFilterLabels: Record<StatusFilter, string> = {
    all:      t('status.all'),
    verified: t('status.verified'),
    pending:  t('status.pending'),
    rejected: t('status.rejected'),
  };

  return (
    <>
      <div className="bg-white border border-[#cdd3da] rounded-sm shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 bg-[#f0f4fa] flex items-center justify-between flex-wrap gap-2">
          <div className="border-l-4 border-[#003580] pl-2">
            <p className="font-bold text-slate-900 text-sm">{t('doclist.title')}</p>
            <p className="text-[11px] text-slate-500">
              {t('doclist.subtitle', { count: documents.length })}
            </p>
          </div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {/* Search + Filter */}
        <div className="px-5 py-3 border-b border-slate-100 bg-white space-y-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('doclist.search_placeholder')}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name="doc-search"
              className="pl-8 pr-8 h-8 text-sm bg-slate-50 border-slate-200 rounded-sm focus-visible:ring-[#003580]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide shrink-0">{t('doclist.status_filter')}</span>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-[11px] px-2.5 py-0.5 border font-semibold transition-colors capitalize rounded-sm ${
                  statusFilter === s
                    ? statusColors[s] + ' ring-1 ring-offset-1 ring-current'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {statusFilterLabels[s]} ({s === 'all' ? documents.length : documents.filter((d) => d.verification_status === s).length})
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            {t('doclist.no_match')}{' '}
            <button className="text-[#003580] underline" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
              {t('doclist.clear_filters')}
            </button>
          </div>
        ) : (
          <table className="gov-table">
            <thead>
              <tr>
                <th>{t('nav.my_documents')}</th>
                <th className="hidden sm:table-cell">{t('doclist.type_col')}</th>
                <th className="hidden md:table-cell">{t('doclist.uploaded_col')}</th>
                <th>{t('doclist.status_col')}</th>
                <th className="text-right">{t('doclist.actions_col')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
                const rec = user ? getExpiry(user.id, doc.id) : null;
                const expiryStatus = rec?.expiryDate ? getExpiryStatus(rec.expiryDate) : 'none';
                const days = rec?.expiryDate ? daysUntilExpiry(rec.expiryDate) : null;

                return (
                  <tr key={doc.id}>
                    {/* Document name + expiry badge */}
                    <td>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 bg-[#e8eef8] rounded-sm shrink-0">
                          <FileText className="h-4 w-4 text-[#003580]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate max-w-[140px] sm:max-w-[200px]">
                            {doc.document_name}
                          </p>
                          {rec && (
                            <span className={`text-[10px] font-semibold px-1.5 py-px rounded-sm border ${
                              expiryStatus === 'expired'  ? 'bg-red-50 text-red-700 border-red-200' :
                              expiryStatus === 'critical' ? 'bg-red-50 text-red-600 border-red-200' :
                              expiryStatus === 'warning'  ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              expiryStatus === 'ok'       ? 'bg-green-50 text-[#138808] border-green-200' :
                              'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              {expiryStatus === 'expired'  ? `${t('status.expired')} ${formatExpiryDate(rec.expiryDate!)}` :
                               expiryStatus === 'critical' ? `${days}d` :
                               expiryStatus === 'warning'  ? `${days}d` :
                               rec.expiryDate              ? `${t('status.valid')} ${formatExpiryDate(rec.expiryDate)}` :
                               '—'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type — translated via documents namespace */}
                    <td className="hidden sm:table-cell">
                      <span className="text-xs text-slate-600">{getDocTypeLabel(doc.document_type)}</span>
                    </td>

                    {/* Date */}
                    <td className="hidden md:table-cell">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={getStatusPill(doc.verification_status)}>
                        {getStatusIcon(doc.verification_status)}
                        <span className="hidden xs:inline">{getStatusLabel(doc.verification_status)}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          title={t('actions.view')}
                          onClick={() => handleView(doc)}
                          className="p-1.5 rounded-sm text-slate-500 hover:text-[#003580] hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          title={t('actions.download')}
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 rounded-sm text-slate-500 hover:text-[#003580] hover:bg-blue-50 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          title={t('actions.share')}
                          onClick={() => setShareDoc(doc)}
                          className="p-1.5 rounded-sm text-slate-500 hover:text-[#FF6200] hover:bg-orange-50 transition-colors"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button
                          title={t('actions.delete')}
                          onClick={() => setConfirmDoc(doc)}
                          disabled={deletingId === doc.id}
                          className="p-1.5 rounded-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="px-5 py-2 border-t border-slate-100 bg-[#f8f9fb] text-[11px] text-slate-400 flex items-center gap-1">
          <QrCode className="h-3 w-3 text-[#FF6200]" /> {t('doclist.share_hint')}
        </div>
      </div>

      {/* Share modal */}
      {shareDoc && user && (
        <ShareDocModal
          open={!!shareDoc}
          onClose={() => setShareDoc(null)}
          documentId={shareDoc.id}
          documentName={shareDoc.document_name}
          userId={user.id}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDoc} onOpenChange={(open) => !open && setConfirmDoc(null)}>
        <AlertDialogContent className="rounded-sm border border-[#cdd3da]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#003580]">{t('doclist.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('doclist.delete_msg', { name: confirmDoc?.document_name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              className="bg-red-600 hover:bg-red-700 text-white rounded-sm"
            >
              {t('doclist.delete_confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
