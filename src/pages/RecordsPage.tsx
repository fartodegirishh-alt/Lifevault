import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext';
import RecordCard, { RecordItem } from '../components/RecordCard';
import {
  Search,
  Filter,
  PlusCircle,
  RefreshCw,
  FolderOpen,
  X,
  AlertCircle,
  FileQuestion,
  Trash2,
} from 'lucide-react';

const CATEGORIES = ['All', 'Identity', 'Education', 'Insurance', 'Vehicle', 'Warranty', 'Other'];
const STATUSES = ['All', 'Active', 'Expiring soon', 'Expired', 'No expiry date'];

export function RecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const searchFromUrl = searchParams.get('search') || '';
  const categoryFromUrl = searchParams.get('category') || 'All';
  const statusFromUrl = searchParams.get('status') || 'All';

  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);
  const [selectedStatus, setSelectedStatus] = useState(statusFromUrl);

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete modal state
  const [recordToDelete, setRecordToDelete] = useState<RecordItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state with URL params
  useEffect(() => {
    setSearchInput(searchFromUrl);
    setSelectedCategory(categoryFromUrl);
    setSelectedStatus(statusFromUrl);
  }, [searchFromUrl, categoryFromUrl, statusFromUrl]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRecords({
        search: searchFromUrl,
        category: categoryFromUrl,
        status: statusFromUrl,
      });
      setRecords(data.records || []);
    } catch (err: any) {
      setError(err.details || err.message || 'Failed to fetch records from backend');
    } finally {
      setLoading(false);
    }
  }, [searchFromUrl, categoryFromUrl, statusFromUrl]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const updateFilters = (newSearch: string, newCategory: string, newStatus: string) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set('search', newSearch.trim());
    if (newCategory && newCategory !== 'All') params.set('category', newCategory);
    if (newStatus && newStatus !== 'All') params.set('status', newStatus);
    setSearchParams(params);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(searchInput, selectedCategory, selectedStatus);
  };

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    updateFilters(searchInput, cat, selectedStatus);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    updateFilters(searchInput, selectedCategory, status);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setSearchParams(new URLSearchParams());
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteRecord(recordToDelete.id);
      showToast(`Record removed from database (ID ${recordToDelete.id})`, 'success');
      setRecordToDelete(null);
      loadRecords();
    } catch (err: any) {
      showToast(err.details || err.message || 'Failed to delete record', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = Boolean(searchFromUrl || categoryFromUrl !== 'All' || statusFromUrl !== 'All');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-purple-800" />
            <span>Vault Documents &amp; Warranties</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse, search, and manage all your stored records. All queries filter through the SQLite API.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/add-document"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-purple-300" />
            <span>+ Document</span>
          </Link>
          <Link
            to="/add-warranty"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#E9E3F8] text-purple-950 hover:bg-purple-200 border border-purple-300 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-purple-700" />
            <span>+ Warranty</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
        
        {/* Search Input & Status Dropdown */}
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title, location, category, notes..."
                aria-label="Search records"
                className="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    updateFilters('', selectedCategory, selectedStatus);
                  }}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search text"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="status-select" className="text-xs font-bold text-slate-600 shrink-0">
              Status:
            </label>
            <select
              id="status-select"
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="py-2 px-3 text-xs font-medium rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-[#F8E5E7] hover:bg-rose-200 border border-rose-300 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset filters</span>
            </button>
          )}
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </span>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state with Retry */}
      {error && (
        <div
          role="alert"
          className="p-5 rounded-2xl bg-[#F8E5E7] border border-rose-300 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-rose-700 shrink-0" />
            <div>
              <div className="font-bold text-sm">Failed to retrieve records</div>
              <div className="text-xs text-rose-800">{error}</div>
            </div>
          </div>
          <button
            onClick={loadRecords}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Spinners */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-white border border-slate-200 rounded-2xl p-5 animate-pulse" />
          ))}
        </div>
      )}

      {/* Records Grid */}
      {!loading && !error && records.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500 font-medium">
            Showing {records.length} record{records.length === 1 ? '' : 's'} matching current criteria
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {records.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onDeleteClick={(r) => setRecordToDelete(r)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && records.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#E9E3F8] text-purple-900 mx-auto flex items-center justify-center">
            <FileQuestion className="w-8 h-8 text-purple-700" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No records match your search</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Try adjusting your search keywords, clearing status filters, or selecting "All" categories.'
              : 'Your vault is currently empty. Start by adding a personal document or product warranty.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {hasActiveFilters ? (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Clear all filters
              </button>
            ) : (
              <Link
                to="/add-document"
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
              >
                + Add your first document
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-700" />
              </div>
              <h3 id="delete-dialog-title" className="font-extrabold text-base text-slate-900">
                Delete Record?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{recordToDelete.title}"</strong> (ID {recordToDelete.id})? This will also remove any associated file attachments and notifications from SQLite.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordsPage;
