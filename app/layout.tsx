import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Pearl Laundry | Laundry care in Riyadh',description:'Discover Pearl Laundry services, current prices and contact details.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
