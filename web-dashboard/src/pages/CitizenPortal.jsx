import { useState, useEffect } from 'react';
import { submitIssue, getMyIssues } from '../services/api';

const CATEGORIES = ['pothole','garbage','streetlight','sewage','encroachment','waterlogging','other'];
const CAT_ICONS  = { pothole:'🕳️', garbage:'🗑️', streetlight:'💡', sewage:'🚰', encroachment:'🚧', waterlogging:'🌊', other:'📋' };

const STATUS_CONFIG = {
  submitted:   { color:'#F59E0B', bg:'#fffbeb', label:'📤 Submitted',       desc:'Your complaint has been received and is pending review.' },
  validated:   { color:'#3B82F6', bg:'#eff6ff', label:'✅ AI Verified',      desc:'AI has confirmed this is a real issue. Awaiting officer assignment.' },
  assigned:    { color:'#8B5CF6', bg:'#f5f3ff', label:'👷 Assigned',         desc:'An officer has been assigned to your complaint.' },
  in_progress: { color:'#06B6D4', bg:'#ecfeff', label:'🔧 In Progress',      desc:'Work is underway to resolve this issue.' },
  resolved:    { color:'#10B981', bg:'#f0fdf4', label:'✅ Resolved',          desc:'Your complaint has been resolved. Thank you!' },
  rejected:    { color:'#EF4444', bg:'#fef2f2', label:'❌ Rejected',          desc:'Your complaint was rejected. See reason below.' },
  manual_review:{ color:'#F59E0B', bg:'#fffbeb', label:'👁 Manual Review',   desc:'Being reviewed manually by an officer.' },
};

const AI_STATUS_CONFIG = {
  validated:     { color:'#10B981', icon:'🤖✅', label:'AI Verified Real Issue' },
  rejected:      { color:'#EF4444', icon:'🤖❌', label:'AI Flagged as Invalid' },
  manual_review: { color:'#F59E0B', icon:'🤖👁', label:'Sent for Manual Review' },
  pending:       { color:'#9ca3af', icon:'🤖⏳', label:'AI Verification Pending' },
};

