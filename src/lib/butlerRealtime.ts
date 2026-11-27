export async function startButlerRealtime(onEvent:(event:any)=>void,onError:()=>void,signal:AbortSignal){
 const pc=new RTCPeerConnection();const audio=document.createElement("audio");audio.autoplay=true;audio.setAttribute("playsinline","");let stream:MediaStream|undefined;let closed=false;let remote:{id:string;signature:string}|undefined;
 const hangup=()=>{if(remote)void fetch('/api/butler-realtime',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'stop',...remote}),keepalive:true}).catch(()=>{});};
 const close=()=>{if(closed)return;closed=true;hangup();stream?.getTracks().forEach(t=>t.stop());pc.close();audio.pause();audio.srcObject=null;audio.remove();signal.removeEventListener("abort",close);};
 signal.addEventListener("abort",close,{once:true});
 try{
 if(signal.aborted)throw Error("cancelled");
 stream=await navigator.mediaDevices.getUserMedia({audio:true});if(closed){stream.getTracks().forEach(t=>t.stop());throw Error("cancelled");}
 document.body.appendChild(audio);pc.ontrack=e=>{audio.srcObject=e.streams[0];audio.play().catch(()=>{close();onError();});};
 stream.getTracks().forEach(t=>pc.addTrack(t,stream!));
 const dc=pc.createDataChannel("oai-events");dc.onmessage=e=>{try{onEvent(JSON.parse(e.data));}catch{}};pc.onconnectionstatechange=()=>{if(pc.connectionState==="failed"){close();onError();}};
 const offer=await pc.createOffer();await pc.setLocalDescription(offer);
 const response=await fetch("/api/butler-realtime",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sdp:offer.sdp})});if(!response.ok)throw Error("session");const answer=await response.json();remote={id:answer.id,signature:answer.signature};if(closed){hangup();throw Error("cancelled");}
 await pc.setRemoteDescription({type:"answer",sdp:answer.sdp});return close;
 }catch(e){close();throw e;}
}
