"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const ORDER_TYPES = ["Normal Order", "Contract", "Repairing"];
const METAL_TYPES = ["MS", "GI", "SS", "Other"];
const EMPTY_ORDER = () => ({ itemName:"", metalType:"MS", height:"", width:"", perKgRate:"", extraCharge:"", description:"", amount:"" });
const TODAY = new Date().toISOString().split("T")[0];

const inp = "w-full bg-[#0c0e1a] border border-[#1e2235] rounded-2xl px-4 py-3.5 text-white text-sm placeholder-[#2e3248] focus:outline-none focus:border-amber-500/60 focus:bg-[#0f1120] focus:ring-2 focus:ring-amber-500/12 transition-all duration-200";

function WeldSpark({ active }) {
  const sparks = Array.from({ length: 8 }, (_, i) => ({
    id: i, angle: (i / 8) * 360 + Math.random() * 30,
    dist: 18 + Math.random() * 28, size: 2 + Math.random() * 3, delay: Math.random() * 0.12,
  }));
  return (
    <AnimatePresence>
      {active && sparks.map(s => {
        const rad = (s.angle * Math.PI) / 180;
        return (
          <motion.div key={s.id}
            initial={{ x:0, y:0, scale:1, opacity:0.9 }}
            animate={{ x: Math.cos(rad)*s.dist, y: Math.sin(rad)*s.dist, scale:0, opacity:0 }}
            transition={{ delay:s.delay, duration:0.45, ease:[0.2,0.8,0.6,1] }}
            style={{ width:s.size, height:s.size, borderRadius:"50%", background:"#f59e0b",
              boxShadow:"0 0 6px #f59e0b", position:"absolute", top:"50%", right:12, pointerEvents:"none" }} />
        );
      })}
    </AnimatePresence>
  );
}

function ForgeField({ label, icon, children }) {
  const [focused, setFocused] = useState(false);
  const [sparked, setSparked] = useState(false);
  return (
    <div>
      <motion.p animate={{ color: focused ? "#f59e0b" : "#3d4260" }} transition={{ duration:0.2 }}
        className="text-[10px] font-black uppercase tracking-[0.18em] mb-2">
        {icon && <span className="mr-1.5">{icon}</span>}{label}
      </motion.p>
      <div className="relative"
        onFocus={() => { setFocused(true); setSparked(true); setTimeout(()=>setSparked(false),600); }}
        onBlur={() => setFocused(false)}>
        <motion.div animate={{ opacity: focused?1:0 }} transition={{ duration:0.2 }}
          className="absolute -inset-px rounded-2xl pointer-events-none"
          style={{ background:"linear-gradient(135deg,#f59e0b22,transparent)", border:"1px solid #f59e0b44" }} />
        {children}
        <WeldSpark active={sparked} />
      </div>
    </div>
  );
}

function MagneticCard({ children, className, onClick, selected }) {
  const ref = useRef(null);
  const rotX = useSpring(0,{stiffness:300,damping:30}); const rotY = useSpring(0,{stiffness:300,damping:30});
  const gX = useSpring(50,{stiffness:200,damping:25});   const gY = useSpring(50,{stiffness:200,damping:25});
  const bg = useTransform([gX,gY],([x,y])=>`radial-gradient(circle at ${x}% ${y}%, ${selected?"#f59e0b18":"#ffffff08"} 0%, transparent 65%)`);
  const onMove = useCallback((e)=>{ const r=ref.current?.getBoundingClientRect(); if(!r)return; const px=(e.clientX-r.left)/r.width; const py=(e.clientY-r.top)/r.height; rotX.set((py-0.5)*-14); rotY.set((px-0.5)*14); gX.set(px*100); gY.set(py*100); },[rotX,rotY,gX,gY]);
  const onLeave = useCallback(()=>{rotX.set(0);rotY.set(0);gX.set(50);gY.set(50);},[rotX,rotY,gX,gY]);
  return (
    <motion.div ref={ref} onClick={onClick} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{rotateX:rotX,rotateY:rotY,transformStyle:"preserve-3d",perspective:800}}
      whileTap={{scale:0.97}} className={`cursor-pointer ${className}`}>
      <motion.div style={{background:bg}} className="absolute inset-0 rounded-2xl pointer-events-none z-10" />
      {children}
    </motion.div>
  );
}

