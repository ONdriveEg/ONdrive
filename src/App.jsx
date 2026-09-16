import { supabase } from './supabaseClient.js'
import { useState, useEffect } from 'react'

export default function App() {
  const [user, setUser] = useState(null)
  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setUser(data.session?.user))
    const {data: l} = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user))
    return () => l.subscription.unsubscribe()
  }, [])
  const login = () => supabase.auth.signInWithOAuth({provider: 'github', options: {redirectTo: window.location.origin}})
  const logout = () => supabase.auth.signOut()
  return (
    <div style={{textAlign:'center',padding:'50px'}}>
      <h1>ONdrive Egypt 🚗</h1>
      {user ? <><p>{user.email}</p><button onClick={logout}>خروج</button></> : <button onClick={login}>دخول بـ GitHub</button>}
    </div>
  )
}
