import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { api } from '../api/client';
import StatusBadge from './ui/StatusBadge';
import DataTable from './ui/DataTable';

export default function GovernmentAuditView({ token }) {
  const [logs, setLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState('');
  const [corridorFilter, setCorridorFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listAuditLogs(
        {
          action: actionFilter || undefined,
          corridor_id: corridorFilter || undefined,
          limit: 100,
        },
        token
      );
      setLogs(res.audit_logs || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, corridorFilter, token]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'created_at',
      render: (row) => (
        <span className="font-mono text-slate-400 text-xs">
          {row.created_at ? row.created_at.substring(0, 19).replace('T', ' ') : '—'}
        </span>
      ),
    },
    {
      header: 'Actor',
      accessor: 'actor_id',
      render: (row) => (
        <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs font-mono">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{row.actor_id}</span>
        </div>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (row) => {
        let variant = 'default';
        if (row.action.includes('AWARDED') || row.action.includes('APPROVED')) variant = 'success';
        else if (row.action.includes('CREATED') || row.action.includes('ALLOCATION')) variant = 'info';
        else if (row.action.includes('SUBMITTED')) variant = 'warning';

        return (
          <StatusBadge variant={variant} showDot>
            {row.action}
          </StatusBadge>
        );
      },
    },
    {
      header: 'Corridor',
      accessor: 'corridor_id',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-400 text-xs">
          {row.corridor_id || '—'}
        </span>
      ),
    },
    {
      header: 'Event Details',
      accessor: 'details',
      render: (row) => (
        <span className="text-slate-300 text-xs font-sans truncate max-w-sm block">
          {typeof row.details === 'object'
            ? JSON.stringify(row.details)
            : String(row.details || 'Action logged')}
        </span>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                GOVERNANCE &amp; OVERSIGHT
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Municipal Procurement &amp; Tender Audit Trail
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Append-only immutable record of tender creation, competitive bidding, budget approvals,
              and contract allocations.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">Total Immutable Entries:</span>
            <span className="font-bold text-emerald-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              {logs.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main DataTable Canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        <DataTable
          title="Procurement Activity Trail"
          subtitle="Real-time chronological log of administrative and contractor transactions"
          columns={columns}
          data={logs}
          searchPlaceholder="Search audit logs by actor or details..."
          itemsPerPage={12}
          filterComponent={
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by corridor (e.g. C-14)..."
                value={corridorFilter}
                onChange={(e) => setCorridorFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Action Types</option>
                <option value="TENDER_CREATED">TENDER_CREATED</option>
                <option value="PROPOSAL_SUBMITTED">PROPOSAL_SUBMITTED</option>
                <option value="TENDER_AWARDED">TENDER_AWARDED</option>
                <option value="DIRECT_ALLOCATION">DIRECT_ALLOCATION</option>
                <option value="BUDGET_APPROVED">BUDGET_APPROVED</option>
                <option value="PROFESSIONAL_VERIFIED">PROFESSIONAL_VERIFIED</option>
              </select>
            </div>
          }
        />
      </div>
    </div>
  );
}