from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import Scan, ScanConfig
from core.security import get_current_user
from services.scanners import SCANNER_MAP
import json

router = APIRouter(prefix="/scan", tags=["scan"])

@router.get("/config")
def get_scan_config(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    configs = db.query(ScanConfig).all()
    config_map = {c.key: c.value for c in configs}
    
    scan_types = list(SCANNER_MAP.keys())
    result = {}
    
    for st in scan_types:
        key = f"scan_{st}"
        # Default is true unless explicitly set to "false"
        result[st] = (config_map.get(key) != "false")
        
    return result

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    # Count scans by type
    from sqlalchemy import func
    stats = db.query(Scan.scan_type, func.count(Scan.id)).filter(Scan.user_id == user.id).group_by(Scan.scan_type).all()
    
    by_type = {s[0]: s[1] for s in stats}
    return {"by_type": by_type}

@router.get("/")
def get_scans(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    scans = db.query(Scan).filter(Scan.user_id == user.id).order_by(Scan.created_at.desc()).offset(skip).limit(limit).all()
    return scans

@router.post("/")
def run_scan(
    data: dict, 
    db: Session = Depends(get_db), 
    user=Depends(get_current_user)
):
    target = data.get("target")
    scan_type = data.get("type", "ip_lookup")
    
    # Check if scan type is enabled
    config_key = f"scan_{scan_type}"
    config = db.query(ScanConfig).filter(ScanConfig.key == config_key).first()
    
    if config and config.value == "false":
        raise HTTPException(403, f"Scan type '{scan_type}' is currently disabled by admin")

    if not target:
        raise HTTPException(400, "Target required")

    if scan_type not in SCANNER_MAP:
        raise HTTPException(400, "Invalid scan type")
        
    # Execute scan
    scanner_func = SCANNER_MAP[scan_type]
    results = scanner_func(target)

    # Save to DB
    scan_entry = Scan(
        target=target,
        scan_type=scan_type,
        result=json.dumps(results, default=str),
        user_id=user.id
    )
    db.add(scan_entry)
    db.commit()
    db.refresh(scan_entry)

    return {
        "id": scan_entry.id,
        "target": target,
        "type": scan_type,
        "result": results
    }