function StepLine({ filled }) {
  return (
    <div className="flex-1 relative h-px mx-1">
      <div className="absolute inset-0 bg-[#1e2235]" />
      <motion.div initial={{scaleX:0}} animate={{scaleX:filled?1:0}}
        transition={{duration:0.5,ease:[0.22,1,0.36,1]}} style={{originX:0}}
        className="absolute inset-0 bg-gradient-to-r from-amber-500 to-emerald-500" />
    </div>
  );
}

function StepPill({ number, label, state, onClick }) {
  return (
    <motion.button onClick={onClick} className="flex items-center gap-2 cursor-pointer" whileTap={{scale:0.92}}>
      <div className="relative w-8 h-8">
        {state==="active" && (
          <motion.div animate={{scale:[1,1.6,1],opacity:[0.5,0,0.5]}}
            transition={{duration:1.6,repeat:Infinity,ease:"easeInOut"}} className="absolute inset-0 rounded-xl bg-amber-500/40" />
        )}
        <motion.div layout animate={{
            background: state==="done"?"linear-gradient(135deg,#10b98122,#05966918)":state==="active"?"linear-gradient(135deg,#f59e0b,#f97316)":"#0c0e1a",
            borderColor: state==="done"?"#10b98150":state==="active"?"#f59e0b":"#1e2235",
            boxShadow: state==="active"?"0 0 20px #f59e0b50":"none",
          }} transition={{duration:0.3}}
          className="absolute inset-0 rounded-xl border flex items-center justify-center text-xs font-black"
          style={{color: state==="done"?"#10b981":state==="active"?"#000":"#3d4260"}}>
          <AnimatePresence mode="wait">
            {state==="done"
              ? <motion.span key="done" initial={{scale:0,rotate:-120}} animate={{scale:1,rotate:0}} exit={{scale:0}} transition={{type:"spring",stiffness:500,damping:20}}>✓</motion.span>
              : <motion.span key={`n${number}`} initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",stiffness:500,damping:22}}>{number}</motion.span>
            }
          </AnimatePresence>
        </motion.div>
      </div>
      <span className={`text-xs font-black hidden sm:block tracking-wider uppercase transition-colors duration-300 ${state==="done"?"text-emerald-400":state==="active"?"text-amber-300":"text-[#2e3248]"}`}>{label}</span>
    </motion.button>
  );
}

function MetalPill({ label, selected, onClick }) {
  return (
    <motion.button type="button" onClick={onClick} whileTap={{scale:0.85,y:2}} whileHover={{y:-2}}
      transition={{type:"spring",stiffness:600,damping:20}}
      className={`relative px-4 py-2.5 rounded-xl text-sm font-black border overflow-hidden transition-colors ${selected?"bg-amber-500/15 border-amber-500/50 text-amber-300":"bg-[#0c0e1a] border-[#1e2235] text-[#3d4260]"}`}>
      {selected && <>
        <motion.div initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}} className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400" />
        <motion.div animate={{x:["-100%","200%"]}} transition={{duration:1.8,repeat:Infinity,ease:"linear",repeatDelay:0.8}} className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/15 to-transparent skew-x-12" />
      </>}
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}

