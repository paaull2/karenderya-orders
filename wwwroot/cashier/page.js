let foods=[],saving=false;
async function load(){foods=(await api("/api/menu")).filter(f=>f.stock>0);$("food-lines").replaceChildren();addLine()}
function addLine(){
 const div=node("div");div.className="line";
 const picker=foodPicker(foods,total);
 const qty=node("input");qty.type="number";qty.min="1";qty.step="1";qty.value="1";qty.setAttribute("aria-label","Quantity");
 const remove=button("Remove",()=>{div.remove();total()},"secondary");
 qty.oninput=total;div.append(picker.element,qty,remove);
 div.getItem=()=>({foodId:picker.value,quantity:Number(qty.value)});
 $("food-lines").append(div);total();
}
function entries(){return [...document.querySelectorAll("#food-lines .line")].map(div=>div.getItem())}
function total(){const sum=entries().reduce((s,l)=>{const food=foods.find(f=>f.id===l.foodId);return s+(food?food.price*l.quantity:0)},0);$("total").textContent=money(sum)}
$("add-line").onclick=addLine;
$("order-form").onsubmit=async e=>{
 e.preventDefault();
 if(saving)return;
 const items=entries();
 if(!items.length||items.some(x=>!x.foodId||!Number.isInteger(x.quantity)||x.quantity<1))return note("Select food and enter a valid quantity for every line.",true);
 if(new Set(items.map(x=>x.foodId)).size!==items.length)return note("The same food item was selected twice.",true);
 const customerName=$("customer").value.trim();
 if(!customerName)return note("Customer name is required.",true);
 if(!await confirmAction("Save order for "+customerName+"? Total: "+$("total").textContent,"Confirm order","Save order"))return;
 saving=true;
 const saveButton=$("order-form").querySelector('button[type="submit"]');
 saveButton.disabled=true;
 try{
  const order=await api("/api/orders","POST",{customerName,items});
  $("customer").value="";await load();
  note("Order #"+order.id+" created for "+order.customerName+". Total: "+money(order.total));
 }catch(error){failure(error)}
 finally{saving=false;saveButton.disabled=false}
};
load().catch(failure);
