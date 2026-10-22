// Hold the writer lock before importing any code that reads or writes session data.
export async function claimSession(){
  if(!navigator.locks?.request)throw Error('session-unsupported');
  return new Promise((resolve,reject)=>{
    navigator.locks.request('pomodoro-squats-session',{ifAvailable:true},async lock=>{
      if(!lock){resolve(false);return;}
      let release;const lifetime=new Promise(done=>release=done);
      addEventListener('pagehide',()=>{document.getElementById('main').inert=true;release();},{once:true});
      addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
      resolve(true);await lifetime;
    }).catch(reject);
  });
}
