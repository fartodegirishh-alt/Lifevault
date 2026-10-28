import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext';
import { calculateWarrantyEndDate } from '../../server/utils/expiry.js';
import { ShieldAlert, ArrowLeft, Save, Calendar, Clock, MapPin, FileUp, AlertCircle, Sparkles } from 'lucide-react';

export function AddWarrantyPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [productName, setProductName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('24');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [receiptLocation, setReceiptLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-calculate warranty end date when purchase date or months changes
  useEffect(() => {
    if (purchaseDate && warrantyMonths) {
      const calculated = calculateWarrantyEndDate(purchaseDate, parseInt(warrantyMonths, 10));
      if (calculated) {
        setWarrantyEndDate(calculated);
      }
    }
  }, [purchaseDate, warrantyMonths]);

  const validateForm = () => {
    if (!productName.trim()) {
      return 'Product name is required';
    }
    if (!purchaseDate) {
      return 'Purchase date is required for warranty tracking';
    }
    if (warrantyEndDate && new Date(warrantyEndDate) < new Date(purchaseDate)) {
      return 'Warranty end date cannot be earlier than the purchase date';
    }
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        return 'Selected file exceeds the 5 MB limit';
      }
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(selectedFile.type)) {
        return 'Invalid file type. Only PDF, JPG, PNG, and WEBP receipts are permitted.';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    setSubmitting(true);

    try {
      // 1. Create warranty record in SQLite
      const res = await api.createRecord({
        type: 'warranty',
        title: productName.trim(),
        category: 'Warranty',
        purchase_date: purchaseDate,
        warranty_months: warrantyMonths ? parseInt(warrantyMonths, 10) : null,
        warranty_end_date: warrantyEndDate || null,
        receipt_location: receiptLocation.trim() || null,
        notes: notes.trim() || null,
      });

      const recordId = res.record.id;

      // 2. Upload receipt scan/PDF if selected
      if (selectedFile) {
        await api.uploadFile(recordId, selectedFile);
      }

      showToast(`Record saved to database (ID ${recordId})`, 'success');
      navigate(`/records/${recordId}`);
    } catch (err: any) {
      setValidationError(err.details || err.message || 'Failed to save warranty record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
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
        
        {/* Page Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-[#E9E3F8] text-purple-900 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Add Product Warranty
            </h1>
            <p className="text-xs text-slate-500">
              Track electronics, appliances, vehicles, and retail purchase warranties with automated end-date calculation.
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
          {/* Product Name */}
          <div>
            <label htmlFor="product-name" className="block text-xs font-bold text-slate-700 mb-1">
              Product Name / Model <span className="text-rose-500">*</span>
            </label>
            <input
              id="product-name"
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Apple MacBook Pro M3, Sony Headphones, Samsung TV"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
            />
          </div>

          {/* Purchase Date & Warranty Months */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="purchase-date" className="block text-xs font-bold text-slate-700 mb-1">
                Purchase Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="purchase-date"
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="warranty-months" className="block text-xs font-bold text-slate-700 mb-1">
                Warranty Coverage (Months)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="warranty-months"
                  type="number"
                  min="1"
                  max="120"
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div className="flex gap-2 mt-1.5">
                {[12, 24, 36].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setWarrantyMonths(String(m))}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    {m} mo ({m / 12}y)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calculated Warranty End Date Display */}
          <div className="bg-[#DFF1E7]/50 border border-emerald-300/80 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>Calculated Warranty Expiration Date</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Automatically projected based on purchase date and warranty duration.
              </p>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-emerald-950 font-mono">
                {warrantyEndDate || '—'}
              </span>
            </div>
          </div>

          {/* Custom Date Override if needed */}
          <div>
            <label htmlFor="warranty-end-date" className="block text-xs font-bold text-slate-700 mb-1">
              Warranty End Date (Custom Override)
            </label>
            <input
              id="warranty-end-date"
              type="date"
              value={warrantyEndDate}
              onChange={(e) => setWarrantyEndDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Receipt Location */}
          <div>
            <label htmlFor="receipt-location" className="block text-xs font-bold text-slate-700 mb-1">
              Receipt / Invoice Location (Physical or Digital)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="receipt-location"
                type="text"
                value={receiptLocation}
                onChange={(e) => setReceiptLocation(e.target.value)}
                placeholder="e.g. Email Receipt (Amazon order #1234), Appliance Drawer B"
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="warranty-notes" className="block text-xs font-bold text-slate-700 mb-1">
              Warranty Terms / Notes / Serial Number (Optional)
            </label>
            <textarea
              id="warranty-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Serial #SN-998822, includes accidental screen replacement clause..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Receipt Upload */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Attach Purchase Receipt Scan (Optional, Max 5 MB)
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-2xl p-4 transition-colors bg-slate-50/50 text-center">
              <input
                id="receipt-upload-input"
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="receipt-upload-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <FileUp className="w-7 h-7 text-purple-700" />
                <span className="text-xs font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Choose receipt PDF, PNG, JPG or WEBP'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {selectedFile
                    ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace`
                    : 'Fictional demo receipts only • Max 5 MB'}
                </span>
              </label>
            </div>
          </div>

          {/* Submit */}
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

export default AddWarrantyPage;
