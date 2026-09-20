import {loadShop} from '../lib/shop';
import Website from './website';
export const dynamic='force-dynamic';
export default async function Page(){return <Website data={await loadShop()}/>;}
