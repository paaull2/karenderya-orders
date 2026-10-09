const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP"}).format(n);
const date=d=>d&&d!=="0001-01-01T00:00:00+00:00"?new Date(d).toLocaleString("en-PH"):"—";
function note(message,error=false){const m=$("message");m.textContent=message;m.classList.toggle("error",error)}
let pending=0;
const overlay=document.createElement("div");
overlay.id="loading-overlay";overlay.hidden=true;
overlay.innerHTML='<div class="loading-box" role="status"><span class="spinner"></span><span>Loading, please wait...</span></div>';
document.body.append(overlay);
async function api(url,method="GET",data){
  const options={method};
  if(data!==undefined){options.headers={"Content-Type":"application/json"};options.body=JSON.stringify(data)}
  pending++;overlay.hidden=false;
  try{
    const response=await fetch(url,options);
    const body=response.status===204?null:await response.json();
    if(!response.ok)throw Error(body?.error||"Request failed.");
    return body;
  }finally{pending--;if(pending===0)overlay.hidden=true}
}
function node(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e}
function cell(row,text){const e=node("td",text);row.append(e);return e}
function button(label,onClick,cls="secondary"){const e=node("button",label);e.type="button";e.className=cls;e.onclick=onClick;return e}
function failure(e){note(e.message,true)}
const confirmModal=document.createElement("dialog");
confirmModal.className="confirm-dialog";
confirmModal.innerHTML='<h3 id="confirm-title">Confirm action</h3><p id="confirm-text"></p><div class="actions"><button id="confirm-no" class="secondary" type="button">Cancel</button><button id="confirm-yes" type="button">Confirm</button></div>';
document.body.append(confirmModal);
function confirmAction(text,title="Confirm action",actionText="Confirm"){
  return new Promise(resolve=>{
    $("confirm-title").textContent=title;$("confirm-text").textContent=text;$("confirm-yes").textContent=actionText;
    let settled=false;
    const finish=value=>{if(settled)return;settled=true;confirmModal.close();resolve(value)};
    const yes=()=>finish(true),no=()=>finish(false),cancel=event=>{event.preventDefault();finish(false)};
    $("confirm-yes").addEventListener("click",yes,{once:true});
    $("confirm-no").addEventListener("click",no,{once:true});
    confirmModal.addEventListener("cancel",cancel,{once:true});
    confirmModal.addEventListener("close",cleanup,{once:true});
    function cleanup(){
      $("confirm-yes").removeEventListener("click",yes);$("confirm-no").removeEventListener("click",no);
      confirmModal.removeEventListener("cancel",cancel);
      if(!settled){settled=true;resolve(false)}
    }
    confirmModal.showModal();
  });
}
// Reusable searchable dropdown without a third-party library.
function foodPicker(foods,onChange){
  const root=node("div");root.className="food-picker";
  const field=node("input");field.type="text";field.placeholder="Search food item...";field.autocomplete="off";field.setAttribute("aria-label","Search food item");
  const arrow=button("▾",()=>{if(list.hidden){draw();field.focus()}else list.hidden=true},"food-arrow");
  arrow.setAttribute("aria-label","Show food options");
  const list=node("div");list.className="food-options";list.hidden=true;
  let picked=null;
  function draw(){
    list.replaceChildren();
    const matches=foods.filter(f=>f.name.toLowerCase().includes(field.value.toLowerCase())).slice(0,30);
    for(const f of matches){
      const option=button(f.name+" — "+money(f.price)+" ("+f.stock+" left)",()=>{
        picked=f;field.value=f.name;list.hidden=true;onChange();
      },"food-option");
      list.append(option);
    }
    if(!matches.length)list.append(node("p","No matching food items."));
    list.hidden=false;
  }
  field.addEventListener("input",()=>{picked=null;draw();onChange()});
  field.addEventListener("focus",draw);
  field.addEventListener("keydown",e=>{if(e.key==="Escape")list.hidden=true});
  document.addEventListener("click",e=>{if(!root.contains(e.target))list.hidden=true});
  root.append(field,arrow,list);
  return {element:root,get value(){return picked?.id||0}};
}
