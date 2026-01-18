import nmap

def nmap_scan(target: str):
    nm = nmap.PortScanner()
    try:
        # Simple fast scan top 100 ports
        nm.scan(target, arguments='-F')
        
        if target in nm.all_hosts():
            results = nm[target]
        elif len(nm.all_hosts()) > 0:
            # If target (domain) isn't the key, use the first resolved IP
            first_ip = nm.all_hosts()[0]
            results = nm[first_ip]
            # Add the resolved IP to results for clarity
            results['resolved_ip'] = first_ip
        else:
            results = {"error": "Host down or unreachable"}
        return results
            
    except Exception as e:
        return {"error": str(e)}
