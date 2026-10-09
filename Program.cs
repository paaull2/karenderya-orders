using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();

var file = Path.Combine(app.Environment.ContentRootPath, "data.json");
var json = new JsonSerializerOptions { WriteIndented = true, PropertyNameCaseInsensitive = true };
var gate = new object();

Store Load() => JsonSerializer.Deserialize<Store>(File.ReadAllText(file), json)
    ?? throw new InvalidDataException("Cannot read menu data.");
void Save(Store data)
{
    var temp = file + ".tmp";
    File.WriteAllText(temp, JsonSerializer.Serialize(data, json));
    File.Move(temp, file, true);
}
string? Check(FoodInput? item) =>
    item is null || string.IsNullOrWhiteSpace(item.Name) || item.Name.Trim().Length > 100
        ? "Food name must be 1–100 characters."
        : item.Price <= 0 || item.Price > 100000 || decimal.Round(item.Price, 2) != item.Price
            ? "Enter a valid price with up to two decimal places." : null;

app.MapGet("/api/menu", () =>
{
    lock (gate) return Results.Ok(Load().Menu);
});

app.MapPost("/api/menu", (FoodInput? input) =>
{
    var error = Check(input);
    if (error is not null) return Results.BadRequest(new { error });
    lock (gate)
    {
        var data = Load();
        if (data.Menu.Any(x => x.Name.Equals(input!.Name.Trim(), StringComparison.OrdinalIgnoreCase)))
            return Results.BadRequest(new { error = "Food name already exists." });
        var now = DateTimeOffset.Now;
        var food = new Food
        {
            Id = data.NextFoodId++, Name = input!.Name.Trim(), Price = input.Price, Stock = 0,
            CreatedAt = now, ModifiedAt = now
        };
        data.Menu.Add(food);
        Save(data);
        return Results.Created("/api/menu/" + food.Id, food);
    }
});

app.MapPut("/api/menu/{id:int}", (int id, FoodInput? input) =>
{
    var error = Check(input);
    if (error is not null) return Results.BadRequest(new { error });
    lock (gate)
    {
        var data = Load();
        var food = data.Menu.FirstOrDefault(x => x.Id == id);
        if (food is null) return Results.NotFound();
        if (data.Menu.Any(x => x.Id != id && x.Name.Equals(input!.Name.Trim(), StringComparison.OrdinalIgnoreCase)))
            return Results.BadRequest(new { error = "Food name already exists." });
        food.Name = input!.Name.Trim();
        food.Price = input.Price;
        food.ModifiedAt = DateTimeOffset.Now;
        Save(data);
        return Results.Ok(food);
    }
});

app.MapPatch("/api/menu/{id:int}/status", (int id, StatusInput input) =>
{
    lock (gate)
    {
        var data = Load();
        var food = data.Menu.FirstOrDefault(x => x.Id == id);
        if (food is null) return Results.NotFound();
        food.Active = input.Active;
        food.ModifiedAt = DateTimeOffset.Now;
        Save(data);
        return Results.Ok(food);
    }
});

app.MapPut("/api/inventory/{id:int}", (int id, StockInput? input) =>
{
    if (input is null || input.Stock < 0)
        return Results.BadRequest(new { error = "Stock must be a nonnegative whole number." });
    lock (gate)
    {
        var data = Load();
        var food = data.Menu.FirstOrDefault(x => x.Id == id);
        if (food is null) return Results.NotFound();
        food.Stock = input.Stock;
        food.ModifiedAt = DateTimeOffset.Now;
        Save(data);
        return Results.Ok(food);
    }
});

app.MapGet("/api/orders", () =>
{
    lock (gate) return Results.Ok(Load().Orders.OrderByDescending(x => x.Id).ToList());
});

