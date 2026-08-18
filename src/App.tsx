import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// Supabase Client
const sb = createClient(
  'https://wdvmxjokidsjvxapoazc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indkdm14am9raWRzanZ4YXBvYXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTQzNjQsImV4cCI6MjEwMDk3MDM2NH0.3j6TNh489JSUhItLCUJFJpTm7ImXvCjE_7-3Rc4UTxQ'
)

/* ── Paleta de Cores e Estilos Globais ── */
const P = {
  violet: '#8b5cf6',
  pink: '#f43f5e',
  cyan: '#22d3ee',
  bg: '#07071a',
  surface: '#0f0f2a',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#e8e8ff',
  muted: 'rgba(232,232,255,0.45)',
}

const QUIZ = {
  filmes: ['Ação & Aventura', 'Comédia Romântica', 'Terror & Suspense', 'Animes & Animação', 'Ficção Científica', 'Séries & Maratona'],
  comidas: ['Pizza 🍕', 'Japonesa & Sushi 🍣', 'Hambúrguer Artesanal 🍔', 'Massa & Italiano 🍝', 'Comida Caseira 🍲', 'Doces & Açaí 🧁'],
  dates: ['Jantar Romântico 🕯️', 'Piquenique ao Ar Livre 🌿', 'Cinema & Pipoca 🎬', 'Passeio na Praia 🌅', 'Jogar em Casa 🎮', 'Viajar no FDS ✈️'],
}

const TABS = [
  { id: 'match', icon: '✦', label: 'Match' },
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'filmes', icon: '🎬', label: 'Filmes' },
  { id: 'comidas', icon: '🍕', label: 'Comidas' },
  { id: 'dates', icon: '✨', label: 'Dates' },
  { id: 'par', icon: '🔗', label: 'Nosso Par' },
]

interface Prefs { filmes: string[]; comidas: string[]; dates: string[] }
interface Msg { remetente: string; nome_remetente: string; mensagem: string; created_at: string }

