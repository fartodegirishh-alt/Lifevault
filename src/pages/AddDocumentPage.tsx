import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext';
import { FileText, ArrowLeft, Upload, AlertCircle, Save, Calendar, Tag, FileUp } from 'lucide-react';

const CATEGORIES = ['Identity', 'Education', 'Insurance', 'Vehicle', 'Other'];

export function AddDocumentPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Identity');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptLocation, setReceiptLocation] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    if (!title.trim()) {
      return 'Document title is required';
    }
    if (!category.trim()) {
      return 'Category is required';
    }
    if (issueDate && expiryDate) {
      if (new Date(expiryDate) < new Date(issueDate)) {
        return 'Expiry date cannot be earlier than the issue date';
      }
    }
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        return 'Selected file exceeds the 5 MB size limit';
      }
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(selectedFile.type)) {
        return 'Invalid file type. Only PDF, JPG, PNG, and WEBP documents are allowed.';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorMsg = validateForm();
    if (errorMsg) {
      setValidationError(errorMsg);
      return;
    }
    setValidationError(null);
    setSubmitting(true);

    try {
      // 1. Create document record via API
      const res = await api.createRecord({
        type: 'document',
        title: title.trim(),
        category: category.trim(),
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        receipt_location: receiptLocation.trim() || null,
        notes: notes.trim() || null,
      });

      const recordId = res.record.id;

      // 2. Upload file if selected
      if (selectedFile) {
        await api.uploadFile(recordId, selectedFile);
      }

      // Show database ID feedback toast
      showToast(`Record saved to database (ID ${recordId})`, 'success');
      navigate(`/records/${recordId}`);
    } catch (err: any) {
      setValidationError(err.details || err.message || 'Failed to save document record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setValidationError(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Back button */}
      <div>
        <Link
          to="/records"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Records</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6">
        
        {/* Page Title */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-[#E9E3F8] text-purple-900 flex items-center justify-center">
            <FileText className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Add New Document
            </h1>
            <p className="text-xs text-slate-500">
              Track passports, IDs, licenses, diplomas, certificates, and contracts.
            </p>
          </div>
        </div>

        {/* Validation Error Alert */}
        {validationError && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F8E5E7] border border-rose-300 text-rose-950 text-xs"
          >
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{validationError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="doc-title" className="block text-xs font-bold text-slate-700 mb-1">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="doc-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. International Passport, Driver's License, Health Card"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="doc-category" className="block text-xs font-bold text-slate-700 mb-1">
              Category <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <select
                id="doc-category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="doc-issue" className="block text-xs font-bold text-slate-700 mb-1">
                Issue Date (Optional)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="doc-issue"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="doc-expiry" className="block text-xs font-bold text-slate-700 mb-1">
                Expiry Date (Optional)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="doc-expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Leave blank if permanent or no expiration date exists.
              </p>
            </div>
          </div>

          {/* Physical / Digital Storage Location */}
          <div>
            <label htmlFor="doc-location" className="block text-xs font-bold text-slate-700 mb-1">
              Physical Location / Safe Box / Folder (Optional)
            </label>
            <input
              id="doc-location"
              type="text"
              value={receiptLocation}
              onChange={(e) => setReceiptLocation(e.target.value)}
              placeholder="e.g. Master Bedroom Safe, Blue Drawer Box 3, Cloud Drive"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="doc-notes" className="block text-xs font-bold text-slate-700 mb-1">
              Notes &amp; Details (Optional)
            </label>
            <textarea
              id="doc-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Renewal instructions, policy numbers, or reminder details..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Optional File Upload */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Attach Scan / Document (Optional, Max 5 MB)
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-2xl p-4 transition-colors bg-slate-50/50 text-center">
              <input
                id="file-upload-input"
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file-upload-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <FileUp className="w-7 h-7 text-purple-700" />
                <span className="text-xs font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Choose a PDF, PNG, JPG or WEBP file'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {selectedFile
                    ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace`
                    : 'Fictional demo files only • Max 5 MB'}
                </span>
              </label>
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Link
              to="/records"
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 shadow-md transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Saving to Database...' : 'Save record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDocumentPage;
