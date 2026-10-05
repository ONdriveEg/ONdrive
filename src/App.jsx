import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient.js'
import { auth } from './firebase.js'
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

export default function App(){
  const [user,setUser]=useState(null)
  const [phone,setPhone]=useState('')
  const [otp,setOtp]=useState('')
  const [step,setStep]=useState('phone')
  const [role,setRole]=useState(localStorage.getItem('role')||'client')
  const [rides,setRides]=useState([])
  const [from,setFrom]=useState('كفر الشيخ')
  const [to,setTo]=useState('القاهرة')
  const [sending,setSending]=useState(false)
  const [verifying,setVerifying]=useState(false)

  useEffect(()=>{
    const savedPhone = localStorage.getItem('phone')
    if(savedPhone){
      setPhone(savedPhone);
      setUser({phone: savedPhone})
    }
  },[])

  useEffect(()=>{
    loadRides()
    // Realtime
    const channel = supabase.channel('rides-changes')
    .on('postgres_changes', {event:'*', schema:'public', table:'rides'}, ()=> loadRides())
    .subscribe()
    return ()=> supabase.removeChannel(channel)
  },[])

  const setupRecaptcha = ()=>{
    if(typeof window === 'undefined') return
    if(window.recaptchaVerifier){
      try{ window.recaptchaVerifier.clear() }catch(e){}
      window.recaptchaVerifier = null
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size':'invisible'
    });
  }

  const sendCode = async()=>{
    if(phone.length<11) return alert('اكتب رقم صحيح 01xxxxxxxxx')
    setSending(true)
    try{
      setupRecaptcha()
      let fullPhone = phone.trim()
      if(fullPhone.startsWith('0')) fullPhone = '+20'+fullPhone.slice(1)
      
      // --- للتجربة: لو الرقم ده استخدم كود 123456 ---
      if(phone === '01030110276'){
         localStorage.setItem('phone', phone)
         setUser({phone: phone})
         setSending(false)
         return
      }

      const confirmation = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier)
      window.confirmationResult = confirmation;
      setStep('otp')
    }catch(err){
      alert('خطأ: '+err.message);
      if(window.recaptchaVerifier){ try{window.recaptchaVerifier.clear()}catch(e){}; window.recaptchaVerifier=null }
    }finally{ setSending(false) }
  }

  const verifyCode = async()=>{
    if(otp.length < 4) return alert('اكتب الكود')
    // كود التجربة
    if(phone === '01030110276' && otp === '123456'){
      localStorage.setItem('phone', phone)
      setUser({phone: phone})
      return
    }
    setVerifying(true)
    try{
      const result = await window.confirmationResult.confirm(otp);
      localStorage.setItem('phone', phone)
      setUser({phone: phone})
    }catch(err){ alert('كود خطأ: '+err.message) }
    finally{ setVerifying(false) }
  }

  const loadRides=async()=>{
    const {data} = await supabase.from('rides').select('*').order('created_at',{ascending:false}).limit(20)
    if(data) setRides(data)
  }

  const requestRide=async()=>{
    if(!from || !to) return alert('اكتب من و الى')
    const {data, error} = await supabase.from('rides').insert([{
      from_text: from,
      to_text: to,
      price: 325,
      category: 'اقتصادي',
      payment_method: 'XPay',
      status: 'بحث عن كابتن',
      client_phone: phone
    }]).select().single()
    
    if(error){
      alert('ايرور: '+error.message)
      console.log(error)
    } else {
      alert('تم ارسال الطلب ✅')
      loadRides()
    }
  }

  const acceptRide = async (id)=>{
    const {error} = await supabase.from('rides').update({
      status: 'وصل الكابتن',
      driver_name: 'كابتن - ' + phone
    }).eq('id', id)
    if(error) alert(error.message)
    else loadRides()
  }

  const rejectRide = async (id)=>{
    await supabase.from('rides').update({ status: 'ملغي' }).eq('id', id)
    loadRides()
  }

  if(!user) return (
    <div style={{padding:20,maxWidth:400,margin:'auto',textAlign:'center',fontFamily:'Arial'}}>
      <h1>ONdrive Egypt 🚗</h1>
      {step==='phone'? <>
        <p>ادخل رقم تليفونك</p>
        <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01xxxxxxxxx" style={{width:'100%',padding:12,fontSize:18,textAlign:'center',borderRadius:10,border:'1px solid #ccc'}}/>
        <br/><br/>
        <button onClick={sendCode} disabled={sending} style={{width:'100%',padding:15,background: sending?'#666':'black',color:'white',fontSize:18,borderRadius:10,border:'none'}}> {sending? '⏳ جاري الارسال...' : 'ارسال كود SMS 📲'} </button>
        <p style={{fontSize:12,color:'#888',marginTop:10}}>للتجربة: 01030110276 / كود 123456</p>
      </> : <>
        <p>دخل كود الـ SMS اللي وصل على {phone}</p>
        <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="123456" style={{width:'100%',padding:12,fontSize:22,textAlign:'center',letterSpacing:5,borderRadius:10,border:'1px solid #ccc'}}/>
        <br/><br/>
        <button onClick={verifyCode} disabled={verifying} style={{width:'100%',padding:15,background: verifying?'#666':'black',color:'white',fontSize:18,borderRadius:10,border:'none'}}> {verifying? '⏳ جاري التأكيد...' : 'تأكيد ودخول ✅'} </button>
      </>}
      <div id="recaptcha-container"></div>
    </div>
  )

  return (
    <div style={{padding:10,maxWidth:500,margin:'auto',fontFamily:'Arial'}}>
      <h2 style={{textAlign:'center'}}>ONdrive - {phone}</h2>
      <div style={{display:'flex',gap:5,justifyContent:'center'}}>
        <button onClick={()=>{setRole('client');localStorage.setItem('role','client')}} style={{padding:10,borderRadius:8,background:role==='client'?'black':'white',color:role==='client'?'white':'black',border:'1px solid black'}}>عميل</button>
        <button onClick={()=>{setRole('driver');localStorage.setItem('role','driver')}} style={{padding:10,borderRadius:8,background:role==='driver'?'black':'white',color:role==='driver'?'white':'black',border:'1px solid black'}}>كابتن</button>
        <button onClick={()=>{localStorage.removeItem('phone'); setUser(null)}} style={{padding:10,borderRadius:8}}>خروج</button>
      </div>

      {role==='client' && (
        <div style={{marginTop:15,background:'#f9f9f9',padding:15,borderRadius:12}}>
          <label>من:</label> <input value={from} onChange={e=>setFrom(e.target.value)} style={{width:'100%',padding:10,borderRadius:8,marginBottom:10}}/>
          <label>إلى:</label> <input value={to} onChange={e=>setTo(e.target.value)} style={{width:'100%',padding:10,borderRadius:8}}/>
          <br/><br/>
          <button onClick={requestRide} style={{width:'100%',padding:15,background:'black',color:'white',borderRadius:10,fontSize:18}}>اطلب الآن 🚀</button>
        </div>
      )}

      <div style={{marginTop:20}}>
        <h3>{role==='driver' ? 'الطلبات المتاحة' : 'اخر طلباتك'}</h3>
        {rides.filter(r=> role==='driver' ? r.status==='بحث عن كابتن' : true).map(r=>(
          <div key={r.id} style={{background:'#eee',padding:12,borderRadius:10,marginBottom:10}}>
            <b>{r.from_text} → {r.to_text}</b>
            <div style={{fontSize:13,color:'#555'}}>{r.price} جنيه - {r.status} - {r.client_phone}</div>
            {role==='driver' && r.status==='بحث عن كابتن' && (
              <div style={{display:'flex',gap:8,marginTop:8}}>
                <button onClick={()=>acceptRide(r.id)} style={{flex:1,padding:10,background:'#00c853',color:'white',border:'none',borderRadius:8}}>قبول ✅</button>
                <button onClick={()=>rejectRide(r.id)} style={{flex:1,padding:10,background:'#d50000',color:'white',border:'none',borderRadius:8}}>رفض ❌</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
