import StatusPage from "./status-page";

export default function NotFound(){
  return <StatusPage code="404" title="This page has gone missing." message="The link may be out of date, or the page may have moved." action="Return to Pearl Laundry" kind="missing"/>;
}
