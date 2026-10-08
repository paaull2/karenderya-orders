# Karenderya Orders

A small .NET 8 web app for recording karenderya food items and, in later milestones, customer orders.

## Run

Requires the .NET 8 SDK.

```bash
dotnet build KarenderyaOrders.csproj
dotnet run --project KarenderyaOrders.csproj --launch-profile KarenderyaOrders
```

Open http://127.0.0.1:5278.

## Checks

Build the project, open the page, add a food item with a price, refresh, and verify it remains listed.

## Assumptions and decisions

- A local JSON file stores the data; no database server or extra packages.
- This first milestone only lists and adds menu items.
- The server validates food names and prices and prevents duplicate names.

## Known limitations and deferred features

- Designed for one local app instance, not concurrent servers.
- No editing, soft deletion, orders, inventory, payment, login, or reports yet.
- Corrupted JSON requires manual repair.

## AI use

ChatGPT helped draft the initial code and scope. Subsequent changes and checks will be reviewed and documented as development progresses.
