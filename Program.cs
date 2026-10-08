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

app.MapGet("/api/menu", () =>
{
    lock (gate) return Results.Ok(Load().Menu);
});

app.MapPost("/api/menu", (FoodInput input) =>
{
    if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Trim().Length > 100 ||
        input.Price <= 0 || input.Price > 100000 || decimal.Round(input.Price, 2) != input.Price)
        return Results.BadRequest(new { error = "Enter a valid food name and price." });

    lock (gate)
    {
        var data = Load();
        if (data.Menu.Any(x => x.Name.Equals(input.Name.Trim(), StringComparison.OrdinalIgnoreCase)))
            return Results.BadRequest(new { error = "Food name already exists." });
        var food = new Food(data.NextFoodId++, input.Name.Trim(), input.Price);
        data.Menu.Add(food);
        Save(data);
        return Results.Created("/api/menu/" + food.Id, food);
    }
});

app.Run();

record Food(int Id, string Name, decimal Price);
record FoodInput(string Name, decimal Price);
class Store
{
    public int NextFoodId { get; set; } = 3;
    public List<Food> Menu { get; set; } = [];
}
