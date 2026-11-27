export async function startButlerRealtime(onEvent:(event:any)=>void,onError:()=>void,signal:AbortSignal){
 const pc=new RTCPeerConnection();const audio=document.createElement("audio");audio.autoplay=true;audio.setAttribute("playsinline","");let stream:MediaStream|undefined;let closed=false;
 const close=()=>{if(closed)return;closed=true;stream?.getTracks().forEach(t=>t.stop());pc.close();audio.pause();audio.srcObject=null;audio.remove();signal.removeEventListener("abort",close);};
 signal.addEventListener("abort",close,{once:true});
 try{
 if(signal.aborted)throw Error("cancelled");
 stream=await navigator.mediaDevices.getUserMedia({audio:true});if(closed){stream.getTracks().forEach(t=>t.stop());throw Error("cancelled");}
 document.body.appendChild(audio);pc.ontrack=e=>{audio.srcObject=e.streams[0];audio.play().catch(()=>{close();onError();});};
 stream.getTracks().forEach(t=>pc.addTrack(t,stream!));
 const dc=pc.createDataChannel("oai-events");dc.onmessage=e=>{try{onEvent(JSON.parse(e.data));}catch{}};pc.onconnectionstatechange=()=>{if(pc.connectionState==="failed"){close();onError();}};
 const offer=await pc.createOffer();await pc.setLocalDescription(offer);
 const token=await fetch("/api/butler-realtime",{method:"POST",signal});if(!token.ok)throw Error("session");const {value}=await token.json();
 const answer=await fetch("https://api.openai.com/v1/realtime/calls",{method:"POST",headers:{Authorization:"Bearer "+value,"Content-Type":"application/sdp"},body:offer.sdp,signal});if(!answer.ok)throw Error("connection");
 await pc.setRemoteDescription({type:"answer",sdp:await answer.text()});return close;
 }catch(e){close();throw e;}
}
