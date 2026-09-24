import StatusPage from "../status-page";

export default function Maintenance(){
  return <StatusPage code="TEMPORARILY UNAVAILABLE" title="We are giving the site a fresh press." message="Pearl Laundry is carrying out a brief update. Please come back shortly." action="Try the home page" kind="maintenance"/>;
}