app.MapPost("/api/orders", (OrderInput? input) =>
{
    if (input is null || string.IsNullOrWhiteSpace(input.CustomerName) ||
        input.CustomerName.Trim().Length > 100)
        return Results.BadRequest(new { error = "Customer name must be 1–100 characters." });
    if (input.Items is not { Count: > 0 })
        return Results.BadRequest(new { error = "Add at least one food item." });
    lock (gate)
    {
        var data = Load();
        var lines = new List<OrderLine>();
        foreach (var selected in input.Items)
        {
            if (selected.Quantity < 1)
                return Results.BadRequest(new { error = "Quantity must be greater than zero." });
            if (lines.Any(x => x.FoodId == selected.FoodId))
                return Results.BadRequest(new { error = "Food item selected more than once." });
            var food = data.Menu.FirstOrDefault(x => x.Id == selected.FoodId && x.Active);
            if (food is null)
                return Results.BadRequest(new { error = "A selected food item is unavailable." });
            if (food.Stock < selected.Quantity)
                return Results.BadRequest(new { error = $"Only {food.Stock} {food.Name} remaining." });
            lines.Add(new OrderLine(food.Id, food.Name, food.Price, selected.Quantity));
        }
        // The browser only submits food IDs and quantities, never prices.
        decimal total;
        try { total = lines.Sum(x => checked(x.Price * x.Quantity)); }
        catch (OverflowException) { return Results.BadRequest(new { error = "Order total is too large." }); }
        var order = new CustomerOrder
        {
            Id = data.NextOrderId++, CustomerName = input.CustomerName.Trim(),
            CreatedAt = DateTimeOffset.Now, Items = lines, Total = total
        };
        foreach (var line in lines)
        {
            var food = data.Menu.First(x => x.Id == line.FoodId);
            food.Stock -= line.Quantity;
            food.ModifiedAt = order.CreatedAt;
        }
        data.Orders.Add(order);
        Save(data);
        return Results.Created("/api/orders/" + order.Id, order);
    }
});

app.MapPatch("/api/orders/{id:int}/status", (int id, OrderStatusInput? input) =>
{
    if (input is null) return Results.BadRequest(new { error = "Status is required." });
    lock (gate)
    {
        var data = Load();
        var order = data.Orders.FirstOrDefault(x => x.Id == id);
        if (order is null) return Results.NotFound();
        if (input.Status == "Cancelled")
        {
            if (order.Status != "Ordered")
                return Results.BadRequest(new { error = "Only Ordered orders can be cancelled." });
            var restore = new List<(Food Food, int Quantity)>();
            foreach (var line in order.Items)
            {
                var food = data.Menu.FirstOrDefault(x => x.Id == line.FoodId);
                if (food is null || line.Quantity < 1 || food.Stock > int.MaxValue - line.Quantity)
                    return Results.BadRequest(new { error = "Cannot restore inventory safely." });
                restore.Add((food, line.Quantity));
            }
            var now = DateTimeOffset.Now;
            foreach (var item in restore)
            {
                item.Food.Stock += item.Quantity;
                item.Food.ModifiedAt = now;
            }
            order.Status = "Cancelled";
            order.ModifiedAt = now;
            Save(data);
            return Results.Ok(order);
        }
        var allowed = (order.Status, input.Status) switch
        {
            ("Ordered", "Preparing") => true,
            ("Preparing", "Completed") => true,
            _ => false
        };
        if (!allowed)
            return Results.BadRequest(new { error = "Only Ordered → Preparing → Completed is allowed." });
        order.Status = input.Status;
        order.ModifiedAt = DateTimeOffset.Now;
        Save(data);
        return Results.Ok(order);
    }
});

app.Run();

class Food
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public bool Active { get; set; } = true;
    public int Stock { get; set; }
    public DateTimeOffset? CreatedAt { get; set; }
    public DateTimeOffset? ModifiedAt { get; set; }
}
record FoodInput(string Name, decimal Price);
record StatusInput(bool Active);
record StockInput(int Stock);
record OrderStatusInput(string Status);
record OrderInput(string CustomerName, List<SelectedItem> Items);
record SelectedItem(int FoodId, int Quantity);
record OrderLine(int FoodId, string Name, decimal Price, int Quantity);
class CustomerOrder
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ModifiedAt { get; set; }
    public string Status { get; set; } = "Ordered";
    public List<OrderLine> Items { get; set; } = [];
    public decimal Total { get; set; }
}
class Store
{
    public int NextFoodId { get; set; } = 3;
    public int NextOrderId { get; set; } = 1;
    public List<Food> Menu { get; set; } = [];
    public List<CustomerOrder> Orders { get; set; } = [];
}
