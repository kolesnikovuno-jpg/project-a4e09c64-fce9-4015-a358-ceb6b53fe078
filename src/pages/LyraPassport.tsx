import { useLocale } from "@/i18n/useLocale";
const URL = "https://lyra.kolesnikov.studio/passport";
export default function LyraPassport() {
 const {locale,localePath}=useLocale();
 const lang=locale==="uk"?0:locale==="ru"?1:2;
 const tr=(a:string,b:string,c:string)=>[a,b,c][lang];
 const qr=(format:string)=>"https://api.qrserver.com/v1/create-qr-code/?size=600x600&qzone=4&format="+format+"&data="+encodeURIComponent(URL);
 const pending=tr("Уточнюється","Уточняется","Pending verification");
 return <main className="min-h-screen px-6 py-12" style={{background:"#F5EFEB",color:"#3A3A3A",fontFamily:"monospace"}}><article className="mx-auto max-w-xl space-y-6">
 <a href={localePath("/lyra")} className="underline">← Lyra</a>
 <h1 className="text-4xl">LYRA</h1><p>{tr("Паспорт виробу","Паспорт изделия","Product passport")} · v0.1</p>
 <p>{tr("Попередня редакція. Не є підтвердженням безпеки або готовності до продажу.","Предварительная редакция. Не является подтверждением безопасности или готовности к продаже.","Preliminary edition. Not a safety certification or confirmation of sale readiness.")}</p>
 {[[tr("Автор","Автор","Author"),"R. Yury Kolesnikov"],[tr("Габарити моделі","Габариты модели","Model dimensions"),"1500 × 840 × 1750 mm (H × W × L)"],[tr("Матеріали","Материалы","Materials"),pending],[tr("Навантаження та випробування","Нагрузка и испытания","Load and testing"),pending],[tr("Експлуатація та догляд","Эксплуатация и уход","Use and care"),pending],[tr("Виробник та гарантія","Производитель и гарантия","Manufacturer and warranty"),pending]].map(([k,v])=><section key={k} className="border-t border-black/20 pt-4"><h2 className="text-xs uppercase tracking-widest opacity-70">{k}</h2><p className="mt-2">{v}</p></section>)}
 <section className="border-t border-black/20 pt-6"><img src={qr("png")} alt="QR — Lyra passport" width={144} height={144}/><p className="mt-3 break-all">{URL}</p><div className="flex gap-6 mt-3"><a className="underline" href={qr("svg")}>SVG</a><a className="underline" href={qr("png")}>PNG</a></div></section>
 <a className="underline" href={localePath("/lyra")}>← Lyra</a><p className="text-xs opacity-60">kolesnikov.studio</p></article></main>;
}
