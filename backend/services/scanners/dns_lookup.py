import dns.resolver

def dns_lookup_scan(target: str):
    try:
        record_types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"]
        results = {}
        for r_type in record_types:
            try:
                answers = dns.resolver.resolve(target, r_type)
                results[r_type] = [str(r) for r in answers]
            except dns.resolver.NoAnswer:
                continue
            except dns.resolver.NXDOMAIN:
                results = {"error": "Domain not found"}
                break
            except Exception:
                continue
        
        if not results and not results.get("error"):
             results = {"message": "No common DNS records found"}
        
        return results
             
    except Exception as e:
        return {"error": str(e)}
