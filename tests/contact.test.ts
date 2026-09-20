import {describe,it,expect,vi} from 'vitest';
vi.mock('nodemailer',()=>({default:{createTransport:vi.fn()}}));
import nodemailer from 'nodemailer';
import {validateContact} from '../lib/contact';
import {POST} from '../app/api/contact/route';
const valid={name:'Test Person',email:'test@example.com',message:'Please tell me about your laundry services.',website:''};
describe('contact safety',()=>{
  it('validates messages and rejects header injection',()=>{expect(validateContact(valid)).toEqual(valid);expect(validateContact({...valid,email:'a@example.com\r\nBcc: other@example.com'})).toBeNull();expect(validateContact({...valid,message:'x'})).toBeNull();});
  it('rejects cross-origin requests',async()=>{const response=await POST(new Request('https://shop.example/api/contact',{method:'POST',headers:{origin:'https://evil.example'},body:JSON.stringify(valid)}));expect(response.status).toBe(403);});
  it('never sends when SMTP is disabled',async()=>{vi.stubEnv('CONTACT_ENABLED','false');const response=await POST(new Request('https://shop.example/api/contact',{method:'POST',headers:{origin:'https://shop.example','content-type':'application/json'},body:JSON.stringify(valid)}));expect(response.status).toBe(503);expect(nodemailer.createTransport).not.toHaveBeenCalled();vi.unstubAllEnvs();});
});
