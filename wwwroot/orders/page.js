let orders=[];
async function load(){orders=await api("/api/orders");draw()}
function draw(){
 const body=$("order-rows");body.replaceChildren();const filter=$("filter").value;
 for(const o of orders.filter(o=>!filter||o.status===filter)){
  const tr=node("tr");cell(tr,"#"+o.id);cell(tr,o.customerName||"Walk-in");cell(tr,o.items.map(i=>i.quantity+"× "+i.name).join(", "));
  cell(tr,money(o.total));cell(tr,date(o.createdAt));cell(tr,o.status);
  const action=cell(tr,"");const next=o.status==="Ordered"?"Preparing":o.status==="Preparing"?"Completed":null;
  if(next)action.append(button("Mark "+next,()=>advance(o,next)));if(o.status==="Ordered")action.append(button("Cancel order",()=>cancelOrder(o),"danger"));body.append(tr);
 }
 if(!body.children.length){const tr=node("tr");const c=cell(tr,"No orders found.");c.colSpan=7;body.append(tr)}
}
async function advance(o,next){
 if(!await confirmAction("Change order #"+o.id+" to "+next+"?","Update order status","Update status"))return;
 try{await api("/api/orders/"+o.id+"/status","PATCH",{status:next});await load();note("Order #"+o.id+" marked "+next+".")}catch(e){failure(e)}
}
async function cancelOrder(o){
 if(!await confirmAction("Cancel order #"+o.id+" for "+o.customerName+"? The reserved food quantities will return to inventory.","Cancel order","Cancel order"))return;
 try{await api("/api/orders/"+o.id+"/status","PATCH",{status:"Cancelled"});await load();note("Order #"+o.id+" cancelled. Inventory restored.")}
 catch(e){failure(e)}
}
$("filter").onchange=draw;$("reload").onclick=()=>load().catch(failure);load().catch(failure);
