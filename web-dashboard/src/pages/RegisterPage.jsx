import { useState, useEffect } from 'react';
import { register, getWards } from '../services/api';

const DEPARTMENTS = ['BBMP Roads','BBMP Sanitation','BESCOM','BWSSB','BMTC','Town Planning','Parks & Gardens','Health','Other'];
const GRADIENT    = 'linear-gradient(135deg, #1976D2 0%, #0d47a1 100%)';

export default function RegisterPage({ onRegistered, onBack }) {
  const [role,    setRole]    = useState('citizen');
  const [wards,   setWards]   = useState([]);
  const [step,    setStep]    = useState(1); // 2-step for citizen
  const [form,    setForm]    = useState({ name:'', email:'', phone:'', password:'', confirm:'', department:'', wardId:'' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass,setShowPass]= useState(false);

  useEffect(() => {
    if (role === 'officer') {
      getWards().then(res => {
        const d = res.data;
        setWards(d?.data || d?.wards || []);
      }).catch(() => {});
    }
  }, [role]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]:v }));

  const handleNext = (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { setError('Name and email are required'); return; }
    setError(''); setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (role === 'officer' && !form.department) { setError('Department is required'); return; }
    setLoading(true); setError('');
    try {
      const payload = {
        name: form.name, email: form.email, password: form.password, role,
        ...(form.phone && { phone: form.phone }),
        ...(role === 'officer' && { department: form.department }),
        ...(role === 'officer' && form.wardId && { wardId: form.wardId }),
      };
      const res = await register(payload);
      if (res.data.success) {
        localStorage.setItem('token', res.data.data.accessToken);
        localStorage.setItem('user',  JSON.stringify(res.data.data.user));
        onRegistered(res.data.data.user);
      }
    } catch(err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally { setLoading(false); }
  };

  const inp = {
    width:'100%', padding:'12px 14px', border:'1.5px solid #e5e7eb',
    borderRadius:8, fontSize:14, boxSizing:'border-box', outline:'none',
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Left panel */}
      <div style={{ flex:1, background:GRADIENT, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding:48, color:'#fff' }}>
        <div style={{ maxWidth:400, textAlign:'center' }}>
          <div style={{ fontSize:64, marginBottom:20 }}>🏙️</div>
          <h1 style={{ fontSize:32, fontWeight:800, marginBottom:12 }}>Join CivicPulse</h1>
          <p style={{ fontSize:16, opacity:0.9, lineHeight:1.7 }}>
            Help make Bengaluru better. Report civic issues directly to the right authorities.
          </p>
          <div style={{ marginTop:40, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {['📍 GPS verified','🤖 AI validated','⚡ Real-time','🔒 Secure'].map(f => (
              <div key={f} style={{ background:'rgba(255,255,255,0.15)', borderRadius:8, padding:'10px 12px', fontSize:13 }}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width:500, display:'flex', flexDirection:'column', justifyContent:'center', padding:48, background:'#fff', overflowY:'auto' }}>
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontSize:26, fontWeight:700, color:'#111', marginBottom:6 }}>Create your account</h2>
          <p style={{ color:'#6b7280', fontSize:14 }}>Already have an account? <button onClick={onBack} style={{ background:'none', border:'none', color:'#1976D2', cursor:'pointer', fontWeight:700, fontSize:14 }}>Sign in</button></p>
        </div>

        {/* Role selector */}
        <div style={{ display:'flex', background:'#f3f4f6', borderRadius:10, padding:4, marginBottom:24 }}>
          {[['citizen','👤 Citizen'],['officer','🏛 Officer']].map(([r,label]) => (
            <button key={r} type="button" onClick={() => { setRole(r); setStep(1); setError(''); }} style={{
              flex:1, padding:'10px', borderRadius:8, fontSize:14, fontWeight:600,
              border:'none', cursor:'pointer', transition:'all 0.2s',
              background:role===r?'#fff':'transparent',
              color:role===r?'#1976D2':'#6b7280',
              boxShadow:role===r?'0 1px 4px rgba(0,0,0,0.1)':'none',
            }}>{label}</button>
          ))}
        </div>

        {/* Step indicator for citizen */}
        {role === 'citizen' && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24 }}>
            {[1,2].map(s => (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, background:step>=s?'#1976D2':'#e5e7eb', color:step>=s?'#fff':'#9ca3af' }}>{s}</div>
                <span style={{ fontSize:12, color:step>=s?'#1976D2':'#9ca3af', fontWeight:step>=s?600:400 }}>{s===1?'Basic Info':'Set Password'}</span>
                {s < 2 && <div style={{ width:40, height:2, background:step>s?'#1976D2':'#e5e7eb', borderRadius:2 }} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1 — Basic info */}
        {(step === 1 || role === 'officer') && (
          <form onSubmit={role==='officer'?handleSubmit:handleNext}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Full Name</label>
              <input type="text" value={form.name} onChange={e => set('name',e.target.value)} required placeholder="Enter your full name" style={inp}
                onFocus={e => e.target.style.borderColor='#1976D2'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Email Address</label>
              <input type="email" value={form.email} onChange={e => set('email',e.target.value)} required placeholder="your@email.com" style={inp}
                onFocus={e => e.target.style.borderColor='#1976D2'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Phone <span style={{ fontWeight:400, color:'#9ca3af' }}>(optional)</span></label>
              <input type="tel" value={form.phone} onChange={e => set('phone',e.target.value)} placeholder="+91 98765 43210" style={inp}
                onFocus={e => e.target.style.borderColor='#1976D2'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
            </div>

            {role === 'officer' && <>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Department <span style={{ color:'#EF4444' }}>*</span></label>
                <select value={form.department} onChange={e => set('department',e.target.value)} required style={inp}>
                  <option value="">Select your department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Assigned Ward <span style={{ fontWeight:400, color:'#9ca3af' }}>(optional)</span></label>
                <select value={form.wardId} onChange={e => set('wardId',e.target.value)} style={inp}>
                  <option value="">All wards</option>
                  {wards.map(w => <option key={w.id} value={w.id}>{w.ward_name} {w.ward_number?`(#${w.ward_number})`:''}</option>)}
                </select>
              </div>
            </>}

            {role === 'officer' && <>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Password</label>
                <div style={{ position:'relative' }}>
                  <input type={showPass?'text':'password'} value={form.password} onChange={e => set('password',e.target.value)} required placeholder="Min 6 characters" style={{ ...inp, paddingRight:44 }}
                    onFocus={e => e.target.style.borderColor='#1976D2'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af' }}>{showPass?'🙈':'👁'}</button>
                </div>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Confirm Password</label>
                <input type="password" value={form.confirm} onChange={e => set('confirm',e.target.value)} required placeholder="Re-enter password" style={inp}
                  onFocus={e => e.target.style.borderColor='#1976D2'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
              </div>
              <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#92400e', marginBottom:16 }}>
                ⚠ Officer accounts require admin approval before dashboard access.
              </div>
            </>}

            {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#dc2626', marginBottom:16 }}>⚠️ {error}</div>}

            <button type="submit" disabled={loading} style={{ width:'100%', padding:13, background:loading?'#93c5fd':GRADIENT, color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', boxShadow:loading?'none':'0 4px 12px rgba(25,118,210,0.4)' }}>
              {loading ? '⏳ Creating account...' : role==='officer' ? 'Register as Officer' : 'Continue →'}
            </button>
          </form>
        )}

        {/* Step 2 — Password for citizen */}
        {step === 2 && role === 'citizen' && (
          <form onSubmit={handleSubmit}>
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#166534', marginBottom:20 }}>
              ✅ Account info saved for <strong>{form.email}</strong>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Create Password</label>
              <div style={{ position:'relative' }}>
                <input type={showPass?'text':'password'} value={form.password} onChange={e => set('password',e.target.value)} required placeholder="Min 6 characters" style={{ ...inp, paddingRight:44 }}
                  onFocus={e => e.target.style.borderColor='#1976D2'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af' }}>{showPass?'🙈':'👁'}</button>
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Confirm Password</label>
              <input type="password" value={form.confirm} onChange={e => set('confirm',e.target.value)} required placeholder="Re-enter password" style={inp}
                onFocus={e => e.target.style.borderColor='#1976D2'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
            </div>

            {/* Password strength */}
            {form.password && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:'#6b7280', marginBottom:4 }}>Password strength</div>
                <div style={{ background:'#e5e7eb', borderRadius:4, height:6 }}>
                  <div style={{ height:'100%', borderRadius:4, transition:'width 0.3s', width: form.password.length<6?'20%':form.password.length<10?'50%':'80%', background: form.password.length<6?'#EF4444':form.password.length<10?'#F59E0B':'#10B981' }} />
                </div>
              </div>
            )}

            {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#dc2626', marginBottom:16 }}>⚠️ {error}</div>}

            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={() => { setStep(1); setError(''); }} style={{ flex:0.4, padding:13, background:'#f3f4f6', color:'#374151', border:'none', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                ← Back
              </button>
              <button type="submit" disabled={loading} style={{ flex:1, padding:13, background:loading?'#93c5fd':GRADIENT, color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', boxShadow:loading?'none':'0 4px 12px rgba(25,118,210,0.4)' }}>
                {loading ? '⏳ Creating account...' : '🚀 Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}