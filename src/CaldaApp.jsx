import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════
const SUPABASE_URL = "https://ywnrfmblyegeplnlykbt.supabase.co";
const SUPABASE_KEY = "sb_publishable_Xc89uAWDA00rkcKDmBKmFA_Goz7x7HI";
const H = { "Content-Type":"application/json", "apikey":SUPABASE_KEY, "Authorization":`Bearer ${SUPABASE_KEY}` };
const VAZAO_BICO = 1.6;

const sbGet = async (path) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers:H });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const sbPost = async (table, body) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:"POST", headers:{...H,"Prefer":"return=representation"},
    body:JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const sbPatch = async (table, where, body) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${where}`, {
    method:"PATCH", headers:{...H,"Prefer":"return=representation"},
    body:JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

// ═══════════════════════════════════════════════════════════════════════
// FAZENDAS
// ═══════════════════════════════════════════════════════════════════════
const FAZENDAS = [
  { id:"SAO_PEDRO", nome:"Faz. São Pedro", subfazendas:[
    { id:"FSP", sigla:"FSP" },
    { id:"FSF", sigla:"FSF" },
  ]},
];

// ═══════════════════════════════════════════════════════════════════════
// HELPERS DE CÁLCULO
// ═══════════════════════════════════════════════════════════════════════
const fv = v => parseFloat(v) || 0;
const fmtL = v => v >= 1000 ? `${(v/1000).toFixed(1)}k L` : `${Math.round(v)} L`;
const fmtP = v => `${v.toFixed(1)}%`;
const today = () => new Date().toISOString().split("T")[0];

const calcVEha = (bicos, velKmh, espRua) => {
  if (!bicos || !velKmh || !espRua) return 0;
  return (bicos * VAZAO_BICO) / ((velKmh * 1000 / 60) * espRua) * 10000;
};

const calcVelPond = trechos => {
  const vt = trechos.reduce((s,t)=>s+fv(t.volume),0);
  if (!vt) return 0;
  return trechos.reduce((s,t)=>s+fv(t.velocidade)*fv(t.volume),0)/vt;
};
const calcBicosPond = trechos => {
  const vt = trechos.reduce((s,t)=>s+fv(t.volume),0);
  if (!vt) return 0;
  return trechos.reduce((s,t)=>s+fv(t.bicos)*fv(t.volume),0)/vt;
};

const calcVEconsol = (trechos, talhoes) => {
  const vt = trechos.reduce((s,t)=>s+fv(t.volume),0);
  if (!vt) return {};
  const bm = trechos.reduce((s,t)=>s+fv(t.bicos)*fv(t.volume),0)/vt;
  const vm = trechos.reduce((s,t)=>s+fv(t.velocidade)*fv(t.volume),0)/vt;
  const r = {};
  talhoes.forEach(t => { r[t.cod] = calcVEha(bm, vm, t.esp_rua) * t.area; });
  return r;
};

const rateioVol = (talhoes, volTotal) => {
  const totalPl = talhoes.reduce((s,t)=>s+t.plantas,0);
  const r = {};
  talhoes.forEach(t => { r[t.cod] = totalPl>0 ? Math.round(volTotal*(t.plantas/totalPl)) : 0; });
  return r;
};

// ═══════════════════════════════════════════════════════════════════════
// TEMA
// ═══════════════════════════════════════════════════════════════════════
const C = {
  bg:"#060e06", sur:"#0f1a0f", sur2:"#152215", bor:"#1c321c", bor2:"#111f11",
  gr:"#4ade80", grDim:"#183018",
  tx:"#daeeda", txD:"#618061", txM:"#364e36",
  warn:"#fbbf24", warnBg:"#1a1000",
  err:"#f87171", errBg:"#1a0606",
  ok:"#34d399", okBg:"#041208",
};

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
export default function App() {
  const [tela, setTela] = useState("entrada");
  const [fazSel, setFazSel] = useState(null);
  const [subf, setSubf] = useState("FSP");
  const [loading, setLoading] = useState(false);
  const [erroDb, setErroDb] = useState(null);

  // Dados do banco
  const [talhoes, setTalhoes] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [aplicacoes, setAplicacoes] = useState([]);
  const [nextSeq, setNextSeq] = useState(1);

  // Senha
  const [senhaConfig, setSenhaConfig] = useState("1234");
  const [showSenha, setShowSenha] = useState(false);
  const [senhaIn, setSenhaIn] = useState("");
  const [senhaErr, setSenhaErr] = useState(false);

  // Navegação detalhes
  const [talSel, setTalSel] = useState(null);
  const [apSel, setApSel] = useState(null);

  // Form nova aplicação
  const [nfazSel, setNfazSel] = useState("FSP");
  const [ntals, setNtals] = useState([]);

  // Form apontamento
  const [aData, setAData] = useState(today());
  const [aOp, setAOp] = useState("");
  const [aEq, setAEq] = useState("");
  const [aTre, setATre] = useState([{velocidade:"",bicos:"",volume:""}]);

  // Config
  const [secao, setSecao] = useState("menu");
  const [novaOp, setNovaOp] = useState("");
  const [novaEq, setNovaEq] = useState("");

  // ──── CARREGAR DADOS ────
  const carregar = async (faz) => {
    setLoading(true);
    setErroDb(null);
    try {
      const subfIds = faz.subfazendas.map(s=>s.id);
      // Talhões das subfazendas
      const tals = await sbGet(`talhoes?select=*&id_subfazenda=in.(${subfIds.join(",")})&ativo=eq.true&order=cod`);
      setTalhoes(tals);

      // Operadores e equipamentos
      const ops = await sbGet(`operadores?select=*&ativo=eq.true&order=nome`);
      const eqs = await sbGet(`equipamentos?select=*&ativo=eq.true&order=nome`);
      setOperadores(ops);
      setEquipamentos(eqs);

      // Aplicações (abertas + 20 últimas fechadas)
      const aps = await sbGet(`aplicacoes?select=*&id_subfazenda=in.(${subfIds.join(",")})&order=seq.desc&limit=50`);

      // Para cada aplicação, busca talhões, apontamentos, trechos, volumes
      const apsCompl = await Promise.all(aps.map(async ap => {
        const apT = await sbGet(`aplicacao_talhoes?select=cod_talhao&id_aplicacao=eq.${ap.id}`);
        const apts = await sbGet(`apontamentos?select=*&id_aplicacao=eq.${ap.id}&order=criado_em`);
        const aptsC = await Promise.all(apts.map(async apt => {
          const tres = await sbGet(`trechos?select=*&id_apontamento=eq.${apt.id}&order=ordem`);
          const vols = await sbGet(`apontamento_talhao_volume?select=*&id_apontamento=eq.${apt.id}`);
          const volRat = {};
          vols.forEach(v => { volRat[v.cod_talhao] = parseFloat(v.vol_rateado); });
          const op = ops.find(o => o.id === apt.id_operador);
          const eq = eqs.find(e => e.id === apt.id_equipamento);
          return {
            id: apt.id, data: apt.data,
            operador: op?.nome || "", equip: eq?.nome || "",
            trechos: tres.map(t => ({ velocidade:String(t.velocidade), bicos:String(t.bicos), volume:String(t.volume) })),
            volTotal: parseFloat(apt.vol_total),
            volRateado: volRat,
            velMedia: parseFloat(apt.vel_media) || 0,
            bicosMedia: parseFloat(apt.bicos_media) || 0,
          };
        }));
        return {
          id: ap.id, seq: ap.seq, fazenda: ap.id_subfazenda,
          talhoes: apT.map(t=>t.cod_talhao),
          status: ap.status, dataCriacao: ap.data_criacao, dataFechamento: ap.data_fechamento,
          apontamentos: aptsC,
        };
      }));
      setAplicacoes(apsCompl);

      // Próximo seq
      if (aps.length > 0) setNextSeq(aps[0].seq + 1);

      // Senha
      try {
        const cfg = await sbGet(`configuracoes?chave=eq.senha_config&select=valor`);
        if (cfg.length > 0) setSenhaConfig(cfg[0].valor);
      } catch(e) {}

    } catch(e) {
      console.error("Erro DB:", e);
      setErroDb("Sem conexão com o banco");
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const getTal = cod => talhoes.find(t => t.cod === cod);
  const getTalhoesAp = ap => ap.talhoes.map(c => getTal(c)).filter(Boolean);
  const apAberta = cod => aplicacoes.find(ap => ap.status==="aberta" && ap.talhoes.includes(cod));
  const apsDeTal = cod => aplicacoes.filter(ap => ap.talhoes.includes(cod)).sort((a,b)=>b.seq-a.seq);

  const todosTrechos = ap => ap.apontamentos.flatMap(r => r.trechos);

  const pctCobertura = ap => {
    const tres = todosTrechos(ap);
    if (!tres.length) return 0;
    const tals = getTalhoesAp(ap);
    const ve = calcVEconsol(tres, tals);
    const veTot = Object.values(ve).reduce((s,v)=>s+v,0);
    const realTot = ap.apontamentos.reduce((s,r)=>s+r.volTotal,0);
    return veTot>0 ? Math.min((realTot/veTot)*100,100) : 0;
  };

  const desvioAp = ap => {
    const tres = todosTrechos(ap);
    if (!tres.length) return null;
    const tals = getTalhoesAp(ap);
    const ve = calcVEconsol(tres, tals);
    const veTot = Object.values(ve).reduce((s,v)=>s+v,0);
    const realTot = ap.apontamentos.reduce((s,r)=>s+r.volTotal,0);
    return veTot>0 ? ((realTot-veTot)/veTot)*100 : null;
  };

  // ──── AÇÕES ────
  const criarAp = async () => {
    const id = `AP-${String(nextSeq).padStart(4,"0")}`;
    const nova = {
      id, seq:nextSeq, fazenda:nfazSel,
      talhoes:ntals.map(t=>t.cod),
      status:"aberta", dataCriacao:today(),
      apontamentos:[],
    };
    setAplicacoes(p=>[nova,...p]);
    setNextSeq(n=>n+1);
    setApSel(nova);
    setNtals([]);
    setTela("apontamento");
    try {
      await sbPost("aplicacoes", { id, seq:nova.seq, id_subfazenda:nfazSel, status:"aberta", data_criacao:today() });
      await Promise.all(nova.talhoes.map(cod => sbPost("aplicacao_talhoes", { id_aplicacao:id, cod_talhao:cod })));
    } catch(e) { console.error(e); }
  };

  const salvarApt = async () => {
    const ap = aplicacoes.find(x=>x.id===apSel.id);
    const volTotal = aTre.reduce((s,t)=>s+fv(t.volume),0);
    const apId = `R${Date.now()}`;
    const velM = calcVelPond(aTre);
    const bicosM = calcBicosPond(aTre);
    const tals = getTalhoesAp(ap);
    const novoR = {
      id:apId, data:aData, operador:aOp, equip:aEq,
      trechos:aTre, volTotal,
      volRateado: rateioVol(tals, volTotal),
      velMedia:velM, bicosMedia:bicosM,
    };
    setAplicacoes(p=>p.map(x=>x.id!==ap.id?x:{...x,apontamentos:[...x.apontamentos,novoR]}));
    setAOp(""); setAEq(""); setATre([{velocidade:"",bicos:"",volume:""}]); setAData(today());
    setTela("ap_detalhe");
    try {
      const opObj = operadores.find(o=>o.nome===aOp);
      const eqObj = equipamentos.find(e=>e.nome===aEq);
      await sbPost("apontamentos", {
        id:apId, id_aplicacao:ap.id, data:aData,
        id_operador:opObj?.id||null, id_equipamento:eqObj?.id||null,
        vol_total:volTotal, vel_media:velM, bicos_media:bicosM,
      });
      await Promise.all(aTre.map((t,i)=>sbPost("trechos", {
        id_apontamento:apId, velocidade:fv(t.velocidade), bicos:fv(t.bicos), volume:fv(t.volume), ordem:i+1,
      })));
      const tresComNovos = [...todosTrechos(ap), ...aTre];
      const veMap = calcVEconsol(tresComNovos, tals);
      await Promise.all(ap.talhoes.map(cod => sbPost("apontamento_talhao_volume", {
        id_apontamento:apId, cod_talhao:cod,
        vol_rateado:novoR.volRateado[cod]||0,
        ve_consolidado:veMap[cod]||0,
      })));
    } catch(e) { console.error(e); }
  };

  const fecharAp = async id => {
    setAplicacoes(p=>p.map(x=>x.id!==id?x:{...x,status:"fechada",dataFechamento:today()}));
    try { await sbPatch("aplicacoes", `id=eq.${id}`, { status:"fechada", data_fechamento:today() }); }
    catch(e) { console.error(e); }
  };
  const reabrirAp = async id => {
    setAplicacoes(p=>p.map(x=>x.id!==id?x:{...x,status:"aberta",dataFechamento:null}));
    try { await sbPatch("aplicacoes", `id=eq.${id}`, { status:"aberta", data_fechamento:null }); }
    catch(e) { console.error(e); }
  };

  // ──── Form helpers ────
  const aTotal = aTre.reduce((s,t)=>s+fv(t.volume),0);
  const aFormOk = aOp && aEq && aTre.every(t=>t.velocidade&&t.bicos&&t.volume);
  const addTre = () => setATre(p=>[...p,{velocidade:"",bicos:"",volume:""}]);
  const rmTre = i => setATre(p=>p.filter((_,j)=>j!==i));
  const updTre = (i,f,v) => setATre(p=>p.map((t,j)=>j===i?{...t,[f]:v}:t));

  // Senha
  const tentaSenha = nova => {
    if (nova === senhaConfig) { setShowSenha(false); setSecao("menu"); setTela("config"); setSenhaIn(""); }
    else { setSenhaErr(true); setTimeout(()=>setSenhaIn(""), 500); }
  };
  const digitar = d => {
    if (senhaIn.length >= 4) return;
    const nova = senhaIn + d;
    setSenhaIn(nova);
    setSenhaErr(false);
    if (nova.length === 4) tentaSenha(nova);
  };

  // Componentes auxiliares
  const Bar = ({pct, h=6}) => {
    const cor = pct>=100?C.ok:pct>=65?C.gr:pct>=35?C.warn:C.err;
    return <div style={{background:C.sur,borderRadius:4,height:h,overflow:"hidden",flex:1}}>
      <div style={{width:`${Math.min(pct,100)}%`,height:"100%",background:cor,transition:"width .3s"}}/>
    </div>;
  };
  const Bdg = ({v}) => {
    if (v===null||v===undefined) return <span style={{color:C.txM,fontSize:11}}>—</span>;
    const a = Math.abs(v);
    const [bg,fg] = a<=5?[C.okBg,C.ok]:a<=15?[C.warnBg,C.warn]:[C.errBg,C.err];
    return <span style={{background:bg,color:fg,borderRadius:6,padding:"2px 7px",fontWeight:700,fontSize:12}}>
      {v>0?"+":""}{v.toFixed(1)}%
    </span>;
  };

  const BaseStyle = {
    fontFamily:"'DM Sans','Segoe UI',sans-serif",
    background:C.bg, minHeight:"100vh", maxWidth:480, margin:"0 auto", color:C.tx,
  };
  const Hdr = ({titulo,sub,onBack,extra}) => (
    <div style={{background:C.sur2,borderBottom:`1px solid ${C.bor}`,padding:"13px 14px",display:"flex",alignItems:"center",gap:9}}>
      {onBack && <button onClick={onBack} style={{background:"none",border:"none",color:C.gr,cursor:"pointer",padding:0}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>}
      <div style={{flex:1}}>
        <div style={{fontSize:15,fontWeight:800}}>{titulo}</div>
        {sub && <div style={{fontSize:10,color:C.txD}}>{sub}</div>}
      </div>
      {extra}
    </div>
  );
  const ChipFaz = ({active,children,onClick}) => (
    <button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:700,border:active?"none":`1px solid ${C.bor}`,background:active?C.gr:"transparent",color:active?C.bg:C.txD,cursor:"pointer"}}>{children}</button>
  );

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  // TELA: ENTRADA
  if (tela === "entrada") {
    return (
      <div style={{...BaseStyle, background:"#040a04", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", position:"relative"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 40%, #0d2a0d 0%, #040a04 70%)",pointerEvents:"none"}}/>

        <div style={{position:"relative",zIndex:1,width:"100%",display:"flex",flexDirection:"column",alignItems:"center"}}>
          <div style={{width:72,height:72,background:"#0f1f0f",border:`1.5px solid ${C.grDim}`,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.gr} strokeWidth="1.5">
              <path d="M17 8C8 10 5.9 16.17 3.82 19.82"/>
              <path d="M17 8c0 3-1 6-5 8"/>
              <path d="M3.82 19.82L10 14"/>
            </svg>
          </div>

          <div style={{fontSize:11,fontWeight:700,letterSpacing:4,color:`${C.gr}66`,marginBottom:6}}>ALFACITRUS</div>
          <div style={{fontSize:24,fontWeight:900,color:C.tx,marginBottom:4}}>Controle de Calda</div>
          <div style={{fontSize:12,color:C.txM,marginBottom:36}}>Pulverização fitossanitária</div>

          <div style={{width:"100%"}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:C.txM,textAlign:"center",marginBottom:12}}>SELECIONE A PROPRIEDADE</div>

            {FAZENDAS.map(faz => (
              <button
                key={faz.id}
                onClick={() => {
                  setFazSel(faz);
                  setSubf(faz.subfazendas[0].id);
                  carregar(faz);
                  setTela("talhoes");
                }}
                style={{
                  width:"100%",
                  background:C.sur,
                  border:`1.5px solid ${C.bor}`,
                  borderRadius:16,
                  padding:"18px",
                  cursor:"pointer",
                  display:"flex",
                  alignItems:"center",
                  gap:14,
                  textAlign:"left",
                  marginBottom:10,
                  color:C.tx,
                }}>
                <div style={{width:42,height:42,background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gr} strokeWidth="1.8">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,marginBottom:2}}>{faz.nome}</div>
                  <div style={{fontSize:11,color:C.txD}}>{faz.subfazendas.map(s=>s.sigla).join(" · ")}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.txM} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
          </div>

          <div style={{fontSize:10,color:C.txM,marginTop:20,letterSpacing:1}}>v7.0 · 8 bar · 1,6 L/min por bico</div>
        </div>

        <button
          onClick={()=>{ setShowSenha(true); setSenhaIn(""); setSenhaErr(false); }}
          style={{position:"fixed",bottom:24,right:24,width:44,height:44,background:"#0a140a",border:`1px solid ${C.bor}`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:C.txM,cursor:"pointer",zIndex:50}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>

        {showSenha && (
          <div style={{position:"fixed",inset:0,background:"#000c",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:24}}
            onClick={e=>{ if(e.target===e.currentTarget) setShowSenha(false); }}>
            <div style={{background:C.sur2,border:`1.5px solid ${C.bor}`,borderRadius:20,padding:24,width:"100%",maxWidth:300}}>
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:15,fontWeight:800}}>Acesso restrito</div>
                <div style={{fontSize:11,color:C.txM,marginTop:4}}>Senha de 4 dígitos</div>
              </div>
              <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:14}}>
                {[0,1,2,3].map(i=>(
                  <div key={i} style={{width:36,height:36,borderRadius:9,background:senhaIn.length>i?C.gr:C.sur,border:senhaErr?`1.5px solid ${C.err}`:`1.5px solid ${C.bor}`}}/>
                ))}
              </div>
              {senhaErr && <div style={{textAlign:"center",color:C.err,fontSize:12,marginBottom:10}}>Senha incorreta</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:10}}>
                {[1,2,3,4,5,6,7,8,9].map(n=>(
                  <button key={n} onClick={()=>digitar(String(n))} style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:11,padding:"13px 0",color:C.tx,fontSize:17,fontWeight:700,cursor:"pointer"}}>{n}</button>
                ))}
                <div/>
                <button onClick={()=>digitar("0")} style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:11,padding:"13px 0",color:C.tx,fontSize:17,fontWeight:700,cursor:"pointer"}}>0</button>
                <button onClick={()=>{setSenhaIn(p=>p.slice(0,-1));setSenhaErr(false);}} style={{background:C.bg,border:`1px solid ${C.bor}`,borderRadius:11,padding:"13px 0",color:C.txD,cursor:"pointer"}}>←</button>
              </div>
              <button onClick={()=>setShowSenha(false)} style={{width:"100%",background:"transparent",border:`1px solid ${C.bor}`,borderRadius:11,padding:10,color:C.txD,fontSize:13,cursor:"pointer"}}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TELA: TALHÕES
  if (tela === "talhoes") {
    const subTals = talhoes.filter(t => t.id_subfazenda === subf);
    const comAb = subTals.filter(t => apAberta(t.cod));

    return (
      <div style={BaseStyle}>
        <Hdr
          titulo={fazSel?.nome || "AlfaCitrus"}
          sub="Controle de pulverização"
          onBack={()=>setTela("entrada")}
          extra={
            <div style={{display:"flex",gap:6}}>
              {fazSel?.subfazendas.map(s => (
                <ChipFaz key={s.id} active={subf===s.id} onClick={()=>setSubf(s.id)}>{s.sigla}</ChipFaz>
              ))}
            </div>
          }
        />
        <div style={{padding:"12px 12px 90px"}}>
          {loading && (
            <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:10,padding:"10px 14px",marginBottom:10,fontSize:12,color:C.txD,textAlign:"center"}}>
              Carregando dados do banco...
            </div>
          )}
          {erroDb && (
            <div style={{background:C.warnBg,border:`1px solid ${C.warn}33`,borderRadius:10,padding:"9px 14px",marginBottom:10,fontSize:12,color:C.warn,textAlign:"center"}}>
              ⚠ {erroDb}
            </div>
          )}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:11,color:C.txD,fontWeight:600}}>
              {comAb.length} em andamento · {subTals.length} talhões
            </span>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {subTals.map(t => {
              const ab = apAberta(t.cod);
              const hist = apsDeTal(t.cod);
              const ultima = hist[0];
              const pct = ab ? pctCobertura(ab) : 0;
              const status = ab ? "aberta" : ultima?.status === "fechada" ? "fechada" : "nenhuma";

              return (
                <button
                  key={t.cod}
                  onClick={()=>{ setTalSel(t); setTela("tal_detalhe"); }}
                  style={{
                    background:C.sur2, border:`1px solid ${status==="aberta"?`${C.warn}44`:C.bor}`,
                    borderRadius:14, padding:"11px 12px", cursor:"pointer", textAlign:"left", color:C.tx,
                  }}>
                  <div style={{fontSize:26,fontWeight:900,lineHeight:1,marginBottom:2}}>{t.quadra}</div>
                  <div style={{fontSize:10,color:C.txD,marginBottom:7,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.variedade}</div>
                  {status==="aberta" && (<>
                    <Bar pct={pct} h={5}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:5}}>
                      <span style={{fontSize:9,background:C.warnBg,color:C.warn,borderRadius:5,padding:"1px 5px",fontWeight:700}}>EM ANDAMENTO</span>
                      <span style={{fontSize:11,fontWeight:700,color:C.warn}}>{fmtP(pct)}</span>
                    </div>
                  </>)}
                  {status==="fechada" && <div style={{fontSize:9,background:C.okBg,color:C.ok,borderRadius:5,padding:"2px 6px",fontWeight:700,display:"inline-block"}}>CONCLUÍDO</div>}
                  {status==="nenhuma" && <div style={{fontSize:10,color:C.txM}}>Sem aplicação</div>}
                </button>
              );
            })}
          </div>

          <button onClick={()=>{ setNfazSel(subf); setNtals([]); setTela("nova_ap"); }}
            style={{width:"100%",background:C.gr,color:C.bg,border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova aplicação
          </button>
        </div>
      </div>
    );
  }

  // TELA: NOVA APLICAÇÃO
  if (tela === "nova_ap") {
    const tals = talhoes.filter(t => t.id_subfazenda === nfazSel);
    return (
      <div style={BaseStyle}>
        <Hdr titulo="Nova aplicação" sub={`AP-${String(nextSeq).padStart(4,"0")}`} onBack={()=>setTela("talhoes")}/>
        <div style={{padding:"12px"}}>
          <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14,marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:8}}>SUBFAZENDA</div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {fazSel?.subfazendas.map(s=><ChipFaz key={s.id} active={nfazSel===s.id} onClick={()=>{setNfazSel(s.id);setNtals([]);}}>{s.sigla}</ChipFaz>)}
            </div>
            <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:8}}>TALHÕES</div>
            <div style={{display:"flex",flexWrap:"wrap"}}>
              {tals.map(t => (
                <button key={t.cod}
                  onClick={()=>setNtals(p=>p.find(x=>x.cod===t.cod)?p.filter(x=>x.cod!==t.cod):[...p,t])}
                  style={{padding:"5px 10px",borderRadius:13,fontSize:11,fontWeight:600,border:ntals.find(x=>x.cod===t.cod)?"none":`1px solid ${C.bor}`,background:ntals.find(x=>x.cod===t.cod)?C.gr:C.sur,color:ntals.find(x=>x.cod===t.cod)?C.bg:C.txD,cursor:"pointer",margin:"3px 2px"}}>
                  {t.quadra}
                </button>
              ))}
            </div>
            {ntals.length>0 && (
              <div style={{background:C.sur,borderRadius:8,padding:"8px 10px",marginTop:10}}>
                {ntals.map(t=>(
                  <div key={t.cod} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.txD,padding:"2px 0"}}>
                    <span>Talhão {t.quadra} · {t.variedade}</span>
                    <span style={{color:C.gr,fontWeight:700}}>{t.plantas.toLocaleString("pt-BR")} pl</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={criarAp} disabled={ntals.length===0}
            style={{width:"100%",background:C.gr,color:C.bg,border:"none",borderRadius:12,padding:13,fontSize:14,fontWeight:800,cursor:"pointer",opacity:ntals.length>0?1:0.4}}>
            Criar e fazer 1º apontamento
          </button>
        </div>
      </div>
    );
  }

  // TELA: DETALHE TALHÃO
  if (tela === "tal_detalhe" && talSel) {
    const ab = apAberta(talSel.cod);
    const hist = apsDeTal(talSel.cod).filter(a=>a.status==="fechada");

    return (
      <div style={BaseStyle}>
        <Hdr
          titulo={`Talhão ${talSel.quadra}`}
          sub={`${talSel.variedade} · ${parseFloat(talSel.area).toFixed(2)} ha · ${talSel.plantas.toLocaleString("pt-BR")} pl`}
          onBack={()=>setTela("talhoes")}
        />
        <div style={{padding:12}}>
          {ab && (() => {
            const pct = pctCobertura(ab);
            const veMap = calcVEconsol(todosTrechos(ab), getTalhoesAp(ab));
            const real = ab.apontamentos.reduce((s,r)=>s+(r.volRateado[talSel.cod]||0),0);
            const esp = veMap[talSel.cod] || 0;
            return (
              <div style={{background:C.sur2,border:`1px solid ${C.warn}44`,borderRadius:14,padding:14,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:700,color:C.warn}}>Em andamento · {ab.id}</span>
                  <span style={{fontSize:16,fontWeight:900,color:C.warn}}>{fmtP(pct)}</span>
                </div>
                <Bar pct={pct} h={7}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.txD,marginTop:6}}>
                  <span>Realizado: <b style={{color:C.tx}}>{fmtL(real)}</b></span>
                  <span>Esperado: <b style={{color:C.tx}}>{fmtL(esp)}</b></span>
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button onClick={()=>{setApSel(ab);setTela("apontamento");}}
                    style={{flex:1,background:C.gr,color:C.bg,border:"none",borderRadius:10,padding:"10px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                    + Apontar
                  </button>
                  <button onClick={()=>{setApSel(ab);setTela("ap_detalhe");}}
                    style={{flex:1,background:"transparent",color:C.gr,border:`1px solid ${C.bor}`,borderRadius:10,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                    Detalhes
                  </button>
                </div>
              </div>
            );
          })()}

          {!ab && (
            <button onClick={()=>{setNfazSel(subf);setNtals([talSel]);setTela("nova_ap");}}
              style={{width:"100%",background:C.gr,color:C.bg,border:"none",borderRadius:12,padding:13,fontSize:14,fontWeight:800,cursor:"pointer"}}>
              + Iniciar nova aplicação
            </button>
          )}

          {hist.length>0 && (
            <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14,marginTop:10}}>
              <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:8}}>HISTÓRICO</div>
              {hist.map(ap => {
                const real = ap.apontamentos.reduce((s,r)=>s+(r.volRateado[talSel.cod]||0),0);
                const veMap = calcVEconsol(todosTrechos(ap), getTalhoesAp(ap));
                const esp = veMap[talSel.cod] || 0;
                const dev = esp>0?((real-esp)/esp)*100:null;
                return (
                  <div key={ap.id} onClick={()=>{setApSel(ap);setTela("ap_detalhe");}}
                    style={{padding:"8px 0",borderBottom:`1px solid ${C.bor2}`,cursor:"pointer",display:"flex",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700}}>{ap.id}</div>
                      <div style={{fontSize:10,color:C.txM}}>{ap.dataCriacao} → {ap.dataFechamento}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.gr}}>{fmtL(real)}</div>
                      <Bdg v={dev}/>
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

  // TELA: APONTAMENTO
  if (tela === "apontamento" && apSel) {
    const ap = aplicacoes.find(x=>x.id===apSel.id) || apSel;
    const tals = getTalhoesAp(ap);
    const tresAcum = todosTrechos(ap);
    const tresAcumNovos = [...tresAcum, ...aTre.filter(t=>t.velocidade&&t.bicos&&t.volume)];

    const volAcum = ap.apontamentos.reduce((s,r)=>s+r.volTotal,0);
    const volComNovo = volAcum + aTotal;
    const veNovos = tresAcumNovos.length>0 ? calcVEconsol(tresAcumNovos, tals) : {};
    const veTot = Object.values(veNovos).reduce((s,v)=>s+v,0);
    const pctNovo = veTot>0 ? Math.min((volComNovo/veTot)*100, 100) : 0;
    const desvio = veTot>0 ? ((volComNovo-veTot)/veTot)*100 : null;
    const rateio = aTotal>0 ? rateioVol(tals, aTotal) : {};

    return (
      <div style={BaseStyle}>
        <Hdr
          titulo={`Talhão ${tals.map(t=>t.quadra).join(" + ")}`}
          sub={`${ap.id} · Apontamento #${ap.apontamentos.length+1}`}
          onBack={()=>setTela("ap_detalhe")}
        />
        <div style={{padding:12}}>
          {ap.apontamentos.length>0 && veTot>0 && (
            <div style={{background:C.sur2,border:`1px solid ${C.grDim}`,borderRadius:14,padding:"10px 13px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:5}}>
                <span style={{color:C.txD}}>Acumulado</span>
                <span style={{fontWeight:700}}>{fmtL(volAcum)} de {fmtL(veTot)}</span>
              </div>
              <Bar pct={veTot>0?Math.min((volAcum/veTot)*100,100):0} h={4}/>
            </div>
          )}

          <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14,marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:4}}>DATA</div>
            <input type="date" value={aData} onChange={e=>setAData(e.target.value)}
              style={{width:"100%",background:C.sur,border:`1.5px solid ${C.bor}`,borderRadius:10,padding:"9px 11px",color:C.tx,fontSize:14,marginBottom:10,boxSizing:"border-box"}}/>
            <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:4}}>OPERADOR</div>
            <select value={aOp} onChange={e=>setAOp(e.target.value)}
              style={{width:"100%",background:C.sur,border:`1.5px solid ${C.bor}`,borderRadius:10,padding:"9px 11px",color:C.tx,fontSize:14,marginBottom:10,boxSizing:"border-box"}}>
              <option value="">Selecionar...</option>
              {operadores.map(o=><option key={o.id} value={o.nome}>{o.nome}</option>)}
            </select>
            <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:4}}>EQUIPAMENTO</div>
            <select value={aEq} onChange={e=>setAEq(e.target.value)}
              style={{width:"100%",background:C.sur,border:`1.5px solid ${C.bor}`,borderRadius:10,padding:"9px 11px",color:C.tx,fontSize:14,boxSizing:"border-box"}}>
              <option value="">Selecionar...</option>
              {equipamentos.map(e=><option key={e.id} value={e.nome}>{e.nome}</option>)}
            </select>
          </div>

          <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:10,fontWeight:700,color:C.txD}}>TRECHOS</span>
              <button onClick={addTre} style={{background:`${C.gr}15`,border:`1px solid ${C.gr}30`,color:C.gr,borderRadius:7,padding:"3px 9px",fontSize:11,cursor:"pointer"}}>+ trecho</button>
            </div>
            {aTre.map((t,i)=>(
              <div key={i} style={{background:C.sur,borderRadius:10,padding:10,marginBottom:7,position:"relative"}}>
                <div style={{fontSize:9,color:C.txM,fontWeight:700,marginBottom:6}}>TRECHO {i+1}</div>
                <div style={{display:"flex",gap:7,marginBottom:7}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,color:C.txD,marginBottom:3}}>VEL. KM/H</div>
                    <input type="number" step="0.1" placeholder="4.2" value={t.velocidade} onChange={e=>updTre(i,"velocidade",e.target.value)}
                      style={{width:"100%",background:C.bg,border:`1px solid ${C.bor}`,borderRadius:8,padding:"8px 10px",color:C.tx,fontSize:14,boxSizing:"border-box"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,color:C.txD,marginBottom:3}}>BICOS</div>
                    <input type="number" placeholder="60" value={t.bicos} onChange={e=>updTre(i,"bicos",e.target.value)}
                      style={{width:"100%",background:C.bg,border:`1px solid ${C.bor}`,borderRadius:8,padding:"8px 10px",color:C.tx,fontSize:14,boxSizing:"border-box"}}/>
                  </div>
                </div>
                <div style={{fontSize:9,color:C.txD,marginBottom:3}}>VOLUME (L)</div>
                <input type="number" placeholder="28000" value={t.volume} onChange={e=>updTre(i,"volume",e.target.value)}
                  style={{width:"100%",background:C.bg,border:`1px solid ${C.bor}`,borderRadius:8,padding:"8px 10px",color:C.tx,fontSize:14,boxSizing:"border-box"}}/>
                {aTre.length>1 && (
                  <button onClick={()=>rmTre(i)} style={{position:"absolute",top:8,right:8,background:"none",border:"none",color:C.err,cursor:"pointer",fontSize:14}}>×</button>
                )}
              </div>
            ))}

            {aTotal>0 && veTot>0 && (
              <div style={{background:C.bg,borderRadius:8,padding:10,marginTop:4}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}>
                  <span style={{color:C.txD}}>Vol. aplicado</span>
                  <span style={{fontWeight:800,color:C.gr}}>{fmtL(aTotal)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                  <span style={{color:C.txD}}>Vol. esperado total</span>
                  <span>{fmtL(veTot)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12}}>
                  <span style={{color:C.txD}}>Desvio</span>
                  <Bdg v={desvio}/>
                </div>
              </div>
            )}
          </div>

          {tals.length>1 && aTotal>0 && (
            <div style={{background:C.sur2,border:`1px solid ${C.grDim}`,borderRadius:14,padding:14,marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:8}}>RATEIO POR TALHÃO</div>
              {tals.map(t=>{
                const totalPl = tals.reduce((s,x)=>s+x.plantas,0);
                const prop = totalPl>0?t.plantas/totalPl:0;
                return (
                  <div key={t.cod} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.bor2}`}}>
                    <span style={{fontSize:12}}>Talhão {t.quadra} <span style={{fontSize:10,color:C.txM}}>({fmtP(prop*100)})</span></span>
                    <span style={{fontSize:13,fontWeight:700,color:C.gr}}>{fmtL(rateio[t.cod]||0)}</span>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={salvarApt} disabled={!aFormOk}
            style={{width:"100%",background:C.gr,color:C.bg,border:"none",borderRadius:12,padding:13,fontSize:14,fontWeight:800,cursor:"pointer",opacity:aFormOk?1:0.4}}>
            Salvar apontamento
          </button>
        </div>
      </div>
    );
  }

  // TELA: DETALHE APLICAÇÃO
  if (tela === "ap_detalhe" && apSel) {
    const ap = aplicacoes.find(x=>x.id===apSel.id) || apSel;
    const tals = getTalhoesAp(ap);
    const veMap = calcVEconsol(todosTrechos(ap), tals);
    const veTot = Object.values(veMap).reduce((s,v)=>s+v,0);
    const realTot = ap.apontamentos.reduce((s,r)=>s+r.volTotal,0);
    const pct = pctCobertura(ap);
    const dev = ap.status==="fechada" ? desvioAp(ap) : null;
    const velM = calcVelPond(todosTrechos(ap));
    const bicosM = calcBicosPond(todosTrechos(ap));

    return (
      <div style={BaseStyle}>
        <Hdr
          titulo={`Talhão ${tals.map(t=>t.quadra).join(" + ")}`}
          sub={`${ap.id} · ${ap.fazenda}`}
          onBack={()=>setTela("talhoes")}
          extra={
            <span style={{fontSize:9,fontWeight:700,padding:"3px 9px",borderRadius:8,background:ap.status==="aberta"?C.warnBg:C.okBg,color:ap.status==="aberta"?C.warn:C.ok}}>
              {ap.status==="aberta"?"ABERTA":"CONCLUÍDA"}
            </span>
          }
        />
        <div style={{padding:12}}>
          <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:13,fontWeight:700}}>Cobertura consolidada</span>
              <span style={{fontSize:18,fontWeight:900,color:pct>=100?C.ok:C.gr}}>{fmtP(pct)}</span>
            </div>
            <Bar pct={pct} h={8}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.txD,marginTop:6}}>
              <span>Realizado: <b style={{color:C.tx}}>{fmtL(realTot)}</b></span>
              <span>VE: <b style={{color:C.tx}}>{fmtL(veTot)}</b></span>
            </div>
            {ap.apontamentos.length>0 && (
              <div style={{fontSize:10,color:C.txM,marginTop:6,display:"flex",gap:14}}>
                <span>Vel. méd.: <b style={{color:C.tx}}>{velM.toFixed(2)} km/h</b></span>
                <span>Bicos méd.: <b style={{color:C.tx}}>{bicosM.toFixed(1)}</b></span>
              </div>
            )}
            {dev!==null && (
              <div style={{marginTop:8,display:"flex",justifyContent:"center"}}><Bdg v={dev}/></div>
            )}
          </div>

          <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14,marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:8}}>VOLUME POR TALHÃO</div>
            {tals.map(t=>{
              const real = ap.apontamentos.reduce((s,r)=>s+(r.volRateado[t.cod]||0),0);
              const esp = veMap[t.cod] || 0;
              const pctT = esp>0?Math.min((real/esp)*100,100):0;
              const devT = esp>0&&ap.status==="fechada"?((real-esp)/esp)*100:null;
              return (
                <div key={t.cod} style={{padding:"8px 0",borderBottom:`1px solid ${C.bor2}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div>
                      <span style={{fontSize:13,fontWeight:800}}>Talhão {t.quadra}</span>
                      <span style={{fontSize:10,color:C.txM,marginLeft:5}}>{parseFloat(t.area).toFixed(2)} ha · rua {t.esp_rua}m</span>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.gr}}>{fmtL(real)}</span>
                      <span style={{fontSize:10,color:C.txD}}> / {fmtL(esp)}</span>
                      {devT!==null && <div><Bdg v={devT}/></div>}
                    </div>
                  </div>
                  <Bar pct={pctT} h={4}/>
                </div>
              );
            })}
          </div>

          {ap.apontamentos.length>0 && (
            <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14,marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:8}}>APONTAMENTOS ({ap.apontamentos.length})</div>
              {ap.apontamentos.map((r,i)=>{
                const v = calcVelPond(r.trechos);
                const b = calcBicosPond(r.trechos);
                return (
                  <div key={r.id} style={{padding:"7px 0",borderBottom:`1px solid ${C.bor2}`,display:"flex",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:C.txD}}>#{i+1} · {r.data}</div>
                      <div style={{fontSize:10,color:C.txM}}>{r.operador} · {r.equip}</div>
                      <div style={{fontSize:10,color:C.txM}}>{v.toFixed(2)} km/h · {b.toFixed(0)} bicos</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.gr}}>{fmtL(r.volTotal)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {ap.status==="aberta" && (
            <>
              <button onClick={()=>{setApSel(ap);setTela("apontamento");}}
                style={{width:"100%",background:C.gr,color:C.bg,border:"none",borderRadius:12,padding:13,fontSize:14,fontWeight:800,cursor:"pointer",marginBottom:8}}>
                + Novo apontamento
              </button>
              <button onClick={()=>fecharAp(ap.id)}
                style={{width:"100%",background:"transparent",color:C.ok,border:`1px solid ${C.ok}44`,borderRadius:12,padding:11,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                🔒 Marcar como concluído
              </button>
            </>
          )}
          {ap.status==="fechada" && (
            <button onClick={()=>reabrirAp(ap.id)}
              style={{width:"100%",background:C.errBg,color:C.err,border:`1px solid ${C.err}33`,borderRadius:12,padding:11,fontSize:13,fontWeight:600,cursor:"pointer"}}>
              Reabrir aplicação
            </button>
          )}
        </div>
      </div>
    );
  }

  // TELA: CONFIG
  if (tela === "config") {
    return (
      <div style={BaseStyle}>
        <Hdr titulo="Configurações" sub={secao==="menu"?"Cadastros":secao} onBack={()=>{ if(secao==="menu") setTela("entrada"); else setSecao("menu"); }}/>
        <div style={{padding:12}}>
          {secao==="menu" && (
            <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14}}>
              {[
                {id:"operadores",label:"Operadores",sub:`${operadores.length} cadastrados`},
                {id:"equipamentos",label:"Equipamentos",sub:`${equipamentos.length} cadastrados`},
                {id:"info",label:"Informações técnicas",sub:`Vazão ${VAZAO_BICO} L/min @ 8 bar`},
              ].map((it,i,arr)=>(
                <div key={it.id} onClick={()=>setSecao(it.id)}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 4px",borderBottom:i<arr.length-1?`1px solid ${C.bor2}`:"none",cursor:"pointer"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700}}>{it.label}</div>
                    <div style={{fontSize:10,color:C.txM}}>{it.sub}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.txM} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ))}
            </div>
          )}

          {secao==="operadores" && (
            <div>
              <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14,marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:8}}>OPERADORES CADASTRADOS</div>
                {operadores.map((op,i)=>(
                  <div key={op.id} style={{padding:"8px 0",borderBottom:i<operadores.length-1?`1px solid ${C.bor2}`:"none",fontSize:13}}>{op.nome}</div>
                ))}
              </div>
              <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14}}>
                <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:8}}>NOVO OPERADOR</div>
                <input value={novaOp} onChange={e=>setNovaOp(e.target.value)} placeholder="Nome do operador"
                  style={{width:"100%",background:C.sur,border:`1.5px solid ${C.bor}`,borderRadius:10,padding:"9px 11px",color:C.tx,fontSize:14,marginBottom:10,boxSizing:"border-box"}}/>
                <button onClick={async()=>{
                  if (!novaOp.trim()) return;
                  try {
                    const res = await sbPost("operadores", { nome:novaOp.trim() });
                    await sbPost("operador_fazenda", { id_operador:res[0].id, id_fazenda:"SAO_PEDRO" });
                    setOperadores(p=>[...p, res[0]]);
                    setNovaOp("");
                  } catch(e) { alert("Erro ao adicionar: " + e.message); }
                }} style={{width:"100%",background:C.gr,color:C.bg,border:"none",borderRadius:12,padding:12,fontSize:14,fontWeight:800,cursor:"pointer"}}>
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {secao==="equipamentos" && (
            <div>
              <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14,marginBottom:10}}>
                <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:8}}>EQUIPAMENTOS CADASTRADOS</div>
                {equipamentos.map((eq,i)=>(
                  <div key={eq.id} style={{padding:"8px 0",borderBottom:i<equipamentos.length-1?`1px solid ${C.bor2}`:"none",fontSize:13}}>{eq.nome}</div>
                ))}
              </div>
              <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14}}>
                <div style={{fontSize:10,fontWeight:700,color:C.txD,marginBottom:8}}>NOVO EQUIPAMENTO</div>
                <input value={novaEq} onChange={e=>setNovaEq(e.target.value)} placeholder="Nome do equipamento"
                  style={{width:"100%",background:C.sur,border:`1.5px solid ${C.bor}`,borderRadius:10,padding:"9px 11px",color:C.tx,fontSize:14,marginBottom:10,boxSizing:"border-box"}}/>
                <button onClick={async()=>{
                  if (!novaEq.trim()) return;
                  try {
                    const res = await sbPost("equipamentos", { nome:novaEq.trim() });
                    await sbPost("equipamento_fazenda", { id_equipamento:res[0].id, id_fazenda:"SAO_PEDRO" });
                    setEquipamentos(p=>[...p, res[0]]);
                    setNovaEq("");
                  } catch(e) { alert("Erro ao adicionar: " + e.message); }
                }} style={{width:"100%",background:C.gr,color:C.bg,border:"none",borderRadius:12,padding:12,fontSize:14,fontWeight:800,cursor:"pointer"}}>
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {secao==="info" && (
            <div style={{background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:14,fontSize:13,lineHeight:1.7,color:C.txD}}>
              <div><b style={{color:C.tx}}>Pressão:</b> 8 bar</div>
              <div><b style={{color:C.tx}}>Vazão por bico:</b> {VAZAO_BICO} L/min</div>
              <div><b style={{color:C.tx}}>Banco de dados:</b> Supabase</div>
              <div><b style={{color:C.tx}}>Versão:</b> 7.0</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
