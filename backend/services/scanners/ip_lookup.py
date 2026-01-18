import socket
import requests

def ip_lookup_scan(target: str):
    try:
        ip = socket.gethostbyname(target)
        results = {"ip": ip}
        # Try to get basic info
        try:
            r = requests.get(f"http://ip-api.com/json/{ip}", timeout=5)
            results.update(r.json())
        except:
            pass
        return results
    except Exception as e:
        return {"error": str(e)}
