from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, ScanConfig
from core.security import require_role, get_password_hash, generate_2fa_secret, get_2fa_uri
import qrcode
import io
import base64

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users")
def list_users(
    skip: int = 0,
    limit: int = 10,
    search: str = None,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    query = db.query(User)
    if search:
        query = query.filter(User.username.ilike(f"%{search}%"))
    
    total = query.count()
    users = query.order_by(User.id.asc()).offset(skip).limit(limit).all()
    
    return {
        "items": [{
            "id": u.id, 
            "username": u.username, 
            "role": u.role, 
            "is_active": u.is_active, 
            "created_at": u.created_at,
            "has_2fa": bool(u.totp_secret)
        } for u in users],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.post("/users/{user_id}/toggle")
def toggle_user(
    user_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(404, "User not found")
    
    if target_user.id == user.id:
        raise HTTPException(400, "Cannot disable yourself")

    target_user.is_active = not target_user.is_active
    db.commit()
    return {"status": "updated", "is_active": target_user.is_active}

@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    data: dict,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(404, "User not found")
    
    if "username" in data and data["username"] != target_user.username:
        # Check if username exists
        existing = db.query(User).filter(User.username == data["username"]).first()
        if existing:
            raise HTTPException(400, "Username already exists")
        target_user.username = data["username"]
        
    if "role" in data:
        target_user.role = data["role"]
        
    db.commit()
    return {"status": "updated", "user": {"id": target_user.id, "username": target_user.username, "role": target_user.role}}

@router.post("/users/{user_id}/reset_password")
def reset_password(
    user_id: int,
    data: dict,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(404, "User not found")
        
    if "password" not in data or not data["password"]:
        raise HTTPException(400, "Password required")
        
    target_user.password_hash = get_password_hash(data["password"])
    db.commit()
    return {"status": "password updated"}

@router.post("/users/{user_id}/2fa/toggle")
def toggle_2fa(
    user_id: int,
    data: dict,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(404, "User not found")
        
    enable = data.get("enable", False)
    
    if not enable:
        # Disable 2FA
        target_user.totp_secret = None
        db.commit()
        return {"status": "2fa disabled"}
    else:
        # Enable 2FA (Generate new secret)
        secret = generate_2fa_secret()
        target_user.totp_secret = secret
        db.commit()
        
        # Return QR code
        uri = get_2fa_uri(target_user.username, secret)
        img = qrcode.make(uri)
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qr_b64 = base64.b64encode(buffered.getvalue()).decode()
        
        return {
            "status": "2fa enabled",
            "qr": f"data:image/png;base64,{qr_b64}",
            "secret": secret
        }

@router.get("/config")
def get_config(
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    configs = db.query(ScanConfig).all()
    # Default config if not present
    defaults = {
        "scan_ip_lookup": "true",
        "scan_nmap": "true",
        "scan_whois": "true",
        "scan_subdomain": "true",
        "scan_dns_lookup": "true",
        "scan_checkphish": "true",
        "scan_asn_lookup": "true",
        "scan_wappalyzer": "true",
        "scan_sherlock": "true"
    }
    
    current = {c.key: c.value for c in configs}
    # Merge defaults
    for k, v in defaults.items():
        if k not in current:
            current[k] = v
            
    return current

@router.post("/config")
def update_config(
    data: dict,
    db: Session = Depends(get_db),
    user=Depends(require_role("admin"))
):
    for key, value in data.items():
        config = db.query(ScanConfig).filter(ScanConfig.key == key).first()
        if not config:
            config = ScanConfig(key=key, value=str(value).lower())
            db.add(config)
        else:
            config.value = str(value).lower()
    
    db.commit()
    return {"status": "updated"}
