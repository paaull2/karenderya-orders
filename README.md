# Karenderya Orders

A small .NET 8 web application for managing food items, with basic customer order creation. Data is stored in a local JSON file.

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
6. Create an order for one Adobo and three Rice; total should be ₱115.
7. Try ordering an inactive food item or duplicate food IDs; the API should reject it.
8. Edit Adobo's menu price, then check GET /api/orders: the previous order still has its original price.
9. Adjust Adobo stock to 2. Ordering 3 Adobo must fail without saving an order or decreasing stock.
10. Order 1 Adobo, then refresh: the stock should decrease to 1 and stay there.
11. Set Rice stock to 0; it should disappear from the order choices. Restore stock using Adjust stock.

## Assumptions and decisions

- Soft deletion uses an `Active` flag rather than removing menu records.
- Server validates names, prices, and duplicate names.
- Existing sample food items have no timestamps because they predate this milestone; new edits receive a modified timestamp.
- Single-process JSON storage, with no additional libraries.
- Orders save the customer's name, timestamp, food name/price snapshots, quantities, and server-calculated total.
- New food items start with zero stock; stock can be adjusted separately from name and price.
- The supplied sample food items have demo stock quantities.
- Each order checks available stock under an in-process lock and deducts inventory only after validating the entire order.

## Limitations / not built yet

Order-status management, login, payment, and reports are not implemented. Order history is currently available through GET /api/orders, with a separate history interface planned. JSON storage isn't designed for multiple server instances or recovery from corrupted files.

## AI use

ChatGPT helped draft the implementation and review scope. Changes are being introduced in separate milestones and need to be checked locally before committing.