const TYPE_META = {
  "Normal Order": { icon:"🔧", desc:"Weight-based calculation", color:"#f59e0b" },
  "Contract":     { icon:"📋", desc:"Fixed amount deal",        color:"#3b82f6" },
  "Repairing":    { icon:"🔩", desc:"Repair & restoration",     color:"#10b981" },
};
function OrderTypeCard({ type, selected, onClick }) {
  const m = TYPE_META[type];
  return (
    <MagneticCard onClick={onClick} selected={selected} className="relative rounded-2xl">
      <motion.div animate={{ borderColor:selected?`${m.color}55`:"#1e2235", background:selected?`${m.color}08`:"#0c0e1a", boxShadow:selected?`0 4px 30px ${m.color}15, inset 0 1px 0 ${m.color}22`:"none" }}
        transition={{duration:0.25}} className="relative w-full text-left rounded-2xl border p-4 overflow-hidden z-0">
        <motion.div animate={{scaleY:selected?1:0,opacity:selected?1:0}} style={{transformOrigin:"bottom",background:m.color}}
          transition={{type:"spring",stiffness:400,damping:28}} className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full" />
        {selected && <motion.div initial={{opacity:0}} animate={{opacity:1}} className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl pointer-events-none" style={{background:`${m.color}30`}} />}
        <div className="flex items-center gap-3 pl-3">
          <motion.span animate={{scale:selected?1.3:1,rotate:selected?[0,-12,0]:0}} transition={{duration:0.4,ease:"easeInOut"}} className="text-2xl flex-shrink-0">{m.icon}</motion.span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm" style={{color:selected?m.color:"#6b7a99"}}>{type}</p>
            <p className="text-[10px] text-[#2e3248] mt-0.5">{m.desc}</p>
          </div>
          <AnimatePresence>
            {selected && <motion.div key="check" initial={{scale:0,rotate:-90,opacity:0}} animate={{scale:1,rotate:0,opacity:1}} exit={{scale:0,opacity:0}} transition={{type:"spring",stiffness:600,damping:20}} className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0" style={{background:`${m.color}22`,color:m.color}}>✓</motion.div>}
          </AnimatePresence>
        </div>
      </motion.div>
    </MagneticCard>
  );
}

function ShimmerBtn({ active, onClick, children, className="", green=false }) {
  const base = green ? "bg-emerald-500 text-black shadow-xl shadow-emerald-500/25" : "bg-amber-500 text-black shadow-lg shadow-amber-500/25";
  return (
    <motion.button onClick={onClick} whileTap={active?{scale:0.97}:{}} whileHover={active?{scale:1.01}:{}}
      className={`relative overflow-hidden font-black transition-all duration-300 ${active?base:"bg-[#0c0e1a] border border-[#1e2235] text-[#2e3248]"} ${className}`}>
      {active && <motion.div animate={{x:["-120%","220%"]}} transition={{duration:2.2,repeat:Infinity,ease:"linear",repeatDelay:0.8}} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 pointer-events-none" />}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

const SPARK_COLORS = ["#f59e0b","#f97316","#10b981","#3b82f6","#fbbf24","#ef4444","#8b5cf6"];
function SuccessScreen({ customerName, orderCount, orderType, onReset }) {
  const sparks = Array.from({length:48},(_,i)=>({ id:i, angle:(i/48)*360+(Math.random()-0.5)*12, dist:70+Math.random()*160, color:SPARK_COLORS[i%SPARK_COLORS.length], size:2+Math.random()*6, delay:Math.random()*0.35, dur:0.7+Math.random()*0.6, trailLen:Math.random()>0.5 }));
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}}
      className="flex flex-col items-center justify-center py-20 overflow-hidden relative"
      style={{fontFamily:"'DM Sans', sans-serif"}}>
      {[80,140,200].map((size,i)=>(
        <motion.div key={i} initial={{scale:0,opacity:0.6}} animate={{scale:4,opacity:0}}
          transition={{delay:i*0.12,duration:1.2,ease:"easeOut"}}
          className="absolute rounded-full border border-amber-400/30 pointer-events-none" style={{width:size,height:size}} />
      ))}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {sparks.map(s=>{ const rad=(s.angle*Math.PI)/180; return (
          <motion.div key={s.id} initial={{x:0,y:0,scale:1.5,opacity:1}} animate={{x:Math.cos(rad)*s.dist,y:Math.sin(rad)*s.dist,scale:0,opacity:[1,1,0.5,0]}}
            transition={{delay:s.delay,duration:s.dur,ease:[0.15,0.8,0.4,1]}} className="absolute pointer-events-none"
            style={{width:s.size,height:s.size*(s.trailLen?3:1),borderRadius:s.trailLen?"2px":"50%",background:s.color,boxShadow:`0 0 ${s.size*3}px ${s.color}`,transform:s.trailLen?`rotate(${s.angle}deg)`:undefined}} />
        );})}
      </div>
      <motion.div initial={{opacity:0}} animate={{opacity:0.15}} transition={{delay:0.05,duration:0.8}}
        className="absolute w-80 h-80 rounded-full bg-amber-400 blur-[80px] pointer-events-none" />
      <motion.div initial={{scale:0,rotate:-30}} animate={{scale:1,rotate:0}} transition={{type:"spring",stiffness:250,damping:16,delay:0.2}} className="relative z-10 mb-6">
        <div className="w-28 h-28 rounded-3xl flex items-center justify-center" style={{background:"linear-gradient(135deg,#10b98120,#05966918)",border:"2px solid #10b98140"}}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <motion.path d="M12 28 L23 39 L44 17" stroke="#10b981" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{pathLength:0,opacity:0}} animate={{pathLength:1,opacity:1}} transition={{delay:0.45,duration:0.55,ease:"easeOut"}} />
          </svg>
        </div>
      </motion.div>
      <motion.h2 initial={{opacity:0,y:24,scale:0.9}} animate={{opacity:1,y:0,scale:1}} transition={{delay:0.55,type:"spring",stiffness:280,damping:20}}
        className="text-5xl font-black text-white mb-3 relative z-10" style={{fontFamily:"'Syne',sans-serif",letterSpacing:"-0.02em"}}>
        Done! 🔥
      </motion.h2>
      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.7}} className="relative z-10 text-center mb-10 space-y-1">
        <p className="text-[#4a5580] text-base">{customerName} ka order ban gaya</p>
        <p className="text-amber-400 font-black text-xl">{orderCount} item{orderCount>1?"s":""} · {orderType}</p>
      </motion.div>
      <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{delay:0.88,type:"spring",stiffness:250,damping:22}} className="relative z-10 w-full max-w-xs px-6">
        <ShimmerBtn active onClick={onReset} className="w-full h-14 rounded-2xl text-base">+ Naya Order Banao</ShimmerBtn>
      </motion.div>
    </motion.div>
  );
}

