import {useState} from "react";
import {catalogs,describe,catalogMatches,type CatalogMatch,type Color,type ColorData} from "../lib/color";
export default function ColorTool({onChange}:{onChange?:(data:ColorData,match?:CatalogMatch)=>void}={}){
 const [color,setColor]=useState<Color>({l:.65,c:.18,h:30});
 const [catalog,setCatalog]=useState("open");
 const [palette,setPalette]=useState<Color[]>(()=>{try{const p=JSON.parse(localStorage.getItem("studio.color.v1")||"[]");return Array.isArray(p)?p.filter(x=>x&&Number.isFinite(x.l)&&x.l>=0&&x.l<=1&&Number.isFinite(x.c)&&x.c>=0&&x.c<=.4&&Number.isFinite(x.h)):[];}catch{return [];}});
 const [notice,setNotice]=useState("");
 const data=describe(color);
 const matches=catalogMatches(color,catalog);
 function choose(v:Color){setColor(v);onChange?.(describe(v),catalogMatches(v,catalog)[0]);}
 function save(p:Color[]){setPalette(p);try{localStorage.setItem("studio.color.v1",JSON.stringify(p));setNotice("Saved on this device");}catch{setNotice("Storage unavailable; export your palette");}}
 function exportPalette(){const url=URL.createObjectURL(new Blob([JSON.stringify(palette.map(describe),null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="studio-palette.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const swatch=(v:Color,i:number)=><button key={i} type="button" title={describe(v).hex} aria-label={describe(v).hex} onClick={()=>choose(v)} style={{background:describe(v).hex,minHeight:44,minWidth:38,flex:1,border:"1px solid #8885",borderRadius:4}}/>;
 return <div style={{background:"hsl(24 26% 94%)",minHeight:onChange?undefined:"100dvh",width:"100%",position:"relative",isolation:"isolate"}}>{!onChange&&<div aria-hidden="true" style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"clamp(100px,42vw,680px)",fontWeight:700,letterSpacing:"-.07em",color:"rgba(80,99,107,.065)",pointerEvents:"none",zIndex:-1,userSelect:"none",overflow:"hidden"}}>EGG</div>}<section style={{fontFamily:"var(--font-body, sans-serif)",color:"#50636b",background:"transparent",padding:20,maxWidth:760,margin:"auto",display:"grid",gap:16}}>
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h1 style={{fontSize:24,letterSpacing:4}}>COLOR</h1>{!onChange&&<a href="https://kolesnikov.studio">kolesnikov.studio</a>}</div>
 <div style={{background:data.hex,minHeight:120,borderRadius:4}} aria-label={data.hex}/>
 {([["h","Hue",360,1],["l","Lightness",1,.01],["c","Chroma",.4,.001]] as const).map(([key,label,max,step])=><label key={key} style={{display:"grid",gap:5}}>{label} · {color[key].toFixed(key==="h"?0:3)}<input type="range" min={0} max={max} step={step} value={color[key]} onChange={e=>choose({...color,[key]:Number(e.target.value)})}/></label>)}
 <div style={{fontSize:13,overflowWrap:"anywhere"}}>{data.hex} · RGB {data.rgb.join(", ")}<br/>OKLCH {Object.values(data.oklch).map(v=>v.toFixed(3)).join(" ")}<br/>CIELAB D65 {data.lab.map(v=>v.toFixed(2)).join(" ")}{data.mapped&&<p>Chroma reduced to fit sRGB.</p>}</div>
 <div>Variations<div style={{display:"flex",gap:4}}>{Array.from({length:7},(_,i)=>({...color,l:Math.max(0,Math.min(1,color.l+(i-3)*.09))})).map(swatch)}</div></div>
 <label>Catalog <select value={catalog} onChange={e=>setCatalog(e.target.value)}>{catalogs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}<option value="own">My palette</option></select></label>
 <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(catalog==="own"?palette:catalogs.find(c=>c.id===catalog)?.colors||[]).map(swatch)}</div>
 <div><small>Nearest catalog references · ΔE76 (D65)</small>{matches.slice(0,3).map(m=><button key={m.code} type="button" onClick={()=>choose(m.color)} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",width:"100%"}}><span style={{background:m.data.hex,width:30,height:30,borderRadius:3}}/>{m.catalog} / {m.code} · ΔE {m.deltaE.toFixed(2)}</button>)}</div>
 <div style={{display:"flex",gap:16,flexWrap:"wrap"}}><button type="button" onClick={()=>save([...palette,color])}>Save color +</button><button type="button" onClick={exportPalette} disabled={!palette.length}>Export JSON</button><button type="button" onClick={()=>save([])}>Clear palette</button></div>
 <small role="status">{notice} · Digital preview, not a physical paint specification.</small>
 </section></div>;
}
