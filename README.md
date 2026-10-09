# Karenderya Orders

A small cashier-side order management application using ASP.NET Core Minimal API (.NET 8), vanilla HTML/CSS/JavaScript and a local JSON file. No database server or additional packages.

## Run

Install the .NET 8 SDK, then from the project root:

```bash
dotnet build KarenderyaOrders.csproj
dotnet run --project KarenderyaOrders.csproj --launch-profile KarenderyaOrders
```

Visit http://127.0.0.1:5278. The home page opens the cashier. Pages: /cashier/, /menu/ and /orders/.

## Current features

- **Menu:** Create and edit food, set prices, activate/deactivate items, and adjust available stock.
- **Cashier:** Create orders with a customer name, multiple items and quantities, searchable food selection, and a confirmation modal. The server checks inventory, computes totals, and deducts stock.
- **Orders:** See past orders and the original name/price of every ordered item; move Ordered → Preparing → Completed, or cancel an Ordered order. Cancellation restores reserved stock exactly once.

## Manual checks

1. Build successfully with `dotnet build KarenderyaOrders.csproj`.
2. Add and edit a food; check duplicate-name and invalid-price rejection.
3. Set Adobo stock to 2. Ordering 3 must fail without changing stock or creating an order.
4. Order 1 Adobo and confirm available stock is now 1; refresh and verify persistence.
5. Change the menu price; verify the previous order retains the original price.
6. Move an order from Ordered → Preparing → Completed and verify it cannot go backward.
7. Create another Ordered order and cancel it. Verify inventory is restored once and the order remains visible with status Cancelled.
8. Confirm the status filter, food picker, loading overlay and modals work.

## Assumptions and design decisions

This is a small exercise intended for a single local server instance. JSON persistence keeps setup minimal; a lock serializes reads and writes within one process. The server, not the browser, determines totals and checks stock. Ordering decrements inventory immediately. Order lines keep their original names and prices. Deactivated food remains in historical orders. The status progression is intentionally limited.

## Known limitations and features left out

No payment collection, refunds, login, access control, reports, audit trail or multi-server support. JSON data is not a production database; concurrent independent server instances and corrupted data are not handled. Browser/endpoint checks are manual at this stage; automated tests and cleanup are a later milestone.

## AI use

ChatGPT helped implement the code in incremental milestones and review the structure and edge cases. The author checks behavior locally before Git commits and remains responsible for correctness. Build and browser test results should be verified rather than assumed.
