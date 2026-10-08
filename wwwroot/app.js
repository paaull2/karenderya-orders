const $ = id => document.getElementById(id);
let foods = [];
let editingId = null;

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
    for (const text of [food.name, "₱" + Number(food.price).toFixed(2), food.active ? "Active" : "Inactive"]) {
      const column = document.createElement("td");
      column.textContent = text;
      row.append(column);
    }
    const actions = document.createElement("td");
    actions.className = "actions";
    actions.append(
      makeButton("Edit", () => openFood(food)),
      makeButton(food.active ? "Deactivate" : "Activate", () => changeStatus(food))
    );
    row.append(actions);
    table.append(row);
  }
}
function openFood(food = null) {
  $("food-form").reset();
  editingId = food?.id ?? null;
  $("name").value = food?.name ?? "";
  $("price").value = food?.price ?? "";
  $("form-title").textContent = food ? "Edit food" : "Add food";
  $("food-dialog").showModal();
}
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
loadMenu().catch(showError);
