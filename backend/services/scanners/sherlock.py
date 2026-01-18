import uuid
import os
import subprocess
import csv
import shutil

def sherlock_scan(target: str):
    # Sherlock scan for username
    username = target
    # Basic validation
    if not username or " " in username:
         return {"error": "Invalid username (no spaces allowed)"}
    
    folder = f"sherlock_{uuid.uuid4().hex}"
    os.makedirs(folder, exist_ok=True)
    
    try:
        # Run sherlock
        # --timeout 1 to be faster per site
        # --no-color to avoid ansi codes
        # --csv to save to CSV
        # --folderoutput to specify output directory
        cmd = ["sherlock", username, "--timeout", "1", "--no-color", "--csv", "--folderoutput", folder]
        
        # 5 minutes timeout for the whole scan
        process = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        expected_file = os.path.join(folder, f"{username}.csv")
        
        if os.path.exists(expected_file):
            data = {}
            with open(expected_file, "r") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    site = row.get("name")
                    url = row.get("url_user")
                    if site and url:
                        data[site] = url
            
            results = {"sherlock_data": data}
        else:
            # Check if it failed or just didn't write file (maybe no results?)
            if process.returncode != 0:
                results = {"error": f"Sherlock failed: {process.stderr}"}
            else:
                results = {"sherlock_data": {}, "message": "No accounts found or file not created"}
        
        return results
            
    except subprocess.TimeoutExpired:
        return {"error": "Sherlock scan timed out"}
    except Exception as e:
        return {"error": f"Sherlock execution error: {str(e)}"}
    finally:
        if os.path.exists(folder):
            shutil.rmtree(folder)
