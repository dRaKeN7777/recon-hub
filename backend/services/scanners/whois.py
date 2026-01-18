import whois

def whois_scan(target: str):
    try:
        w = whois.whois(target)
        return w
    except Exception as e:
        return {"error": str(e)}
