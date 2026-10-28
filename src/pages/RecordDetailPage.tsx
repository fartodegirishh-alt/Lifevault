import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext';
import { calculateWarrantyEndDate } from '../../server/utils/expiry.js';
import StatusBadge from '../components/StatusBadge';
import { RecordItem } from '../components/RecordCard';
import {
  ArrowLeft,
  FileText,
  ShieldAlert,
  Calendar,
  MapPin,
  Clock,
  Download,
  Trash2,
  Edit3,
  Paperclip,
  Save,
  X,
  FileUp,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [record, setRecord] = useState<RecordItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editWarrantyMonths, setEditWarrantyMonths] = useState('');
  const [editWarrantyEndDate, setEditWarrantyEndDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // File replacement state
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRecord(id);
      setRecord(data.record);
      // Pre-fill edit state
      setEditTitle(data.record.title || '');
      setEditCategory(data.record.category || '');
      setEditIssueDate(data.record.issue_date || '');
      setEditExpiryDate(data.record.expiry_date || '');
      setEditPurchaseDate(data.record.purchase_date || '');
      setEditWarrantyMonths(data.record.warranty_months ? String(data.record.warranty_months) : '');
      setEditWarrantyEndDate(data.record.warranty_end_date || '');
      setEditLocation(data.record.receipt_location || '');
      setEditNotes(data.record.notes || '');
    } catch (err: any) {
      setError(err.details || err.message || 'Failed to load record');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  // Handle Edit Submit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    if (!editTitle.trim()) {
      setEditError('Title is required');
      return;
    }

    if (record.type === 'document' && editIssueDate && editExpiryDate) {
      if (new Date(editExpiryDate) < new Date(editIssueDate)) {
        setEditError('Expiry date cannot be earlier than issue date');
        return;
      }
    }

    if (record.type === 'warranty' && editPurchaseDate && editWarrantyEndDate) {
      if (new Date(editWarrantyEndDate) < new Date(editPurchaseDate)) {
        setEditError('Warranty end date cannot be earlier than purchase date');
        return;
      }
    }

    setEditError(null);
    setIsSaving(true);
    try {
      const res = await api.updateRecord(record.id, {
        type: record.type,
        title: editTitle.trim(),
        category: editCategory.trim(),
        issue_date: editIssueDate || null,
        expiry_date: editExpiryDate || null,
        purchase_date: editPurchaseDate || null,
        warranty_months: editWarrantyMonths ? parseInt(editWarrantyMonths, 10) : null,
        warranty_end_date: editWarrantyEndDate || null,
        receipt_location: editLocation.trim() || null,
        notes: editNotes.trim() || null,
      });

      setRecord(res.record);
      setIsEditing(false);
      showToast(`Record updated in database (ID ${record.id})`, 'success');
    } catch (err: any) {
      setEditError(err.details || err.message || 'Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!record || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds 5 MB limit', 'error');
      return;
    }

    setIsUploadingFile(true);
    try {
      const res = await api.uploadFile(record.id, file);
      setRecord(res.record);
      showToast(`Attachment uploaded for record ID ${record.id}`, 'success');
    } catch (err: any) {
      showToast(err.details || err.message || 'File upload failed', 'error');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Handle Authenticated File Download
  const handleDownload = async () => {
    if (!record || !record.has_file) return;
    setIsDownloading(true);
    try {
      await api.downloadFile(record.id, record.file_original_name || 'document');
      showToast('File downloaded successfully', 'info');
    } catch (err: any) {
      showToast(err.message || 'Download failed', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Record Delete
  const handleDelete = async () => {
    if (!record) return;
    setIsDeleting(true);
    try {
      await api.deleteRecord(record.id);
      showToast(`Record removed from database (ID ${record.id})`, 'success');
      navigate('/records');
    } catch (err: any) {
      showToast(err.details || err.message || 'Failed to delete record', 'error');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-800 rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Fetching record details from database...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-[#F8E5E7] border border-rose-300 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-700 mx-auto" />
          <h2 className="text-lg font-bold text-rose-950">Record Unavailable</h2>
          <p className="text-xs text-rose-800 max-w-md mx-auto">{error || 'This record could not be found or you do not have permission to view it.'}</p>
          <div className="pt-2 flex justify-center gap-3">
            <Link to="/records" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
              Back to All Records
            </Link>
            <button
              onClick={fetchRecord}
              className="px-4 py-2 bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isWarranty = record.type === 'warranty';
  const targetDate = isWarranty ? record.warranty_end_date : record.expiry_date;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Navigation & Actions Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          to="/records"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Records</span>
        </Link>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Record</span>
            </button>
          )}

          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-[#F8E5E7] hover:bg-rose-200 border border-rose-300 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8">
        
        {/* Header Header */}
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                isWarranty
                  ? 'bg-[#E9E3F8] text-purple-900 border border-purple-200'
                  : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              {isWarranty ? <ShieldAlert className="w-3.5 h-3.5 text-purple-700" /> : <FileText className="w-3.5 h-3.5 text-slate-600" />}
              {isWarranty ? 'Warranty Record' : 'Document Record'}
            </span>

            <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {record.category}
            </span>

            <span className="text-xs text-slate-400 font-mono">
              DB Record #{record.id}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {record.title}
            </h1>
            <StatusBadge status={record.expiry_status} daysLeft={record.days_left} className="text-sm px-3.5 py-1.5" />
          </div>
        </div>

        {/* View Details Mode */}
        {!isEditing ? (
          <div className="space-y-6">
            
            {/* Key Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {isWarranty ? 'Warranty End Date' : 'Expiry Date'}
                </span>
                <span className="text-base font-extrabold text-slate-900 block font-mono">
                  {targetDate || 'No Expiry Date'}
                </span>
                {record.days_left !== null && record.days_left !== undefined && (
                  <span className="text-xs text-slate-600 block">
                    {record.days_left > 0 ? `${record.days_left} days remaining` : `${Math.abs(record.days_left)} days ago`}
                  </span>
                )}
              </div>

              {isWarranty && (
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Purchase Date
                  </span>
                  <span className="text-base font-extrabold text-slate-900 block font-mono">
                    {record.purchase_date || '—'}
                  </span>
                  <span className="text-xs text-slate-600 block">
                    {record.warranty_months ? `${record.warranty_months} Months Coverage` : 'Standard Coverage'}
                  </span>
                </div>
              )}

              {!isWarranty && record.issue_date && (
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Issue Date
                  </span>
                  <span className="text-base font-extrabold text-slate-900 block font-mono">
                    {record.issue_date}
                  </span>
                </div>
              )}

              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Receipt / Safe Location
                </span>
                <span className="text-sm font-semibold text-slate-800 block truncate" title={record.receipt_location || 'Not specified'}>
                  {record.receipt_location || 'Not specified'}
                </span>
              </div>
            </div>

            {/* Notes Section */}
            {record.notes && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Notes &amp; Particulars
                </h3>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {record.notes}
                </div>
              </div>
            )}

            {/* Document / Receipt Attachment Section */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-purple-700" />
                <span>Document Attachment &amp; Storage</span>
              </h3>

              {record.has_file ? (
                <div className="p-4 rounded-2xl bg-[#E9E3F8]/50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-purple-950 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-700" />
                      <span>{record.file_original_name || 'Attached Document'}</span>
                    </div>
                    <div className="text-xs text-purple-800">
                      Authenticated secure storage • Protected from public access
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isDownloading ? 'Downloading...' : 'Download File'}</span>
                    </button>

                    <label
                      htmlFor="replace-file"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Replace</span>
                    </label>
                    <input
                      id="replace-file"
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploadingFile}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-5 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-slate-500">No document or receipt scan currently attached.</p>
                  <div>
                    <label
                      htmlFor="attach-file-now"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                    >
                      <FileUp className="w-3.5 h-3.5 text-purple-300" />
                      <span>{isUploadingFile ? 'Uploading...' : 'Attach PDF or Image (Max 5 MB)'}</span>
                    </label>
                    <input
                      id="attach-file-now"
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploadingFile}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Audit Timestamps */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Created in SQLite: {record.created_at}</span>
              <span>Last Updated: {record.updated_at}</span>
            </div>
          </div>
        ) : (
          /* Edit Form Mode */
          <form onSubmit={handleSaveEdit} className="space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Editing Record #{record.id}</h2>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Cancel Edit
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-[#F8E5E7] border border-rose-300 rounded-xl text-xs text-rose-950 font-medium">
                {editError}
              </div>
            )}

            <div>
              <label htmlFor="edit-title" className="block text-xs font-bold text-slate-700 mb-1">
                {isWarranty ? 'Product Name' : 'Document Title'}
              </label>
              <input
                id="edit-title"
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-category" className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  id="edit-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {['Identity', 'Education', 'Insurance', 'Vehicle', 'Warranty', 'Other'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-location" className="block text-xs font-bold text-slate-700 mb-1">
                  Storage / Receipt Location
                </label>
                <input
                  id="edit-location"
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            {/* Conditional date fields based on type */}
            {!isWarranty ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-issue" className="block text-xs font-bold text-slate-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    id="edit-issue"
                    type="date"
                    value={editIssueDate}
                    onChange={(e) => setEditIssueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label htmlFor="edit-expiry" className="block text-xs font-bold text-slate-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    id="edit-expiry"
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="edit-purchase" className="block text-xs font-bold text-slate-700 mb-1">
                    Purchase Date
                  </label>
                  <input
                    id="edit-purchase"
                    type="date"
                    value={editPurchaseDate}
                    onChange={(e) => {
                      setEditPurchaseDate(e.target.value);
                      if (e.target.value && editWarrantyMonths) {
                        const calculated = calculateWarrantyEndDate(e.target.value, parseInt(editWarrantyMonths, 10));
                        if (calculated) setEditWarrantyEndDate(calculated);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label htmlFor="edit-months" className="block text-xs font-bold text-slate-700 mb-1">
                    Warranty Months
                  </label>
                  <input
                    id="edit-months"
                    type="number"
                    value={editWarrantyMonths}
                    onChange={(e) => {
                      setEditWarrantyMonths(e.target.value);
                      if (editPurchaseDate && e.target.value) {
                        const calculated = calculateWarrantyEndDate(editPurchaseDate, parseInt(e.target.value, 10));
                        if (calculated) setEditWarrantyEndDate(calculated);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div>
                  <label htmlFor="edit-warranty-end" className="block text-xs font-bold text-slate-700 mb-1">
                    Warranty End Date
                  </label>
                  <input
                    id="edit-warranty-end"
                    type="date"
                    value={editWarrantyEndDate}
                    onChange={(e) => setEditWarrantyEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="edit-notes" className="block text-xs font-bold text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                id="edit-notes"
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-700" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                Permanently Delete Record?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action cannot be undone. "{record.title}" (ID #{record.id}) and its stored files will be completely erased from the SQLite database.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordDetailPage;
