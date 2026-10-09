const $ = id => document.getElementById(id);
let foods = [];
let editingId = null;
let stockId = null;

async function request(path, method = "GET", data) {
  const response = await fetch(path, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}
function showError(error) { $("message").textContent = error.message; }
function makeButton(label, click) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.onclick = click;
  return button;
}
async function loadMenu() {
  foods = await request("/api/menu");
  const table = $("menu");
  table.replaceChildren();
  for (const food of foods) {
    const row = document.createElement("tr");
    for (const text of [food.name, "₱" + Number(food.price).toFixed(2), String(food.stock), food.active ? "Active" : "Inactive"]) {
      const column = document.createElement("td");
      column.textContent = text;
      row.append(column);
    }
    const actions = document.createElement("td");
    actions.className = "actions";
    actions.append(
      makeButton("Edit", () => openFood(food)),
      makeButton("Adjust stock", () => openStock(food)),
      makeButton(food.active ? "Deactivate" : "Activate", () => changeStatus(food))
    );
    row.append(actions);
    table.append(row);
  }
  // Keep selectable food choices in sync after menu edits.
  if (!$("order-lines").children.length) addOrderLine();
  else renderOrderLines();
}
function openFood(food = null) {
  $("food-form").reset();
  editingId = food?.id ?? null;
  $("name").value = food?.name ?? "";
  $("price").value = food?.price ?? "";
  $("form-title").textContent = food ? "Edit food" : "Add food";
  $("food-dialog").showModal();
}
function openStock(food) {
  stockId = food.id;
  $("stock-title").textContent = "Adjust stock — " + food.name;
  $("current-stock").textContent = food.stock;
  $("new-stock").value = food.stock;
  $("stock-dialog").showModal();
}
$("close-stock").onclick = () => $("stock-dialog").close();
$("stock-form").onsubmit = async event => {
  event.preventDefault();
  const stock = Number($("new-stock").value);
  if (!Number.isSafeInteger(stock) || stock < 0 || stock > 2147483647) {
    $("message").textContent = "Enter a valid whole-number stock quantity.";
    return;
  }
  try {
    await request("/api/inventory/" + stockId, "PUT", { stock });
    $("stock-dialog").close();
    await loadMenu();
    $("message").textContent = "Stock updated.";
  } catch (error) { showError(error); }
};
function askConfirmation(text) {
  $("confirm-message").textContent = text;
  return new Promise(resolve => {
    const dialog = $("confirm-dialog");
    const yes = $("confirm-status");
    const no = $("cancel-status");
    const finish = answer => {
      yes.removeEventListener("click", accept);
      no.removeEventListener("click", reject);
      dialog.removeEventListener("cancel", escape);
      dialog.close();
      resolve(answer);
    };
    const accept = () => finish(true);
    const reject = () => finish(false);
    const escape = event => { event.preventDefault(); finish(false); };
    yes.addEventListener("click", accept);
    no.addEventListener("click", reject);
    dialog.addEventListener("cancel", escape);
    dialog.showModal();
  });
}
async function changeStatus(food) {
  const action = food.active ? "Deactivate" : "Activate";
  if (!await askConfirmation(action + " " + food.name + "?")) return;
  try {
    await request("/api/menu/" + food.id + "/status", "PATCH", { active: !food.active });
    await loadMenu();
    $("message").textContent = "Food status updated.";
  } catch (error) { showError(error); }
}
$("add-food").onclick = () => openFood();
$("close-food").onclick = () => $("food-dialog").close();
$("food-form").onsubmit = async event => {
  event.preventDefault();
  try {
    const input = { name: $("name").value.trim(), price: Number($("price").value) };
    await request(editingId === null ? "/api/menu" : "/api/menu/" + editingId,
      editingId === null ? "POST" : "PUT", input);
    $("food-dialog").close();
    await loadMenu();
    $("message").textContent = "Food saved.";
  } catch (error) { showError(error); }
};
function addOrderLine() {
  const row = document.createElement("div");
  row.className = "order-row";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Food item");
  const quantity = document.createElement("input");
  quantity.type = "number";
  quantity.min = "1";
  quantity.step = "1";
  quantity.value = "1";
  quantity.setAttribute("aria-label", "Quantity");
  select.onchange = updateTotal;
  quantity.oninput = updateTotal;
  row.append(select, quantity, makeButton("Remove", () => { row.remove(); updateTotal(); }));
  $("order-lines").append(row);
  fillChoices(select);
  updateTotal();
}
function fillChoices(select) {
  const selected = select.value;
  select.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose food";
  select.append(placeholder);
  for (const food of foods.filter(x => x.active && x.stock > 0)) {
    const option = document.createElement("option");
    option.value = food.id;
    option.textContent = food.name + " — ₱" + Number(food.price).toFixed(2) + " (" + food.stock + " left)";
    select.append(option);
  }
  select.value = selected && [...select.options].some(x => x.value === selected) ? selected : "";
}
function renderOrderLines() {
  document.querySelectorAll("#order-lines select").forEach(fillChoices);
  updateTotal();
}
function orderItems() {
  return [...document.querySelectorAll("#order-lines .order-row")].map(row => ({
    foodId: Number(row.querySelector("select").value),
    quantity: Number(row.querySelector("input").value)
  }));
}
function updateTotal() {
  const total = orderItems().reduce((sum, line) => {
    const food = foods.find(x => x.id === line.foodId && x.active);
    return sum + (food && Number.isInteger(line.quantity) && line.quantity > 0 ? Number(food.price) * line.quantity : 0);
  }, 0);
  $("order-total").textContent = "₱" + total.toFixed(2);
}
$("add-order-line").onclick = addOrderLine;
let savingOrder = false;
$("order-form").onsubmit = async event => {
  event.preventDefault();
  if (savingOrder) return;
  const items = orderItems();
  if (!items.length || items.some(x => !x.foodId || !Number.isInteger(x.quantity) || x.quantity < 1)) {
    $("message").textContent = "Choose food and enter a valid quantity for each item.";
    return;
  }
  if (new Set(items.map(x => x.foodId)).size !== items.length) {
    $("message").textContent = "The same food item was selected twice.";
    return;
  }
  savingOrder = true;
  $("save-order").disabled = true;
  try {
    const order = await request("/api/orders", "POST", {
      customerName: $("customer-name").value.trim(), items
    });
    await loadMenu();
    $("order-form").reset();
    $("order-lines").replaceChildren();
    addOrderLine();
    $("message").textContent = "Order #" + order.id + " saved. Total: ₱" + Number(order.total).toFixed(2);
  } catch (error) { showError(error); }
  finally { savingOrder = false; $("save-order").disabled = false; }
};
loadMenu().catch(showError);
