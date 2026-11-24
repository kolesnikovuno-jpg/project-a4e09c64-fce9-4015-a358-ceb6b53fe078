import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { lyraSupabase } from "@/integrations/supabase/lyraClient";

type Passport = {id:string; slug:string; title:string; object_url:string; revision:number; updated_at:string; public_data:{author?:string; kind?:string; status?:string; dimensions_mm?:{height:number;width:number;length:number}; technical_document?:string}};
export default function PassportPage(){
 const {id}=useParams(); const {pathname}=useLocation();
 const locale=pathname.split("/")[1]; const uk=locale==="uk", ru=locale==="ru";
 const [data,setData]=useState<Passport|null>(null); const [error,setError]=useState(false);
 useEffect(()=>{let active=true;setData(null);setError(false);
 if(!id){setError(true);return;}
 lyraSupabase.from("egg_passports").select("id,slug,title,object_url,revision,updated_at,public_data").eq("id",id).maybeSingle().then(({data,error})=>{if(active){setData(data as Passport|null);setError(!!error||!data);}});
 return ()=>{active=false;};},[id]);
 const heading=uk?"Паспорт об’єкта":ru?"Паспорт объекта":"Object passport";
 return <main style={{maxWidth:640,margin:"0 auto",padding:"48px 24px",minHeight:"100vh",fontFamily:"var(--font-body)",color:"#2a2a2a",background:"#F5EFEB"}}>
 <p style={{letterSpacing:".2em",fontSize:12}}>KOLESNIKOV.STUDIO / EGG</p><h1 style={{fontSize:32,margin:"24px 0"}}>{heading}</h1>
 {error?<p role="alert">{uk?"Паспорт недоступний":ru?"Паспорт недоступен":"Passport unavailable"}</p>:!data?<p>{uk?"Завантаження…":ru?"Загрузка…":"Loading…"}</p>:<>
 <h2 style={{fontSize:28}}>{data.title}</h2><p>{uk?"Паспорт моделі":ru?"Паспорт модели":"Model passport"}</p>
 <hr/><p>ID: {data.id}</p><p>{uk?"Версія":ru?"Версия":"Revision"}: {data.revision}</p><p>{new Date(data.updated_at).toLocaleDateString(uk?"uk-UA":ru?"ru-RU":"en-GB")}</p>
 <p>{data.public_data.author}</p>
 {data.public_data.dimensions_mm&&<p>{uk?"Розміри":ru?"Размеры":"Dimensions"}: {data.public_data.dimensions_mm.length} × {data.public_data.dimensions_mm.width} × {data.public_data.dimensions_mm.height} mm</p>}
 <p>{uk?"Дані моделі; не сертифікат випробувань.":ru?"Данные модели; не сертификат испытаний.":"Model documentation; not a test certificate."}</p>
 <p><a href="/lyra-technical.pdf">{uk?"Технічний документ":ru?"Технический документ":"Technical document"}</a></p>
 <img src="/passports/lyra.svg" alt="Passport QR code" width={150} height={150}/><p><a href="/passports/lyra.svg" download="lyra-passport.svg">QR SVG</a></p>
 <hr/><a href={data.object_url}>{uk?"Сторінка об’єкта":ru?"Страница объекта":"Object page"} ↗</a></>}
 </main>;
}
