import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient.js'

export default function App(){
  const [user,setUser]=useState(null)
  const [phone,setPhone]=useState('')
  const [otp,setOtp]=useState('')
  const [step,setStep]=useState('phone')
  const [role,setRole]=useState(localStorage.getItem('role')||'client')
  const [tab,setTab]=useState('request')
  const [rides,setRides]=useState([])
  const [from,setFrom]=useState('كفر الشيخ')
  const [to,setTo]=useState('القاهرة')
  const [price,setPrice]=useState(325)
  const [activeRide,setActiveRide]=useState(null)
  const [driverProfile,setDriverProfile]=useState(JSON.parse(localStorage.getItem('driverProfile')||'{}'))

  const saveDriver = (k,v)=>{
    const n={...driverProfile,[k]:v};
    setDriverProfile(n);
    localStorage.setItem('driverProfile',JSON.stringify(n))
  }

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>setUser(data.user))
  },[])

  useEffect(()=>{ if(user) loadRides() },[user])

  // ✅ الكود الجديد - بيكلم الواتساب الرسمي
  const sendCode = async()=>{
    if(phone.length<11) return alert('اكتب رقم صحيح 01xxxxxxxxx')
    // نظبط الرقم ل +20
    const fullPhone = phone.startsWith('0')? '+20'+phone.slice(1) : '+2'+phone

    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: { phone: fullPhone }
    })

    if(error) {
      alert('خطأ: ' + error.message)
      console.log(error)
    } else {
      alert('تم ارسال الكود على واتساب: ' + fullPhone)
      setStep('otp')
    }
  }

  // ✅ التحقق الجديد
  const verifyCode = async()=>{
    if(otp.length < 4) return alert('اكتب الكود 4 أرقام')
    const fullPhone = phone.startsWith('0')? '+20'+phone.slice(1) : '+2'+phone

    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { phone: fullPhone, code: otp }
    })

    if(error ||!data?.valid){
      return alert('كود خطأ: ' + (error?.message || 'الكود غير صحيح'))
    }

    // بعد ما الكود صح - نعمل دخول وهمي بالايميل
    const email = phone+'@ondrive.eg'
    const pass = '123456'

    const { data: signInData } = await supabase.auth.signInWithPassword({email, password: pass})
    if(signInData?.user) {
      setUser(signInData.user)
    } else {
      const { data: signUp } = await supabase.auth.signUp({
        email, password: pass,
        options:{data:{phone:phone}}
      })
      if(signUp.user) setUser(signUp.user)
      else setUser({id: 'test-'+phone, email: phone})
    }
  }

  const loadRides=async()=>{
    const {data}=await supabase.from('rides').select('*').order('created_at',{ascending:false})
    if(data){ setRides(data); if(data[0]) setActiveRide(data[0]) }
  }

  const requestRide=async()=>{
    const {data}=await supabase.from('rides').insert({
      client_id:user.id, from_text:from, to_text:to, price:price,
      status:'يبحث عن كابتن', driver_name: driverProfile.driverName
    }).select().single()
    if(data){ setTab('tracking'); loadRides() }
  }

  if(!user) return (
    <div style={{padding:20,maxWidth:400,margin:'auto',textAlign:'center',fontFamily:'Arial'}}>
      <h1>ONdrive Egypt 🚗</h1>
      {step==='phone'? <>
        <p>ادخل رقم تليفونك</p>
        <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="01xxxxxxxxx" style={{width:'100%',padding:12,fontSize:18,textAlign:'center'}}/>
        <br/><br/>
        <button onClick={sendCode} style={{width:'100%',padding:15,background:'black',color:'white',fontSize:18}}>ارسال كود التحقق</button>
      </> : <>
        <p>دخل كود التحقق اللي وصلك على واتساب {phone}</p>
        <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="****" style={{width:'100%',padding:12,fontSize:22,textAlign:'center',letterSpacing:5}}/>
        <br/><br/>
        <button onClick={verifyCode} style={{width:'100%',padding:15,background:'black',color:'white',fontSize:18}}>تأكيد ودخول</button>
        <br/><br/>
        <button onClick={()=>setStep('phone')}>تغيير الرقم</button>
      </>}
      <p style={{marginTop:20,color:'#666',fontSize:14}}>سيصلك كود التحقق على واتساب فوراً 📲</p>
    </div>
  )

  //... باقي الكود بتاع الطلبات زي ما هو...
  return (
    <div style={{padding:10,maxWidth:500,margin:'auto',fontFamily:'Arial'}}>
      <h2 style={{textAlign:'center'}}>ONdrive - {phone}</h2>
      <div style={{display:'flex',gap:5,justifyContent:'center'}}>
        <button onClick={()=>{setRole('client');localStorage.setItem('role','client')}} style={{background:role==='client'?'black':'white',color:role==='client'?'white':'black'}}>عميل</button>
        <button onClick={()=>{setRole('driver');localStorage.setItem('role','driver')}} style={{background:role==='driver'?'black':'white',color:role==='driver'?'white':'black'}}>كابتن</button>
        <button onClick={async()=>{await supabase.auth.signOut(); setUser(null)}}>خروج</button>
      </div>
      {role==='driver' && (
        <div style={{marginTop:15,border:'1px solid #ccc',padding:10}}>
          <h3>مستندات الكابتن (مطلوبة)</h3>
          اسم الكابتن: <input value={driverProfile.driverName||''} onChange={e=>saveDriver('driverName',e.target.value)} style={{width:'100%'}} placeholder="الاسم ثلاثي"/><br/>
          نوع العربية: <input value={driverProfile.carType||''} onChange={e=>saveDriver('carType',e.target.value)} style={{width:'100%'}} placeholder="تويوتا كورولا 2020"/><br/>
          اللون: <input value={driverProfile.carColor||''} onChange={e=>saveDriver('carColor',e.target.value)} style={{width:'100%'}} placeholder="أبيض"/><br/>
          حروف اللوحة: <input value={driverProfile.plateLetters||''} onChange={e=>saveDriver('plateLetters',e.target.value)} style={{width:'100%'}} placeholder="أ ب ج"/><br/>
          ارقام اللوحة: <input value={driverProfile.plateNumbers||''} onChange={e=>saveDriver('plateNumbers',e.target.value)} style={{width:'100%'}} placeholder="1234"/><br/><br/>
          <b>البطاقة:</b><br/> وش: <input type="file" onChange={e=>saveDriver('idFront',e.target.files[0]?.name)}/> {driverProfile.idFront}<br/> ضهر: <input type="file" onChange={e=>saveDriver('idBack',e.target.files[0]?.name)}/> {driverProfile.idBack}<br/><br/>
          <b>رخصة القيادة:</b><br/> وش: <input type="file" onChange={e=>saveDriver('licenseFront',e.target.files[0]?.name)}/> {driverProfile.licenseFront}<br/> ضهر: <input type="file" onChange={e=>saveDriver('licenseBack',e.target.files[0]?.name)}/> {driverProfile.licenseBack}<br/><br/>
          <b>رخصة السيارة:</b><br/> وش: <input type="file" onChange={e=>saveDriver('carLicenseFront',e.target.files[0]?.name)}/> {driverProfile.carLicenseFront}<br/> ضهر: <input type="file" onChange={e=>saveDriver('carLicenseBack',e.target.files[0]?.name)}/> {driverProfile.carLicenseBack}<br/><br/>
          <b>صور السيارة:</b><br/> وش: <input type="file" onChange={e=>saveDriver('carFront',e.target.files[0]?.name)}/> {driverProfile.carFront}<br/> ضهر: <input type="file" onChange={e=>saveDriver('carBack',e.target.files[0]?.name)}/> {driverProfile.carBack}<br/>
        </div>
      )}
      {role==='client' && tab==='request' && (
        <div style={{marginTop:15}}>
          من: <input value={from} onChange={e=>setFrom(e.target.value)} style={{width:'100%'}}/><br/><br/>
          إلى: <input value={to} onChange={e=>setTo(e.target.value)} style={{width:'100%'}}/><br/><br/>
          السعر {price}ج<br/><br/>
          <button onClick={requestRide} style={{width:'100%',padding:15,background:'black',color:'white'}}>اطلب الآن - برقم {phone}</button>
        </div>
      )}
      {activeRide && (
        <div style={{marginTop:15,background:'#f3f4f6',padding:10}}>
          <b>{activeRide.from_text} → {activeRide.to_text}</b><br/>
          {activeRide.driver_name && <>الكابتن: {activeRide.driver_name} - {driverProfile.carType} {driverProfile.carColor} - {driverProfile.plateLetters} {driverProfile.plateNumbers}</>}
        </div>
      )}
    </div>
  )
}
