import socket
import requests

def asn_lookup_scan(target: str):
    try:
        # 1. Resolve to IP if needed
        ip = target
        if not target.upper().startswith("AS"):
            try:
                ip = socket.gethostbyname(target)
            except:
                pass # Keep as is, might be IP already or invalid
        
        # 2. If it's an IP, get ASN first
        asn = None
        asn_org = ""
        
        if not target.upper().startswith("AS"):
            r = requests.get(f"https://api.hackertarget.com/aslookup/?q={ip}", timeout=10)
            if r.status_code == 200:
                line = r.text.strip()
                # format: "IP","ASN","CIDR","Name"
                # e.g. "8.8.8.8","15169","8.8.8.0/24","GOOGLE, US"
                parts = line.split('","')
                if len(parts) >= 4:
                    asn = "AS" + parts[1].replace('"', '')
                    asn_org = parts[3].replace('"', '')
        else:
            asn = target.upper()

        if not asn:
            return {"error": "Could not determine ASN for target"}
        else:
            # 3. Get prefixes for ASN
            r = requests.get(f"https://api.hackertarget.com/aslookup/?q={asn}", timeout=10)
            prefixes = []
            if r.status_code == 200:
                lines = r.text.strip().split('\n')
                # First line is header: "ASN","Name"
                if len(lines) > 0:
                    header_parts = lines[0].split('","')
                    if len(header_parts) >= 2:
                        asn_org = header_parts[1].replace('"', '')
                    
                    # Rest are prefixes
                    prefixes = [l.strip() for l in lines[1:] if l.strip()]
            
            return {
                "asn_data": [{
                    "ip": ip if ip != target else target,
                    "asn": asn,
                    "org": asn_org,
                    "prefixes": prefixes
                }]
            }

    except Exception as e:
        return {"error": str(e)}
