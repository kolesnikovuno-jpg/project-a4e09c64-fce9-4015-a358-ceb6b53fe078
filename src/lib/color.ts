export type Color = { l:number; c:number; h:number };
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
function linear({l,c,h}:Color){
 const a=c*Math.cos(h*Math.PI/180), b=c*Math.sin(h*Math.PI/180);
 const x=(l+.3963377774*a+.2158037573*b)**3,y=(l-.1055613458*a-.0638541728*b)**3,z=(l-.0894841775*a-1.291485548*b)**3;
 return [4.0767416621*x-3.3077115913*y+.2309699292*z,-1.2684380046*x+2.6097574011*y-.3413193965*z,-.0041960863*x-.7034186147*y+1.707614701*z];
}
export function describe(input:Color){
 let lo=0,hi=input.c;
 const valid=(c:number)=>linear({...input,c}).every(v=>v>=-1e-7&&v<=1+1e-7);
 if(valid(hi))lo=hi;else for(let i=0;i<25;i++){const m=(lo+hi)/2;if(valid(m))lo=m;else hi=m;}
 const oklch={...input,c:lo};
 const [r,g,b]=linear(oklch).map(clamp);
 const rgb=[r,g,b].map(v=>Math.round(255*(v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055)));
 const hex="#"+rgb.map(v=>v.toString(16).padStart(2,"0")).join("").toUpperCase();
 const f=(v:number)=>v>216/24389?Math.cbrt(v):(24389/27*v+16)/116;
 const x=f((.4124564*r+.3575761*g+.1804375*b)/.95047),y=f(.2126729*r+.7151522*g+.072175*b),z=f((.0193339*r+.119192*g+.9503041*b)/1.08883);
 return {hex,rgb,oklch,lab:[116*y-16,500*(x-y),200*(y-z)],mapped:lo<input.c-1e-6};
}
export type ColorData=ReturnType<typeof describe>;
export type Catalog={id:string;name:string;colors:Color[];license:string};
export const catalogs:Catalog[]=[{id:"open",name:"Open spectrum",license:"Generated",colors:Array.from({length:12},(_,i)=>({l:.65,c:.18,h:i*30}))},{id:"studio",name:"Studio neutrals",license:"Original",colors:Array.from({length:8},(_,i)=>({l:.25+i*.095,c:.025,h:65}))}];

export function catalogMatches(color:Color, catalogId:string){
 const target=describe(color);
 const catalog=catalogs.find(c=>c.id===catalogId);
 if(!catalog)return [];
 return catalog.colors.map((entry,index)=>{
 const data=describe(entry);
 const deltaE=Math.hypot(...data.lab.map((v,i)=>v-target.lab[i]));
 return {catalog:catalog.name,catalogId:catalog.id,code:catalog.id.toUpperCase()+"-"+String(index+1).padStart(3,"0"),color:entry,data,deltaE};
 }).sort((a,b)=>a.deltaE-b.deltaE);
}
export type CatalogMatch=ReturnType<typeof catalogMatches>[number];

export type ColorSelection = ColorData & {schemaVersion:1; selectedAt:string; reference?:{catalog:string;catalogId:string;code:string;deltaE:number;hex:string}};
export function colorSelection(data:ColorData,match?:CatalogMatch):ColorSelection{return {...data,schemaVersion:1,selectedAt:new Date().toISOString(),reference:match?{catalog:match.catalog,catalogId:match.catalogId,code:match.code,deltaE:match.deltaE,hex:match.data.hex}:undefined};}
