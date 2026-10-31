import React, { useState, useEffect, useCallback } from 'react';
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

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                GOVERNANCE &amp; OVERSIGHT
              </span>
              <h1 className="text-lg font-bold text-white">
                Municipal Procurement &amp; Tender Audit Trail
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Append-only immutable record of tender creation, competitive bidding, budget approvals,
              and contract allocations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-400">Total Entries:</span>
            <span className="font-mono font-bold text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              {logs.length}
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <input
            type="text"
            placeholder="Filter by corridor (e.g. C-14, C-01)..."
            value={corridorFilter}
            onChange={(e) => setCorridorFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
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
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Corridor</th>
                <th className="py-3 px-4">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-850/50 transition">
                  <td className="py-3 px-4 text-slate-400 text-[11px]">
                    {log.created_at ? log.created_at.substring(0, 19).replace('T', ' ') : '—'}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-200">{log.actor_id}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-300 border border-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">
                    {log.corridor_id || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-[11px] font-sans truncate max-w-xs">
                    {typeof log.details === 'object'
                      ? JSON.stringify(log.details)
                      : String(log.details || 'Action logged')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
