const list = document.getElementById("menu");
const message = document.getElementById("message");

async function loadMenu() {
  const response = await fetch("/api/menu");
  if (!response.ok) throw new Error("Could not load menu.");
  const foods = await response.json();
  list.replaceChildren();
  for (const food of foods) {
    const item = document.createElement("li");
    item.textContent = food.name + " — ₱" + Number(food.price).toFixed(2);
    list.append(item);
  }
}
document.getElementById("food-form").addEventListener("submit", async event => {
  event.preventDefault();
  message.textContent = "";
  try {
    const response = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.getElementById("name").value.trim(),
        price: Number(document.getElementById("price").value)
      })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Could not save item.");
    }
    event.target.reset();
    await loadMenu();
  } catch (error) { message.textContent = error.message; }
});
loadMenu().catch(error => { message.textContent = error.message; });
