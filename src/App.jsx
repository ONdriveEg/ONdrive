import { supabase } from './supabaseClient.js'
import { useState, useEffect } from 'react'
const cats = { 'اقتصادي': 300, 'كمفورت': 450, 'بيزنس': 700 }
export default function App(){
  const [user,setUser]=useState(null)
  const [tab,setTab]=useState('طلب')
  const [role,setRole]=useState('client')
  const [from,setFrom]=useState('كفر الشيخ')
  const [to,setTo]=useState('القاهرة')
  const [cat,setCat]=useState('اقتصادي')
  const [pay,setPay]=useState('كاش')
  const [rides,setRides]=useState([])
  const [cur,setCur]=useState(null)
  const [msgs,setMsgs]=useState([])
  const [txt,setTxt]=useState('')
  const [online,setOnline]=useState(false)
  const [auto,setAuto]=useState(false)
  useEffect(()=>{
    supabase.auth.getSession().then(r=>setUser(r.data.session?.user))
    supabase.auth.onAuthStateChange((_,s)=>setUser(s?.user))
  },[])
  useEffect(()=>{ if(user) loadRides() },[user])
  const loadRides = async()=>{
    const {data}=await supabase.from('rides').select('*').order('created_at',{ascending:false}).limit(20)
    setRides(data||[]); if(data?.[0] &&!cur) setCur(data[0])
  }
  const price = cats[cat] + 25
  const request = async()=>{
    const {data}=await supabase.from('rides').insert({client_id:user.id, from_text:from, to_text:to, category:cat, price, payment_method:pay, status:'يبحث عن كابتن'}).select().single()
    setCur(data); setTab('تتبع'); loadRides()
  }
  const accept = async(r)=>{
    await supabase.from('rides').update({driver_id:user.id, status:'الكابتن في الطريق'}).eq('id',r.id)
    setCur({...r, status:'الكابتن في الطريق'}); loadRides()
  }
  const setStatus = async(s)=>{
    await supabase.from('rides').update({status:s}).eq('id',cur.id)
    setCur({...cur, status:s})
  }
  const send = async()=>{
    if(!txt ||!cur) return
    await supabase.from('ride_messages').insert({ride_id:cur.id, sender:user.id, message:txt})
    setTxt(''); getMsgs()
  }
  const getMsgs = async()=>{
    if(!cur) return
    const {data}=await supabase.from('ride_messages').select('*').eq('ride_id',cur.id).order('created_at')
    setMsgs(data||[])
  }
  useEffect(()=>{ getMsgs(); const i=setInterval(getMsgs,2000); return ()=>clearInterval(i)},[cur])
  if(!user) return <div style={{padding:50,textAlign:'center'}}><h1>ONdrive Egypt 🚗</h1><button onClick={()=>supabase.auth.signInWithOAuth({provider:'github',options:{redirectTo:window.location.origin}})}>دخول عميل / كابتن</button></div>
  return (
    <div style={{maxWidth:480,margin:'auto',padding:10,fontFamily:'system-ui'}}>
      <h2 style={{textAlign:'center'}}>ONdrive Egypt 🚗</h2>
      <div style={{display:'flex',gap:5,justifyContent:'center',marginBottom:10}}>
        <button onClick={()=>setRole('client')} style={{background:role==='client'?'black':'#eee',color:role==='client'?'white':'black'}}>عميل</button>
        <button onClick={()=>setRole('driver')} style={{background:role==='driver'?'black':'#eee',color:role==='driver'?'white':'black'}}>كابتن</button>
        <button onClick={()=>supabase.auth.signOut()}>خروج</button>
      </div>
      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
        {['طلب','تتبع','شات','محفظة'].map(t=> <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:8,background:tab===t?'#7c3aed':'#f3f3f3',color:tab===t?'white':'black'}}>{t}</button>)}
      </div>
      {role==='client' && tab==='طلب' && (
        <div>
          <p>من: <input value={from} onChange={e=>setFrom(e.target.value)} style={{width:'100%'}}/></p>
          <p>إلى: <input value={to} onChange={e=>setTo(e.target.value)} style={{width:'100%'}}/></p>
          <p>الفئة: {Object.keys(cats).map(c=><button key={c} onClick={()=>setCat(c)} style={{margin:3,background:cat===c?'black':'#ddd',color:cat===c?'white':'black'}}>{c} {cats[c]}ج</button>)}</p>
          <p>الدفع: <select value={pay} onChange={e=>setPay(e.target.value)}><option>كاش</option><option>محفظة</option><option>XPay</option></select></p>
          <div style={{border:'1px solid #ccc',height:180,margin:'10px 0'}}><iframe width="100%" height="180" src="https://www.openstreetmap.org/export/embed.html?bbox=30.5%2C30.0%2C32.0%2C31.5&layer=mapnik"></iframe></div>
          <h3>السعر: {price} جنيه</h3>
          <button onClick={request} style={{width:'100%',padding:15,background:'black',color:'white',fontSize:18}}>اطلب الآن</button>
        </div>
      )}
      {role==='driver' && tab==='طلب' && (
        <div>
          <h3>الكابتن - المستندات</h3>
          <input type="file" /> بطاقة<br/><br/><input type="file" /> رخصة<br/><br/>
          <label><input type="checkbox" checked={online} onChange={e=>setOnline(e.target.checked)}/> أونلاين</label>
          <label style={{marginLeft:20}}><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/> قبول تلقائي</label>
          <h4>الرحلات القريبة</h4>
          {rides.filter(r=>r.status==='يبحث عن كابتن').map(r=><div key={r.id} style={{border:'1px solid #ddd',padding:8,margin:5}}>{r.from_text} → {r.to_text} - {r.price}ج - {r.payment_method}<br/><button onClick={()=>accept(r)}>قبول</button> <button>رفض</button></div>)}
        </div>
      )}
      {tab==='تتبع' && cur && (
        <div><h3>تتبع الرحلة</h3><p>{cur.from_text} → {cur.to_text}</p><p>الحالة: <b>{cur.status}</b></p><p>{cur.category} | {cur.price}ج | {cur.payment_method}</p><div style={{display:'flex',gap:5}}><button onClick={()=>setStatus('وصل الكابتن')}>وصلت</button><button onClick={()=>setStatus('الرحلة بدأت')}>بدأت</button><button onClick={()=>setStatus('تم الوصول')}>تم الوصول</button></div></div>
      )}
      {tab==='شات' && cur && (
        <div><h3>شات</h3><div style={{border:'1px solid #ccc',height:250,overflowY:'auto',padding:5}}>{msgs.map(m=><div key={m.id} style={{textAlign:m.sender===user.id?'right':'left',margin:5}}><span style={{background:m.sender===user.id?'#000':'#eee',color:m.sender===user.id?'#fff':'#000',padding:'5px 10px',borderRadius:10}}>{m.message}</span></div>)}</div><div style={{display:'flex'}}><input value={txt} onChange={e=>setTxt(e.target.value)} style={{flex:1}}/><button onClick={send}>ارسال</button></div></div>
      )}
      {tab==='محفظة' && (<div><h3>المحفظة والتقييم</h3><p>رصيدك: 500ج</p><button>شحن بـ XPay</button><hr/>⭐️⭐️⭐️⭐️⭐️<br/><input placeholder="تعليق" style={{width:'100%'}}/><button style={{marginTop:10,width:'100%',background:'black',color:'white',padding:10}}>ارسال التقييم</button></div>)}
    </div>
  )
}
