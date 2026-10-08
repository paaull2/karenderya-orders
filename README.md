# Karenderya Orders

A small .NET 8 web application for managing food items, with orders coming in later milestones. Data is stored in a local JSON file.

## Run

Requires the .NET 8 SDK. No extra packages or database.

```bash
dotnet build KarenderyaOrders.csproj
dotnet run --project KarenderyaOrders.csproj --launch-profile KarenderyaOrders
```

Open http://127.0.0.1:5278.

## Checks

1. Add a food item and refresh: the new item should remain.
2. Edit its name and price; verify they update.
3. Deactivate it and refresh; it should still appear as Inactive.
4. Reactivate it; verify it returns to Active.
5. Try adding another food with the same name; the API should reject it.

## Assumptions and decisions

- Soft deletion uses an `Active` flag rather than removing menu records.
- Server validates names, prices, and duplicate names.
- Existing sample food items have no timestamps because they predate this milestone; new edits receive a modified timestamp.
- Single-process JSON storage, with no additional libraries.

## Limitations / not built yet

Orders, inventory checks, customer tracking, login, payment, and reports are not implemented. JSON storage isn't designed for multiple server instances or recovery from corrupted files.

## AI use

ChatGPT helped draft the implementation and review scope. Changes are being introduced in separate milestones and need to be checked locally before committing.
