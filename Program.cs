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
            Id = data.NextFoodId++, Name = input!.Name.Trim(), Price = input.Price,
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

app.Run();

class Food
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public bool Active { get; set; } = true;
    public DateTimeOffset? CreatedAt { get; set; }
    public DateTimeOffset? ModifiedAt { get; set; }
}
record FoodInput(string Name, decimal Price);
record StatusInput(bool Active);
class Store
{
    public int NextFoodId { get; set; } = 3;
    public List<Food> Menu { get; set; } = [];
}
