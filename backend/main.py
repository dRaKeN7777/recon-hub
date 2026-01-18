from fastapi import FastAPI, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import csv
import io
import os

from core.database import Base, engine, get_db, wait_for_db
from routers.auth import router as auth_router
from routers.scan import router as scan_router
from routers.admin import router as admin_router
from core.models import Scan
from core.security import get_current_user

wait_for_db()
Base.metadata.create_all(bind=engine)


app = FastAPI(title="ReconHub API", root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(scan_router)
app.include_router(admin_router)

@app.get("/export/scans.csv")
def export_scans_csv(
    scan_id: int = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    query = db.query(Scan).filter(Scan.user_id == user.id)
    if scan_id:
        query = query.filter(Scan.id == scan_id)
    scans = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Target", "Type", "Result", "Created At"])

    for s in scans:
        writer.writerow([
            s.id,
            s.target,
            s.scan_type,
            s.result[:500] if s.result else "",
            s.created_at
        ])

    filename = f"scan_{scan_id}.csv" if scan_id else "scans.csv"
    return Response(
        output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