export default function App() {
  const [screen, setScreen] = useState<'auth' | 'quiz' | 'app'>('auth')
  const [authMode, setAuthMode] = useState<'login' | 'cadastro' | 'esqueci'>('login')

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [nome, setNome] = useState('')

  const [nomeUsuario, setNomeUsuario] = useState('')
  const [codigoCasal, setCodigoCasal] = useState(() => localStorage.getItem('codigoCasal') || '')
  const [codigoInput, setCodigoInput] = useState('')
  const [nomeParceiro, setNomeParceiro] = useState('')
  const [prefsParceiro, setPrefsParceiro] = useState<Prefs | null>(null)

  const [myPrefs, setMyPrefs] = useState<Prefs>({ filmes: [], comidas: [], dates: [] })
  const [aba, setAba] = useState('match')
  const [unreadCount, setUnreadCount] = useState(0)

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [newMsg, setNewMsg] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ text: string; ok?: boolean } | null>(null)

  const showToast = (text: string, ok = true) => {
    setToast({ text, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const mudarAba = (idAba: string) => {
    setAba(idAba)
    if (idAba === 'chat') {
      setUnreadCount(0)
    }
  }

  /* ── Autenticação ── */
  const auth = async () => {
    const em = email.trim().toLowerCase()
    if (!em) return showToast('Preencha o e-mail!', false)

    if (authMode === 'esqueci') {
      if (!novaSenha.trim()) return showToast('Digite a nova senha!', false)
      setLoading(true)
      const { data, error } = await sb.from('Usuarios').update({ senha: novaSenha.trim() }).ilike('email', em).select()
      setLoading(false)
      if (error || !data?.length) return showToast('E-mail não encontrado!', false)
      showToast('Senha alterada! Faça login.')
      setAuthMode('login'); setSenha(''); setNovaSenha('')
      return
    }

    if (!senha.trim()) return showToast('Preencha a senha!', false)
    setLoading(true)

    if (authMode === 'cadastro') {
      if (!nome.trim()) { setLoading(false); return showToast('Digite seu nome!', false) }
      const { error } = await sb.from('Usuarios').insert([{ nome: nome.trim(), email: em, senha: senha.trim() }])
      setLoading(false)
      if (error) return showToast(`Erro: ${error.message}`, false)
      setNomeUsuario(nome.trim())
      setScreen('quiz')
    } else {
      const { data, error } = await sb.from('Usuarios').select('*').ilike('email', em).eq('senha', senha.trim()).maybeSingle()
      setLoading(false)
      if (error || !data) return showToast('E-mail ou senha incorretos!', false)
      setNomeUsuario(data.nome)
      if (data.preferencias) {
        const p = typeof data.preferencias === 'string' ? JSON.parse(data.preferencias) : data.preferencias
        setMyPrefs(p)
        setScreen('app')
      } else {
        setScreen('quiz')
      }
    }
  }

  const salvarQuiz = async () => {
    if (!myPrefs.filmes.length || !myPrefs.comidas.length || !myPrefs.dates.length)
      return showToast('Selecione pelo menos 1 em cada categoria!', false)
    const em = email.trim().toLowerCase()
    const { error } = await sb.from('Usuarios').update({ preferencias: JSON.stringify(myPrefs) }).ilike('email', em)
    if (error) return showToast('Erro ao salvar!', false)
    setScreen('app')
    showToast('Perfil salvo! 🌟')
  }

  const toggleAndSave = async (item: string, key: keyof Prefs) => {
    const currentList = myPrefs[key]
    const updatedList = currentList.includes(item)
      ? currentList.filter(x => x !== item)
      : [...currentList, item]

    const updatedPrefs = { ...myPrefs, [key]: updatedList }
    setMyPrefs(updatedPrefs)

    const em = email.trim().toLowerCase()
    if (em && screen === 'app') {
      await sb.from('Usuarios').update({ preferencias: JSON.stringify(updatedPrefs) }).ilike('email', em)
    }
  }

  /* ── Casal & Realtime ── */
  const gerarCodigo = async () => {
    const rawCode = 'AMOR-' + Math.floor(1000 + Math.random() * 9000)
    const { error } = await sb.from('App_Casal').insert([
      { 
        codigo_casal: rawCode, 
        pref1: { email: email.trim().toLowerCase() } 
      }
    ])
    if (error) return showToast('Erro ao criar código.', false)
    
    const linkCompleto = `${window.location.origin}?codigo=${rawCode}`
    setCodigoCasal(linkCompleto)
    localStorage.setItem('codigoCasal', linkCompleto)
    showToast(`Link gerado com sucesso! 🗝️`)
  }

  const desconectar = () => {
    setCodigoCasal('')
    setCodigoInput('')
    setNomeParceiro('')
    setPrefsParceiro(null)
    localStorage.removeItem('codigoCasal')
    showToast('Código desvinculado!')
  }

  const extrairCodigo = (str: string) => {
    if (str.includes('?codigo=')) {
      return str.split('?codigo=')[1]?.trim() || str.trim()
    }
    return str.trim()
  }

  const vincular = async () => {
    const c = extrairCodigo(codigoInput)
    const em = email.trim().toLowerCase()
    if (!c) return showToast('Digite ou cole o link!', false)
    
    const { data: casal, error } = await sb.from('App_Casal').select('*').eq('codigo_casal', c).maybeSingle()
    if (error || !casal) return showToast('Código inválido!', false)
    
    if (!casal.pref2 || casal.pref2.email !== em) {
      const { error: updateErr } = await sb
        .from('App_Casal')
        .update({ pref2: { email: em } })
        .eq('codigo_casal', c)

      if (updateErr) return showToast('Erro ao salvar conexão!', false)
    }
    
    const linkCompleto = `${window.location.origin}?codigo=${c}`
    setCodigoCasal(linkCompleto)
    localStorage.setItem('codigoCasal', linkCompleto)
    await carregarPar(c)
    showToast('Conectados com sucesso! 🎉')
  }

  const carregarPar = async (codOuLink: string) => {
    const c = extrairCodigo(codOuLink)
    const em = email.trim().toLowerCase()
    const { data: casal } = await sb.from('App_Casal').select('*').eq('codigo_casal', c).maybeSingle()
    if (!casal) return
    
    const email1 = casal.pref1?.email
    const email2 = casal.pref2?.email
    const emailPar = email1 === em ? email2 : email1
    
    if (!emailPar) return
    const { data: par } = await sb.from('Usuarios').select('*').ilike('email', emailPar).maybeSingle()
    if (par) {
      setNomeParceiro(par.nome)
      if (par.preferencias) {
        const p = typeof par.preferencias === 'string' ? JSON.parse(par.preferencias) : par.preferencias
        setPrefsParceiro(p)
      }
    }
    carregarMsgs(c)
  }

  const carregarMsgs = async (codOuLink: string) => {
    const c = extrairCodigo(codOuLink)
    const { data } = await sb.from('App_Mensagens').select('*').eq('codigo_casal', c).order('created_at', { ascending: true })
    if (data) setMsgs(data)
  }

  const enviar = async () => {
    const c = extrairCodigo(codigoCasal)
    if (!newMsg.trim() || !c) return
    const txt = newMsg.trim(); setNewMsg('')
    const { error } = await sb.from('App_Mensagens').insert([{
      codigo_casal: c, remetente: email.trim().toLowerCase(),
      nome_remetente: nomeUsuario, mensagem: txt
    }])
    if (error) showToast('Erro ao enviar!', false)
    else carregarMsgs(c)
  }

  useEffect(() => {
    if (codigoCasal && email) carregarPar(codigoCasal)
  }, [codigoCasal, email])

  useEffect(() => {
    const c = extrairCodigo(codigoCasal)
    if (!c) return

    carregarPar(c)

    const ch = sb.channel('rt_casal_' + c)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'App_Casal', 
        filter: `codigo_casal=eq.${c}` 
      }, () => carregarPar(c))
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'App_Mensagens', 
        filter: `codigo_casal=eq.${c}` 
      }, (payload) => {
        const novaMsg = payload.new as Msg
        setMsgs(prev => [...prev, novaMsg])
        
        if (novaMsg.remetente !== email.trim().toLowerCase() && aba !== 'chat') {
          setUnreadCount(prev => prev + 1)
        }
      })
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [codigoCasal, email, aba])

  useEffect(() => {
    if (aba === 'chat' && chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [msgs, aba])

  const matches = (mine: string[], theirs: string[] | undefined) =>
    mine.filter(x => theirs?.includes(x))

  /* ── Interface ── */
  return (
    <div style={{ fontFamily: 'Outfit, sans-serif', minHeight: '100vh', background: P.bg, color: P.text, overflow: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; }
        ::placeholder { color: rgba(232,232,255,0.3); }
        input:focus { outline: none; }
        ::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,63,94,0.14) 0%, transparent 70%)' }} />
      </div>

      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 999,
          background: toast.ok ? 'rgba(139,92,246,0.9)' : 'rgba(244,63,94,0.9)',
          backdropFilter: 'blur(20px)', borderRadius: 40, padding: '10px 22px',
          color: '#fff', fontSize: '0.88rem', fontWeight: 700, animation: 'slideUp 0.2s ease',
        }}>{toast.text}</div>
      )}

      {/* Tela de Login / Cadastro */}
      {screen === 'auth' && (
        <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 20, marginBottom: 16, background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(244,63,94,0.3))', border: '1px solid rgba(139,92,246,0.4)', fontSize: '1.8rem' }}>🎬</div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, letterSpacing: '-1px', background: `linear-gradient(135deg, ${P.violet}, ${P.pink})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Cine & Dates</h1>
              <p style={{ color: P.muted, marginTop: 6, fontSize: '0.9rem' }}>O app do casal perfeito</p>
            </div>

            <div style={{ background: P.card, backdropFilter: 'blur(24px)', border: `1px solid ${P.border}`, borderRadius: 28, padding: '28px 24px' }}>
              {authMode !== 'esqueci' && (
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, marginBottom: 24, gap: 4 }}>
                  {(['login', 'cadastro'] as const).map(m => (
                    <button key={m} onClick={() => setAuthMode(m)} style={{
                      flex: 1, padding: '9px', borderRadius: 11, border: 'none', cursor: 'pointer',
                      fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem', fontWeight: 700,
                      background: authMode === m ? `linear-gradient(135deg, ${P.violet}, ${P.pink})` : 'transparent',
                      color: authMode === m ? '#fff' : P.muted,
                    }}>{m === 'login' ? 'Entrar' : 'Criar conta'}</button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {authMode === 'cadastro' && <AuthInput label="Seu nome" placeholder="Como te chamam?" value={nome} onChange={setNome} />}
                <AuthInput label="E-mail" type="email" placeholder="seu@email.com" value={email} onChange={setEmail} />
                {authMode !== 'esqueci' && <AuthInput label="Senha" type="password" placeholder="••••••••" value={senha} onChange={setSenha} onEnter={auth} />}
                {authMode === 'esqueci' && <AuthInput label="Nova senha" type="password" placeholder="Nova senha" value={novaSenha} onChange={setNovaSenha} onEnter={auth} />}
              </div>

              <GradBtn onClick={auth} loading={loading} style={{ marginTop: 20 }}>
                {loading ? '...' : authMode === 'login' ? 'Entrar 🚀' : authMode === 'cadastro' ? 'Criar conta & Quiz' : 'Redefinir senha'}
              </GradBtn>

              <div style={{ display: 'flex', justifyContent: authMode === 'login' ? 'space-between' : 'center', marginTop: 16 }}>
                {authMode === 'login' && <button onClick={() => setAuthMode('esqueci')} style={linkStyle}>Esqueci a senha</button>}
                {authMode === 'esqueci' && <button onClick={() => setAuthMode('login')} style={linkStyle}>← Voltar ao login</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz */}
      {screen === 'quiz' && (
        <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', padding: '28px 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: 480 }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <span style={{ fontSize: '2.5rem' }}>💜</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '8px 0 4px' }}>O que você curte?</h2>
              <p style={{ color: P.muted, fontSize: '0.88rem' }}>Escolha suas opções favoritas para dar o match!</p>
            </div>

            {(['filmes', 'comidas', 'dates'] as const).map(key => (
              <div key={key} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 24, padding: '20px', marginBottom: 14 }}>
                <p style={{ margin: '0 0 12px', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: P.violet }}>{key}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {QUIZ[key].map(item => {
                    const sel = myPrefs[key].includes(item)
                    return (
                      <button key={item} onClick={() => toggleAndSave(item, key)} style={{
                        padding: '8px 14px', borderRadius: 40, border: `1.5px solid ${sel ? P.violet : P.border}`,
                        background: sel ? `${P.violet}22` : 'transparent', color: sel ? P.violet : P.muted,
                        fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif'
                      }}>{item}</button>
                    )
                  })}
                </div>
              </div>
            ))}

            <GradBtn onClick={salvarQuiz} style={{ marginTop: 8 }}>Salvar e Entrar 🔥</GradBtn>
          </div>
        </div>
      )}

      {/* App Principal */}
      {screen === 'app' && (
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', minHeight: '100vh' }}>
          <main style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 100px', maxWidth: 640, width: '100%', margin: '0 auto' }}>
            
            {/* MATCH TAB */}
            {aba === 'match' && (
              <div style={{ animation: 'slideUp 0.25s ease' }}>
                <div style={{ borderRadius: 28, padding: '24px', background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(244,63,94,0.15))', border: `1px solid rgba(139,92,246,0.3)`, marginBottom: 20 }}>
                  <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: P.muted, textTransform: 'uppercase' }}>Status do Casal</p>
                  <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>{prefsParceiro ? `${nomeUsuario} & ${nomeParceiro}` : 'Sem par conectado'}</p>
                </div>

                {prefsParceiro && (['filmes', 'comidas', 'dates'] as const).map(key => {
                  const list = matches(myPrefs[key], prefsParceiro[key])
                  return (
                    <div key={key} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 24, padding: '18px', marginBottom: 14 }}>
                      <p style={{ margin: '0 0 12px', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: P.pink }}>{key}</p>
                      {list.length === 0 ? <p style={{ color: P.muted, fontSize: '0.83rem', margin: 0 }}>Nenhum match nessa categoria ainda.</p> : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {list.map(x => <span key={x} style={{ padding: '7px 14px', borderRadius: 40, background: `${P.pink}18`, border: `1px solid ${P.pink}44`, color: P.pink, fontSize: '0.82rem', fontWeight: 600 }}>✓ {x}</span>)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* CHAT TAB */}
            {aba === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', animation: 'slideUp 0.25s ease' }}>
                <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
                  {msgs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: P.muted, margin: 'auto', fontSize: '0.88rem' }}>
                      💬 Nenhuma mensagem ainda.<br />Mande um "Oi!" para seu amor.
                    </div>
                  ) : (
                    msgs.map((m, i) => {
                      const mine = m.remetente === email.trim().toLowerCase()
                      const dataHora = m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                          <span style={{ fontSize: '0.68rem', color: P.muted, marginBottom: 3, paddingLeft: mine ? 0 : 4, paddingRight: mine ? 4 : 0 }}>
                            {mine ? 'Você' : m.nome_remetente}
                          </span>
                          <div style={{
                            maxWidth: '82%',
                            padding: '10px 14px',
                            borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: mine ? `linear-gradient(135deg, ${P.violet}, ${P.pink})` : 'rgba(255,255,255,0.08)',
                            color: '#fff',
                            fontSize: '0.9rem',
                            lineHeight: 1.4,
                            boxShadow: mine ? '0 4px 14px rgba(139,92,246,0.25)' : 'none',
                            wordBreak: 'break-word'
                          }}>
                            {m.mensagem}
                            {dataHora && (
                              <div style={{ fontSize: '0.62rem', opacity: 0.7, textAlign: 'right', marginTop: 4 }}>
                                {dataHora}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {codigoCasal ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, background: 'rgba(15,15,42,0.8)', padding: 6, borderRadius: 20, border: `1px solid ${P.border}` }}>
                    <input 
                      value={newMsg} 
                      onChange={e => setNewMsg(e.target.value)} 
                      placeholder="Digite sua mensagem..." 
                      onKeyDown={e => e.key === 'Enter' && enviar()} 
                      style={{ flex: 1, padding: '12px 16px', background: 'transparent', border: 'none', color: P.text, fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem' }} 
                    />
                    <button 
                      onClick={enviar} 
                      style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${P.violet}, ${P.pink})`, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}
                    >
                      ➤
                    </button>
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: P.pink, fontSize: '0.82rem', marginTop: 12 }}>Conecte um par para habilitar o chat!</p>
                )}
              </div>
            )}

            {/* CATEGORIAS */}
            {(['filmes', 'comidas', 'dates'] as const).includes(aba as any) && (
              <div style={{ animation: 'slideUp 0.25s ease' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 12, textTransform: 'capitalize' }}>{aba}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {QUIZ[aba as 'filmes' | 'comidas' | 'dates'].map(item => {
                    const sel = myPrefs[aba as keyof Prefs].includes(item)
                    return (
                      <button key={item} onClick={() => toggleAndSave(item, aba as keyof Prefs)} style={{
                        padding: '16px 14px', borderRadius: 18, border: `1.5px solid ${sel ? P.violet : P.border}`,
                        background: sel ? `${P.violet}18` : 'rgba(255,255,255,0.03)', color: sel ? P.violet : P.muted,
                        fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif'
                      }}>{sel ? '✓ ' : ''}{item}</button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CONECTAR PAR */}
            {aba === 'par' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'slideUp 0.25s ease' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>🔗 Conectar Par</h2>
                
                <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 24, padding: '20px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 700 }}>Seu Link de Casal</p>
                  
                  {codigoCasal ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: 14 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: P.violet, wordBreak: 'break-all' }}>{codigoCasal}</span>
                        <button 
                          onClick={() => { navigator.clipboard.writeText(codigoCasal); showToast('Link copiado!') }} 
                          style={{ background: 'none', border: 'none', color: P.cyan, cursor: 'pointer', fontWeight: 700, marginLeft: 8 }}
                        >
                          Copiar
                        </button>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          onClick={gerarCodigo} 
                          style={{ flex: 1, padding: '10px', borderRadius: 12, border: `1px solid ${P.border}`, background: 'rgba(255,255,255,0.05)', color: P.text, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          🔄 Gerar Novo Link
                        </button>
                        <button 
                          onClick={desconectar} 
                          style={{ padding: '10px 14px', borderRadius: 12, border: 'none', background: 'rgba(244,63,94,0.15)', color: P.pink, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Desconectar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <GradBtn onClick={gerarCodigo}>Gerar meu link 🗝️</GradBtn>
                  )}
                </div>

                <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 24, padding: '20px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 700 }}>Código ou Link do seu amor</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                      value={codigoInput} 
                      onChange={e => setCodigoInput(e.target.value)} 
                      placeholder="AMOR-1234 ou cole o link" 
                      style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${P.border}`, borderRadius: 14, color: P.text, fontFamily: 'Outfit, sans-serif' }} 
                    />
                    <GradBtn onClick={vincular} style={{ width: 'auto', padding: '0 20px' }}>Conectar</GradBtn>
                  </div>
                </div>
              </div>
            )}

          </main>

          <nav style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            background: 'rgba(7,7,26,0.92)', backdropFilter: 'blur(20px)',
            borderTop: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-around', padding: '8px 12px 20px',
          }}>
            {TABS.map(t => {
              const active = aba === t.id
              return (
                <button key={t.id} onClick={() => mudarAba(t.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  color: active ? P.violet : P.muted, fontFamily: 'Outfit, sans-serif', fontSize: '0.68rem', fontWeight: active ? 700 : 500,
                }}>
                  <span style={{ fontSize: '1.2rem', position: 'relative' }}>
                    {t.icon}
                    {t.id === 'chat' && unreadCount > 0 && (
                      <span style={{
                        position: 'absolute', top: -4, right: -8, background: P.pink, color: '#fff',
                        fontSize: '0.62rem', fontWeight: 900, borderRadius: '10px', padding: '2px 5px',
                        minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${P.bg}`
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </span>
                  {t.label}
                </button>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}

function AuthInput({ label, type = 'text', placeholder, value, onChange, onEnter }: { label: string; type?: string; placeholder: string; value: string; onChange: (v: string) => void; onEnter?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: P.muted }}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && onEnter?.()} style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${P.border}`, borderRadius: 14, color: P.text, fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif' }} />
    </div>
  )
}

function GradBtn({ children, onClick, loading, style }: { children: React.ReactNode; onClick?: () => void; loading?: boolean; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg, ${P.violet}, ${P.pink})`, color: '#fff', fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', boxShadow: '0 8px 24px rgba(139,92,246,0.3)', ...style }}>
      {children}
    </button>
  )
}

const linkStyle: React.CSSProperties = { background: 'none', border: 'none', color: P.muted, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }