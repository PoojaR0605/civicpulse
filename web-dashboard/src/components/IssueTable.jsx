import { useState } from 'react';
import { updateStatus } from '../services/api';

const STATUS_COLORS = {
  submitted:'#F59E0B', validated:'#3B82F6', assigned:'#8B5CF6',
  in_progress:'#06B6D4', resolved:'#10B981', rejected:'#EF4444',
};

// Valid next statuses from current status
const NEXT_STATUSES = {
  submitted:    ['assigned', 'rejected'],
  validated:    ['assigned', 'in_progress', 'rejected'],
  assigned:     ['in_progress', 'rejected'],
  in_progress:  ['resolved', 'rejected'],
  resolved:     [],
  rejected:     ['submitted'],
};

const STATUS_LABELS = {
  submitted:   'Submitted',
  assigned:    'Assigned',
  in_progress: 'In Progress',
  resolved:    'Resolved',
  rejected:    'Rejected',
};

const STATUS_BTN_COLORS = {
  assigned:    { bg:'#8B5CF6', color:'#fff' },
  in_progress: { bg:'#06B6D4', color:'#fff' },
  resolved:    { bg:'#10B981', color:'#fff' },
  rejected:    { bg:'#EF4444', color:'#fff' },
  submitted:   { bg:'#F59E0B', color:'#fff' },
};

export default function IssueTable({ issues, onUpdate }) {
  const [updating, setUpdating] = useState(null);
  const [errMsg,   setErrMsg]   = useState(null);

  const handleStatusChange = async (id, newStatus) => {
    if (!newStatus || updating) return;
    setUpdating(id + newStatus);
    setErrMsg(null);
    try {
      await updateStatus(id, newStatus, `Status updated to ${newStatus} by officer`);
      onUpdate();
    } catch(err) {
      setErrMsg(err.response?.data?.message || 'Failed to update status');
      setTimeout(() => setErrMsg(null), 5000);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      {errMsg && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', padding:'10px 16px', borderRadius:6, fontSize:13, marginBottom:10 }}>
          ⚠ {errMsg}
        </div>
      )}
      <div style={{ background:'#fff', borderRadius:8, border:'1px solid #e5e7eb', overflow:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:860 }}>
          <thead>
            <tr style={{ background:'#f9fafb', borderBottom:'1px solid #e5e7eb' }}>
              {['Category','Title / Location','Ward','Priority','AI','Status','SLA','Action'].map(h => (
                <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issues.length===0 ? (
              <tr>
                <td colSpan={8} style={{ padding:40, textAlign:'center', color:'#9ca3af' }}>
                  No issues found
                </td>
              </tr>
            ) : issues.map((issue, idx) => {
              const nextStatuses = NEXT_STATUSES[issue.status] || [];
              return (
                <tr key={issue.id} style={{ borderBottom:'1px solid #f3f4f6', background:issue.sla_breached?'#fef2f2':idx%2===0?'#fff':'#f9fafb' }}>

                  {/* Category */}
                  <td style={{ padding:'12px 14px', fontSize:13 }}>
                    <span style={{ background:'#e0e7ff', color:'#3730a3', padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:500 }}>
                      {issue.category}
                    </span>
                  </td>

                  {/* Title + address */}
                  <td style={{ padding:'12px 14px', fontSize:13, maxWidth:200 }}>
                    <div style={{ fontWeight:500 }}>{issue.title || '—'}</div>
                    {issue.address && (
                      <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>
                        {issue.address.split(',').slice(0,2).join(',')}
                      </div>
                    )}
                  </td>

                  {/* Ward */}
                  <td style={{ padding:'12px 14px', fontSize:12, color:'#6b7280' }}>
                    {issue.ward_name
                      ? `${issue.ward_name}${issue.ward_number ? ` #${issue.ward_number}` : ''}`
                      : <span style={{ color:'#F59E0B' }}>⚠ Unassigned</span>
                    }
                  </td>

                  {/* Priority */}
                  <td style={{ padding:'12px 14px', fontSize:13 }}>
                    <span style={{ fontWeight:600, color:parseFloat(issue.priority_score)>60?'#EF4444':parseFloat(issue.priority_score)>40?'#F59E0B':'#10B981' }}>
                      {parseFloat(issue.priority_score||0).toFixed(1)}
                    </span>
                  </td>

                  {/* AI */}
                  <td style={{ padding:'12px 14px', fontSize:11 }}>
                    {issue.ai_confidence
                      ? <span style={{ color:'#10B981', fontWeight:500 }}>🤖 {(parseFloat(issue.ai_confidence)*100).toFixed(0)}%</span>
                      : issue.ai_status==='manual_review'
                        ? <span style={{ color:'#F59E0B' }}>👁 Manual</span>
                        : <span style={{ color:'#9ca3af' }}>—</span>
                    }
                  </td>

                  {/* Status badge */}
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ background:(STATUS_COLORS[issue.status]||'#6b7280')+'20', color:STATUS_COLORS[issue.status]||'#6b7280', padding:'3px 10px', borderRadius:12, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>
                      {STATUS_LABELS[issue.status] || issue.status}
                    </span>
                  </td>

                  {/* SLA */}
                  <td style={{ padding:'12px 14px', fontSize:11 }}>
                    {issue.sla_breached
                      ? <span style={{ color:'#EF4444', fontWeight:700 }}>⚠ BREACHED</span>
                      : issue.sla_deadline
                        ? <span style={{ color:'#6b7280' }}>{new Date(issue.sla_deadline).toLocaleDateString('en-IN')}</span>
                        : '—'}
                  </td>

                  {/* Action — buttons instead of dropdown */}
                  <td style={{ padding:'12px 14px' }}>
                    {nextStatuses.length === 0 ? (
                      <span style={{ fontSize:11, color:'#9ca3af' }}>
                        {issue.status==='resolved' ? '✅ Done' : '—'}
                      </span>
                    ) : (
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {nextStatuses.map(s => {
                          const isLoading = updating === issue.id + s;
                          const btnStyle  = STATUS_BTN_COLORS[s] || { bg:'#6b7280', color:'#fff' };
                          return (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(issue.id, s)}
                              disabled={!!updating}
                              style={{
                                padding:'4px 10px',
                                background: isLoading ? '#e5e7eb' : btnStyle.bg,
                                color: isLoading ? '#9ca3af' : btnStyle.color,
                                border:'none', borderRadius:4,
                                fontSize:11, fontWeight:600,
                                cursor: updating ? 'not-allowed' : 'pointer',
                                whiteSpace:'nowrap',
                                opacity: updating && !isLoading ? 0.6 : 1,
                              }}
                            >
                              {isLoading ? '...' : STATUS_LABELS[s]}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}