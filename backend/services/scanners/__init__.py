from .ip_lookup import ip_lookup_scan
from .nmap import nmap_scan
from .whois import whois_scan
from .subdomain import subdomain_scan
from .dns_lookup import dns_lookup_scan
from .checkphish import checkphish_scan
from .asn_lookup import asn_lookup_scan
from .wappalyzer import wappalyzer_scan
from .sherlock import sherlock_scan

SCANNER_MAP = {
    "ip_lookup": ip_lookup_scan,
    "nmap": nmap_scan,
    "whois": whois_scan,
    "subdomain": subdomain_scan,
    "dns_lookup": dns_lookup_scan,
    "checkphish": checkphish_scan,
    "asn_lookup": asn_lookup_scan,
    "wappalyzer": wappalyzer_scan,
    "sherlock": sherlock_scan
}
