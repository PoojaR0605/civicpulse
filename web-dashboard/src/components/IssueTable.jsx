import { useState } from 'react';
import { updateStatus } from '../services/api';

const STATUS_COLORS = {
  submitted:   '#F59E0B',
  validated:   '#3B82F6',
  assigned:    '#8B5CF6',
  in_progress: '#06B6D4',
  resolved:    '#10B981',
  rejected:    '#EF4444',
};

export default function IssueTable({ issues, onUpdate }) {
  const [updating, setUpdating] = useState(null);

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await updateStatus(id, status, 'Updated by officer');
      onUpdate();
    } catch {
      alert('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['Category','Title','Ward','Priority','Status','SLA','Action'].map(h => (
              <th key={h} style={{
                padding: '12px 16px', textAlign: 'left',
                fontSize: 12, fontWeight: 600, color: '#6b7280',
                textTransform: 'uppercase',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {issues.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                No issues found
              </td>
            </tr>
          ) : issues.map((issue, idx) => (
            <tr key={issue.id} style={{
              borderBottom: '1px solid #f3f4f6',
              background: issue.sla_breached ? '#fef2f2' : idx % 2 === 0 ? '#fff' : '#f9fafb',
            }}>
              <td style={{ padding: '12px 16px', fontSize: 13 }}>
                <span style={{
                  background: '#e0e7ff', color: '#3730a3',
                  padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500,
                }}>{issue.category}</span>
              </td>
              <td style={{ padding: '12px 16px', fontSize: 13 }}>{issue.title || '—'}</td>
              <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>
                {issue.ward_name || '—'}
              </td>
              <td style={{ padding: '12px 16px', fontSize: 13 }}>
                <span style={{
                  fontWeight: 600,
                  color: parseFloat(issue.priority_score) > 50 ? '#EF4444' : '#1976D2',
                }}>
                  {parseFloat(issue.priority_score || 0).toFixed(1)}
                </span>
              </td>
              <td style={{ padding: '12px 16px' }}>
                <span style={{
                  background: STATUS_COLORS[issue.status] + '20',
                  color: STATUS_COLORS[issue.status],
                  padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                }}>{issue.status}</span>
              </td>
              <td style={{ padding: '12px 16px', fontSize: 12 }}>
                {issue.sla_breached
                  ? <span style={{ color: '#EF4444', fontWeight: 600 }}>BREACHED</span>
                  : issue.sla_deadline
                    ? <span style={{ color: '#6b7280' }}>
                        {new Date(issue.sla_deadline).toLocaleDateString()}
                      </span>
                    : '—'}
              </td>
              <td style={{ padding: '12px 16px' }}>
                <select
                  disabled={updating === issue.id}
                  value={issue.status}
                  onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                  style={{
                    fontSize: 12, padding: '4px 8px',
                    borderRadius: 4, border: '1px solid #d1d5db', cursor: 'pointer',
                  }}
                >
                  <option value="submitted">Submitted</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}