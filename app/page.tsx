import {loadShop} from '../lib/shop';
import Website from './website';
import StatusPage from './status-page';
export const dynamic='force-dynamic';
export default async function Page(){const data=await loadShop();return data?.shop?.maintenanceActive?<StatusPage code="TEMPORARILY UNAVAILABLE" title="We are giving the site a fresh press." message="Pearl Laundry is carrying out a brief update. Please come back shortly." action="Try again soon" kind="maintenance"/>:<Website data={data}/>;}