async function reverseGeocode(lat, lng) {
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`, { headers:{ 'Accept-Language':'en' } });
    const data = await res.json();
    const a    = data.address || {};
    return {
      full:     data.display_name || '',
      street:   a.road || a.pedestrian || '',
      area:     a.suburb || a.neighbourhood || '',
      district: a.city_district || a.district || '',
      city:     a.city || a.town || 'Bengaluru',
      pincode:  a.postcode || '',
    };
  } catch {
    return { full:`${lat.toFixed(5)}, ${lng.toFixed(5)}`, street:'', area:'', district:'', city:'', pincode:'' };
  }
}

// Timeline steps for a complaint
function ComplaintTimeline({ issue }) {
  const steps = [
    { key:'submitted',    label:'Submitted',    icon:'📤' },
    { key:'validated',    label:'AI Verified',  icon:'🤖' },
    { key:'assigned',     label:'Assigned',     icon:'👷' },
    { key:'in_progress',  label:'In Progress',  icon:'🔧' },
    { key:'resolved',     label:'Resolved',     icon:'✅' },
  ];

  const statusOrder = ['submitted','validated','assigned','in_progress','resolved','rejected'];
  const currentIdx  = statusOrder.indexOf(issue.status);
  const isRejected  = issue.status === 'rejected';

  return (
    <div style={{ marginTop:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:0 }}>
        {steps.map((step, idx) => {
          const stepIdx   = statusOrder.indexOf(step.key);
          const isDone    = !isRejected && currentIdx >= stepIdx;
          const isCurrent = !isRejected && statusOrder[currentIdx] === step.key;
          return (
            <div key={step.key} style={{ display:'flex', alignItems:'center', flex: idx < steps.length-1 ? 1 : 'none' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{
                  width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                  background: isDone ? '#1976D2' : '#e5e7eb',
                  color: isDone ? '#fff' : '#9ca3af',
                  fontSize:12, fontWeight:600,
                  border: isCurrent ? '2px solid #1976D2' : 'none',
                  boxShadow: isCurrent ? '0 0 0 3px #bfdbfe' : 'none',
                }}>
                  {isDone ? (isCurrent ? step.icon : '✓') : step.icon}
                </div>
                <div style={{ fontSize:9, color: isDone?'#1976D2':'#9ca3af', marginTop:3, textAlign:'center', whiteSpace:'nowrap' }}>
                  {step.label}
                </div>
              </div>
              {idx < steps.length-1 && (
                <div style={{ flex:1, height:2, background: isDone && currentIdx > stepIdx ? '#1976D2' : '#e5e7eb', margin:'0 4px', marginBottom:16 }} />
              )}
            </div>
          );
        })}
        {isRejected && (
          <div style={{ marginLeft:8, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:6, padding:'2px 8px', fontSize:11, color:'#EF4444', fontWeight:600 }}>
            ❌ Rejected
          </div>
        )}
      </div>
    </div>
  );
}

// AI Verification card
function AIVerificationCard({ issue }) {
  const aiStatus = issue.ai_status || (issue.ai_confidence ? 'validated' : 'pending');
  const config   = AI_STATUS_CONFIG[aiStatus] || AI_STATUS_CONFIG.pending;
  const conf     = issue.ai_confidence ? parseFloat(issue.ai_confidence) : null;

  return (
    <div style={{ marginTop:10, padding:10, background:'#f8fafc', borderRadius:6, border:'1px solid #e2e8f0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:conf?6:0 }}>
        <div style={{ fontSize:12, fontWeight:600, color:config.color }}>
          {config.icon} {config.label}
        </div>
        {conf && (
          <div style={{ fontSize:11, color:'#6b7280' }}>
            Confidence: <strong style={{ color:conf>=0.75?'#10B981':conf>=0.5?'#F59E0B':'#EF4444' }}>{(conf*100).toFixed(0)}%</strong>
          </div>
        )}
      </div>
      {conf && (
        <div style={{ background:'#e5e7eb', borderRadius:4, height:6, overflow:'hidden' }}>
          <div style={{ width:`${conf*100}%`, height:'100%', background:conf>=0.75?'#10B981':conf>=0.5?'#F59E0B':'#EF4444', borderRadius:4, transition:'width 0.5s' }} />
        </div>
      )}
      {aiStatus === 'rejected' && (
        <div style={{ marginTop:6, fontSize:11, color:'#EF4444' }}>
          ⚠ AI could not verify this as a real civic issue. If you believe this is wrong, it will be reviewed manually.
        </div>
      )}
      {aiStatus === 'pending' && (
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>
          AI verification runs automatically after submission. Check back in a few minutes.
        </div>
      )}
    </div>
  );
}

export default function CitizenPortal({ user, onLogout }) {
  const [tab,           setTab]           = useState('report');
  const [myIssues,      setMyIssues]      = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [expandedId,    setExpandedId]    = useState(null);
  const [form,          setForm]          = useState({ title:'', description:'', category:'pothole' });
  const [photo,         setPhoto]         = useState(null);
  const [photoPreview,  setPhotoPreview]  = useState(null);
  const [gps,           setGps]           = useState(null);
  const [address,       setAddress]       = useState(null);
  const [gpsState,      setGpsState]      = useState('idle');
  const [submitting,    setSubmitting]    = useState(false);
  const [success,       setSuccess]       = useState('');
  const [error,         setError]         = useState('');

  useEffect(() => { if (tab==='myissues') fetchMyIssues(); }, [tab]);

  const fetchMyIssues = async () => {
    setLoadingIssues(true);
    try {
      const res = await getMyIssues();
      if (res.data.success) {
        const data = res.data.data;
        setMyIssues(Array.isArray(data) ? data : data.issues || []);
      }
    } catch(e) {
      console.error('Failed to load my issues:', e.response?.data || e.message);
    } finally { setLoadingIssues(false); }
  };

  const getLocation = () => {
    setGpsState('loading'); setAddress(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude:lat, longitude:lng } = pos.coords;
        setGps({ lat, lng }); setGpsState('done');
        setAddress(await reverseGeocode(lat, lng));
      },
      () => setGpsState('error'),
      { enableHighAccuracy:true, timeout:10000 }
    );
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]:v }));
  const canSubmit = gps && photo && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gps)   { setError('Please capture your GPS location first'); return; }
    if (!photo) { setError('Please add a photo — required for AI verification'); return; }
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      fd.append('title',       form.title || `${form.category} issue`);
      fd.append('description', form.description || form.category);
      fd.append('category',    form.category);
      fd.append('latitude',    gps.lat.toString());
      fd.append('longitude',   gps.lng.toString());
      if (address?.full) fd.append('address', address.full);
      fd.append('photo', photo);
      await submitIssue(fd);
      setSuccess('✅ Complaint submitted! AI verification is running automatically.');
      setForm({ title:'', description:'', category:'pothole' });
      setPhoto(null); setPhotoPreview(null); setGps(null); setAddress(null); setGpsState('idle');
      setTimeout(() => { setSuccess(''); setTab('myissues'); }, 2000);
    } catch(err) {
      setError(err.response?.data?.message || 'Submission failed. Try again.');
    } finally { setSubmitting(false); }
  };

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:14, boxSizing:'border-box' };

  return (
    <div style={{ minHeight:'100vh', background:'#f3f4f6' }}>
      <div style={{ background:'#1976D2', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:56 }}>
        <span style={{ color:'#fff', fontWeight:700, fontSize:18 }}>CivicPulse</span>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ color:'#bfdbfe', fontSize:13 }}>👤 {user?.name}</span>
          <button onClick={onLogout} style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'none', padding:'6px 14px', borderRadius:6, cursor:'pointer', fontSize:13 }}>Logout</button>
        </div>
      </div>

      <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'0 24px', display:'flex' }}>
        {[['report','📝 Report Issue'],['myissues','📋 My Complaints']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding:'14px 20px', border:'none', background:'none', fontSize:14, fontWeight:tab===key?600:400, color:tab===key?'#1976D2':'#6b7280', borderBottom:tab===key?'2px solid #1976D2':'2px solid transparent', cursor:'pointer' }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:24, maxWidth:640, margin:'0 auto' }}>

        {/* REPORT TAB */}
        {tab==='report' && (
          <div style={{ background:'#fff', borderRadius:10, padding:28, border:'1px solid #e5e7eb' }}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Report a Civic Issue</h2>
            <p style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>📍 GPS + 📷 Photo required for AI verification</p>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:8 }}>Issue Category</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {CATEGORIES.map(c => (
                    <button key={c} type="button" onClick={() => set('category', c)} style={{ padding:'6px 14px', borderRadius:20, fontSize:13, border:`1px solid ${form.category===c?'#1976D2':'#d1d5db'}`, background:form.category===c?'#1976D2':'#fff', color:form.category===c?'#fff':'#374151', cursor:'pointer', fontWeight:form.category===c?600:400 }}>
                      {CAT_ICONS[c]} {c.charAt(0).toUpperCase()+c.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:18, padding:16, background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Step 1 — 📍 Location <span style={{ color:'#EF4444' }}>*</span></div>
                <button type="button" onClick={getLocation} style={{ padding:'10px 20px', background:gpsState==='done'?'#10B981':'#1976D2', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:500 }}>
                  {gpsState==='loading'?'📡 Getting GPS...':gpsState==='done'?'✅ GPS Locked':gpsState==='error'?'❌ Retry':'📍 Get My Location'}
                </button>
                {address && (
                  <div style={{ marginTop:10, padding:10, background:'#f0fdf4', borderRadius:6, border:'1px solid #bbf7d0', fontSize:12, lineHeight:1.9 }}>
                    {address.street   && <div>🛣️ <strong>Street:</strong> {address.street}</div>}
                    {address.area     && <div>📍 <strong>Area:</strong> {address.area}</div>}
                    {address.district && <div>🏙️ <strong>District:</strong> {address.district}</div>}
                    {address.city     && <div>🌆 <strong>City:</strong> {address.city}</div>}
                    {address.pincode  && <div>📮 <strong>Pincode:</strong> {address.pincode}</div>}
                    <div style={{ color:'#6b7280', fontSize:11 }}>GPS: {gps?.lat.toFixed(6)}, {gps?.lng.toFixed(6)}</div>
                  </div>
                )}
                {gpsState==='error' && <p style={{ color:'#EF4444', fontSize:12, marginTop:6 }}>Allow location access and retry.</p>}
              </div>

              <div style={{ marginBottom:18, padding:16, background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Step 2 — 📷 Photo <span style={{ color:'#EF4444' }}>*</span></div>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:10 }}>Required for AI to verify the issue is real</div>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} style={{ fontSize:13 }} />
                {photoPreview && (
                  <div style={{ marginTop:8, position:'relative', display:'inline-block' }}>
                    <img src={photoPreview} alt="preview" style={{ width:180, height:130, objectFit:'cover', borderRadius:6, border:'2px solid #10B981' }} />
                    <div style={{ position:'absolute', top:4, right:4, background:'#10B981', color:'#fff', borderRadius:4, padding:'2px 6px', fontSize:10, fontWeight:600 }}>✅ Ready</div>
                    <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); }} style={{ display:'block', marginTop:4, background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:12 }}>✕ Remove</button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom:18, padding:16, background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Step 3 — Details <span style={{ color:'#9ca3af', fontWeight:400 }}>(optional)</span></div>
                <div style={{ marginBottom:10 }}>
                  <label style={{ fontSize:12, fontWeight:500, display:'block', marginBottom:4 }}>Title</label>
                  <input type="text" value={form.title} onChange={e => set('title',e.target.value)} placeholder={`e.g. Large ${form.category} near bus stop`} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:500, display:'block', marginBottom:4 }}>Description</label>
                  <textarea value={form.description} onChange={e => set('description',e.target.value)} rows={2} placeholder="Describe the issue..." style={{ ...inp, resize:'vertical' }} />
                </div>
              </div>

              {error   && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', padding:'10px 14px', borderRadius:6, fontSize:13, marginBottom:12 }}>⚠ {error}</div>}
              {success && <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#166534', padding:'10px 14px', borderRadius:6, fontSize:13, marginBottom:12 }}>{success}</div>}

              <button type="submit" disabled={!canSubmit} style={{ width:'100%', padding:13, background:canSubmit?'#1976D2':'#93c5fd', color:'#fff', border:'none', borderRadius:6, fontSize:15, fontWeight:600, cursor:canSubmit?'pointer':'not-allowed' }}>
                {submitting?'⏳ Submitting...':!gps&&!photo?'Capture location & photo first':!gps?'📍 Capture location first':!photo?'📷 Add photo first':'🚀 Submit Complaint'}
              </button>

              <div style={{ display:'flex', gap:8, marginTop:12, justifyContent:'center' }}>
                <span style={{ fontSize:11, color:gps?'#10B981':'#9ca3af' }}>{gps?'✅':'⭕'} Location</span>
                <span style={{ fontSize:11, color:'#9ca3af' }}>•</span>
                <span style={{ fontSize:11, color:photo?'#10B981':'#9ca3af' }}>{photo?'✅':'⭕'} Photo</span>
                <span style={{ fontSize:11, color:'#9ca3af' }}>•</span>
                <span style={{ fontSize:11, color:'#9ca3af' }}>⭕ AI Check (auto)</span>
              </div>
            </form>
          </div>
        )}

        {/* MY COMPLAINTS TAB */}
        {tab==='myissues' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>My Complaints</h2>
              <button onClick={fetchMyIssues} style={{ padding:'6px 14px', borderRadius:6, border:'1px solid #d1d5db', background:'#fff', cursor:'pointer', fontSize:13 }}>⟳ Refresh</button>
            </div>

            {loadingIssues ? (
              <div style={{ textAlign:'center', padding:40, color:'#9ca3af' }}>Loading your complaints...</div>
            ) : myIssues.length===0 ? (
              <div style={{ background:'#fff', borderRadius:10, padding:48, textAlign:'center', color:'#9ca3af', border:'1px solid #e5e7eb' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                <div style={{ fontWeight:500, marginBottom:4 }}>No complaints yet</div>
                <div style={{ fontSize:12, marginBottom:12 }}>Logged in as: {user?.email}</div>
                <button onClick={() => setTab('report')} style={{ background:'none', border:'none', color:'#1976D2', cursor:'pointer', fontSize:13 }}>Report your first issue →</button>
              </div>
            ) : myIssues.map(issue => {
              const sc = STATUS_CONFIG[issue.status] || STATUS_CONFIG.submitted;
              const isExpanded = expandedId === issue.id;
              return (
                <div key={issue.id} style={{ background:'#fff', borderRadius:8, border:`1px solid ${sc.color}40`, marginBottom:12, overflow:'hidden' }}>
                  {/* Status bar */}
                  <div style={{ background:sc.bg, borderBottom:`1px solid ${sc.color}30`, padding:'8px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:sc.color }}>{sc.label}</span>
                    <span style={{ fontSize:11, color:'#9ca3af' }}>📅 {new Date(issue.created_at).toLocaleDateString('en-IN')}</span>
                  </div>

                  <div style={{ padding:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:14 }}>{CAT_ICONS[issue.category]} {issue.title || issue.category}</div>
                        {issue.ward_name
                          ? <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>📍 {issue.ward_name}</div>
                          : <div style={{ fontSize:12, color:'#F59E0B', marginTop:2 }}>⚠ No ward assigned — nearest officer notified</div>
                        }
                        {issue.address && <div style={{ fontSize:11, color:'#9ca3af', marginTop:1 }}>{issue.address.split(',').slice(0,3).join(',')}</div>}
                      </div>
                    </div>

                    {/* Status description */}
                    <div style={{ fontSize:12, color:'#6b7280', marginBottom:10, padding:'6px 10px', background:'#f9fafb', borderRadius:4 }}>
                      {sc.desc}
                      {issue.status==='rejected' && issue.rejection_note && (
                        <div style={{ color:'#EF4444', marginTop:4 }}>Reason: {issue.rejection_note}</div>
                      )}
                    </div>

                    {/* Progress timeline */}
                    <ComplaintTimeline issue={issue} />

                    {/* Expand for AI details */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                      style={{ marginTop:10, background:'none', border:'none', color:'#1976D2', cursor:'pointer', fontSize:12, padding:0 }}
                    >
                      {isExpanded ? '▲ Hide details' : '▼ Show AI verification & details'}
                    </button>

                    {isExpanded && (
                      <div style={{ marginTop:8 }}>
                        <AIVerificationCard issue={issue} />
                        {parseInt(issue.duplicate_count||0)>0 && (
                          <div style={{ marginTop:8, padding:'6px 10px', background:'#f5f3ff', borderRadius:4, fontSize:12, color:'#8B5CF6' }}>
                            👥 {issue.duplicate_count} other citizens reported the same issue — merged for faster resolution
                          </div>
                        )}
                        {issue.sla_breached && (
                          <div style={{ marginTop:8, padding:'6px 10px', background:'#fef2f2', borderRadius:4, fontSize:12, color:'#EF4444' }}>
                            ⚠ SLA deadline was breached — escalated to senior officer
                          </div>
                        )}
                        <div style={{ marginTop:8, fontSize:11, color:'#9ca3af' }}>
                          Issue ID: {issue.id?.slice(0,8)}... • Priority: {parseFloat(issue.priority_score||0).toFixed(1)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}