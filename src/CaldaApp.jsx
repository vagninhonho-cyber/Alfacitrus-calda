import { useState } from "react";

// ═══════════════════════════════════════════════════════════════════════
// CONFIG SUPABASE
// ═══════════════════════════════════════════════════════════════════════
const SUPABASE_URL = "https://ywnrfmblyegeplnlykbt.supabase.co";
const SUPABASE_KEY = "sb_publishable_Xc89uAWDA00rkcKDmBKmFA_Goz7x7HI";
const H = { "Content-Type":"application/json", "apikey":SUPABASE_KEY, "Authorization":`Bearer ${SUPABASE_KEY}` };
// Vazão vem do banco por fazenda — valor padrão até carregar
let VAZAO_BICO_GLOBAL = 1.6;

const sbGet  = async p => { const r=await fetch(`${SUPABASE_URL}/rest/v1/${p}`,{headers:H}); if(!r.ok) throw new Error(await r.text()); return r.json(); };
const sbPost = async (t,b) => { const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}`,{method:"POST",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)}); if(!r.ok) throw new Error(await r.text()); return r.json(); };
const sbPatch= async (t,w,b) => { const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}?${w}`,{method:"PATCH",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(b)}); if(!r.ok) throw new Error(await r.text()); return r.json(); };
const sbDelete= async (t,w) => { const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}?${w}`,{method:"DELETE",headers:H}); if(!r.ok) throw new Error(await r.text()); };

// ═══════════════════════════════════════════════════════════════════════
// CÁLCULOS
// ═══════════════════════════════════════════════════════════════════════
const fv    = v => parseFloat(v)||0;
const fmtL  = v => v>=1000?`${(v/1000).toFixed(1)}k L`:`${Math.round(v)} L`;
const fmtP  = v => `${v.toFixed(1)}%`;
const today = () => new Date().toISOString().split("T")[0];

const sortTalhoes = arr => [...arr].sort((a,b)=>{
  const na=parseInt(a.quadra.replace(/\D/g,""))||0;
  const nb=parseInt(b.quadra.replace(/\D/g,""))||0;
  return na!==nb?na-nb:a.quadra.localeCompare(b.quadra);
});

const calcVEha     = (bicos,vel,esp,vaz=VAZAO_BICO_GLOBAL) => (!bicos||!vel||!esp)?0:(bicos*vaz)/((vel*1000/60)*esp)*10000;
const calcVelPond  = t => { const vt=t.reduce((s,x)=>s+fv(x.volume),0); return vt?t.reduce((s,x)=>s+fv(x.velocidade)*fv(x.volume),0)/vt:0; };
const calcBicosPond= t => { const vt=t.reduce((s,x)=>s+fv(x.volume),0); return vt?t.reduce((s,x)=>s+fv(x.bicos)*fv(x.volume),0)/vt:0; };
const calcVEconsol = (trechos,tals) => {
  const vt=trechos.reduce((s,t)=>s+fv(t.volume),0); if(!vt) return {};
  const bm=trechos.reduce((s,t)=>s+fv(t.bicos)*fv(t.volume),0)/vt;
  const vm=trechos.reduce((s,t)=>s+fv(t.velocidade)*fv(t.volume),0)/vt;
  const r={}; tals.forEach(t=>{ r[t.cod]=calcVEha(bm,vm,t.esp_rua)*t.area; }); return r;
};
const rateioVol = (tals,vol) => {
  const tp=tals.reduce((s,t)=>s+t.plantas,0); const r={};
  tals.forEach(t=>{ r[t.cod]=tp>0?Math.round(vol*(t.plantas/tp)):0; }); return r;
};

// ═══════════════════════════════════════════════════════════════════════
// TEMA
// ═══════════════════════════════════════════════════════════════════════
const TEMA_ESCURO = {
  bg:"#060e06",sur:"#0f1a0f",sur2:"#152215",bor:"#1c321c",bor2:"#111f11",
  gr:"#4ade80",grDim:"#183018",
  tx:"#daeeda",txD:"#618061",txM:"#364e36",
  warn:"#fbbf24",warnBg:"#1a1000",
  err:"#f87171",errBg:"#1a0606",
  ok:"#34d399",okBg:"#041208",
  blue:"#60a5fa",blueBg:"#0a1a2a",
};
const TEMA_CLARO = {
  bg:"#f4f7f4",sur:"#ffffff",sur2:"#ffffff",bor:"#d4e2d4",bor2:"#e8efe8",
  gr:"#16a34a",grDim:"#dcf5e3",
  tx:"#16321a",txD:"#4a6b4f",txM:"#8aa890",
  warn:"#b45309",warnBg:"#fef3c7",
  err:"#dc2626",errBg:"#fee2e2",
  ok:"#15803d",okBg:"#dcfce7",
  blue:"#2563eb",blueBg:"#dbeafe",
};
// C é mutável: aplicarTema troca todas as cores in-place
const C = {...TEMA_ESCURO};
const aplicarTema = claro => Object.assign(C, claro?TEMA_CLARO:TEMA_ESCURO);

// Estilos como FUNÇÕES para refletir o tema atual a cada render
const inp = () => ({width:"100%",background:C.sur,border:`1.5px solid ${C.bor}`,borderRadius:10,padding:"9px 11px",color:C.tx,fontSize:14,boxSizing:"border-box",outline:"none"});
const sel = () => ({...inp(),appearance:"none"});
const btnP= () => ({background:C.gr,color:"#fff",border:"none",borderRadius:12,padding:"12px 16px",fontSize:14,fontWeight:800,width:"100%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7});
const btnG= () => ({background:"transparent",color:C.gr,border:`1px solid ${C.bor}`,borderRadius:12,padding:"11px 16px",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6});
const crd = () => ({background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:14,padding:"12px 14px",marginBottom:10});
const lbl = () => ({fontSize:10,fontWeight:700,color:C.txD,textTransform:"uppercase",letterSpacing:.8,marginBottom:4,display:"block"});

const Bar = ({pct,h=6,cor}) => {
  const c=cor||(pct>=100?C.ok:pct>=65?C.gr:pct>=35?C.warn:C.err);
  return <div style={{background:C.sur,borderRadius:4,height:h,overflow:"hidden",flex:1}}>
    <div style={{width:`${Math.min(pct,100)}%`,height:"100%",background:c,transition:"width .3s"}}/>
  </div>;
};
const Bdg = ({v}) => {
  if(v===null||v===undefined) return <span style={{color:C.txM,fontSize:11}}>—</span>;
  const a=Math.abs(v); const [bg,fg]=a<=5?[C.okBg,C.ok]:a<=10?[C.warnBg,C.warn]:[C.errBg,C.err];
  return <span style={{background:bg,color:fg,borderRadius:6,padding:"2px 7px",fontWeight:700,fontSize:12}}>{v>0?"+":""}{v.toFixed(1)}%</span>;
};

// Ícones
const Ico=({d,s=18})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const IBack  =()=><Ico d="M15 18l-6-6 6-6"/>;
const IPlus  =()=><Ico d="M12 5v14M5 12h14"/>;
const ICheck =()=><Ico d="M20 6L9 17l-5-5"/>;
const ILeaf  =()=><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 8C8 10 5.9 16.17 3.82 19.82"/><path d="M17 8c0 3-1 6-5 8"/><path d="M3.82 19.82L10 14"/></svg>;
const IChart =()=><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
const IGrid  =()=><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
const IList  =()=><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IGear  =()=><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const ILock  =()=><Ico d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"/>;
const IUnlock=()=><Ico d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 019.9-1"/>;
const ISun   =()=><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IMoon  =()=><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>;

// Cor da aplicação (1ª=amarelo, 2ª=azul)
const corAp = idx => idx===0 ? C.warn : C.blue;
const bgCorAp = idx => idx===0 ? C.warnBg : C.blueBg;

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tela,    setTela]    = useState("entrada");
  const [aba,     setAba]     = useState("talhoes");
  const [fazSel,  setFazSel]  = useState(null);
  const [subf,    setSubf]    = useState("FSP");
  const [loading, setLoading] = useState(false);
  const [erroDb,  setErroDb]  = useState(null);
  const [temaClaro, setTemaClaro] = useState(false);
  // Aplica o tema a cada render antes de calcular os estilos
  aplicarTema(temaClaro);

  // Dados banco
  const [fazendas,     setFazendas]     = useState([]);
  const [talhoes,      setTalhoes]      = useState([]);
  const [operadores,   setOperadores]   = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [aplicacoes,   setAplicacoes]   = useState([]);
  const [nextSeq,      setNextSeq]      = useState(1);

  // Senha config
  const [senhaConfig, setSenhaConfig] = useState("1234");
  const [showSenha,   setShowSenha]   = useState(false);
  const [senhaIn,     setSenhaIn]     = useState("");
  const [senhaErr,    setSenhaErr]    = useState(false);

  // Senha fazenda
  const [showSenhaFaz,  setShowSenhaFaz]  = useState(false);
  const [senhaFazIn,    setSenhaFazIn]    = useState("");
  const [senhaFazErr,   setSenhaFazErr]   = useState(false);
  const [fazPendente,   setFazPendente]   = useState(null); // fazenda aguardando senha

  // Modal alerta aplicação simultânea
  const [showAlertaAp, setShowAlertaAp] = useState(false);
  const [alertaTals,   setAlertaTals]   = useState([]);

  // Modal cancelar apontamento
  const [showCancelar,    setShowCancelar]    = useState(false);
  const [showExcluirAp,   setShowExcluirAp]   = useState(false);
  const [senhaExcluirIn,  setSenhaExcluirIn]  = useState("");
  const [senhaExcluirErr, setSenhaExcluirErr] = useState(false);
  const [apExcluirId,     setApExcluirId]     = useState(null);
  const [apontCancelar,   setApontCancelar]   = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  // Navegação
  const [talSel, setTalSel] = useState(null);
  const [apSel,  setApSel]  = useState(null);

  // Form nova aplicação
  const [nfaz,  setNfaz]  = useState("FSP");
  const [ntals, setNtals] = useState([]);

  // Form apontamento
  const [aData, setAData] = useState(today());
  const [aOp,   setAOp]   = useState("");
  const [aEq,   setAEq]   = useState("");
  const [aTre,  setATre]  = useState([{velocidade:"",bicos:"",volume:""}]);
  const [aObs,  setAObs]  = useState("");

  // Config
  const [secao,     setSecao]     = useState("menu");
  const [novaOp,    setNovaOp]    = useState("");
  const [novaOpMat, setNovaOpMat] = useState("");
  const [editOp,    setEditOp]    = useState(null); // {id, nome, matricula} sendo editado
  const [editOpNome,setEditOpNome]= useState("");
  const [editOpMat, setEditOpMat] = useState("");
  const [novaEq,    setNovaEq]    = useState("");
  const [ntCod,  setNtCod]  = useState("");
  const [ntQ,    setNtQ]    = useState("");
  const [ntVar,  setNtVar]  = useState("");
  const [ntPl,   setNtPl]   = useState("");
  const [ntRua,  setNtRua]  = useState("");
  const [ntPlE,  setNtPlE]  = useState("");
  const [ntSubf, setNtSubf] = useState("");
  const [nfNome,  setNfNome]  = useState("");
  const [nfSigla, setNfSigla] = useState("");
  const [nsfNome, setNsfNome] = useState("");
  const [nsfSigla,setNsfSigla]= useState("");
  const [nsfFaz,  setNsfFaz]  = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [configsVazao, setConfigsVazao] = useState([]);
  const [vazaoAtiva, setVazaoAtiva] = useState({id:null,nome:"Padrão",pressao_bar:8,vazao_bico:1.6});
  const [nvcNome,    setNvcNome]    = useState("");
  const [nvcPressao, setNvcPressao] = useState("");
  const [nvcVazao,   setNvcVazao]   = useState("");
  // Seletor de fazenda nas configurações (independente da fazenda de entrada)
  const [fazConfig, setFazConfig] = useState(null);
  const [talhoesCfg, setTalhoesCfg] = useState([]);
  const [operadoresCfg, setOperadoresCfg] = useState([]);
  const [equipamentosCfg, setEquipamentosCfg] = useState([]);
  // Carrega dados de uma fazenda específica para a tela de config
  const carregarConfigFaz = async (faz) => {
    setFazConfig(faz);
    try {
      const subfIds = faz.subfazendas.map(s=>s.id);
      const tals = subfIds.length>0 ? await sbGet(`talhoes?select=*&id_subfazenda=in.(${subfIds.join(",")})&ativo=eq.true&order=cod`) : [];
      setTalhoesCfg(tals);
      const opFaz = await sbGet(`operador_fazenda?select=id_operador&id_fazenda=eq.${faz.id}`);
      const eqFaz = await sbGet(`equipamento_fazenda?select=id_equipamento&id_fazenda=eq.${faz.id}`);
      const opIds = opFaz.map(x=>x.id_operador);
      const eqIds = eqFaz.map(x=>x.id_equipamento);
      setOperadoresCfg(opIds.length>0 ? await sbGet(`operadores?select=*&ativo=eq.true&id=in.(${opIds.join(",")})&order=nome`) : []);
      setEquipamentosCfg(eqIds.length>0 ? await sbGet(`equipamentos?select=*&ativo=eq.true&id=in.(${eqIds.join(",")})&order=nome`) : []);
    } catch(e){ console.error(e); }
  };

  // ── CARREGAR DADOS ──────────────────────────────────────────────────────
  const carregar = async (faz) => {
    setLoading(true); setErroDb(null);
    try {
      // Fazendas e subfazendas
      const fazDB = await sbGet(`fazendas?select=*&ativo=eq.true`);
      const subfDB= await sbGet(`subfazendas?select=*&ativo=eq.true`);
      const fazComSubf = fazDB.map(f=>({...f, subfazendas:subfDB.filter(s=>s.id_fazenda===f.id)}));
      setFazendas(fazComSubf);

      const subfIds = faz.subfazendas.map(s=>s.id);

      // Talhões
      const tals = await sbGet(`talhoes?select=*&id_subfazenda=in.(${subfIds.join(",")})&ativo=eq.true&order=cod`);
      setTalhoes(tals);

      // Operadores e equipamentos filtrados pela fazenda
      const opFaz = await sbGet(`operador_fazenda?select=id_operador&id_fazenda=eq.${faz.id}`);
      const eqFaz = await sbGet(`equipamento_fazenda?select=id_equipamento&id_fazenda=eq.${faz.id}`);
      const opIds = opFaz.map(x=>x.id_operador);
      const eqIds = eqFaz.map(x=>x.id_equipamento);
      const ops = opIds.length>0
        ? await sbGet(`operadores?select=*&ativo=eq.true&id=in.(${opIds.join(",")})&order=nome`)
        : [];
      const eqs = eqIds.length>0
        ? await sbGet(`equipamentos?select=*&ativo=eq.true&id=in.(${eqIds.join(",")})&order=nome`)
        : [];
      setOperadores(ops);
      setEquipamentos(eqs);

      // Senha do banco
      try {
        const cfg = await sbGet(`configuracoes?chave=eq.senha_config&select=valor`);
        if(cfg.length>0) setSenhaConfig(cfg[0].valor);
      } catch(e){}

      // Configurações de vazão da fazenda
      try {
        const cvs = await sbGet(`configuracoes_vazao?id_fazenda=eq.${faz.id}&order=id`);
        setConfigsVazao(cvs);
        const ativa = cvs.find(v=>v.ativo) || cvs[0];
        if(ativa) {
          setVazaoAtiva(ativa);
          VAZAO_BICO_GLOBAL = parseFloat(ativa.vazao_bico);
        }
      } catch(e){}

      // Aplicações
      const aps = await sbGet(`aplicacoes?select=*&id_subfazenda=in.(${subfIds.join(",")})&order=seq.desc`);
      const apsCompl = await Promise.all(aps.map(async ap => {
        const apT = await sbGet(`aplicacao_talhoes?select=cod_talhao&id_aplicacao=eq.${ap.id}`);
        const apts = await sbGet(`apontamentos?select=*&id_aplicacao=eq.${ap.id}&cancelado=eq.false&order=criado_em`);
        const aptsC = await Promise.all(apts.map(async apt => {
          const tres = await sbGet(`trechos?select=*&id_apontamento=eq.${apt.id}&order=ordem`);
          const vols = await sbGet(`apontamento_talhao_volume?select=*&id_apontamento=eq.${apt.id}`);
          const volRat={};
          vols.forEach(v=>{ volRat[v.cod_talhao]=parseFloat(v.vol_rateado); });
          const op=ops.find(o=>o.id===apt.id_operador);
          const eq=eqs.find(e=>e.id===apt.id_equipamento);
          return {
            id:apt.id, data:apt.data, operador:op?.nome||"", equip:eq?.nome||"",
            trechos:tres.map(t=>({velocidade:String(t.velocidade),bicos:String(t.bicos),volume:String(t.volume)})),
            volTotal:parseFloat(apt.vol_total),volRateado:volRat,
            velMedia:parseFloat(apt.vel_media)||0,bicosMedia:parseFloat(apt.bicos_media)||0,
            observacao:apt.observacao||"",cancelado:apt.cancelado,
          };
        }));
        return {
          id:ap.id,seq:ap.seq,fazenda:ap.id_subfazenda,
          talhoes:apT.map(t=>t.cod_talhao),
          status:ap.status,dataCriacao:ap.data_criacao,dataFechamento:ap.data_fechamento,
          apontamentos:aptsC,
        };
      }));
      setAplicacoes(apsCompl);
      // nextSeq deve usar o maior seq GLOBAL do banco (não só da subfazenda),
      // senão pode gerar IDs duplicados que já existem em outras fazendas
      try {
        const maxSeqRes = await sbGet(`aplicacoes?select=seq&order=seq.desc&limit=1`);
        if(maxSeqRes.length>0) setNextSeq(maxSeqRes[0].seq+1);
        else if(aps.length>0) setNextSeq(aps[0].seq+1);
      } catch(e){ if(aps.length>0) setNextSeq(aps[0].seq+1); }

    } catch(e) {
      console.error(e); setErroDb("Sem conexão com o banco");
    } finally { setLoading(false); }
  };

  // ── HELPERS ────────────────────────────────────────────────────────────
  const getTal       = cod => talhoes.find(t=>t.cod===cod);
  const getTalhoesAp = ap  => ap.talhoes.map(c=>getTal(c)).filter(Boolean);
  const apAbertasDeTal=cod => aplicacoes.filter(ap=>ap.status==="aberta"&&ap.talhoes.includes(cod));
  const apsDeTal     = cod => aplicacoes.filter(ap=>ap.talhoes.includes(cod)).sort((a,b)=>b.seq-a.seq);
  const todosTrechos = ap  => ap.apontamentos.filter(r=>!r.cancelado).flatMap(r=>r.trechos);

  const pctCobertura = ap => {
    const tres=todosTrechos(ap); if(!tres.length) return 0;
    const ve=calcVEconsol(tres,getTalhoesAp(ap));
    const veTot=Object.values(ve).reduce((s,v)=>s+v,0);
    const real=ap.apontamentos.filter(r=>!r.cancelado).reduce((s,r)=>s+r.volTotal,0);
    return veTot>0?Math.min((real/veTot)*100,100):0;
  };

  const desvioAp = ap => {
    const tres=todosTrechos(ap); if(!tres.length) return null;
    const ve=calcVEconsol(tres,getTalhoesAp(ap));
    const veTot=Object.values(ve).reduce((s,v)=>s+v,0);
    const real=ap.apontamentos.filter(r=>!r.cancelado).reduce((s,r)=>s+r.volTotal,0);
    return veTot>0?((real-veTot)/veTot)*100:null;
  };

  const ultimoApontamento = ap => {
    const apts=ap.apontamentos.filter(r=>!r.cancelado);
    if(!apts.length) return null;
    return apts[apts.length-1].data;
  };

  // ── AÇÕES ──────────────────────────────────────────────────────────────
  const tentarCriarAp = () => {
    // Verificar aplicações abertas nos talhões selecionados
    const talsComAberta = ntals.filter(t => apAbertasDeTal(t.cod).length > 0);
    if(talsComAberta.length > 0) {
      // Verificar se algum já tem 2 abertas (limite)
      const talsNoLimite = ntals.filter(t => apAbertasDeTal(t.cod).length >= 2);
      if(talsNoLimite.length > 0) {
        alert(`Talhão ${talsNoLimite.map(t=>t.quadra).join(", ")} já atingiu o limite de 2 aplicações simultâneas.`);
        return;
      }
      setAlertaTals(talsComAberta);
      setShowAlertaAp(true);
    } else {
      criarAp();
    }
  };

  const criarAp = async () => {
    // Busca o maior seq atual no banco para evitar ID duplicado
    let seqUsar = nextSeq;
    try {
      const maxRes = await sbGet(`aplicacoes?select=seq&order=seq.desc&limit=1`);
      if(maxRes.length>0 && maxRes[0].seq>=seqUsar) seqUsar = maxRes[0].seq+1;
    } catch(e){}

    const tals=ntals.map(t=>t.cod);
    const subfDest=nfaz;
    setNtals([]);
    setShowAlertaAp(false);

    // Tenta criar; se houver conflito de chave, incrementa e tenta de novo (até 10x)
    let criada=null;
    for(let tentativa=0; tentativa<10; tentativa++){
      const id=`AP-${String(seqUsar).padStart(4,"0")}`;
      try {
        await sbPost("aplicacoes",{id,seq:seqUsar,id_subfazenda:subfDest,status:"aberta",data_criacao:today()});
        await Promise.all(tals.map(cod=>sbPost("aplicacao_talhoes",{id_aplicacao:id,cod_talhao:cod})));
        criada={id,seq:seqUsar,fazenda:subfDest,talhoes:tals,status:"aberta",dataCriacao:today(),apontamentos:[]};
        break;
      } catch(e){
        // 23505 = duplicate key. Tenta o próximo número.
        if(String(e.message).includes("23505")||String(e.message).includes("duplicate")){
          seqUsar++;
          continue;
        }
        console.error(e);
        alert("Erro ao criar aplicação: "+e.message);
        return;
      }
    }
    if(!criada){ alert("Não foi possível gerar um número de aplicação único. Recarregue o app."); return; }

    setAplicacoes(p=>[criada,...p]);
    setNextSeq(seqUsar+1);
    setApSel(criada);
    setTela("apontamento");
  };

  const salvarApt = async () => {
    const ap=aplicacoes.find(x=>x.id===apSel.id);
    const volTotal=aTre.reduce((s,t)=>s+fv(t.volume),0);
    const apId=`R${Date.now()}`;
    const velM=calcVelPond(aTre); const bicosM=calcBicosPond(aTre);
    const tals=getTalhoesAp(ap);
    const novoR={id:apId,data:aData,operador:aOp,equip:aEq,trechos:aTre,volTotal,volRateado:rateioVol(tals,volTotal),velMedia:velM,bicosMedia:bicosM,observacao:aObs,cancelado:false};
    setAplicacoes(p=>p.map(x=>x.id!==ap.id?x:{...x,apontamentos:[...x.apontamentos,novoR]}));
    setAOp(""); setAEq(""); setATre([{velocidade:"",bicos:"",volume:""}]); setAData(today()); setAObs("");
    setTela("ap_detalhe");
    try {
      const opObj=operadores.find(o=>o.nome===aOp);
      const eqObj=equipamentos.find(e=>e.nome===aEq);
      await sbPost("apontamentos",{id:apId,id_aplicacao:ap.id,data:aData,id_operador:opObj?.id||null,id_equipamento:eqObj?.id||null,vol_total:volTotal,vel_media:velM,bicos_media:bicosM,observacao:aObs,cancelado:false,vazao_bico:VAZAO_BICO_GLOBAL});
      await Promise.all(aTre.map((t,i)=>sbPost("trechos",{id_apontamento:apId,velocidade:fv(t.velocidade),bicos:fv(t.bicos),volume:fv(t.volume),ordem:i+1})));
      const veMap=calcVEconsol([...todosTrechos(ap),...aTre],tals);
      await Promise.all(ap.talhoes.map(cod=>sbPost("apontamento_talhao_volume",{id_apontamento:apId,cod_talhao:cod,vol_rateado:novoR.volRateado[cod]||0,ve_consolidado:veMap[cod]||0})));
    } catch(e){console.error(e);}
  };

  const cancelarApontamento = async () => {
    if(!apontCancelar) return;
    const apId=apontCancelar.apId; const rId=apontCancelar.rId;
    setAplicacoes(p=>p.map(ap=>ap.id!==apId?ap:{...ap,apontamentos:ap.apontamentos.map(r=>r.id!==rId?r:{...r,cancelado:true})}));
    setShowCancelar(false); setMotivoCancelamento(""); setApontCancelar(null);
    try { await sbPatch("apontamentos",`id=eq.${rId}`,{cancelado:true,motivo_cancelamento:motivoCancelamento}); }
    catch(e){console.error(e);}
  };

  const fecharAp  = async id => { setAplicacoes(p=>p.map(x=>x.id!==id?x:{...x,status:"fechada",dataFechamento:today()})); try{await sbPatch("aplicacoes",`id=eq.${id}`,{status:"fechada",data_fechamento:today()});}catch(e){} };
  const reabrirAp = async id => { setAplicacoes(p=>p.map(x=>x.id!==id?x:{...x,status:"aberta",dataFechamento:null})); try{await sbPatch("aplicacoes",`id=eq.${id}`,{status:"aberta",data_fechamento:null});}catch(e){} };
  const excluirAplicacao = async (senhaDigitada) => {
    const s = senhaDigitada !== undefined ? senhaDigitada : senhaExcluirIn;
    if(s !== senhaConfig){ setSenhaExcluirErr(true); setSenhaExcluirIn(""); return; }
    try {
      await sbDelete("apontamentos", `id_aplicacao=eq.${apExcluirId}`);
      await sbDelete("aplicacao_talhoes", `id_aplicacao=eq.${apExcluirId}`);
      await sbDelete("aplicacoes", `id=eq.${apExcluirId}`);
      setAplicacoes(p=>p.filter(x=>x.id!==apExcluirId));
      setShowExcluirAp(false); setSenhaExcluirIn(""); setSenhaExcluirErr(false); setApExcluirId(null);
      setTela("main");
    } catch(e) { alert("Erro ao excluir: "+e.message); }
  };

  const aTotal =aTre.reduce((s,t)=>s+fv(t.volume),0);
  const aFormOk=aOp&&aEq&&aTre.every(t=>t.velocidade&&t.bicos&&t.volume);
  const addTre =()=>setATre(p=>[...p,{velocidade:"",bicos:"",volume:""}]);
  const rmTre  =i =>setATre(p=>p.filter((_,j)=>j!==i));
  const updTre =(i,f,v)=>setATre(p=>p.map((t,j)=>j===i?{...t,[f]:v}:t));

  // Senha config
  const digitar = d => {
    if(senhaIn.length>=4) return;
    const nova=senhaIn+d; setSenhaIn(nova); setSenhaErr(false);
    if(nova.length===4){
      if(nova===senhaConfig){setShowSenha(false);setSecao("menu");setTela("config");setSenhaIn("");if(fazSel){setFazConfig(fazSel);setTalhoesCfg(talhoes);setOperadoresCfg(operadores);setEquipamentosCfg(equipamentos);}}
      else{setSenhaErr(true);setTimeout(()=>setSenhaIn(""),500);}
    }
  };

  // Senha fazenda — cada fazenda usa sua própria senha do banco
  const digitarFaz = d => {
    if(senhaFazIn.length>=4) return;
    const nova=senhaFazIn+d; setSenhaFazIn(nova); setSenhaFazErr(false);
    if(nova.length===4){
      const senhaCorreta = fazPendente?.senha || senhaConfig;
      if(nova===senhaCorreta){
        setShowSenhaFaz(false);
        const faz=fazPendente;
        setFazPendente(null);
        setSenhaFazIn("");
        setFazSel(faz);
        setSubf(faz.subfazendas[0]?.id||"");
        setNfaz(faz.subfazendas[0]?.id||"");
        carregar(faz);
        setAba("talhoes");
        setTela("main");
      } else {
        setSenhaFazErr(true);
        setTimeout(()=>setSenhaFazIn(""),500);
      }
    }
  };

  // Estado temporário para campos de senha das fazendas na tela de config
  const [fazSenhas, setFazSenhas] = useState({});

  // ── LAYOUT BASE ────────────────────────────────────────────────────────
  const AppStyle={fontFamily:"'DM Sans','Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto",color:C.tx};

  const Hdr=({titulo,sub,onBack,extra})=>(
    <div style={{background:C.sur2,borderBottom:`1px solid ${C.bor}`,padding:"13px 14px",display:"flex",alignItems:"center",gap:9}}>
      {onBack&&<button onClick={onBack} style={{background:"none",border:"none",color:C.gr,cursor:"pointer",padding:0}}><IBack/></button>}
      <div style={{flex:1}}><div style={{fontSize:15,fontWeight:800}}>{titulo}</div>{sub&&<div style={{fontSize:10,color:C.txD}}>{sub}</div>}</div>
      {extra}
    </div>
  );

  const NavBar=()=>(
    <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.sur2,borderTop:`1px solid ${C.bor}`,display:"flex",padding:"8px 0 12px",zIndex:50}}>
      {[{id:"talhoes",label:"TALHÕES",icon:<IGrid/>},{id:"aplicacoes",label:"APLICAÇÕES",icon:<IList/>},{id:"painel",label:"PAINEL",icon:<IChart/>}].map(n=>(
        <button key={n.id} onClick={()=>{setAba(n.id);setTela("main");}}
          style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",color:aba===n.id?C.gr:C.txM,fontSize:9,fontWeight:700,letterSpacing:.3}}>
          {n.icon}<span>{n.label}</span>
        </button>
      ))}
    </nav>
  );

  const ChipFaz=({active,onClick,children})=>(
    <button onClick={onClick} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:700,border:active?"none":`1px solid ${C.bor}`,background:active?C.gr:"transparent",color:active?"#fff":C.txD,cursor:"pointer"}}>{children}</button>
  );

  // Modal senha
  const ModalSenha=()=>showSenha?(
    <div style={{position:"fixed",inset:0,background:"#000c",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:24}}
      onClick={e=>{if(e.target===e.currentTarget)setShowSenha(false);}}>
      <div style={{background:C.sur2,border:`1.5px solid ${C.bor}`,borderRadius:20,padding:24,width:"100%",maxWidth:300}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:15,fontWeight:800}}>Acesso restrito</div>
          <div style={{fontSize:11,color:C.txM,marginTop:4}}>Senha de 4 dígitos</div>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:14}}>
          {[0,1,2,3].map(i=><div key={i} style={{width:36,height:36,borderRadius:9,background:senhaIn.length>i?C.gr:C.sur,border:senhaErr?`1.5px solid ${C.err}`:`1.5px solid ${C.bor}`}}/>)}
        </div>
        {senhaErr&&<div style={{textAlign:"center",color:C.err,fontSize:12,marginBottom:10}}>Senha incorreta</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:10}}>
          {[1,2,3,4,5,6,7,8,9].map(n=><button key={n} onClick={()=>digitar(String(n))} style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:11,padding:"13px 0",color:C.tx,fontSize:17,fontWeight:700,cursor:"pointer"}}>{n}</button>)}
          <div/>
          <button onClick={()=>digitar("0")} style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:11,padding:"13px 0",color:C.tx,fontSize:17,fontWeight:700,cursor:"pointer"}}>0</button>
          <button onClick={()=>{setSenhaIn(p=>p.slice(0,-1));setSenhaErr(false);}} style={{background:C.bg,border:`1px solid ${C.bor}`,borderRadius:11,padding:"13px 0",color:C.txD,cursor:"pointer"}}>←</button>
        </div>
        <button onClick={()=>setShowSenha(false)} style={{width:"100%",background:"transparent",border:`1px solid ${C.bor}`,borderRadius:11,padding:10,color:C.txD,fontSize:13,cursor:"pointer"}}>Cancelar</button>
      </div>
    </div>
  ):null;

  // Modal senha fazenda
  const ModalSenhaFaz=()=>showSenhaFaz?(
    <div style={{position:"fixed",inset:0,background:"#000c",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:24}}
      onClick={e=>{if(e.target===e.currentTarget){setShowSenhaFaz(false);setFazPendente(null);setSenhaFazIn("");}}}>
      <div style={{background:C.sur2,border:`1.5px solid ${C.bor}`,borderRadius:20,padding:24,width:"100%",maxWidth:300}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:15,fontWeight:800}}>{fazPendente?.nome}</div>
          <div style={{fontSize:11,color:C.txM,marginTop:4}}>Senha de 4 dígitos para acessar</div>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:14}}>
          {[0,1,2,3].map(i=><div key={i} style={{width:36,height:36,borderRadius:9,background:senhaFazIn.length>i?C.gr:C.sur,border:senhaFazErr?`1.5px solid ${C.err}`:`1.5px solid ${C.bor}`}}/>)}
        </div>
        {senhaFazErr&&<div style={{textAlign:"center",color:C.err,fontSize:12,marginBottom:10}}>Senha incorreta</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:10}}>
          {[1,2,3,4,5,6,7,8,9].map(n=><button key={n} onClick={()=>digitarFaz(String(n))} style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:11,padding:"13px 0",color:C.tx,fontSize:17,fontWeight:700,cursor:"pointer"}}>{n}</button>)}
          <div/>
          <button onClick={()=>digitarFaz("0")} style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:11,padding:"13px 0",color:C.tx,fontSize:17,fontWeight:700,cursor:"pointer"}}>0</button>
          <button onClick={()=>{setSenhaFazIn(p=>p.slice(0,-1));setSenhaFazErr(false);}} style={{background:C.bg,border:`1px solid ${C.bor}`,borderRadius:11,padding:"13px 0",color:C.txD,cursor:"pointer"}}>←</button>
        </div>
        <button onClick={()=>{setShowSenhaFaz(false);setFazPendente(null);setSenhaFazIn("");}} style={{width:"100%",background:"transparent",border:`1px solid ${C.bor}`,borderRadius:11,padding:10,color:C.txD,fontSize:13,cursor:"pointer"}}>Cancelar</button>
      </div>
    </div>
  ):null;

  // Modal alerta aplicação simultânea
  const ModalAlertaAp=()=>showAlertaAp?(
    <div style={{position:"fixed",inset:0,background:"#000c",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:24}}>
      <div style={{background:C.sur2,border:`1.5px solid ${C.warn}44`,borderRadius:20,padding:24,width:"100%",maxWidth:320}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:18,marginBottom:8}}>⚠️</div>
          <div style={{fontSize:15,fontWeight:800,color:C.warn}}>Aplicação em andamento</div>
          <div style={{fontSize:12,color:C.txD,marginTop:8,lineHeight:1.5}}>
            {`Talhão ${alertaTals.map(t=>t.quadra).join(", ")} já possui uma aplicação aberta. Deseja abrir uma segunda aplicação simultânea?`}
          </div>
        </div>
        <div style={{background:C.bg,borderRadius:10,padding:"10px 12px",marginBottom:16,fontSize:11,color:C.txM}}>
          A segunda aplicação será exibida em <span style={{color:C.blue,fontWeight:700}}>azul</span> para diferenciação.
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowAlertaAp(false)} style={{...btnG(),flex:1,justifyContent:"center"}}>Cancelar</button>
          <button onClick={criarAp} style={{...btnP(),flex:1,background:C.blue}}><ICheck/> Confirmar</button>
        </div>
      </div>
    </div>
  ):null;

  // Modal cancelar apontamento
  const ModalCancelar=()=>showCancelar?(
    <div style={{position:"fixed",inset:0,background:"#000c",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:24}}>
      <div style={{background:C.sur2,border:`1.5px solid ${C.err}44`,borderRadius:20,padding:24,width:"100%",maxWidth:320}}>
        <div style={{fontSize:15,fontWeight:800,color:C.err,marginBottom:8}}>Cancelar apontamento</div>
        <div style={{fontSize:12,color:C.txD,marginBottom:12}}>O apontamento será marcado como cancelado mas permanece no histórico para auditoria.</div>
        <span style={lbl()}>Motivo (opcional)</span>
        <textarea value={motivoCancelamento} onChange={e=>setMotivoCancelamento(e.target.value)}
          placeholder="Ex: volume informado incorretamente"
          style={{...inp(),height:80,resize:"none",marginBottom:12}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setShowCancelar(false)} style={{...btnG(),flex:1,justifyContent:"center"}}>Voltar</button>
          <button onClick={cancelarApontamento} style={{flex:1,background:C.errBg,color:C.err,border:`1px solid ${C.err}33`,borderRadius:12,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Cancelar apontamento</button>
        </div>
      </div>
    </div>
  ):null;

  const ModalExcluirAp=()=>showExcluirAp?(
    <div style={{position:"fixed",inset:0,background:"#000c",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:24}}>
      <div style={{background:C.sur2,border:`1.5px solid ${C.err}44`,borderRadius:20,padding:24,width:"100%",maxWidth:320}}>
        <div style={{fontSize:15,fontWeight:800,color:C.err,marginBottom:6}}>Excluir aplicação</div>
        <div style={{background:C.errBg,border:`1px solid ${C.err}33`,borderRadius:10,padding:"10px 12px",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:900,color:C.err,marginBottom:3}}>{apExcluirId}</div>
          <div style={{fontSize:11,color:C.txD,lineHeight:1.6}}>Esta ação é <b style={{color:C.err}}>irreversível</b>. A aplicação e todos os seus dados serão permanentemente removidos do banco.</div>
        </div>
        <div style={{textAlign:"center",marginBottom:10}}>
          <div style={{fontSize:11,color:C.txM,marginBottom:10}}>Digite a senha de configuração</div>
          <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:10}}>
            {[0,1,2,3].map(i=><div key={i} style={{width:36,height:36,borderRadius:9,background:senhaExcluirIn.length>i?C.err:C.sur,border:senhaExcluirErr?`1.5px solid ${C.err}`:`1.5px solid ${C.bor}`}}/>)}
          </div>
          {senhaExcluirErr&&<div style={{color:C.err,fontSize:12,marginBottom:8}}>Senha incorreta</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:10}}>
            {[1,2,3,4,5,6,7,8,9].map(n=>(
              <button key={n} onClick={()=>{
                if(senhaExcluirIn.length>=4)return;
                const nova=senhaExcluirIn+String(n);
                setSenhaExcluirIn(nova);setSenhaExcluirErr(false);
              }} style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:11,padding:"13px 0",color:C.tx,fontSize:17,fontWeight:700,cursor:"pointer"}}>{n}</button>
            ))}
            <div/>
            <button onClick={()=>{
              if(senhaExcluirIn.length>=4)return;
              const nova=senhaExcluirIn+"0";
              setSenhaExcluirIn(nova);setSenhaExcluirErr(false);
            }} style={{background:C.sur,border:`1px solid ${C.bor}`,borderRadius:11,padding:"13px 0",color:C.tx,fontSize:17,fontWeight:700,cursor:"pointer"}}>0</button>
            <button onClick={()=>{setSenhaExcluirIn(p=>p.slice(0,-1));setSenhaExcluirErr(false);}}
              style={{background:C.bg,border:`1px solid ${C.bor}`,borderRadius:11,padding:"13px 0",color:C.txD,cursor:"pointer"}}>←</button>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{setShowExcluirAp(false);setSenhaExcluirIn("");setSenhaExcluirErr(false);}} style={{...btnG(),flex:1,justifyContent:"center"}}>Cancelar</button>
          <button onClick={()=>excluirAplicacao()} style={{flex:1,background:senhaExcluirIn.length===4?C.err:`${C.err}55`,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontSize:13,fontWeight:700,cursor:senhaExcluirIn.length===4?"pointer":"default"}}>Excluir</button>
        </div>
      </div>
    </div>
  ):null;

  // ════════════════════════════════════════════════════════════════════════
  // TELA: ENTRADA
  // ════════════════════════════════════════════════════════════════════════
  if(tela==="entrada") return (
    <div style={{...AppStyle,background:temaClaro?C.bg:"#040a04",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 24px",position:"relative"}}>
      <div style={{position:"absolute",inset:0,background:temaClaro?"radial-gradient(ellipse at 50% 40%, #e6f4ea 0%, #f4f7f4 70%)":"radial-gradient(ellipse at 50% 40%, #0d2a0d 0%, #040a04 70%)",pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:1,width:"100%",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{width:72,height:72,background:temaClaro?C.grDim:"#0f1f0f",border:`1.5px solid ${C.grDim}`,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,color:C.gr}}><ILeaf/></div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:4,color:`${C.gr}66`,marginBottom:6}}>ALFACITRUS</div>
        <div style={{fontSize:24,fontWeight:900,color:C.tx,marginBottom:4}}>Controle de Calda</div>
        <div style={{fontSize:12,color:C.txM,marginBottom:36}}>Pulverização fitossanitária</div>
        <div style={{width:"100%"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:C.txM,textAlign:"center",marginBottom:12}}>SELECIONE A PROPRIEDADE</div>
          {loading&&<div style={{textAlign:"center",color:C.txD,fontSize:12,marginBottom:12}}>Carregando fazendas...</div>}
          {fazendas.length===0&&!loading&&(
            <button onClick={async()=>{
              setLoading(true);
              try{
                const fazDB=await sbGet(`fazendas?select=*&ativo=eq.true`);
                const subfDB=await sbGet(`subfazendas?select=*&ativo=eq.true`);
                const fazComSubf=fazDB.map(f=>({...f,subfazendas:subfDB.filter(s=>s.id_fazenda===f.id)}));
                setFazendas(fazComSubf);
              }catch(e){setErroDb("Erro ao carregar fazendas");}
              setLoading(false);
            }} style={btnP()}>Carregar fazendas</button>
          )}
          {fazendas.map(faz=>(
            <button key={faz.id} onClick={()=>{setFazPendente(faz);setSenhaFazIn("");setSenhaFazErr(false);setShowSenhaFaz(true);}}
              style={{width:"100%",background:C.sur,border:`1.5px solid ${C.bor}`,borderRadius:16,padding:"18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14,textAlign:"left",marginBottom:10,color:C.tx}}>
              <div style={{width:42,height:42,background:C.sur2,border:`1px solid ${C.bor}`,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gr} strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:800,marginBottom:2}}>{faz.nome}</div>
                <div style={{fontSize:11,color:C.txD}}>{faz.subfazendas.map(s=>s.sigla).join(" · ")}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.txM} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </div>
        <div style={{fontSize:10,color:C.txM,marginTop:20,letterSpacing:1}}>v8.6 · 8 bar · 1,6 L/min por bico</div>
      </div>
      <button onClick={()=>setTemaClaro(t=>!t)}
        style={{position:"fixed",bottom:24,left:24,width:44,height:44,background:temaClaro?C.sur:"#0a140a",border:`1px solid ${C.bor}`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:C.txD,cursor:"pointer",zIndex:50}}>
        {temaClaro?<IMoon/>:<ISun/>}
      </button>
      <button onClick={()=>{setShowSenha(true);setSenhaIn("");setSenhaErr(false);}}
        style={{position:"fixed",bottom:24,right:24,width:44,height:44,background:temaClaro?C.sur:"#0a140a",border:`1px solid ${C.bor}`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",color:C.txM,cursor:"pointer",zIndex:50}}>
        <IGear/>
      </button>
      <ModalSenha/>
      <ModalSenhaFaz/>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // TELA MAIN
  // ════════════════════════════════════════════════════════════════════════
  if(tela==="main") {
    const subfTals=sortTalhoes(talhoes.filter(t=>t.id_subfazenda===subf));

    const TabTalhoes=()=>(
      <div style={{padding:"12px 12px 88px"}}>
        {loading&&<div style={{...crd(),textAlign:"center",fontSize:12,color:C.txD}}>Sincronizando...</div>}
        {erroDb&&<div style={{...crd(),background:C.warnBg,borderColor:`${C.warn}33`,fontSize:12,color:C.warn,textAlign:"center"}}>⚠ {erroDb}</div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:11,color:C.txD,fontWeight:600}}>{subfTals.filter(t=>apAbertasDeTal(t.cod).length>0).length} em andamento · {subfTals.length} talhões</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {subfTals.map(t=>{
            const abs=apAbertasDeTal(t.cod);
            const hist=apsDeTal(t.cod);
            const ultima=hist.find(a=>a.status==="fechada");
            const status=abs.length>0?"aberta":ultima?"fechada":"nenhuma";
            return (
              <button key={t.cod} onClick={()=>{setTalSel(t);setTela("tal_detalhe");}}
                style={{background:C.sur2,border:`1px solid ${abs.length>0?`${corAp(0)}44`:C.bor}`,borderRadius:14,padding:"11px 12px",cursor:"pointer",textAlign:"left",color:C.tx}}>
                <div style={{fontSize:26,fontWeight:900,lineHeight:1,marginBottom:2}}>{t.quadra}</div>
                <div style={{fontSize:10,color:C.txD,marginBottom:6,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.variedade}</div>
                {abs.map((ap,i)=>(
                  <div key={ap.id} style={{marginBottom:4}}>
                    <Bar pct={pctCobertura(ap)} h={4} cor={corAp(i)}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:3}}>
                      <span style={{fontSize:8,background:bgCorAp(i),color:corAp(i),borderRadius:4,padding:"1px 5px",fontWeight:700}}>{i===0?"ANDAMENTO":"2ª APLIC."}</span>
                      <span style={{fontSize:10,fontWeight:700,color:corAp(i)}}>{fmtP(pctCobertura(ap))}</span>
                    </div>
                  </div>
                ))}
                {status==="aberta"&&ultimoApontamento(abs[0])&&(
                  <div style={{fontSize:9,color:C.txM,marginTop:3}}>último: {ultimoApontamento(abs[0])}</div>
                )}
                {status==="fechada"&&<div style={{fontSize:9,background:C.okBg,color:C.ok,borderRadius:4,padding:"1px 5px",fontWeight:700,display:"inline-block"}}>CONCLUÍDO</div>}
                {status==="nenhuma"&&<div style={{fontSize:10,color:C.txM}}>Sem aplicação</div>}
              </button>
            );
          })}
        </div>
        <button onClick={()=>{setNfaz(subf);setNtals([]);setTela("nova_ap");}} style={btnP()}><IPlus/> Nova aplicação</button>
      </div>
    );

    const exportarExcel = () => {
      const lista = aplicacoes.filter(ap=>ap.fazenda===subf).sort((a,b)=>b.seq-a.seq);
      const linhas = [];

      lista.forEach(ap => {
        const tals  = getTalhoesAp(ap);
        const apts  = ap.apontamentos.filter(r=>!r.cancelado);

        // para cada talhão separado
        tals.forEach(tal => {
          const veTal  = apts.reduce((s,r)=>{ const m=calcVEconsol(r.trechos,[tal]); return s+(m[tal.cod]||0); },0);
          const volTal = apts.reduce((s,r)=>s+(r.volRateado?.[tal.cod]||0),0);
          const cobTal = veTal>0?Math.min((volTal/veTal)*100,100):0;
          const desvTal= veTal>0?((volTal-veTal)/veTal)*100:null;

          // linha RESUMO do talhão
          linhas.push({
            "ID Aplicação":             ap.id,
            "Seq":                       ap.seq,
            "Fazenda":                   fazSel?.nome||"",
            "Subfazenda":                subf,
            "Talhão":                    tal.quadra,
            "Variedade":                 tal.variedade,
            "Área (ha)":                 +tal.area.toFixed(2),
            "Plantas":                   tal.plantas,
            "Status":                    ap.status==="aberta"?"Aberta":"Concluída",
            "Data criação":              ap.dataCriacao||"",
            "Data fechamento":           ap.dataFechamento||"",
            "Qtd apontamentos":          apts.length,
            "Vol. realizado talhão (L)": +volTal.toFixed(0),
            "VE esperado talhão (L)":    +veTal.toFixed(0),
            "Cobertura talhão (%)":      +cobTal.toFixed(1),
            "Desvio talhão (%)":         desvTal!==null?+desvTal.toFixed(2):"",
            "Tipo":                      "RESUMO TALHÃO",
            "Apto #":                    "",
            "Data apontamento":          "",
            "Operador":                  "",
            "Equipamento":               "",
            "Vol. apontamento talhão (L)":"",
            "Vel. apontamento (km/h)":   "",
            "Bicos apontamento":         "",
            "Observação":                "",
          });

          // linhas APONTAMENTO — volume rateado para este talhão
          apts.forEach((r,i) => {
            const volAptTal = r.volRateado?.[tal.cod]||0;
            linhas.push({
              "ID Aplicação":              ap.id,
              "Seq":                        ap.seq,
              "Fazenda":                    fazSel?.nome||"",
              "Subfazenda":                 subf,
              "Talhão":                     tal.quadra,
              "Variedade":                  tal.variedade,
              "Área (ha)":                  +tal.area.toFixed(2),
              "Plantas":                    tal.plantas,
              "Status":                     ap.status==="aberta"?"Aberta":"Concluída",
              "Data criação":               ap.dataCriacao||"",
              "Data fechamento":            ap.dataFechamento||"",
              "Qtd apontamentos":           apts.length,
              "Vol. realizado talhão (L)":  +volTal.toFixed(0),
              "VE esperado talhão (L)":     +veTal.toFixed(0),
              "Cobertura talhão (%)":       +cobTal.toFixed(1),
              "Desvio talhão (%)":          desvTal!==null?+desvTal.toFixed(2):"",
              "Tipo":                       "APONTAMENTO",
              "Apto #":                     i+1,
              "Data apontamento":           r.data||"",
              "Operador":                   r.operador||"",
              "Equipamento":                r.equip||"",
              "Vol. apontamento talhão (L)":+volAptTal.toFixed(0),
              "Vel. apontamento (km/h)":    +r.velMedia.toFixed(2),
              "Bicos apontamento":          +r.bicosMedia.toFixed(1),
              "Observação":                 r.observacao||"",
            });
          });
        });
      });

      const gerarArquivo = (XLSX) => {
        const ws = XLSX.utils.json_to_sheet(linhas);
        ws["!cols"] = Object.keys(linhas[0]||{}).map(()=>({wch:16}));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Aplicações");
        const nomeFaz = fazSel?.nome?.replace(/\s/g,"_")||subf;
        XLSX.writeFile(wb, `AlfaCitrus_${nomeFaz}_${subf}_${today()}.xlsx`);
      };

      if(window.XLSX){
        gerarArquivo(window.XLSX);
      } else {
        const script = document.createElement("script");
        script.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
        script.onload = () => gerarArquivo(window.XLSX);
        script.onerror = () => {
          // fallback CSV
          const header = Object.keys(linhas[0]||{}).join(";");
          const rows   = linhas.map(l=>Object.values(l).join(";")).join("\n");
          const blob   = new Blob(["\uFEFF"+header+"\n"+rows],{type:"text/csv;charset=utf-8;"});
          const url    = URL.createObjectURL(blob);
          const a      = document.createElement("a");
          a.href=url; a.download=`AlfaCitrus_${subf}_${today()}.csv`; a.click();
          URL.revokeObjectURL(url);
        };
        document.head.appendChild(script);
      }
    };

    const TabAplicacoes=()=>{
      const lista=aplicacoes.filter(ap=>ap.fazenda===subf).sort((a,b)=>b.seq-a.seq);
      return (
        <div style={{padding:"12px 12px 88px"}}>
          {lista.length>0&&(
            <button onClick={exportarExcel}
              style={{...btnG(),width:"100%",justifyContent:"center",marginBottom:10,color:C.ok,borderColor:`${C.ok}33`}}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar Excel ({lista.length} aplicações)
            </button>
          )}
          {lista.length===0&&<div style={{...crd(),textAlign:"center",color:C.txD,fontSize:13}}>Nenhuma aplicação</div>}
          {lista.map((ap,idx)=>{
            const pct=pctCobertura(ap); const volR=ap.apontamentos.filter(r=>!r.cancelado).reduce((s,r)=>s+r.volTotal,0); const dev=desvioAp(ap);
            // Índice para cor (se tem irmão aberto no mesmo talhão)
            const talsAbs=ap.talhoes.flatMap(cod=>apAbertasDeTal(cod));
            const corIdx=talsAbs.indexOf(ap)>0?1:0;
            return (
              <div key={ap.id} style={{...crd(),cursor:"pointer",borderColor:ap.status==="aberta"?`${corAp(corIdx)}33`:C.bor}} onClick={()=>{setApSel(ap);setTela("ap_detalhe");}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div>
                    <div style={{fontSize:17,fontWeight:900}}>Talhão {ap.talhoes.map(c=>getTal(c)?.quadra).join(" + ")}</div>
                    <div style={{fontSize:9,color:C.txM}}>{ap.id} · {ap.dataCriacao}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:7,background:ap.status==="aberta"?bgCorAp(corIdx):C.okBg,color:ap.status==="aberta"?corAp(corIdx):C.ok}}>
                      {ap.status==="aberta"?"ABERTA":"CONCLUÍDA"}
                    </span>
                    {dev!==null&&<div style={{marginTop:3}}><Bdg v={dev}/></div>}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <Bar pct={pct} h={6} cor={ap.status==="aberta"?corAp(corIdx):undefined}/>
                  <span style={{fontSize:11,fontWeight:700,color:pct>=100?C.ok:corAp(corIdx),whiteSpace:"nowrap"}}>{fmtP(pct)}</span>
                </div>
                <div style={{fontSize:10,color:C.txM}}>{fmtL(volR)} · {ap.apontamentos.filter(r=>!r.cancelado).length} apontamento(s)</div>
              </div>
            );
          })}
        </div>
      );
    };

    const TabPainel=()=>{
      const todas=aplicacoes.filter(ap=>ap.fazenda===subf);
      const fechadas=todas.filter(ap=>ap.status==="fechada");
      const abertas=todas.filter(ap=>ap.status==="aberta");
      const volTot=todas.reduce((s,ap)=>s+ap.apontamentos.filter(r=>!r.cancelado).reduce((a,r)=>a+r.volTotal,0),0);
      const desvMap={};
      fechadas.forEach(ap=>{
        const tals=getTalhoesAp(ap);
        const veMap=calcVEconsol(todosTrechos(ap),tals);
        ap.talhoes.forEach(cod=>{
          const t=getTal(cod); if(!t) return;
          const real=ap.apontamentos.filter(r=>!r.cancelado).reduce((s,r)=>s+(r.volRateado[cod]||0),0);
          const esp=veMap[cod]||0;
          const dev=esp>0?((real-esp)/esp)*100:null;
          if(!desvMap[cod]) desvMap[cod]={cod,q:t.quadra,var:t.variedade,devs:[],vols:[]};
          if(dev!==null) desvMap[cod].devs.push(dev);
          desvMap[cod].vols.push(real);
        });
      });
      const stats=Object.values(desvMap).map(x=>({...x,devMed:x.devs.length?x.devs.reduce((a,b)=>a+b,0)/x.devs.length:null,volTot:x.vols.reduce((a,b)=>a+b,0)})).sort((a,b)=>Math.abs(b.devMed||0)-Math.abs(a.devMed||0));
      const criticos=stats.filter(s=>s.devMed!==null&&Math.abs(s.devMed)>15).length;
      return (
        <div style={{padding:"12px 12px 88px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:7,marginBottom:12}}>
            {[{l:"Aplicações",v:todas.length,c:C.gr},{l:"Concluídas",v:fechadas.length,c:C.ok},{l:"Vol. Total",v:fmtL(volTot),c:C.gr},{l:"Críticos",v:criticos,c:criticos>0?C.err:C.ok}].map(k=>(
              <div key={k.l} style={{...crd(),textAlign:"center",padding:"9px 4px",marginBottom:0}}>
                <div style={{fontSize:18,fontWeight:900,color:k.c}}>{k.v}</div>
                <div style={{fontSize:8,color:C.txM,textTransform:"uppercase"}}>{k.l}</div>
              </div>
            ))}
          </div>
          {abertas.length>0&&(
            <div style={crd()}>
              <span style={lbl()}>Em andamento</span>
              {abertas.map(ap=>{
                const pct=pctCobertura(ap);
                const veMap=calcVEconsol(todosTrechos(ap),getTalhoesAp(ap));
                const veTot=Object.values(veMap).reduce((s,v)=>s+v,0);
                const volR=ap.apontamentos.filter(r=>!r.cancelado).reduce((s,r)=>s+r.volTotal,0);
                const ult=ultimoApontamento(ap);
                return (
                  <div key={ap.id} style={{padding:"8px 0",borderBottom:`1px solid ${C.bor2}`,cursor:"pointer"}} onClick={()=>{setApSel(ap);setTela("ap_detalhe");}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <div><span style={{fontSize:13,fontWeight:800}}>Talhão {ap.talhoes.map(c=>getTal(c)?.quadra).join("+")}</span>{ult&&<div style={{fontSize:9,color:C.txM}}>último apto: {ult}</div>}</div>
                      <span style={{fontSize:11,fontWeight:700,color:C.warn}}>{fmtP(pct)}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Bar pct={pct} h={5}/>
                      <span style={{fontSize:10,color:C.txM,whiteSpace:"nowrap"}}>{fmtL(volR)}/{fmtL(veTot)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={crd()}>
            <span style={lbl()}>Desvio por talhão — aplicações concluídas</span>
            {stats.length===0&&<p style={{fontSize:12,color:C.txM}}>Nenhuma aplicação concluída.</p>}
            {stats.map(t=>{
              const abs=t.devMed!==null?Math.abs(t.devMed):0;
              const cor=abs<=5?C.ok:abs<=15?C.warn:C.err;
              return (
                <div key={t.cod} style={{padding:"7px 0",borderBottom:`1px solid ${C.bor2}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div><span style={{fontSize:12,fontWeight:800}}>Talhão {t.q}</span><span style={{fontSize:10,color:C.txM,marginLeft:5}}>{t.var}</span></div>
                    <Bdg v={t.devMed}/>
                  </div>
                  <div style={{background:C.sur,borderRadius:4,height:5,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(abs*4,100)}%`,height:"100%",background:cor,borderRadius:4}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div style={AppStyle}>
        <Hdr titulo={fazSel?.nome||"AlfaCitrus"} sub="Controle de pulverização" onBack={()=>setTela("entrada")}
          extra={<div style={{display:"flex",gap:6}}>{fazSel?.subfazendas.map(s=><ChipFaz key={s.id} active={subf===s.id} onClick={()=>setSubf(s.id)}>{s.sigla}</ChipFaz>)}</div>}/>
        {aba==="talhoes"&&<TabTalhoes/>}
        {aba==="aplicacoes"&&<TabAplicacoes/>}
        {aba==="painel"&&<TabPainel/>}
        <NavBar/>
        <ModalAlertaAp/>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // TELA: DETALHE TALHÃO
  // ════════════════════════════════════════════════════════════════════════
  if(tela==="tal_detalhe"&&talSel) {
    const abs=apAbertasDeTal(talSel.cod);
    const hist=apsDeTal(talSel.cod).filter(a=>a.status==="fechada");
    return (
      <div style={AppStyle}>
        <Hdr titulo={`Talhão ${talSel.quadra}`} sub={`${talSel.variedade} · ${parseFloat(talSel.area).toFixed(2)} ha · ${talSel.plantas.toLocaleString("pt-BR")} pl`} onBack={()=>setTela("main")}/>
        <div style={{padding:12}}>
          {abs.map((ap,i)=>{
            const pct=pctCobertura(ap);
            const veMap=calcVEconsol(todosTrechos(ap),getTalhoesAp(ap));
            const real=ap.apontamentos.filter(r=>!r.cancelado).reduce((s,r)=>s+(r.volRateado[talSel.cod]||0),0);
            const esp=veMap[talSel.cod]||0;
            const falta=Math.max(esp-real,0);
            const cor=corAp(i);
            return (
              <div key={ap.id} style={{...crd(),borderColor:`${cor}55`,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:700,color:cor}}>{i===0?"Em andamento":"2ª aplicação"} · {ap.id}</span>
                  <span style={{fontSize:16,fontWeight:900,color:cor}}>{fmtP(pct)}</span>
                </div>
                <Bar pct={pct} h={7} cor={cor}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.txD,marginTop:6}}>
                  <span>Realizado: <b style={{color:C.tx}}>{fmtL(real)}</b></span>
                  <span>Esperado: <b style={{color:C.tx}}>{fmtL(esp)}</b></span>
                </div>
                {falta>0&&<div style={{fontSize:11,color:cor,textAlign:"center",marginTop:5}}>~{fmtL(falta)} restante</div>}
                {ultimoApontamento(ap)&&<div style={{fontSize:10,color:C.txM,marginTop:4}}>Último apontamento: {ultimoApontamento(ap)}</div>}
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <button onClick={()=>{setApSel(ap);setTela("apontamento");}} style={{...btnP(),flex:1,padding:"11px",background:cor}}>+ Apontar</button>
                  <button onClick={()=>{setApSel(ap);setTela("ap_detalhe");}} style={{...btnG(),flex:1,justifyContent:"center"}}>Detalhes</button>
                </div>
              </div>
            );
          })}
          {abs.length===0&&<button onClick={()=>{setNfaz(subf);setNtals([talSel]);setTela("nova_ap");}} style={btnP()}><IPlus/> Iniciar nova aplicação</button>}
          {hist.length>0&&(
            <div style={crd()}>
              <span style={lbl()}>Histórico</span>
              {hist.map(ap=>{
                const real=ap.apontamentos.filter(r=>!r.cancelado).reduce((s,r)=>s+(r.volRateado[talSel.cod]||0),0);
                const veMap=calcVEconsol(todosTrechos(ap),getTalhoesAp(ap));
                const esp=veMap[talSel.cod]||0;
                const dev=esp>0?((real-esp)/esp)*100:null;
                return (
                  <div key={ap.id} onClick={()=>{setApSel(ap);setTela("ap_detalhe");}} style={{padding:"8px 0",borderBottom:`1px solid ${C.bor2}`,cursor:"pointer",display:"flex",justifyContent:"space-between"}}>
                    <div><div style={{fontSize:12,fontWeight:700}}>{ap.id}</div><div style={{fontSize:10,color:C.txM}}>{ap.dataCriacao} → {ap.dataFechamento}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:700,color:C.gr}}>{fmtL(real)}</div><Bdg v={dev}/></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // TELA: NOVA APLICAÇÃO
  // ════════════════════════════════════════════════════════════════════════
  if(tela==="nova_ap") {
    const tals=sortTalhoes(talhoes.filter(t=>t.id_subfazenda===nfaz));
    return (
      <div style={AppStyle}>
        <Hdr titulo="Nova aplicação" sub={`AP-${String(nextSeq).padStart(4,"0")}`} onBack={()=>setTela("main")}/>
        <div style={{padding:12}}>
          <div style={crd()}>
            <span style={lbl()}>Subfazenda</span>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {fazSel?.subfazendas.map(s=><ChipFaz key={s.id} active={nfaz===s.id} onClick={()=>{setNfaz(s.id);setNtals([]);}}>{s.sigla}</ChipFaz>)}
            </div>
            <span style={lbl()}>Talhões</span>
            <div style={{display:"flex",flexWrap:"wrap"}}>
              {tals.map(t=>{
                const nAbs=apAbertasDeTal(t.cod).length;
                const noLimite=nAbs>=2;
                return (
                  <button key={t.cod} disabled={noLimite}
                    onClick={()=>setNtals(p=>p.find(x=>x.cod===t.cod)?p.filter(x=>x.cod!==t.cod):[...p,t])}
                    style={{padding:"5px 10px",borderRadius:13,fontSize:11,fontWeight:600,border:ntals.find(x=>x.cod===t.cod)?"none":`1px solid ${noLimite?C.err:C.bor}`,background:ntals.find(x=>x.cod===t.cod)?C.gr:noLimite?C.errBg:C.sur,color:ntals.find(x=>x.cod===t.cod)?"#fff":noLimite?C.err:C.txD,cursor:noLimite?"not-allowed":"pointer",margin:"3px 2px",opacity:noLimite?0.5:1}}>
                    {t.quadra}{nAbs>0?` (${nAbs})`:""}</button>
                );
              })}
            </div>
            {ntals.length>0&&(
              <div style={{background:C.sur,borderRadius:8,padding:"8px 10px",marginTop:10}}>
                {ntals.map(t=><div key={t.cod} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.txD,padding:"2px 0"}}><span>Talhão {t.quadra} · {t.variedade}</span><span style={{color:C.gr,fontWeight:700}}>{t.plantas.toLocaleString("pt-BR")} pl</span></div>)}
              </div>
            )}
          </div>
          <button onClick={tentarCriarAp} disabled={ntals.length===0} style={{...btnP(),opacity:ntals.length>0?1:0.4}}>Criar e fazer 1º apontamento</button>
        </div>
        <ModalAlertaAp/>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // TELA: APONTAMENTO
  // ════════════════════════════════════════════════════════════════════════
  if(tela==="apontamento"&&apSel) {
    const ap=aplicacoes.find(x=>x.id===apSel.id)||apSel;
    const tals=getTalhoesAp(ap);
    const tresAcumNovos=[...todosTrechos(ap),...aTre.filter(t=>t.velocidade&&t.bicos&&t.volume)];
    const volAcum=ap.apontamentos.filter(r=>!r.cancelado).reduce((s,r)=>s+r.volTotal,0);
    const veNovos=tresAcumNovos.length>0?calcVEconsol(tresAcumNovos,tals):{};
    const veTot=Object.values(veNovos).reduce((s,v)=>s+v,0);
    const desvio=veTot>0?((volAcum+aTotal-veTot)/veTot)*100:null;
    const rateio=aTotal>0?rateioVol(tals,aTotal):{};

    return (
      <div style={AppStyle}>
        <Hdr titulo={`Talhão ${tals.map(t=>t.quadra).join(" + ")}`} sub={`${ap.id} · Apontamento #${ap.apontamentos.filter(r=>!r.cancelado).length+1}`} onBack={()=>setTela("ap_detalhe")}/>
        <div style={{padding:12}}>
          {ap.apontamentos.filter(r=>!r.cancelado).length>0&&veTot>0&&(
            <div style={{...crd(),borderColor:C.grDim,padding:"10px 13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:700,marginBottom:5}}>
                <span style={{color:C.txD,fontSize:11}}>Cobertura consolidada</span>
                <span style={{color:veTot>0&&Math.min((volAcum/veTot)*100,100)>=100?C.ok:C.warn}}>{fmtP(veTot>0?Math.min((volAcum/veTot)*100,100):0)}</span>
              </div>
              <Bar pct={veTot>0?Math.min((volAcum/veTot)*100,100):0} h={6}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.txD,marginTop:6}}>
                <span>Realizado: <b style={{color:C.tx}}>{fmtL(volAcum)}</b></span>
                <span>VE: <b style={{color:C.tx}}>{fmtL(veTot)}</b></span>
              </div>
              {tresAcumNovos.length>0&&(()=>{
                const velM=calcVelPond(tresAcumNovos);
                const bicosM=calcBicosPond(tresAcumNovos);
                return (
                  <div style={{display:"flex",gap:10,fontSize:11,color:C.txD,marginTop:5,flexWrap:"wrap"}}>
                    <span>Vel. méd.: <b style={{color:C.tx}}>{velM.toFixed(2)} km/h</b></span>
                    <span>Bicos méd.: <b style={{color:C.tx}}>{bicosM.toFixed(1)}</b></span>
                    <span>Vazão: <b style={{color:C.tx}}>{VAZAO_BICO_GLOBAL.toFixed(1)} L/min</b></span>
                  </div>
                );
              })()}
              {desvio!==null&&(
                <div style={{marginTop:8,display:"flex",justifyContent:"center"}}>
                  <span style={{background:Math.abs(desvio)<=5?C.okBg:Math.abs(desvio)<=15?C.warnBg:C.errBg,color:Math.abs(desvio)<=5?C.ok:Math.abs(desvio)<=15?C.warn:C.err,borderRadius:6,padding:"2px 10px",fontWeight:700,fontSize:13}}>
                    {desvio>0?"+":""}{desvio.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}
          <div style={crd()}>
            <span style={lbl()}>Data</span>
            <input type="date" value={aData} onChange={e=>setAData(e.target.value)} style={{...inp(),marginBottom:9}}/>
            <span style={lbl()}>Operador</span>
            <select value={aOp} onChange={e=>setAOp(e.target.value)} style={{...sel(),marginBottom:9}}>
              <option value="">Selecionar...</option>
              {operadores.map(o=><option key={o.id} value={o.nome}>{o.nome}</option>)}
            </select>
            <span style={lbl()}>Equipamento</span>
            <select value={aEq} onChange={e=>setAEq(e.target.value)} style={sel()}>
              <option value="">Selecionar...</option>
              {equipamentos.map(e=><option key={e.id} value={e.nome}>{e.nome}</option>)}
            </select>
          </div>
          <div style={crd()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={lbl()}>Trechos</span>
              <button onClick={addTre} style={{background:`${C.gr}15`,border:`1px solid ${C.gr}30`,color:C.gr,borderRadius:7,padding:"3px 9px",fontSize:11,cursor:"pointer"}}>+ trecho</button>
            </div>
            {aTre.map((t,i)=>(
              <div key={i} style={{background:C.sur,borderRadius:10,padding:10,marginBottom:7,position:"relative"}}>
                <div style={{fontSize:9,color:C.txM,fontWeight:700,marginBottom:6}}>TRECHO {i+1}</div>
                <div style={{display:"flex",gap:7,marginBottom:7}}>
                  <div style={{flex:1}}><div style={{fontSize:9,color:C.txD,marginBottom:3}}>VEL. KM/H</div><input type="number" step="0.1" placeholder="4.2" value={t.velocidade} onChange={e=>updTre(i,"velocidade",e.target.value)} style={inp()}/></div>
                  <div style={{flex:1}}><div style={{fontSize:9,color:C.txD,marginBottom:3}}>BICOS</div><input type="number" placeholder="60" value={t.bicos} onChange={e=>updTre(i,"bicos",e.target.value)} style={inp()}/></div>
                </div>
                <div style={{fontSize:9,color:C.txD,marginBottom:3}}>VOLUME (L)</div>
                <input type="number" placeholder="28000" value={t.volume} onChange={e=>updTre(i,"volume",e.target.value)} style={inp()}/>
                {aTre.length>1&&<button onClick={()=>rmTre(i)} style={{position:"absolute",top:8,right:8,background:"none",border:"none",color:C.err,cursor:"pointer",fontSize:16}}>×</button>}
              </div>
            ))}
            {aTotal>0&&veTot>0&&(
              <div style={{background:C.bg,borderRadius:8,padding:10,marginTop:4}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}><span style={{color:C.txD}}>Vol. aplicado</span><span style={{fontWeight:800,color:C.gr}}>{fmtL(aTotal)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{color:C.txD}}>Vol. esperado</span><span>{fmtL(veTot)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,alignItems:"center"}}><span style={{color:C.txD}}>Desvio</span><Bdg v={desvio}/></div>
              </div>
            )}
          </div>
          {tals.length>1&&aTotal>0&&(
            <div style={{...crd(),borderColor:C.grDim}}>
              <span style={lbl()}>Rateio por talhão</span>
              {tals.map(t=>{const tp=tals.reduce((s,x)=>s+x.plantas,0);const prop=tp>0?t.plantas/tp:0;return(<div key={t.cod} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.bor2}`}}><span style={{fontSize:12}}>Talhão {t.quadra} <span style={{fontSize:10,color:C.txM}}>({fmtP(prop*100)})</span></span><span style={{fontSize:13,fontWeight:700,color:C.gr}}>{fmtL(rateio[t.cod]||0)}</span></div>);})}
            </div>
          )}
          <div style={crd()}>
            <span style={lbl()}>Observação (opcional)</span>
            <textarea value={aObs} onChange={e=>setAObs(e.target.value)} placeholder="Ex: chuva interrompeu no trecho 2, máquina apresentou problema..."
              style={{...inp(),height:70,resize:"none"}}/>
          </div>
          <button onClick={salvarApt} disabled={!aFormOk} style={{...btnP(),opacity:aFormOk?1:0.4}}>Salvar apontamento</button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // TELA: DETALHE APLICAÇÃO
  // ════════════════════════════════════════════════════════════════════════
  if(tela==="ap_detalhe"&&apSel) {
    const ap=aplicacoes.find(x=>x.id===apSel.id)||apSel;
    const tals=getTalhoesAp(ap);
    const veMap=calcVEconsol(todosTrechos(ap),tals);
    const veTot=Object.values(veMap).reduce((s,v)=>s+v,0);
    const volReal=ap.apontamentos.filter(r=>!r.cancelado).reduce((s,r)=>s+r.volTotal,0);
    const pct=pctCobertura(ap);
    const dev=ap.status==="fechada"?desvioAp(ap):null;
    const talsAbs=ap.talhoes.flatMap(cod=>apAbertasDeTal(cod));
    const corIdx=talsAbs.indexOf(ap)>0?1:0;
    const cor=corAp(corIdx);

    return (
      <div style={AppStyle}>
        <Hdr titulo={`Talhão ${tals.map(t=>t.quadra).join(" + ")}`} sub={`${ap.id} · ${ap.fazenda}`} onBack={()=>setTela("main")}
          extra={<span style={{fontSize:9,fontWeight:700,padding:"3px 9px",borderRadius:8,background:ap.status==="aberta"?bgCorAp(corIdx):C.okBg,color:ap.status==="aberta"?cor:C.ok}}>{ap.status==="aberta"?"ABERTA":"CONCLUÍDA"}</span>}/>
        <div style={{padding:12}}>
          <div style={crd()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:13,fontWeight:700}}>Cobertura consolidada</span>
              <span style={{fontSize:18,fontWeight:900,color:pct>=100?C.ok:cor}}>{fmtP(pct)}</span>
            </div>
            <Bar pct={pct} h={8} cor={ap.status==="aberta"?cor:undefined}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.txD,marginTop:6}}>
              <span>Realizado: <b style={{color:C.tx}}>{fmtL(volReal)}</b></span>
              <span>VE: <b style={{color:C.tx}}>{fmtL(veTot)}</b></span>
            </div>
            {ap.apontamentos.filter(r=>!r.cancelado).length>0&&(()=>{
              const velM=calcVelPond(todosTrechos(ap));
              const bicosM=calcBicosPond(todosTrechos(ap));
              return (
                <div style={{display:"flex",gap:10,fontSize:11,color:C.txD,marginTop:6,flexWrap:"wrap"}}>
                  <span>Vel. méd.: <b style={{color:C.tx}}>{velM.toFixed(2)} km/h</b></span>
                  <span>Bicos méd.: <b style={{color:C.tx}}>{bicosM.toFixed(1)}</b></span>
                  <span>Vazão: <b style={{color:C.tx}}>{VAZAO_BICO_GLOBAL.toFixed(1)} L/min</b></span>
                </div>
              );
            })()}
            {dev!==null&&<div style={{marginTop:8,display:"flex",justifyContent:"center"}}><Bdg v={dev}/></div>}
          </div>

          <div style={crd()}>
            <span style={lbl()}>Volume por talhão</span>
            {tals.map(t=>{
              const real=ap.apontamentos.filter(r=>!r.cancelado).reduce((s,r)=>s+(r.volRateado[t.cod]||0),0);
              const esp=veMap[t.cod]||0;
              const pctT=esp>0?Math.min((real/esp)*100,100):0;
              const devT=esp>0&&ap.status==="fechada"?((real-esp)/esp)*100:null;
              return (
                <div key={t.cod} style={{padding:"8px 0",borderBottom:`1px solid ${C.bor2}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div><span style={{fontSize:13,fontWeight:800}}>Talhão {t.quadra}</span><span style={{fontSize:10,color:C.txD,marginLeft:5}}>{parseFloat(t.area).toFixed(2)} ha · rua {t.esp_rua}m</span></div>
                    <div style={{textAlign:"right"}}><span style={{fontSize:13,fontWeight:700,color:C.gr}}>{fmtL(real)}</span><span style={{fontSize:10,color:C.tx}}> / {fmtL(esp)}</span>{devT!==null&&<div><Bdg v={devT}/></div>}</div>
                  </div>
                  <Bar pct={pctT} h={4}/>
                </div>
              );
            })}
          </div>

          <div style={crd()}>
            <span style={lbl()}>Apontamentos ({ap.apontamentos.filter(r=>!r.cancelado).length})</span>
            {ap.apontamentos.map((r,i)=>(
              <div key={r.id} style={{padding:"7px 0",borderBottom:`1px solid ${C.bor2}`,opacity:r.cancelado?0.4:1}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:12,fontWeight:700,color:C.tx}}>#{i+1} · {r.data}</span>
                      {r.cancelado&&<span style={{fontSize:9,background:C.errBg,color:C.err,borderRadius:4,padding:"1px 5px",fontWeight:700}}>CANCELADO</span>}
                    </div>
                    <div style={{fontSize:10,color:C.txD}}>{r.operador} · {r.equip}</div>
                    <div style={{fontSize:10,color:C.txD}}>{calcVelPond(r.trechos).toFixed(2)} km/h · {calcBicosPond(r.trechos).toFixed(0)} bicos</div>
                    {r.observacao&&<div style={{fontSize:10,color:C.txD,marginTop:2,fontStyle:"italic"}}>"{r.observacao}"</div>}
                  </div>
                  <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <div style={{fontSize:13,fontWeight:700,color:r.cancelado?C.txM:C.gr}}>{fmtL(r.volTotal)}</div>
                    {!r.cancelado&&ap.status==="aberta"&&(
                      <button onClick={()=>{setApontCancelar({apId:ap.id,rId:r.id});setMotivoCancelamento("");setShowCancelar(true);}}
                        style={{fontSize:10,background:"none",border:`1px solid ${C.err}44`,color:C.err,borderRadius:6,padding:"2px 8px",cursor:"pointer"}}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {ap.status==="aberta"&&(<>
            <button onClick={()=>{setApSel(ap);setTela("apontamento");}} style={{...btnP(),marginBottom:8,background:cor}}>+ Novo apontamento</button>
            <button onClick={()=>fecharAp(ap.id)} style={{...btnG(),width:"100%",justifyContent:"center",borderColor:`${C.ok}44`,color:C.ok}}><ILock/> Marcar como concluído</button>
            {ap.apontamentos.filter(r=>!r.cancelado).length===0&&(
              <button onClick={()=>{setApExcluirId(ap.id);setSenhaExcluirIn("");setSenhaExcluirErr(false);setShowExcluirAp(true);}}
                style={{...btnG(),width:"100%",justifyContent:"center",marginTop:6,borderColor:`${C.err}33`,color:C.err}}>
                Excluir aplicação
              </button>
            )}
          </>)}
          {ap.status==="fechada"&&(
            <button onClick={()=>reabrirAp(ap.id)} style={{...btnG(),width:"100%",justifyContent:"center",borderColor:`${C.err}33`,color:C.err}}><IUnlock/> Reabrir aplicação</button>
          )}
        </div>
        <ModalCancelar/>
        <ModalExcluirAp/>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // TELA: CONFIGURAÇÕES
  // ════════════════════════════════════════════════════════════════════════
  if(tela==="config") {
    // Fazenda efetiva da tela de config (seletor próprio com fallback para a de entrada)
    const fazCfg = fazConfig || fazSel;
    const talsCfg = fazConfig ? talhoesCfg : talhoes;
    const opsCfg = fazConfig ? operadoresCfg : operadores;
    const eqsCfg = fazConfig ? equipamentosCfg : equipamentos;
    const menuItens=[
      {id:"fazendas",    label:"Fazendas e Subfazendas",sub:`${fazendas.length} fazenda(s)`},
      {id:"talhoes_cfg", label:"Talhões",               sub:`${talsCfg.length} cadastrados`},
      {id:"operadores",  label:"Operadores",             sub:`${opsCfg.length} cadastrados`},
      {id:"equipamentos",label:"Equipamentos",           sub:`${eqsCfg.length} cadastrados`},
      {id:"senha",       label:"Alterar senha",          sub:"Senha de acesso"},
      {id:"vazao",       label:"Configurações de vazão",  sub:`${configsVazao.length} config · ativa: ${vazaoAtiva.nome}`},
      {id:"sobre",       label:"Sobre o sistema",        sub:"v8.6 · Banco · Repositório · Contexto"},
    ];
    return (
      <div style={AppStyle}>
        <Hdr titulo="Configurações" sub={secao==="menu"?"Cadastros e parâmetros":menuItens.find(m=>m.id===secao)?.label||""}
          onBack={()=>{if(secao==="menu") setTela("entrada"); else setSecao("menu");}}/>
        <div style={{padding:12}}>

          {/* Seletor de fazenda — apenas nas seções de cadastro por fazenda */}
          {(secao==="talhoes_cfg"||secao==="operadores"||secao==="equipamentos")&&(
            <div style={{...crd(),padding:"10px 12px"}}>
              <span style={lbl()}>Fazenda</span>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {fazendas.map(f=>(
                  <button key={f.id} onClick={()=>carregarConfigFaz(f)}
                    style={{padding:"6px 13px",borderRadius:20,fontSize:12,fontWeight:700,border:fazCfg?.id===f.id?"none":`1px solid ${C.bor}`,background:fazCfg?.id===f.id?C.gr:"transparent",color:fazCfg?.id===f.id?"#fff":C.txD,cursor:"pointer"}}>
                    {f.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {secao==="menu"&&(
            <div style={crd()}>
              {menuItens.map((it,i,arr)=>(
                <div key={it.id} onClick={()=>setSecao(it.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 4px",borderBottom:i<arr.length-1?`1px solid ${C.bor2}`:"none",cursor:"pointer"}}>
                  <div><div style={{fontSize:13,fontWeight:700}}>{it.label}</div><div style={{fontSize:10,color:C.txM}}>{it.sub}</div></div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.txM} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ))}
            </div>
          )}

          {secao==="fazendas"&&(
            <div>
              <div style={crd()}>
                <span style={lbl()}>Fazendas cadastradas</span>
                {fazendas.map(f=>(
                  <div key={f.id} style={{padding:"8px 0",borderBottom:`1px solid ${C.bor2}`}}>
                    <div style={{fontSize:13,fontWeight:700}}>{f.nome}</div>
                    <div style={{fontSize:11,color:C.txM}}>Subfazendas: {f.subfazendas.map(s=>s.sigla).join(", ")}</div>
                  </div>
                ))}
              </div>
              <div style={crd()}>
                <span style={lbl()}>Nova fazenda</span>
                <input placeholder="Nome (ex: Faz. Santa Maria)" value={nfNome} onChange={e=>setNfNome(e.target.value)} style={{...inp(),marginBottom:8}}/>
                <input placeholder="Sigla (ex: FSM)" value={nfSigla} onChange={e=>setNfSigla(e.target.value)} style={{...inp(),marginBottom:10}}/>
                <button onClick={async()=>{
                  if(!nfNome.trim()||!nfSigla.trim()) return;
                  const id=nfSigla.toUpperCase().replace(/\s/g,"_");
                  try{ await sbPost("fazendas",{id,nome:nfNome.trim(),sigla:nfSigla.trim(),ativo:true}); setFazendas(p=>[...p,{id,nome:nfNome.trim(),subfazendas:[]}]); setNfNome(""); setNfSigla(""); }catch(e){alert("Erro: "+e.message);}
                }} style={btnP()}>Adicionar fazenda</button>
              </div>
              <div style={crd()}>
                <span style={lbl()}>Nova subfazenda</span>
                <span style={lbl()}>Fazenda principal</span>
                <select value={nsfFaz} onChange={e=>setNsfFaz(e.target.value)} style={{...sel(),marginBottom:8}}>
                  <option value="">Selecionar...</option>
                  {fazendas.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
                <input placeholder="Nome (ex: Fazenda São João)" value={nsfNome} onChange={e=>setNsfNome(e.target.value)} style={{...inp(),marginBottom:8}}/>
                <input placeholder="Sigla (ex: FSJ)" value={nsfSigla} onChange={e=>setNsfSigla(e.target.value)} style={{...inp(),marginBottom:10}}/>
                <button onClick={async()=>{
                  if(!nsfFaz||!nsfNome.trim()||!nsfSigla.trim()) return;
                  const id=nsfSigla.toUpperCase().replace(/\s/g,"");
                  try{ await sbPost("subfazendas",{id,id_fazenda:nsfFaz,nome:nsfNome.trim(),sigla:id,ativo:true}); setFazendas(p=>p.map(f=>f.id!==nsfFaz?f:{...f,subfazendas:[...f.subfazendas,{id,sigla:id,nome:nsfNome.trim()}]})); setNsfNome(""); setNsfSigla(""); setNsfFaz(""); }catch(e){alert("Erro: "+e.message);}
                }} style={btnP()}>Adicionar subfazenda</button>
              </div>
            </div>
          )}

          {secao==="talhoes_cfg"&&(
            <div>
              <div style={crd()}>
                <span style={lbl()}>Talhões cadastrados</span>
                {sortTalhoes(talsCfg).map(t=>(
                  <div key={t.cod} style={{padding:"7px 0",borderBottom:`1px solid ${C.bor2}`,display:"flex",justifyContent:"space-between"}}>
                    <div><div style={{fontSize:12,fontWeight:700}}>{t.id_subfazenda} · Talhão {t.quadra}</div><div style={{fontSize:10,color:C.txM}}>{t.variedade} · {t.plantas.toLocaleString("pt-BR")} pl · {t.esp_rua}m × {t.esp_planta}m</div></div>
                    <div style={{fontSize:11,color:C.txD,textAlign:"right"}}>{parseFloat(t.area).toFixed(2)} ha</div>
                  </div>
                ))}
              </div>
              <div style={crd()}>
                <span style={lbl()}>Novo talhão</span>
                <span style={lbl()}>Subfazenda</span>
                <select value={ntSubf} onChange={e=>setNtSubf(e.target.value)} style={{...sel(),marginBottom:8}}>
                  <option value="">Selecionar...</option>
                  {(fazCfg?.subfazendas||fazendas.flatMap(f=>f.subfazendas)).map(s=><option key={s.id} value={s.id}>{s.sigla} — {s.nome}</option>)}
                </select>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <div style={{flex:1}}><span style={lbl()}>Código</span><input placeholder="ex: FSP23" value={ntCod} onChange={e=>setNtCod(e.target.value)} style={inp()}/></div>
                  <div style={{flex:1}}><span style={lbl()}>Quadra</span><input placeholder="ex: 23" value={ntQ} onChange={e=>setNtQ(e.target.value)} style={inp()}/></div>
                </div>
                <span style={lbl()}>Variedade</span>
                <input placeholder="ex: Murcot Olé" value={ntVar} onChange={e=>setNtVar(e.target.value)} style={{...inp(),marginBottom:8}}/>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <div style={{flex:1}}><span style={lbl()}>Plantas</span><input type="number" value={ntPl} onChange={e=>setNtPl(e.target.value)} style={inp()}/></div>
                  <div style={{flex:1}}><span style={lbl()}>Esp. rua (m)</span><input type="number" step="0.1" value={ntRua} onChange={e=>setNtRua(e.target.value)} style={inp()}/></div>
                  <div style={{flex:1}}><span style={lbl()}>Esp. planta (m)</span><input type="number" step="0.1" value={ntPlE} onChange={e=>setNtPlE(e.target.value)} style={inp()}/></div>
                </div>
                {ntPl&&ntRua&&ntPlE&&(
                  <div style={{background:C.bg,borderRadius:8,padding:"8px 10px",marginBottom:10,fontSize:12,color:C.txD}}>
                    Área calculada: <b style={{color:C.gr}}>{((fv(ntRua)*fv(ntPlE)*fv(ntPl))/10000).toFixed(3)} ha</b>
                  </div>
                )}
                <button onClick={async()=>{
                  if(!ntCod.trim()||!ntQ.trim()||!ntVar.trim()||!ntPl||!ntRua||!ntPlE||!ntSubf) return;
                  const area=(fv(ntRua)*fv(ntPlE)*fv(ntPl))/10000;
                  try{
                    await sbPost("talhoes",{cod:ntCod.trim(),id_subfazenda:ntSubf,quadra:ntQ.trim(),variedade:ntVar.trim(),plantas:parseInt(ntPl),esp_rua:fv(ntRua),esp_planta:fv(ntPlE),ativo:true});
                    const novoTal={cod:ntCod.trim(),id_subfazenda:ntSubf,quadra:ntQ.trim(),variedade:ntVar.trim(),plantas:parseInt(ntPl),esp_rua:fv(ntRua),esp_planta:fv(ntPlE),area};
                    setTalhoes(p=>[...p,novoTal]);
                    setTalhoesCfg(p=>[...p,novoTal]);
                    setNtCod(""); setNtQ(""); setNtVar(""); setNtPl(""); setNtRua(""); setNtPlE("");
                  }catch(e){alert("Erro: "+e.message);}
                }} style={btnP()}>Adicionar talhão</button>
              </div>
            </div>
          )}

          {secao==="operadores"&&(
            <div>
              <div style={crd()}>
                <span style={lbl()}>Operadores cadastrados</span>
                {opsCfg.map(op=>(
                  <div key={op.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.bor2}`}}>
                    {editOp?.id===op.id ? (
                      <div>
                        <span style={lbl()}>Editar operador</span>
                        <input placeholder="Nome" value={editOpNome} onChange={e=>setEditOpNome(e.target.value)} style={{...inp(),marginBottom:8}}/>
                        <input placeholder="Matrícula" value={editOpMat} onChange={e=>setEditOpMat(e.target.value)} style={{...inp(),marginBottom:10}}/>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={async()=>{
                            if(!editOpNome.trim()) return;
                            try{
                              await sbPatch("operadores",`id=eq.${op.id}`,{nome:editOpNome.trim(),matricula:editOpMat.trim()||null});
                              const upd=x=>x.id!==op.id?x:{...x,nome:editOpNome.trim(),matricula:editOpMat.trim()||null};
                              setOperadores(p=>p.map(upd));
                              setOperadoresCfg(p=>p.map(upd));
                              setEditOp(null);
                            }catch(e){alert("Erro: "+e.message);}
                          }} style={{...btnP(),flex:1,padding:"10px"}}>Salvar</button>
                          <button onClick={()=>setEditOp(null)} style={{...btnG(),flex:1,justifyContent:"center"}}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600}}>{op.nome}</div>
                          {op.matricula&&<div style={{fontSize:10,color:C.txD}}>Matrícula: {op.matricula}</div>}
                        </div>
                        <div style={{display:"flex",gap:10}}>
                          <button onClick={()=>{setEditOp(op);setEditOpNome(op.nome);setEditOpMat(op.matricula||"");}} style={{background:"none",border:"none",color:C.gr,cursor:"pointer",fontSize:11}}>Editar</button>
                          <button onClick={async()=>{try{await sbPatch("operadores",`id=eq.${op.id}`,{ativo:false});setOperadores(p=>p.filter(x=>x.id!==op.id));setOperadoresCfg(p=>p.filter(x=>x.id!==op.id));}catch(e){alert("Erro: "+e.message);}}} style={{background:"none",border:"none",color:C.err,cursor:"pointer",fontSize:11}}>Remover</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={crd()}>
                <span style={lbl()}>Novo operador {fazCfg&&<span style={{color:C.gr}}>· {fazCfg.nome}</span>}</span>
                <input placeholder="Nome" value={novaOp} onChange={e=>setNovaOp(e.target.value)} style={{...inp(),marginBottom:8}}/>
                <input placeholder="Matrícula (opcional)" value={novaOpMat} onChange={e=>setNovaOpMat(e.target.value)} style={{...inp(),marginBottom:10}}/>
                <button onClick={async()=>{
                  if(!novaOp.trim()||!fazCfg) return;
                  try{
                    const res=await sbPost("operadores",{nome:novaOp.trim(),matricula:novaOpMat.trim()||null,ativo:true});
                    await sbPost("operador_fazenda",{id_operador:res[0].id,id_fazenda:fazCfg.id});
                    setOperadores(p=>[...p,res[0]]); setOperadoresCfg(p=>[...p,res[0]]); setNovaOp(""); setNovaOpMat("");
                  }catch(e){alert("Erro: "+e.message);}
                }} style={btnP()}>Adicionar operador</button>
              </div>
            </div>
          )}

          {secao==="equipamentos"&&(
            <div>
              <div style={crd()}>
                <span style={lbl()}>Equipamentos cadastrados</span>
                {eqsCfg.map(eq=>(
                  <div key={eq.id} style={{padding:"8px 0",borderBottom:`1px solid ${C.bor2}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{fontSize:13,fontWeight:600}}>{eq.nome}</div></div>
                    <button onClick={async()=>{try{await sbPatch("equipamentos",`id=eq.${eq.id}`,{ativo:false});setEquipamentos(p=>p.filter(x=>x.id!==eq.id));setEquipamentosCfg(p=>p.filter(x=>x.id!==eq.id));}catch(e){alert("Erro: "+e.message);}}} style={{background:"none",border:"none",color:C.err,cursor:"pointer",fontSize:11}}>Remover</button>
                  </div>
                ))}
              </div>
              <div style={crd()}>
                <span style={lbl()}>Novo equipamento {fazCfg&&<span style={{color:C.gr}}>· {fazCfg.nome}</span>}</span>
                <input placeholder="Nome" value={novaEq} onChange={e=>setNovaEq(e.target.value)} style={{...inp(),marginBottom:10}}/>
                <button onClick={async()=>{
                  if(!novaEq.trim()||!fazCfg) return;
                  try{
                    const res=await sbPost("equipamentos",{nome:novaEq.trim(),ativo:true});
                    await sbPost("equipamento_fazenda",{id_equipamento:res[0].id,id_fazenda:fazCfg.id});
                    setEquipamentos(p=>[...p,res[0]]); setEquipamentosCfg(p=>[...p,res[0]]); setNovaEq("");
                  }catch(e){alert("Erro: "+e.message);}
                }} style={btnP()}>Adicionar equipamento</button>
              </div>
            </div>
          )}

          {secao==="senha"&&(
            <div>
              <div style={crd()}>
                <span style={lbl()}>Senha do menu de configurações</span>
                <input type="password" maxLength={4} placeholder="····" value={novaSenha} onChange={e=>setNovaSenha(e.target.value.replace(/\D/g,"").slice(0,4))}
                  style={{...inp(),letterSpacing:8,fontSize:20,textAlign:"center",marginBottom:10}}/>
                <button onClick={async()=>{
                  if(novaSenha.length!==4) return;
                  try{
                    await sbPatch("configuracoes","chave=eq.senha_config",{valor:novaSenha});
                    setSenhaConfig(novaSenha); setNovaSenha(""); setSecao("menu");
                  }catch(e){alert("Erro: "+e.message);}
                }} style={{...btnP(),opacity:novaSenha.length===4?1:0.4}}>Salvar senha do menu</button>
              </div>
              <div style={crd()}>
                <span style={lbl()}>Senha por fazenda</span>
                <div style={{fontSize:11,color:C.txD,marginBottom:12,lineHeight:1.6}}>
                  Cada fazenda tem sua própria senha de acesso. Digite a nova senha de 4 dígitos no campo ao lado de cada fazenda.
                </div>
                {fazendas.map(faz=>{
                  return (
                    <div key={faz.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.bor2}`,display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600}}>{faz.nome}</div>
                        <div style={{fontSize:10,color:C.txD}}>{faz.subfazendas.map(sf=>sf.sigla).join(" · ")}</div>
                      </div>
                      <input type="password" maxLength={4} placeholder="····" value={fazSenhas[faz.id]||""}
                        onChange={e=>setFazSenhas(p=>({...p,[faz.id]:e.target.value.replace(/\D/g,"").slice(0,4)}))}
                        style={{...inp(),width:80,letterSpacing:6,fontSize:16,textAlign:"center",padding:"8px"}}/>
                      <button onClick={async()=>{
                        const nova=fazSenhas[faz.id]||"";
                        if(nova.length!==4){alert("Digite 4 dígitos");return;}
                        try{
                          await sbPatch("fazendas",`id=eq.${faz.id}`,{senha:nova});
                          setFazSenhas(p=>({...p,[faz.id]:""}));
                          alert(`Senha da ${faz.nome} atualizada!`);
                        }catch(e){alert("Erro: "+e.message);}
                      }} style={{background:C.gr,color:"#fff",border:"none",borderRadius:9,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                        Salvar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {secao==="vazao"&&(
            <div>
              <div style={crd()}>
                <span style={lbl()}>Configurações cadastradas — {fazSel?.nome}</span>
                {configsVazao.map((cv,i)=>(
                  <div key={cv.id} style={{padding:"10px 0",borderBottom:`1px solid ${C.bor2}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontSize:13,fontWeight:700,color:C.tx}}>{cv.nome}</span>
                        {cv.ativo&&<span style={{fontSize:9,background:C.okBg,color:C.ok,borderRadius:5,padding:"1px 6px",fontWeight:700}}>ATIVA</span>}
                      </div>
                      <div style={{fontSize:11,color:C.txD}}>{cv.pressao_bar} bar · {parseFloat(cv.vazao_bico).toFixed(1)} L/min por bico</div>
                      {cv.ativo&&<div style={{fontSize:10,color:C.txM,marginTop:2}}>VEha (60b · 4km/h · 6,5m) = {(calcVEha(60,4,6.5,parseFloat(cv.vazao_bico))/1000).toFixed(1)}k L/ha</div>}
                    </div>
                    {!cv.ativo&&(
                      <button onClick={async()=>{
                        try{
                          // Desativa todas
                          await Promise.all(configsVazao.filter(x=>x.ativo).map(x=>sbPatch("configuracoes_vazao",`id=eq.${x.id}`,{ativo:false})));
                          // Ativa esta
                          await sbPatch("configuracoes_vazao",`id=eq.${cv.id}`,{ativo:true});
                          const atualizadas=configsVazao.map(x=>({...x,ativo:x.id===cv.id}));
                          setConfigsVazao(atualizadas);
                          setVazaoAtiva(cv);
                          VAZAO_BICO_GLOBAL=parseFloat(cv.vazao_bico);
                        }catch(e){alert("Erro: "+e.message);}
                      }} style={{background:"transparent",border:`1px solid ${C.bor}`,color:C.txD,borderRadius:9,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>
                        Ativar
                      </button>
                    )}
                  </div>
                ))}
                {configsVazao.length===0&&<p style={{fontSize:12,color:C.txM}}>Nenhuma configuração cadastrada.</p>}
              </div>
              <div style={crd()}>
                <span style={lbl()}>Nova configuração</span>
                <span style={lbl()}>Nome</span>
                <input placeholder="ex: Padrão 10 bar" value={nvcNome} onChange={e=>setNvcNome(e.target.value)} style={{...inp(),marginBottom:8}}/>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <div style={{flex:1}}>
                    <span style={lbl()}>Pressão (bar)</span>
                    <input type="number" step="0.1" placeholder="ex: 10" value={nvcPressao} onChange={e=>setNvcPressao(e.target.value)} style={inp()}/>
                  </div>
                  <div style={{flex:1}}>
                    <span style={lbl()}>Vazão (L/min)</span>
                    <input type="number" step="0.1" placeholder="ex: 1.8" value={nvcVazao} onChange={e=>setNvcVazao(e.target.value)} style={inp()}/>
                  </div>
                </div>
                {nvcVazao&&nvcPressao&&(
                  <div style={{background:C.bg,borderRadius:8,padding:"8px 10px",marginBottom:10,fontSize:11,color:C.txD}}>
                    Preview VEha (60 bicos · 4 km/h · rua 6,5m):
                    <span style={{color:C.gr,fontWeight:700,marginLeft:6}}>
                      {(calcVEha(60,4,6.5,fv(nvcVazao))/1000).toFixed(2)}k L/ha
                    </span>
                  </div>
                )}
                <button onClick={async()=>{
                  if(!nvcNome.trim()||!nvcPressao||!nvcVazao) return;
                  try{
                    const res=await sbPost("configuracoes_vazao",{nome:nvcNome.trim(),pressao_bar:fv(nvcPressao),vazao_bico:fv(nvcVazao),id_fazenda:fazSel?.id,ativo:false});
                    setConfigsVazao(p=>[...p,res[0]]);
                    setNvcNome(""); setNvcPressao(""); setNvcVazao("");
                  }catch(e){alert("Erro: "+e.message);}
                }} style={{...btnP(),opacity:(nvcNome&&nvcPressao&&nvcVazao)?1:0.4}}>Adicionar configuração</button>
              </div>
              <div style={{...crd(),background:C.warnBg,borderColor:`${C.warn}33`}}>
                <div style={{fontSize:11,color:C.warn,lineHeight:1.6}}>
                  ⚠ A vazão ativa é gravada em cada apontamento no momento do registro. Alterar a configuração ativa não afeta apontamentos já salvos.
                </div>
              </div>
            </div>
          )}

          {secao==="sobre"&&(
            <div>
              <div style={crd()}>
                <span style={lbl()}>Sistema</span>
                {[
                  ["Versão",        "v8.0"],
                  ["App",           "alfacitrus-calda.vercel.app"],
                  ["Banco",         "ywnrfmblyegeplnlykbt.supabase.co"],
                  ["Repositório",   "github.com/vagninhonho-cyber/Alfacitrus-calda"],
                  ["Codespace",     "crispy-rotary-phone"],
                  ["Chave pública", "sb_publishable_Xc89uAWDA00rkcKDmBKmFA_Goz7x7HI"],
                  ["Pressão",       "8 bar"],
                  ["Vazão/bico",    "1,6 L/min"],
                  ["Desvio alerta", "±5% a ±10%"],
                  ["Desvio crítico","> ±10%"],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.bor2}`}}>
                    <span style={{fontSize:11,color:C.txD,fontWeight:700}}>{k}</span>
                    <span style={{fontSize:11,color:C.tx,textAlign:"right",maxWidth:"60%",wordBreak:"break-all"}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={crd()}>
                <span style={lbl()}>Contexto para novo chat</span>
                <div style={{background:C.bg,borderRadius:8,padding:10,fontSize:10,color:C.txD,lineHeight:1.6,fontFamily:"monospace"}}>
                  {`App: alfacitrus-calda.vercel.app (React v8.0)
Banco: ywnrfmblyegeplnlykbt.supabase.co
Chave: sb_publishable_Xc89uAWDA00rkcKDmBKmFA_Goz7x7HI
Repo: github.com/vagninhonho-cyber/Alfacitrus-calda
Codespace: crispy-rotary-phone
Talhões: 39 (FSP1-22+7A+14A, FSF23-37)
Views: vw_volume_por_talhao, vw_resumo_aplicacoes, vw_apontamentos_completo
VEha = (bicos×1.6)/((vel×1000/60)×esp_rua)×10000
Desvio crítico: >±10%`}
                </div>
              </div>
              <div style={crd()}>
                <span style={lbl()}>Próximas evoluções</span>
                {[
                  "Cadastro de produtos por ordem de serviço",
                  "Custo por hectare por produto",
                  "Notificação: talhão sem apontamento há X dias",
                  "Integração Rex Agro via API",
                  "Modo offline com sincronização",
                  "Perfis: encarregado cria ordens, operador aponta",
                ].map((e,i)=>(
                  <div key={i} style={{padding:"6px 0",borderBottom:`1px solid ${C.bor2}`,fontSize:12,color:C.txD,display:"flex",gap:8}}>
                    <span style={{color:C.grDim}}>○</span>{e}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
