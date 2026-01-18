import shutil
import uuid
import subprocess
import os

def subdomain_scan(target: str):
    # Use subfinder
    if not shutil.which("subfinder"):
         return {"error": "subfinder tool not found in system path"}
    
    output_file = f"subfinder_{uuid.uuid4().hex}.txt"
    try:
        # Run subfinder with file output
        cmd = ["subfinder", "-d", target, "-silent", "-o", output_file]
        # 60s timeout might be tight for large domains but reasonable for web request
        process = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if process.returncode != 0:
            results = {"error": f"subfinder failed: {process.stderr}"}
        else:
            if os.path.exists(output_file):
                with open(output_file, "r") as f:
                    subdomains = [line.strip() for line in f.readlines() if line.strip()]
                results = {"subdomains": subdomains}
                # Clean up
                os.remove(output_file)
            else:
                results = {"subdomains": []}
        return results

    except subprocess.TimeoutExpired:
         if os.path.exists(output_file):
             os.remove(output_file)
         return {"error": "subfinder scan timed out"}
    except Exception as e:
         if os.path.exists(output_file):
             os.remove(output_file)
         return {"error": f"subfinder execution error: {str(e)}"}
