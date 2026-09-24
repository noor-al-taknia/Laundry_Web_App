import StatusPage from "../status-page";

export default function Offline(){
  return <StatusPage code="OFFLINE" title="No connection right now." message="Check your Wi-Fi or mobile data, then refresh this page to continue." action="Try again" kind="offline"/>;
}
