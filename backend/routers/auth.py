from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User
from core.security import *
from core.audit import log
import qrcode
import io
import base64
from pydantic import BaseModel

router = APIRouter(prefix="/auth")

class LoginSchema(BaseModel):
    username: str
    password: str
    otp: str | None = None

@router.post("/register")
def register(data: dict, db: Session = Depends(get_db)):
    if db.query(User).filter_by(username=data["username"]).first():
        raise HTTPException(400, "Username already registered")
    
    secret = generate_2fa_secret()
    # Explicitly check for password in data, though schema validation usually handles this if Pydantic model used
    if "password" not in data:
         raise HTTPException(400, "Password required")

    user = User(
        username=data["username"],
        password_hash=get_password_hash(data["password"]),
        role="user",
        totp_secret=secret
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    uri = get_2fa_uri(user.username, secret)
    img = qrcode.make(uri)
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_b64 = base64.b64encode(buffered.getvalue()).decode()
    
    return {
        "msg": "User created",
        "qr": f"data:image/png;base64,{qr_b64}",
        "secret": secret
    }

@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    print(f"Login request: username={data.username}, has_otp={bool(data.otp)}")
    user = db.query(User).filter_by(username=data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
        
    if not user.is_active:
        raise HTTPException(403, "Account disabled")

    # If 2FA is not set up for the user, skip the check
    if not user.totp_secret:
        access = create_access_token({"sub": user.username, "role": user.role, "sub_id": user.id})
        refresh = create_refresh_token({"sub": user.username, "sub_id": user.id})
        log(db, user.username, "LOGIN_SUCCESS")
        return {
            "access_token": access,
            "refresh_token": refresh,
            "role": user.role
        }

    if not data.otp:
        return {"status": "2fa_required", "msg": "2FA code required"}

    if not verify_2fa(user.totp_secret, data.otp):
        raise HTTPException(401, "Invalid 2FA")

    access = create_access_token({"sub": user.username, "role": user.role, "sub_id": user.id})
    refresh = create_refresh_token({"sub": user.username, "sub_id": user.id})

    log(db, user.username, "LOGIN_SUCCESS")
    return {
        "access_token": access,
        "refresh_token": refresh,
        "role": user.role
    }

@router.post("/refresh")
def refresh(data: dict, db: Session = Depends(get_db)):
    payload = decode(data["refresh_token"])
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")

    username = payload.get("sub")
    if not username:
        raise HTTPException(401, "Invalid token payload")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(401, "User not found")

    if not user.is_active:
        raise HTTPException(403, "Account disabled")

    return {
        "access_token": create_access_token({"sub": user.username, "role": user.role, "sub_id": user.id})
    }

@router.get("/verify")
def verify_token(user=Depends(get_current_user)):
    return {"status": "valid", "user": user.username, "role": user.role}

@router.post("/change-password")
def change_password(data: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if "old_password" not in data or "new_password" not in data:
        raise HTTPException(400, "Old and new passwords required")
        
    if not verify_password(data["old_password"], user.password_hash):
        raise HTTPException(400, "Incorrect old password")
        
    user.password_hash = get_password_hash(data["new_password"])
    db.commit()
    
    return {"status": "password updated"}
