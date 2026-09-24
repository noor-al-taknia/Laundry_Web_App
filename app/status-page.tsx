import Link from "next/link";

type StatusPageProps={
  code:string;
  title:string;
  message:string;
  action:string;
  href?:string;
  kind:"missing"|"maintenance"|"offline";
};

function Illustration({kind}:{kind:StatusPageProps["kind"]}){
  return <div className={`status-illustration status-${kind}`} aria-hidden="true">
    <span className="status-bubble one"/><span className="status-bubble two"/><span className="status-bubble three"/>
    <div className="status-machine"><span/><div><i/></div></div>
    {kind==="maintenance"&&<><span className="status-wrench">⌁</span><span className="status-spark">✦</span></>}
    {kind==="offline"&&<><span className="status-cloud">☁</span><span className="status-signal">⌁</span></>}
    {kind==="missing"&&<><span className="status-search">⌕</span><span className="status-sock">●</span></>}
  </div>;
}

export default function StatusPage({code,title,message,action,href="/",kind}:StatusPageProps){
  return <main className="status-page"><section className="status-card"><Illustration kind={kind}/><p className="eyebrow">{code}</p><h1>{title}</h1><p>{message}</p><Link className="button primary" href={href}>{action}</Link></section></main>;
}
