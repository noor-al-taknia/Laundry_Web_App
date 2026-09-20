export type PublicShop={shop:{name:string;nameAr:string;address:string;phone:string;email:string}|null;categories:Array<{id:number;name:string;services:Array<{id:number;name:string;nameAr:string;price:number}>}>};
export async function loadShop():Promise<PublicShop|null>{
  try {
    const origin=process.env.BACKEND_URL || 'http://127.0.0.1:4000';
    const response=await fetch(new URL('/api/public/shop',origin),{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(!response.ok)return null;
    return await response.json() as PublicShop;
  } catch {return null;}
}
