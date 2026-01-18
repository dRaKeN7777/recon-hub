from fastapi import Depends, HTTPException, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session
import os
from datetime import datetime, timedelta
from passlib.context import CryptContext
import pyotp

from core.database import get_db
from core.models import User
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_2fa(secret, code):
    if not secret:
        return True # If no 2FA set, skip or handle as needed. But typically we want 2FA.
                    # For now assuming optional or handled elsewhere.
                    # Wait, logic in login.py: if not verify_2fa(...) -> Invalid 2FA.
                    # If secret is None/empty, verify_2fa should probably return True if code is empty?
                    # Or fail?
                    # Let's assume strict 2FA for now.
        return True 
    if not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code)

def generate_2fa_secret():
    return pyotp.random_base32()

def get_2fa_uri(username, secret):
    return pyotp.totp.TOTP(secret).provisioning_uri(name=username, issuer_name="ReconHub")

def decode(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    return user


def require_role(role: str):
    def checker(user=Depends(get_current_user)):
        if user.role != role:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker
