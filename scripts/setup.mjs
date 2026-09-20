import {existsSync,copyFileSync,chmodSync} from 'node:fs';
if(!existsSync('.env.local')){copyFileSync('.env.example','.env.local');chmodSync('.env.local',0o600);}
console.log('Website config ready. SMTP sending stays disabled until configured.');
