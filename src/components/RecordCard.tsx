import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { FileText, ShieldAlert, Paperclip, Calendar, MapPin, Eye, ExternalLink } from 'lucide-react';

export interface RecordItem {
  id: number;
  user_id: number;
  type: 'document' | 'warranty';
  title: string;
  category: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  purchase_date?: string | null;
  warranty_months?: number | null;
  warranty_end_date?: string | null;
  receipt_location?: string | null;
  notes?: string | null;
  has_file?: boolean;
  file_original_name?: string | null;
  expiry_status: string;
  days_left?: number | null;
  created_at: string;
  updated_at: string;
}

interface RecordCardProps {
  record: RecordItem;
  onDeleteClick?: (record: RecordItem) => void;
}

export function RecordCard({ record, onDeleteClick }: RecordCardProps) {
  const isWarranty = record.type === 'warranty';
  const targetDate = isWarranty ? record.warranty_end_date : record.expiry_date;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                isWarranty
                  ? 'bg-[#E9E3F8] text-purple-900 border border-purple-200'
                  : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              {isWarranty ? <ShieldAlert className="w-3 h-3 text-purple-700" /> : <FileText className="w-3 h-3 text-slate-600" />}
              {isWarranty ? 'Warranty' : 'Document'}
            </span>

            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {record.category}
            </span>
          </div>

          <StatusBadge status={record.expiry_status} daysLeft={record.days_left} />
        </div>

        {/* Title */}
        <Link to={`/records/${record.id}`} className="block group-hover:text-purple-800 transition-colors">
          <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
            {record.title}
          </h3>
        </Link>

        {/* Date Details */}
        <div className="mt-3 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {isWarranty ? 'Warranty Ends: ' : 'Expires: '}
              <strong className="text-slate-800 font-semibold">{targetDate || 'No expiry date'}</strong>
            </span>
          </div>

          {isWarranty && record.purchase_date && (
            <div className="text-[11px] text-slate-500 pl-5">
              Purchased: {record.purchase_date} {record.warranty_months ? `(${record.warranty_months} mo warranty)` : ''}
            </div>
          )}

          {!isWarranty && record.issue_date && (
            <div className="text-[11px] text-slate-500 pl-5">
              Issued: {record.issue_date}
            </div>
          )}

          {record.receipt_location && (
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{record.receipt_location}</span>
            </div>
          )}
        </div>

        {/* Notes Snippet */}
        {record.notes && (
          <p className="mt-3 text-xs text-slate-500 line-clamp-2 italic bg-slate-50/70 p-2 rounded-lg border border-slate-100">
            "{record.notes}"
          </p>
        )}
      </div>

      {/* Card Footer */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-slate-500">
          {record.has_file ? (
            <span className="inline-flex items-center gap-1 text-purple-700 bg-[#E9E3F8]/70 px-2 py-0.5 rounded text-[11px] font-medium" title={record.file_original_name || 'Attachment ready'}>
              <Paperclip className="w-3 h-3 text-purple-700" />
              <span className="truncate max-w-[120px]">{record.file_original_name || 'Attached file'}</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">No file attached</span>
          )}
        </div>

        <Link
          to={`/records/${record.id}`}
          className="inline-flex items-center gap-1 font-semibold text-purple-700 hover:text-purple-900 transition-colors p-1"
          aria-label={`View details for ${record.title}`}
        >
          <span>View details</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default RecordCard;
