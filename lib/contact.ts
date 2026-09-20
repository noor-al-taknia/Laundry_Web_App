export type Contact={name:string;email:string;message:string;website:string};
export function validateContact(value:unknown):Contact|null{
  if(!value||typeof value!=='object')return null;
  const raw=value as Record<string,unknown>;
  if(!['name','email','message'].every(key=>typeof raw[key]==='string'))return null;
  const name=String(raw.name).trim(),email=String(raw.email).trim(),message=String(raw.message).trim(),website=typeof raw.website==='string'?raw.website:'';
  if(name.length<2||name.length>100||/[\r\n\x00]/.test(name)||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||/[\r\n\x00]/.test(email)||message.length<10||message.length>4000)return null;
  return {name,email,message,website};
}
// Conservative single-process global cap; production must also rate-limit at its ingress.
const attempts:number[]=[];
export function allowContact(now=Date.now()){
  while(attempts.length && attempts[0]<now-15*60_000)attempts.shift();
  if(attempts.length>=20)return false;
  attempts.push(now);return true;
}
