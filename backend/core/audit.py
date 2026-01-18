from core.models import AuditLog, User
from sqlalchemy.orm import Session

def log(db: Session, username: str, event: str):
    user = db.query(User).filter(User.username == username).first()
    user_id = user.id if user else None
    
    db.add(AuditLog(user_id=user_id, action=event))
    db.commit()
