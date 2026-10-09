"""Isolated API smoke test. Run: python3 tests/smoke.py"""
import json
import pathlib
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]

def call(base, path, method="GET", payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(base + path, data=body, method=method)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=3) as res:
            return res.status, json.load(res)
    except urllib.error.HTTPError as exc:
        return exc.code, json.load(exc)

def main():
    with tempfile.TemporaryDirectory(prefix="karenderya-smoke-") as temp:
        directory = pathlib.Path(temp)
        for name in ("Program.cs", "KarenderyaOrders.csproj", "data.json"):
            shutil.copy2(ROOT / name, directory / name)
        (directory / "wwwroot").mkdir()
        # Use an isolated data file; never modify the real orders.
        (directory / "data.json").write_text(json.dumps({
            "NextFoodId": 1, "NextOrderId": 1, "Menu": [], "Orders": []
        }))
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        base = "http://127.0.0.1:" + str(port)
        proc = subprocess.Popen(
            ["dotnet", "run", "--project", str(directory / "KarenderyaOrders.csproj"),
             "--no-launch-profile", "--urls", base],
            cwd=directory, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
        )
        try:
            for _ in range(120):
                if proc.poll() is not None:
                    raise RuntimeError("Server exited during startup: " + proc.stderr.read().decode()[-2000:])
                try:
                    call(base, "/api/menu")
                    break
                except (urllib.error.URLError, TimeoutError):
                    time.sleep(0.25)
            else:
                raise RuntimeError("Test server did not start.")
            status, food = call(base, "/api/menu", "POST", {"name":"Adobo","price":70,"stock":2})
            assert status == 201 and food["stock"] == 2, (status, food)
            food_id = food["id"]
            assert call(base, "/api/menu", "POST", {"name":"Adobo","price":70,"stock":1})[0] == 400
            assert call(base, "/api/orders", "POST", {
                "customerName":"Test", "items":[{"foodId":food_id,"quantity":3}]
            })[0] == 400
            assert call(base, "/api/menu")[1][0]["stock"] == 2
            status, order = call(base, "/api/orders", "POST", {
                "customerName":"Test", "items":[{"foodId":food_id,"quantity":1}]
            })
            assert status == 201 and order["total"] == 70
            assert call(base, "/api/menu")[1][0]["stock"] == 1
            status, cancelled = call(base, "/api/orders/" + str(order["id"]) + "/status",
                                     "PATCH", {"status":"Cancelled"})
            assert status == 200 and cancelled["status"] == "Cancelled"
            assert call(base, "/api/menu")[1][0]["stock"] == 2
            assert call(base, "/api/orders/" + str(order["id"]) + "/status",
                        "PATCH", {"status":"Cancelled"})[0] == 400
            assert call(base, "/api/menu")[1][0]["stock"] == 2
            print("PASS: food creation, duplicate validation, stock rejection, deduction, cancellation, no double restore")
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait()

if __name__ == "__main__":
    main()
