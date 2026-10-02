import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient.js'

export default function App(){
  const [user,setUser]=useState(null)
  const [role,setRole]=useState(localStorage.getItem('role')||'client')
  const [tab,setTab]=useState('request')
  const [rides,setRides]=useState([])
  const [from,setFrom]=useState('كفر الشيخ')
  const [to,setTo]=useState('القاهرة')
  const [cat,setCat]=useState('اقتصادي')
  const [price,setPrice]=useState(325)
  const [pay,setPay]=useState('XPay')
  const [msgs,setMsgs]=useState([])
  const [newMsg,setNewMsg]=useState('')
  const [activeRide,setActiveRide]=useState(null)

  // بيانات الكابتن الجديدة
  const [driverProfile,setDriverProfile]=useState(JSON.parse(localStorage.getItem('driverProfile')||'{}'))

  const saveDriverProfile = (k,v)=>{
    const np={...driverProfile,[k]:v}
    setDriverProfile(np)
    localStorage.setItem('driverProfile',JSON.stringify(np))
  }

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>setUser(data.user))
    const {data:listener}=supabase.auth.onAuthStateChange((e,u)=>setUser(u))
    return ()=>listener.subscription.unsubscribe()
  },[])

  useEffect(()=>{ if(user) loadRides() },[user,role])
  useEffect(()=>{ if(activeRide) getMsgs(activeRide.id) },[activeRide])

  const loadRides=async()=>{
    const {data}=await supabase.from('rides').select('*').order('created_at',{ascending:false})
    if(data){ setRides(data); if(data[0]) setActiveRide(data[0]) }
  }

  const requestRide=async()=>{
    if(!user) return alert('سجل دخول أولا')
    const {data,error}=await supabase.from('rides').insert({
      client_id:user.id, from_text:from, to_text:to, category:cat,
      price:price, payment_method:pay, status:'يبحث عن كابتن',
      driver_name: driverProfile.driverName || null,
      car_type: driverProfile.carType || null
    }).select().single()
    if(error) alert(error.message)
    else { setTab('tracking'); loadRides() }
  }

  const acceptRide=async(ride)=>{
    const {error}=await supabase.from('rides').update({
      status:'الكابتن في الطريق', driver_id:user.id,
      driver_name: driverProfile.driverName || user.email,
      car_type: driverProfile.carType,
      car_color: driverProfile.carColor,
      plate_letters: driverProfile.plateLetters,
      plate_numbers: driverProfile.plateNumbers
    }).eq('id',ride.id)
    if(!error) loadRides()
  }

  const setStatus=async(s)=>{
    if(!activeRide) return
    await supabase.from('rides').update({status:s}).eq('id',activeRide.id)
    loadRides()
  }

  const getMsgs=async(rideId)=>{
    const {data}=await supabase.from('ride_messages').select('*').eq('ride_id',rideId).order('created_at')
    if(data) setMsgs(data)
  }

  const sendMsg=async()=>{
    if(!newMsg ||!activeRide) return
    await supabase.from('ride_messages').insert({ride_id:activeRide.id,sender:user.id,message:newMsg})
    setNewMsg(''); getMsgs(activeRide.id)
  }

  if(!user) return (
    <div style={{padding:20,textAlign:'center'}}>
      <h1>ONdrive Egypt 🚗</h1>
      <button onClick={()=>supabase.auth.signInWithOAuth({provider:'google'})} style={{padding:12,background:'black',color:'white'}}>دخول بجوجل</button>
    </div>
  )

  return (
    <div style={{padding:10,maxWidth:500,margin:'auto',fontFamily:'Arial'}}>
      <h1 style={{textAlign:'center'}}>ONdrive Egypt 🚗</h1>
      <div style={{display:'flex',gap:5,justifyContent:'center'}}>
        <button onClick={()=>{setRole('client');localStorage.setItem('role','client')}} style={{background:role==='client'?'black':'white',color:role==='client'?'white':'black'}}>عميل</button>
        <button onClick={()=>{setRole('driver');localStorage.setItem('role','driver')}} style={{background:role==='driver'?'black':'white',color:role==='driver'?'white':'black'}}>كابتن</button>
        <button onClick={()=>supabase.auth.signOut()}>خروج</button>
      </div>
      <div style={{display:'flex',gap:5,marginTop:10}}>
        <button onClick={()=>setTab('request')} style={{background:tab==='request'?'#7c3aed':'white',flex:1}}>طلب</button>
        <button onClick={()=>setTab('tracking')} style={{background:tab==='tracking'?'#7c3aed':'white',flex:1}}>تتبع</button>
        <button onClick={()=>setTab('chat')} style={{background:tab==='chat'?'#7c3aed':'white',flex:1}}>شات</button>
        <button onClick={()=>setTab('wallet')} style={{background:tab==='wallet'?'#7c3aed':'white',flex:1}}>محفظة</button>
      </div>

      {tab==='request' && role==='client' && (
        <div style={{marginTop:15}}>
          من: <input value={from} onChange={e=>setFrom(e.target.value)} style={{width:'100%'}}/><br/><br/>
          إلى: <input value={to} onChange={e=>setTo(e.target.value)} style={{width:'100%'}}/><br/><br/>
          الفئة:
          <button onClick={()=>{setCat('اقتصادي');setPrice(300)}}>اقتصادي 300ج</button>
          <button onClick={()=>{setCat('كمفورت');setPrice(450)}}>كمفورت 450ج</button>
          <button onClick={()=>{setCat('بيزنس');setPrice(700)}}>بيزنس 700ج</button><br/><br/>
          الدفع: <select value={pay} onChange={e=>setPay(e.target.value)}><option>XPay</option><option>كاش</option></select><br/><br/>
          <div style={{height:200,background:'#e5e7eb',display:'flex',alignItems:'center',justifyContent:'center'}}>خريطة {from} → {to}</div><br/>
          السعر: {price} جنيه<br/><br/>
          <button onClick={requestRide} style={{width:'100%',padding:15,background:'black',color:'white',fontSize:18}}>اطلب الآن</button>
        </div>
      )}

      {role==='driver' && (
        <div style={{marginTop:15,border:'1px solid #ccc',padding:10}}>
          <h3>الكابتن - المستندات</h3>
          اسم الكابتن: <input value={driverProfile.driverName||''} onChange={e=>saveDriverProfile('driverName',e.target.value)} placeholder="الاسم ثلاثي" style={{width:'100%'}}/><br/><br/>
          نوع السيارة: <input value={driverProfile.carType||''} onChange={e=>saveDriverProfile('carType',e.target.value)} placeholder="مثال: تويوتا كورولا 2020" style={{width:'100%'}}/><br/>
          لون السيارة: <input value={driverProfile.carColor||''} onChange={e=>saveDriverProfile('carColor',e.target.value)} placeholder="أبيض" style={{width:'100%'}}/><br/>
          حروف اللوحة: <input value={driverProfile.plateLetters||''} onChange={e=>saveDriverProfile('plateLetters',e.target.value)} placeholder="أ ب ج" style={{width:'100%'}}/><br/>
          أرقام اللوحة: <input value={driverProfile.plateNumbers||''} onChange={e=>saveDriverProfile('plateNumbers',e.target.value)} placeholder="1234" style={{width:'100%'}}/><br/><br/>

          بطاقة وش: <input type="file" onChange={e=>saveDriverProfile('idFront',e.target.files[0]?.name)}/> {driverProfile.idFront||''}<br/>
          بطاقة ضهر (الصلاحية): <input type="file" onChange={e=>saveDriverProfile('idBack',e.target.files[0]?.name)}/> {driverProfile.idBack||''}<br/><br/>
          رخصة قيادة وش: <input type="file" onChange={e=>saveDriverProfile('licenseFront',e.target.files[0]?.name)}/> {driverProfile.licenseFront||''}<br/>
          رخصة قيادة ضهر: <input type="file" onChange={e=>saveDriverProfile('licenseBack',e.target.files[0]?.name)}/> {driverProfile.licenseBack||''}<br/><br/>
          رخصة سيارة وش: <input type="file" onChange={e=>saveDriverProfile('carLicenseFront',e.target.files[0]?.name)}/> {driverProfile.carLicenseFront||''}<br/>
          رخصة سيارة ضهر: <input type="file" onChange={e=>saveDriverProfile('carLicenseBack',e.target.files[0]?.name)}/> {driverProfile.carLicenseBack||''}<br/><br/>
          صورة العربية وش: <input type="file" onChange={e=>saveDriverProfile('carFront',e.target.files[0]?.name)}/> {driverProfile.carFront||''}<br/>
          صورة العربية ضهر: <input type="file" onChange={e=>saveDriverProfile('carBack',e.target.files[0]?.name)}/> {driverProfile.carBack||''}<br/><br/>

          <label><input type="checkbox" checked/> أونلاين</label>
          <h4 style={{marginTop:15}}>الرحلات القريبة</h4>
          {rides.filter(r=>r.status==='يبحث عن كابتن').map(r=>(
            <div key={r.id} style={{border:'1px solid #ccc',padding:8,marginBottom:5}}>
              {r.from_text} → {r.to_text} - {r.price}ج
              <button onClick={()=>acceptRide(r)} style={{marginLeft:5}}>قبول</button>
            </div>
          ))}
        </div>
      )}

      {tab==='tracking' && activeRide && (
        <div style={{marginTop:15}}>
          <h3>تتبع الرحلة</h3>
          {activeRide.from_text} → {activeRide.to_text}<br/>
          الحالة: <b>{activeRide.status}</b><br/>
          {activeRide.price}ج | {activeRide.category} | {activeRide.payment_method}<br/><br/>
          {activeRide.driver_name && (
            <div style={{background:'#f3f4f6',padding:10,borderRadius:8}}>
              <b>بيانات الكابتن:</b><br/>
              الاسم: {activeRide.driver_name}<br/>
              السيارة: {activeRide.car_type} - {activeRide.car_color}<br/>
              اللوحة: {activeRide.plate_letters} {activeRide.plate_numbers}<br/>
            </div>
          )}
          <br/>
          <button onClick={()=>setStatus('وصلت')}>وصلت</button>
          <button onClick={()=>setStatus('بدأت')}>بدأت</button>
          <button onClick={()=>setStatus('تم الوصول')}>تم الوصول</button>
        </div>
      )}

      {tab==='chat' && activeRide && (
        <div style={{marginTop:15}}>
          <h3>شات الرحلة</h3>
          <div style={{border:'1px solid #ccc',height:200,overflow:'auto',padding:5}}>
            {msgs.map(m=><div key={m.id}><b>{m.sender===user.id?'انت':'الطرف الاخر'}:</b> {m.message}</div>)}
          </div>
          <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} style={{width:'70%'}}/>
          <button onClick={sendMsg}>ارسال</button>
        </div>
      )}
    </div>
  )
}
