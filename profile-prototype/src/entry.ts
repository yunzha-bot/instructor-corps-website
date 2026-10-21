import "./scrollbars.css";

async function startPrototype() {
if (new URLSearchParams(location.search).get("view") === "learning") {
  await import("./learning");
} else if (new URLSearchParams(location.search).get("view") === "profile") {
  await import("./main.jsx");
} else {
  const {records}=await import('./rhine/data');
  if(records.length===0){await import('./rhine/catalog-empty');return;}
  document.querySelector("#root")!.innerHTML = '<main id="viewport"><div id="stage"></div></main>';
  await import("./rhine/main");
}

}
void startPrototype();
export {};
