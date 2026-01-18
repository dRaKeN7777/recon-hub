import os
import requests
import time

CHECKPHISH_API_KEY = os.getenv("CHECKPHISH_API_KEY")

def checkphish_scan(target: str):
    if not CHECKPHISH_API_KEY:
        # We raise exception here so it's caught by the wrapper
        # Alternatively, return error dict
        return {"error": "CheckPhish API key not configured"}

    try:
        url = "https://developers.checkphish.ai/api/neo/scan"
        headers = {
            "Content-Type": "application/json"
        }
        payload = {
            "apiKey": CHECKPHISH_API_KEY,
            "urlInfo": {
                "url": target
            }
        }

        r = requests.post(url, json=payload, headers=headers, timeout=15)
        r.raise_for_status()
        scan_data = r.json()
        
        job_id = scan_data.get("jobID")
        if not job_id:
            # If no jobID, maybe it returned direct results or error
            if "disposition" in scan_data:
                return {"disposition": scan_data["disposition"]}
            return scan_data

        # Poll for status
        status_url = "https://developers.checkphish.ai/api/neo/scan/status"
        status_payload = {
            "apiKey": CHECKPHISH_API_KEY,
            "jobID": job_id,
            "insights": True
        }
        
        for _ in range(10): # Try for ~30 seconds
            time.sleep(3)
            try:
                r_status = requests.post(status_url, json=status_payload, headers=headers, timeout=10)
                if r_status.status_code == 200:
                    status_data = r_status.json()
                    if status_data.get("status") == "DONE":
                        if "disposition" in status_data:
                            return {"disposition": status_data["disposition"]}
                        return status_data
            except Exception:
                pass # Continue polling on error
                
        # Return initial data if timed out
        scan_data["message"] = "Scan initiated but pending completion"
        return scan_data
        
    except Exception as e:
        return {"error": str(e)}
