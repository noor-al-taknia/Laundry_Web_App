import nodemailer from 'nodemailer';
import {allowContact,validateContact} from '../../../lib/contact';
export const runtime='nodejs';
export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Cross-origin request denied.'},{status:403});
  if(!allowContact())return Response.json({error:'Too many requests. Please try again later.'},{status:429,headers:{'retry-after':'900'}});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'JSON required.'},{status:415});
  if(Number(request.headers.get('content-length')||0)>20_000)return Response.json({error:'Message too large.'},{status:413});
  let bytes=0;const chunks:Uint8Array[]=[];const reader=request.body?.getReader();
  if(reader){while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>20_000){await reader.cancel();return Response.json({error:'Message too large.'},{status:413});}chunks.push(value);}}
  let input:unknown;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return Response.json({error:'Invalid message.'},{status:400});}
  const fields=validateContact(input);if(!fields)return Response.json({error:'Please provide a valid name, email and message (10–4000 characters).'},{status:400});
  if(fields.website)return Response.json({ok:true});
  const {SMTP_HOST,SMTP_USER,SMTP_PASS,SMTP_FROM}=process.env;
  if(process.env.CONTACT_ENABLED!=='true'||!SMTP_HOST||!SMTP_USER||!SMTP_PASS||!SMTP_FROM)return Response.json({error:'The message form is not configured yet. Please email pearllaundrysupport@gmail.com.'},{status:503});
  const port=Number(process.env.SMTP_PORT||465);
  const transport=nodemailer.createTransport({host:SMTP_HOST,port,secure:port===465,requireTLS:port!==465,auth:{user:SMTP_USER,pass:SMTP_PASS},connectionTimeout:10_000,greetingTimeout:10_000,socketTimeout:20_000});
  try{await transport.sendMail({from:SMTP_FROM,to:'pearllaundrysupport@gmail.com',replyTo:fields.email,subject:'Pearl Laundry website enquiry',text:`Name: ${fields.name}\nEmail: ${fields.email}\n\n${fields.message}`});return Response.json({ok:true});}
  catch{return Response.json({error:'Unable to send right now. Please email pearllaundrysupport@gmail.com.'},{status:502});}
  finally{transport.close();}
}
