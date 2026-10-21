// Camera zoom values are browser units, not the iPhone Camera app's lens labels.
export function isUltraWide(label=''){
  return !/front|frontal|delantera|facetime/i.test(label)&&/ultra[\s-]*(wide|gran[\s-]*angular|grand[\s-]*angle|weitwinkel)/i.test(label);
}
export function cameraSignature(track){
  const s=track?.getSettings?.()||{},identity=s.deviceId||track?.label||'';
  if(!identity)return '';
  let hash=2166136261;for(const c of identity)hash=Math.imul(hash^c.charCodeAt(0),16777619);
  return `${(hash>>>0).toString(36)}@${Number.isFinite(s.zoom)?Math.round(s.zoom*1000)/1000:'default'}`;
}
export async function minimizeZoom(track){
  try{
    const range=track?.getCapabilities?.().zoom;
    if(!Number.isFinite(range?.min)||range.min<=0||!Number.isFinite(range.max)||range.max<range.min||!track.applyConstraints)return false;
    // Keep the requested resolution and frame rate when changing the zoom.
    const constraints=track.getConstraints?.()||{};
    await track.applyConstraints({...constraints,zoom:{ideal:range.min},advanced:[{zoom:range.min}]});
    const actual=track.getSettings?.().zoom;
    return Number.isFinite(actual)&&Math.abs(actual-range.min)<.001;
  }catch{return false;}
}
const stop=stream=>stream?.getTracks().forEach(track=>track.stop());
export async function openCamera({media,facing,wide=false,deviceId='',active=()=>true,onStream=()=>{}}){
  let stream=null,devices=[],fallback=false;
  const acquire=async id=>{
    const next=await media.getUserMedia({video:{...(id?{deviceId:{exact:id}}:{facingMode:{ideal:facing}}),width:{ideal:640},height:{ideal:480},frameRate:{ideal:15,max:24}},audio:false});
    if(!active()){stop(next);return false;}
    stream=next;onStream(next);return true;
  };
  try{
    try{if(!await acquire(deviceId))return null;}
    catch(error){if(!deviceId||!['NotFoundError','OverconstrainedError'].includes(error.name))throw error;fallback=true;if(!active()||!await acquire(''))return null;}
    try{devices=(await media.enumerateDevices?.()||[]).filter(d=>d.kind==='videoinput'&&d.deviceId);}catch{}
    if(!active()){stop(stream);return null;}
    let track=stream.getVideoTracks?.()[0];
    if(wide&&!deviceId){
      const ultra=devices.find(d=>isUltraWide(d.label)),current=track?.getSettings?.().deviceId;
      if(ultra&&ultra.deviceId!==current){
        stop(stream);
        try{if(!await acquire(ultra.deviceId))return null;}
        catch(error){if(['NotAllowedError','SecurityError'].includes(error.name))throw error;fallback=true;if(!active()||!await acquire(''))return null;}
        track=stream.getVideoTracks?.()[0];
      }
    }
    const zoomMin=wide?await minimizeZoom(track):false;
    if(!active()){stop(stream);return null;}
    const actual=track?.getSettings?.()||{},label=devices.find(d=>d.deviceId===actual.deviceId)?.label||track?.label||'';
    return {stream,devices,track,zoomMin,ultraWide:isUltraWide(label),fallback,lens:cameraSignature(track)};
  }catch(error){stop(stream);throw error;}
}