function CustomerCard({ customer, orderCount, onEdit }) {
  return (
    <motion.div initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{type:"spring",stiffness:280,damping:26}}
      className="relative rounded-3xl overflow-hidden"
      style={{background:"linear-gradient(145deg,#0e1020 0%,#0c0e1a 60%,#080a14 100%)",border:"1px solid #1e2235",boxShadow:"inset 0 1px 0 #f59e0b15"}}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/35 to-transparent" />
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <motion.div initial={{scale:0,rotate:-90}} animate={{scale:1,rotate:0}} transition={{type:"spring",stiffness:400,damping:20,delay:0.1}}
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black flex-shrink-0"
            style={{background:"linear-gradient(135deg,#f59e0b20,#f9730c10)",border:"1px solid #f59e0b25",color:"#f59e0b"}}>
            {customer.customerName.charAt(0).toUpperCase()}
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-lg leading-tight truncate" style={{fontFamily:"'Syne',sans-serif"}}>{customer.customerName}</p>
            <a href={`tel:${customer.phone}`} className="text-blue-400 font-mono text-xs hover:text-blue-300 transition-colors">📞 {customer.phone}</a>
          </div>
          <motion.button whileTap={{scale:0.88}} onClick={onEdit}
            className="w-8 h-8 rounded-xl bg-[#1e2235] border border-[#2e3248] text-[#4a5580] hover:text-amber-400 hover:border-amber-500/30 transition-all flex items-center justify-center text-sm flex-shrink-0">✏️</motion.button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-[10px] px-2.5 py-1.5 rounded-xl font-black uppercase tracking-wider" style={{background:"#f59e0b15",border:"1px solid #f59e0b30",color:"#f59e0b"}}>{customer.orderType}</span>
          <span className="text-[10px] px-2.5 py-1.5 rounded-xl font-black" style={{background:"#1e2235",border:"1px solid #2e3248",color:"#4a5580"}}>{orderCount} item{orderCount>1?"s":""}</span>
        </div>
        <div className="space-y-2">
          {customer.address && (
            <div className="rounded-xl px-3 py-2.5" style={{background:"#06080f",border:"1px solid #1e2235"}}>
              <p className="text-[#2e3248] text-[9px] uppercase tracking-widest font-black mb-1">Address</p>
              <p className="text-[#6b7a99] text-xs leading-snug">{customer.address}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-2.5" style={{background:"#06080f",border:"1px solid #1e2235"}}>
              <p className="text-[#2e3248] text-[9px] uppercase tracking-widest font-black mb-1">Date</p>
              <p className="text-[#6b7a99] text-xs font-mono">{customer.date}</p>
            </div>
            <div className="rounded-xl px-3 py-2.5" style={{background:"#06080f",border:"1px solid #1e2235"}}>
              <p className="text-[#2e3248] text-[9px] uppercase tracking-widest font-black mb-1">Items</p>
              <p className="text-amber-400 text-sm font-black">{orderCount}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function OrderCard({ order, index, orderType, onChange, onRemove }) {
  return (
    <motion.div initial={{opacity:0,y:30,scale:0.93}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,x:-40,scale:0.88,transition:{duration:0.2}}}
      transition={{type:"spring",stiffness:280,damping:26,delay:index*0.06}}
      className="rounded-3xl overflow-hidden" style={{background:"#0c0e1a",border:"1px solid #1e2235"}}>
      <div className="flex items-center gap-3 px-5 py-4" style={{borderBottom:"1px solid #1e2235",background:"#08090f"}}>
        <motion.div initial={{scale:0,rotate:-180}} animate={{scale:1,rotate:0}} transition={{type:"spring",stiffness:500,damping:22,delay:index*0.06+0.1}}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{background:"#f59e0b20",border:"1px solid #f59e0b30",color:"#f59e0b"}}>{index+1}</motion.div>
        <span className="text-white font-bold text-sm flex-1 min-w-0 truncate">{order.itemName||`Order #${index+1}`}</span>
        <motion.button whileTap={{scale:0.82,rotate:15}} onClick={onRemove}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
          style={{background:"#1a0c0c",border:"1px solid #ef444425",color:"#ef4444"}}>🗑️</motion.button>
      </div>
      <div className="p-5 space-y-4">
        {orderType==="Normal Order" ? (
          <>
            <ForgeField label="Item Name" icon="🔧">
              <input value={order.itemName} onChange={e=>onChange("itemName",e.target.value)} placeholder="Grill, Gate, Door..." className={inp} />
            </ForgeField>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#3d4260] mb-2.5">Metal Type</p>
              <div className="flex gap-2 flex-wrap">
                {METAL_TYPES.map(m=><MetalPill key={m} label={m} selected={order.metalType===m} onClick={()=>onChange("metalType",m)} />)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ForgeField label="Height (ft)" icon="↕️">
                {/* ✅ FIX: type="text" inputMode="decimal" — number bug fix */}
                <input type="text" inputMode="decimal" value={order.height} onChange={e=>onChange("height",e.target.value)} placeholder="42" className={inp} />
              </ForgeField>
              <ForgeField label="Width (ft)" icon="↔️">
                <input type="text" inputMode="decimal" value={order.width} onChange={e=>onChange("width",e.target.value)} placeholder="26" className={inp} />
              </ForgeField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ForgeField label="Rate/kg (₹)" icon="💲">
                <input type="text" inputMode="decimal" value={order.perKgRate} onChange={e=>onChange("perKgRate",e.target.value)} placeholder="90" className={inp} />
              </ForgeField>
              <ForgeField label="Extra Charge" icon="➕">
                <input type="text" inputMode="decimal" value={order.extraCharge} onChange={e=>onChange("extraCharge",e.target.value)} placeholder="0" className={inp} />
              </ForgeField>
            </div>
            <ForgeField label="Description" icon="📝">
              <input value={order.description} onChange={e=>onChange("description",e.target.value)} placeholder="Blue sheet, extra fitting..." className={inp} />
            </ForgeField>
          </>
        ) : (
          <>
            <ForgeField label="Amount (₹)" icon="💰">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg pointer-events-none" style={{color:order.amount?"#f59e0b":"#2e3248"}}>₹</span>
                {/* ✅ FIX: type="text" inputMode="decimal" */}
                <input type="text" inputMode="decimal" value={order.amount} onChange={e=>onChange("amount",e.target.value)} placeholder="5000" className={`${inp} pl-9`} />
              </div>
            </ForgeField>
            <ForgeField label="Description" icon="📝">
              <textarea rows={3} value={order.description} onChange={e=>onChange("description",e.target.value)} placeholder="Kaam ka description..." className={`${inp} resize-none`} />
            </ForgeField>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function OrdersSection() {
  const [step,     setStep]     = useState(1);
  const [customer, setCustomer] = useState({ orderType:"", date:TODAY, customerName:"", phone:"", address:"" });
  const [orders,   setOrders]   = useState([EMPTY_ORDER()]);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);
  const [done,     setDone]     = useState(false);
  const [dir,      setDir]      = useState(1);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };
  const setField  = (f,v) => setCustomer(p=>({...p,[f]:v}));
  const setOF     = (i,f,v) => setOrders(p=>{ const c=[...p]; c[i]={...c[i],[f]:v}; return c; });
  const addOrder  = () => setOrders(p=>[...p,EMPTY_ORDER()]);
  const remOrder  = (i) => { if(orders.length===1) return showToast("Kam se kam ek order chahiye","error"); setOrders(p=>p.filter((_,idx)=>idx!==i)); };

  const canS2 = !!(customer.orderType && customer.customerName && customer.phone);
  const canS3 = orders.length>0 && orders.every(o => customer.orderType==="Normal Order" ? o.itemName : (o.description||o.amount));
  const goTo  = (s) => { setDir(s>step?1:-1); setStep(s); };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post("/orders", {
        orderType: customer.orderType,
        customer: { name:customer.customerName, phone:customer.phone, address:customer.address },
        orders: orders.map(o=>({
          date:customer.date, itemType:o.itemName||"", metalType:o.metalType||"",
          height:Number(o.height)||0, width:Number(o.width)||0,
          perKgRate:Number(o.perKgRate)||0, extraCharge:Number(o.extraCharge)||0,
          description:o.description||"", amount:o.amount?Number(o.amount):undefined
        })),
      });
      setDone(true);
    } catch(err) { showToast(err?.response?.data?.error||"Order create nahi hua","error"); }
    finally { setLoading(false); }
  };

  const reset = () => { setCustomer({orderType:"",date:TODAY,customerName:"",phone:"",address:""}); setOrders([EMPTY_ORDER()]); setStep(1); setDone(false); };

  const sv = {
    enter: d=>({ x:d>0?"50%":"-50%", opacity:0, scale:0.97 }),
    center: { x:0, opacity:1, scale:1 },
    exit:  d=>({ x:d>0?"-50%":"50%", opacity:0, scale:0.97 }),
  };

  const STEPS = [{n:1,l:"Customer"},{n:2,l:"Orders"},{n:3,l:"Review"}];

  if (done) return (
    <SuccessScreen customerName={customer.customerName} orderCount={orders.length} orderType={customer.orderType} onReset={reset} />
  );

  return (
    <div className="px-4 lg:px-6 py-5 pb-6" style={{ fontFamily:"'DM Sans', sans-serif" }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{opacity:0,y:-40,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-30,scale:0.95}}
            transition={{type:"spring",stiffness:380,damping:28}}
            className={`fixed top-20 left-4 right-4 lg:left-auto lg:right-6 lg:w-96 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold shadow-2xl ${toast.type==="error"?"text-red-300":"text-emerald-300"}`}
            style={{ background:toast.type==="error"?"#1a050518":"#05180b18", backdropFilter:"blur(20px)", border:toast.type==="error"?"1px solid #ef444430":"1px solid #10b98130" }}>
            <span className="text-xl flex-shrink-0">{toast.type==="error"?"⚠️":"✅"}</span>
            <span className="flex-1 leading-snug">{toast.msg}</span>
            <motion.button whileTap={{scale:0.85}} onClick={()=>setToast(null)} className="opacity-40 hover:opacity-90 text-lg">✕</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step header */}
      <div className="flex items-center gap-4 mb-6 pb-5" style={{borderBottom:"1px solid #1e2235"}}>
        <motion.div animate={{rotate:[0,-15,5,-8,0],scale:[1,1.1,1]}} transition={{duration:3.5,repeat:Infinity,repeatDelay:2,ease:"easeInOut"}}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{background:"#f59e0b15",border:"1px solid #f59e0b25"}}>🔨</motion.div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-black text-lg leading-none" style={{fontFamily:"'Syne',sans-serif"}}>Naya Order</h2>
          <p className="text-[#2e3248] text-xs mt-0.5">Customer details aur kaam ka detail bharo</p>
        </div>
        <div className="flex items-center gap-1">
          {STEPS.map((s,i)=>(
            <React.Fragment key={s.n}>
              <StepPill number={s.n} label={s.l}
                state={step>s.n?"done":step===s.n?"active":"pending"}
                onClick={()=>{ if(s.n<step)goTo(s.n); if(s.n===2&&canS2)goTo(2); if(s.n===3&&canS2&&canS3)goTo(3); }} />
              {i<2 && <StepLine filled={step>s.n} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step title */}
      <div className="mb-6">
        <AnimatePresence mode="wait">
          <motion.div key={`title-${step}`} initial={{opacity:0,y:16,filter:"blur(4px)"}} animate={{opacity:1,y:0,filter:"blur(0px)"}} exit={{opacity:0,y:-10,filter:"blur(4px)"}} transition={{duration:0.28,ease:[0.22,1,0.36,1]}}>
            <h3 className="text-white font-black text-2xl sm:text-3xl" style={{fontFamily:"'Syne',sans-serif",letterSpacing:"-0.02em"}}>
              {step===1 && <><span className="text-amber-400">01.</span> Customer Info</>}
              {step===2 && <><span className="text-amber-400">02.</span> Order Details</>}
              {step===3 && <><span className="text-amber-400">03.</span> Review & Submit</>}
            </h3>
            <p className="text-[#2e3248] text-sm mt-1">
              {step===1&&"Customer ka naam aur details bharo"}
              {step===2&&"Kaam ka detail add karo"}
              {step===3&&"Sab check karo phir submit karo"}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step 1 */}
      {step===1 && (
        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key="s1" custom={dir} variants={sv} initial="enter" animate="center" exit="exit"
              transition={{type:"spring",damping:32,stiffness:300}} className="space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#3d4260] mb-3">Order Type</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ORDER_TYPES.map(type=><OrderTypeCard key={type} type={type} selected={customer.orderType===type} onClick={()=>setField("orderType",type)} />)}
                </div>
              </div>
              <AnimatePresence>
                {customer.orderType && (
                  <motion.div initial={{opacity:0,y:20,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-10}} transition={{type:"spring",stiffness:280,damping:26}} className="space-y-3.5">
                    <ForgeField label="Customer Name" icon="👤"><input value={customer.customerName} onChange={e=>setField("customerName",e.target.value)} placeholder="Roopa Kumari" autoComplete="off" className={inp} /></ForgeField>
                    <ForgeField label="Phone Number" icon="📞"><input type="tel" inputMode="tel" value={customer.phone} onChange={e=>setField("phone",e.target.value)} placeholder="8260519735" className={inp} /></ForgeField>
                    <ForgeField label="Address" icon="📍"><textarea rows={2} value={customer.address} onChange={e=>setField("address",e.target.value)} placeholder="Jaltanda, Ranchi..." className={`${inp} resize-none`} /></ForgeField>
                    <ForgeField label="Order Date" icon="📅"><input type="date" value={customer.date} onChange={e=>setField("date",e.target.value)} className={inp} /></ForgeField>
                  </motion.div>
                )}
              </AnimatePresence>
              <ShimmerBtn active={canS2} onClick={()=>canS2?goTo(2):showToast("Type, naam aur phone required hai","error")} className="w-full h-14 rounded-2xl text-base mt-2">
                {canS2?"Aage Jao →":"Pehle details bharo"}
              </ShimmerBtn>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Steps 2 & 3 */}
      {step>=2 && (
        <div className="lg:grid lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr] lg:gap-7 lg:items-start">
          <div className="hidden lg:block lg:sticky lg:top-36">
            <CustomerCard customer={customer} orderCount={orders.length} onEdit={()=>goTo(1)} />
          </div>
          <div>
            <div className="lg:hidden mb-4">
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{background:"#0c0e1a",border:"1px solid #f59e0b25"}}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0" style={{background:"#f59e0b18",color:"#f59e0b"}}>{customer.customerName.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{customer.customerName}</p>
                  <p className="text-[#3d4260] text-xs">{customer.orderType}</p>
                </div>
                <motion.button whileTap={{scale:0.88}} onClick={()=>goTo(1)} className="text-[#3d4260] hover:text-amber-400 text-xs font-bold transition-colors">Edit ✏️</motion.button>
              </div>
            </div>

            <AnimatePresence mode="wait" custom={dir}>
              {step===2 && (
                <motion.div key="s2" custom={dir} variants={sv} initial="enter" animate="center" exit="exit" transition={{type:"spring",damping:32,stiffness:300}} className="space-y-4">
                  <AnimatePresence initial={false}>
                    {orders.map((order,i)=>(
                      <OrderCard key={i} order={order} index={i} orderType={customer.orderType} onChange={(f,v)=>setOF(i,f,v)} onRemove={()=>remOrder(i)} />
                    ))}
                  </AnimatePresence>
                  <motion.button type="button" whileTap={{scale:0.97}} whileHover={{borderColor:"#f59e0b40"}} onClick={addOrder}
                    className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    style={{border:"2px dashed #1e2235",color:"#3d4260",background:"transparent"}}>
                    <motion.span animate={{rotate:[0,90,180,270,360]}} transition={{duration:4,repeat:Infinity,ease:"linear"}} className="text-lg">✦</motion.span>
                    Aur ek kaam add karo
                  </motion.button>
                  <div className="flex gap-3 pt-1">
                    <motion.button whileTap={{scale:0.9}} onClick={()=>goTo(1)} className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-2xl text-white text-xl" style={{background:"#0c0e1a",border:"1px solid #1e2235"}}>←</motion.button>
                    <ShimmerBtn active={canS3} onClick={()=>canS3?goTo(3):showToast("Har order ka detail bharo","error")} className="flex-1 h-14 rounded-2xl text-base">Review Karo →</ShimmerBtn>
                  </div>
                </motion.div>
              )}

              {step===3 && (
                <motion.div key="s3" custom={dir} variants={sv} initial="enter" animate="center" exit="exit" transition={{type:"spring",damping:32,stiffness:300}} className="space-y-4">
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#3d4260]">📦 Items ({orders.length})</p>
                    {orders.map((o,i)=>(
                      <motion.div key={i} initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} transition={{delay:i*0.07,type:"spring",stiffness:300,damping:28}}
                        className="rounded-2xl px-5 py-4" style={{background:"#0c0e1a",border:"1px solid #1e2235"}}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{background:"#1e2235",color:"#4a5580"}}>{i+1}</span>
                          <p className="text-white font-bold text-sm">{o.itemName||customer.orderType}</p>
                          {o.metalType && <span className="ml-auto text-xs px-2 py-0.5 rounded-lg font-bold" style={{background:"#f59e0b12",border:"1px solid #f59e0b25",color:"#f59e0b"}}>{o.metalType}</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pl-8">
                          {(o.height||o.width) && <span className="text-[#4a5580]">📐 {o.height||"—"}×{o.width||"—"} ft</span>}
                          {o.perKgRate && <span className="text-[#4a5580]">💲 ₹{o.perKgRate}/kg</span>}
                          {Number(o.extraCharge)>0 && <span className="text-[#4a5580]">➕ ₹{o.extraCharge}</span>}
                          {o.amount && <span className="text-amber-400 font-bold">₹{Number(o.amount).toLocaleString("en-IN")}</span>}
                          {o.description && <span className="text-blue-400">📝 {o.description}</span>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[{label:"✏️ Customer Edit",action:()=>goTo(1)},{label:"✏️ Orders Edit",action:()=>goTo(2)}].map(b=>(
                      <motion.button key={b.label} whileTap={{scale:0.95}} onClick={b.action} className="py-3 rounded-xl text-sm font-bold transition-all" style={{background:"#0c0e1a",border:"1px solid #1e2235",color:"#4a5580"}}>{b.label}</motion.button>
                    ))}
                  </div>
                  <motion.button onClick={handleSubmit} disabled={loading} whileTap={!loading?{scale:0.97}:{}}
                    className="relative w-full h-16 rounded-2xl font-black text-lg overflow-hidden disabled:opacity-50"
                    style={{background:"linear-gradient(135deg,#10b981,#059669)",boxShadow:"0 8px 40px #10b98125",color:"#000"}}>
                    {!loading && <motion.div animate={{x:["-100%","200%"]}} transition={{duration:2.5,repeat:Infinity,ease:"linear",repeatDelay:0.8}} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 pointer-events-none" />}
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {loading ? <><motion.span animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:"linear"}} className="w-5 h-5 border-2 border-black/25 border-t-black rounded-full inline-block" />Creating...</> : "✅ Order Submit Karo"}
                    </span>
                  </motion.button>
                  <button onClick={()=>goTo(2)} className="w-full py-3 text-[#2e3248] text-sm font-semibold hover:text-[#4a5580] transition-colors">← Wapis jao</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}