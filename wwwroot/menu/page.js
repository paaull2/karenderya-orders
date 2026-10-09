let foods=[],stockId=0,originalStock=0;
async function load(){foods=await api("/api/menu?includeInactive=true");draw()}
function draw(){
 const body=$("menu-rows");body.replaceChildren();const q=$("search").value.toLowerCase();
 for(const f of foods.filter(x=>x.name.toLowerCase().includes(q))){
  const tr=node("tr");cell(tr,f.name);cell(tr,money(f.price));cell(tr,String(f.stock));
  cell(tr,f.active?"Active":"Inactive");cell(tr,date(f.createdAt));cell(tr,date(f.modifiedAt));
  const a=cell(tr,"");
  a.append(button("Edit",()=>openFood(f)),button("Adjust stock",()=>openStock(f),"secondary"),button(f.active?"Deactivate":"Activate",()=>toggle(f),f.active?"danger":"secondary"));
  body.append(tr);
 }
 if(!body.children.length){const tr=node("tr");const td=cell(tr,"No food items found.");td.colSpan=7;body.append(tr)}
}
function openFood(f){
 $("food-form").reset();$("food-id").value=f?.id||"";
 $("food-name").value=f?.name||"";$("food-price").value=f?.price||"";
 $("food-stock").value=f?.stock??0;$("initial-stock-label").hidden=!!f;
 $("food-stock").disabled=!!f;$("modal-title").textContent=f?"Edit Food Item":"Add Food Item";
 $("food-modal").showModal();
}
async function toggle(f){
 if(!await confirmAction((f.active?"Deactivate ":"Reactivate ")+f.name+"?",f.active?"Deactivate food item":"Reactivate food item",f.active?"Deactivate":"Reactivate"))return;
 try{await api("/api/menu/"+f.id+"/status","PATCH",{active:!f.active});await load();note("Menu status updated.")}catch(e){failure(e)}
}
function openStock(f){stockId=f.id;originalStock=f.stock;$("stock-title").textContent="Adjust stock — "+f.name;$("current-stock").textContent=f.stock;$("new-stock").value=f.stock;stockDifference();$("stock-modal").showModal()}
function stockDifference(){const d=Number($("new-stock").value)-originalStock;$("stock-change").textContent=Number.isInteger(d)?(d>0?"+":"")+d:"—"}
$("new-stock").oninput=stockDifference;
$("close-stock").onclick=()=>$("stock-modal").close();
$("stock-form").onsubmit=async e=>{
 e.preventDefault();
 try{await api("/api/inventory/"+stockId,"PUT",{stock:Number($("new-stock").value)});$("stock-modal").close();await load();note("Stock updated.")}catch(e){failure(e)}
};
$("add-food").onclick=()=>openFood(null);
$("close-modal").onclick=()=>$("food-modal").close();
$("search").oninput=draw;
$("food-form").onsubmit=async e=>{
 e.preventDefault();const id=$("food-id").value;
 const input={name:$("food-name").value.trim(),price:Number($("food-price").value),stock:Number($("food-stock").value)};
 try{await api(id?"/api/menu/"+id:"/api/menu",id?"PUT":"POST",input);$("food-modal").close();await load();note("Food item saved.")}catch(error){failure(error)}
};
load().catch(failure);
