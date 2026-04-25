"""Auth routes - POST /register, POST /login"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.auth_service import hash_password, verify_password, create_token
from database.config.connection import get_db

router = APIRouter()


class RegisterRequest(BaseModel):
    username:  str
    password:  str
    farm_name: str = "My Farm"


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/register")
async def register(req: RegisterRequest):
    db       = get_db()
    existing = await db.users.find_one({"username": req.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    await db.users.insert_one({
        "username":  req.username,
        "password":  hash_password(req.password),
        "farm_name": req.farm_name,
    })
    token = create_token(req.username)
    return {
        "access_token": token,
        "username":     req.username,
        "farm_name":    req.farm_name,
    }


@router.post("/login")
async def login(req: LoginRequest):
    db   = get_db()
    user = await db.users.find_one({"username": req.username})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Wrong username or password")

    token = create_token(req.username)
    return {
        "access_token": token,
        "username":     req.username,
        "farm_name":    user.get("farm_name", "My Farm"),
    }
