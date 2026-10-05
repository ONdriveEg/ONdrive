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
  const [price,setPrice]=useState(325)
  const [activeRide,setActiveRide]=useState(null)
  const [driverProfile,setDriverProfile]=useState(JSON.parse(localStorage.getItem('driverProfile')||'{}'))

  const saveDriver = (k,v)=>{ const n={...driverProfile,[k]:v}; setDriverProfile(n); localStorage.setItem('driverProfile',JSON.stringify(n)) }

  useEffect(()=>{
    const savedPhone = localStorage.getItem('phone')
    if(savedPhone){ setPhone(savedPhone); setUser({id: 'fb-'+savedPhone, phone: savedPhone}) }
  },[])
  useEffect(()=>{ if(user) loadRides() },[user])

  const setupRecaptcha = ()=>{
    if(!window.recaptchaVerifier){
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {'size':'invisible'});
    }
  }

  const sendCode = async()=>{
    if(phone.length<11) return alert('اكتب رقم صحيح 01xxxxxxxxx')
    try{
      setupRecaptcha()
      const fullPhone = phone.startsWith('0')? '+20'+phone.slice(1) : '+2'+phone
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier)
      window.confirmationResult = confirmation;
      alert('تم ارسال كود SMS على: ' + fullPhone)
      setStep('otp')
    }catch(err){ alert('خطأ: '+err.message); window.recaptchaVerifier=null; console.log(err) }
  }

  const verifyCode = async()=>{
    if(otp.length < 4) return alert('اكتب الكود')
    try{
      const result = await window.confirmationResult.confirm(otp);
      localStorage.setItem('phone', phone)
      setUser({id: result.user.uid, phone: phone})
      const email = phone+'@ondrive.eg'; const pass = '123456'
      await supabase.auth.signUp({ email, password: pass }).catch(()=>{})
      await supabase.auth.signInWithPassword({email, password: pass}).catch(()=>{})
    }catch(err){ alert('كود خطأ: '+err.message) }
  }

  const loadRides=async()=>{
    const {data}=await supabase.from('rides').select('*').order('created_at',{ascending:false})
    if(data){ setRides(data); if(data[0]) setActiveRide(data[0]) }
  }
  const requestRide=async()=>{
    const {data}=await supabase.from('rides').insert({ client_id: user.id, from_text:from, to_text:to, price:price, status:'يبحث عن كابتن', driver_name: driverProfile.driverName }).select().single()
    if(data){ loadRides() }
  }

  if(!user) return (
    <div style={{padding:20,maxWidth:400,margin:'auto',textAlign:'center',fontFamily:'Arial'}}>
      <h1>ONdrive Egypt 🚗</h1>
      {step==='phone'? <>
        <p>ادخل رقم تليفونك</p>
        <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01xxxxxxxxx" style={{width:'100%',padding:12,fontSize:18,textAlign:'center'}}/>
        <br/><br/>
        <button onClick={sendCode} style={{width:'100%',padding:15,background:'black',color:'white',fontSize:18}}>ارسال كود SMS</button>
      </> : <>
        <p>دخل كود الـ SMS {phone}</p>
        <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="******" style={{width:'100%',padding:12,fontSize:22,textAlign:'center',letterSpacing:5}}/>
        <br/><br/>
        <button onClick={verifyCode} style={{width:'100%',padding:15,background:'black',color:'white',fontSize:18}}>تأكيد ودخول</button>
        <br/><br/>
        <button onClick={()=>setStep('phone')}>تغيير الرقم</button>
      </>}
      <div id="recaptcha-container"></div>
    </div>
  )
  return (
    <div style={{padding:10,maxWidth:500,margin:'auto',fontFamily:'Arial'}}>
      <h2 style={{textAlign:'center'}}>ONdrive - {phone}</h2>
      <div style={{display:'flex',gap:5,justifyContent:'center'}}>
        <button onClick={()=>{setRole('client');localStorage.setItem('role','client')}} style={{background:role==='client'?'black':'white',color:role==='client'?'white':'black'}}>عميل</button>
        <button onClick={()=>{setRole('driver');localStorage.setItem('role','driver')}} style={{background:role==='driver'?'black':'white',color:role==='driver'?'white':'black'}}>كابتن</button>
        <button onClick={()=>{localStorage.removeItem('phone'); setUser(null)}}>خروج</button>
      </div>
      {role==='client' && (<div style={{marginTop:15}}>من: <input value={from} onChange={e=>setFrom(e.target.value)} style={{width:'100%'}}/><br/><br/>إلى: <input value={to} onChange={e=>setTo(e.target.value)} style={{width:'100%'}}/><br/><br/><button onClick={requestRide} style={{width:'100%',padding:15,background:'black',color:'white'}}>اطلب الآن</button></div>)}
      {activeRide && (<div style={{marginTop:15,background:'#eee',padding:10}}><b>{activeRide.from_text} → {activeRide.to_text}</b></div>)}
      <div id="recaptcha-container"></div>
    </div>
  )
      }
