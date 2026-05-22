from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select

from .core.config import get_settings
from .core.security import create_access_token, decode_access_token, verify_password
from .db import (
    AuditEventModel,
    AircraftModel,
    FlightModel,
    OrganizationModel,
    SessionLocal,
    UnitModel,
    UserModel,
    bootstrap_database,
    get_session,
)
from .domain import (
    AircraftCreateRequest,
    ExportRequest,
    FlightCreateRequest,
    FlightEntry,
    FlightStatus,
    LoginRequest,
    Organization,
    OrganizationCreateRequest,
    OrganizationUpdateRequest,
    PasswordResetRequest,
    OwnProfileUpdateRequest,
    ReviewDecision,
    ReviewRequest,
    RoleName,
    Unit,
    UnitCreateRequest,
    UnitUpdateRequest,
    TokenResponse,
    User,
    UserCreateRequest,
    UserUpdateRequest,
)
from .services import (
    audit_for_organization,
    create_aircraft,
    create_flight,
    create_organization,
    create_unit,
    create_user,
    dashboard_for_unit,
    dashboard_for_user,
    export_summary,
    export_flights_csv,
    export_flights_pdf,
    list_aircraft,
    list_flights,
    list_organizations,
    list_units,
    list_users,
    delete_organization,
    delete_unit,
    delete_user,
    review_flight,
    submit_flight,
    update_organization,
    update_unit,
    update_user,
)

settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
security = HTTPBearer(auto_error=False)
EXEMPT_API_PATHS = {
    "/api/auth/login",
    "/api/auth/request-password-reset",
    "/api/auth/reset-password",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    bootstrap_database()


def _extract_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization")
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    return request.cookies.get("flylogx-token")


def _load_user_from_token(token: str, db):
    try:
        payload = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = db.get(UserModel, payload["sub"])
    if not user or not user.active or user.is_deleted:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    organization = db.get(OrganizationModel, user.organization_id)
    if organization is None or organization.is_deleted:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive organization")
    return user


@app.middleware("http")
async def protect_api_routes(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api") and path not in EXEMPT_API_PATHS:
        token = _extract_token(request)
        if not token:
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "Missing bearer token"})
        with SessionLocal() as db:
            try:
                request.state.current_user = _load_user_from_token(token, db)
            except HTTPException as exc:
                return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return await call_next(request)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db=Depends(get_session),
):
    cached_user = getattr(request.state, "current_user", None)
    if cached_user is not None:
        return cached_user

    token = credentials.credentials if credentials is not None else _extract_token(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return _load_user_from_token(token, db)


def require_role(*roles: RoleName):
    def dependency(user=Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency


@app.get("/")
def root():
    return {
        "name": "FlyLogX",
        "description": "Digitales Flugzeitennachweis- und Prüfverwaltungssystem",
        "docs": "/api/docs",
        "health": "/health",
    }


@app.get("/api", include_in_schema=False)
@app.get("/api/", include_in_schema=False)
def api_root(user=Depends(get_current_user)):
    return HTMLResponse(
        f"""
        <!doctype html>
        <html lang="de">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>FlyLogX API</title>
          <style>
            body {{ margin: 0; font-family: system-ui, sans-serif; background: #0f1724; color: #eef4fb; }}
            main {{ max-width: 960px; margin: 0 auto; padding: 48px 24px; }}
            .card {{ background: #13243a; border: 1px solid #274461; border-radius: 18px; padding: 24px; margin-top: 20px; }}
            a {{ color: #a8c7e8; }}
            code {{ background: rgba(255,255,255,.08); padding: 2px 6px; border-radius: 6px; }}
          </style>
        </head>
        <body>
          <main>
            <h1>FlyLogX API</h1>
            <p>Eingeloggt als <strong>{user.name}</strong> ({user.role.value}).</p>
            <div class="card">
              <p><a href="/api/docs">Swagger UI</a></p>
              <p><a href="/api/redoc">ReDoc</a></p>
              <p><a href="/api/openapi.json">OpenAPI JSON</a></p>
              <p>Auth: <code>/api/auth/login</code></p>
            </div>
          </main>
        </body>
        </html>
        """,
        media_type="text/html; charset=utf-8",
    )


@app.get("/api/openapi.json", include_in_schema=False)
def openapi_json(user=Depends(get_current_user)):
    return app.openapi()


@app.get("/api/docs", include_in_schema=False)
def swagger_docs(user=Depends(get_current_user)):
    return get_swagger_ui_html(
        openapi_url="/api/openapi.json",
        title=f"{settings.app_name} - Swagger UI",
    )


@app.get("/api/redoc", include_in_schema=False)
def redoc_docs(user=Depends(get_current_user)):
    return get_redoc_html(
        openapi_url="/api/openapi.json",
        title=f"{settings.app_name} - ReDoc",
    )


@app.get("/health")
def health(db=Depends(get_session)):
    return {
        "status": "ok",
        "organizations": db.query(OrganizationModel).filter(OrganizationModel.is_deleted.is_(False)).count(),
        "users": db.query(UserModel).filter(UserModel.is_deleted.is_(False)).count(),
        "aircraft": db.query(AircraftModel).filter(AircraftModel.is_deleted.is_(False)).count(),
        "flights": db.query(FlightModel).filter(FlightModel.is_deleted.is_(False)).count(),
        "audits": db.query(AuditEventModel).count(),
    }


@app.get("/api/meta")
def meta():
    return {
        "product": "FlyLogX",
        "version": "0.1.0",
        "stack": {"frontend": "Next.js + TypeScript", "backend": "FastAPI", "database": "PostgreSQL"},
    }


@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, response: Response, db=Depends(get_session)):
    user = db.scalar(select(UserModel).where(func.lower(UserModel.email) == payload.email.lower()))
    if not user or user.is_deleted or not user.active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.id, user.role.value)
    forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    response.set_cookie(
        key="flylogx-token",
        value=token,
        httponly=True,
        secure=forwarded_proto == "https",
        samesite="lax",
        path="/",
        max_age=settings.jwt_expires_minutes * 60,
    )
    return TokenResponse(access_token=token, expires_in=settings.jwt_expires_minutes * 60)


@app.post("/api/auth/logout")
def logout(response: Response, _: object = Depends(get_current_user)):
    response.delete_cookie(key="flylogx-token", path="/")
    return {"message": "Session closed"}


@app.post("/api/auth/request-password-reset")
def request_password_reset(payload: PasswordResetRequest):
    return {"message": f"Password reset link prepared for {payload.email}"}


@app.post("/api/auth/reset-password")
def reset_password():
    return {"message": "Password reset workflow scaffolded"}


@app.get("/api/auth/sessions")
def sessions(_: object = Depends(get_current_user)):
    return [
        {"id": "session-01", "device": "Browser", "ip": "127.0.0.1", "last_seen": "2026-05-21T09:47:00Z"},
    ]


@app.get("/api/auth/me", response_model=User)
def me(user=Depends(get_current_user)):
    return User.model_validate(user)


@app.patch("/api/auth/me", response_model=User)
def update_me(payload: OwnProfileUpdateRequest, user=Depends(get_current_user), db=Depends(get_session)):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No profile changes provided")

    if "name" in changes and (changes["name"] is None or not str(changes["name"]).strip()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name cannot be empty")
    if "email" in changes and (changes["email"] is None or not str(changes["email"]).strip()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email cannot be empty")

    try:
        return update_user(
            db,
            user.id,
            UserUpdateRequest(
                name=changes.get("name"),
                email=changes.get("email"),
                password=changes.get("password"),
            ),
            actor_id=user.id,
        )
    except KeyError as exc:
        key = exc.args[0] if exc.args else "user_not_found"
        detail = "User not found"
        status_code = status.HTTP_404_NOT_FOUND
        if key == "user_email_exists":
            detail = "Email already exists"
            status_code = status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=detail)


@app.get("/api/organizations")
def organizations(_: object = Depends(require_role(RoleName.admin, RoleName.supervisor)), db=Depends(get_session)):
    return list_organizations(db)


@app.post("/api/organizations", response_model=Organization)
def organization_create(
    payload: OrganizationCreateRequest,
    user=Depends(require_role(RoleName.admin)),
    db=Depends(get_session),
):
    try:
        return create_organization(db, payload, actor_id=user.id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent organization not found")


@app.patch("/api/organizations/{organization_id}")
def organization_update(
    organization_id: str,
    payload: OrganizationUpdateRequest,
    user=Depends(require_role(RoleName.admin)),
    db=Depends(get_session),
):
    try:
        return update_organization(db, organization_id, payload, actor_id=user.id)
    except KeyError as exc:
        key = exc.args[0] if exc.args else "organization_not_found"
        detail = "Organization not found"
        if key == "organization_parent_invalid":
            detail = "Organization cannot reference itself as parent"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST if key == "organization_parent_invalid" else status.HTTP_404_NOT_FOUND, detail=detail)


@app.delete("/api/organizations/{organization_id}")
def organization_delete(
    organization_id: str,
    user=Depends(require_role(RoleName.admin)),
    db=Depends(get_session),
):
    try:
        return delete_organization(db, organization_id, actor_id=user.id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")


@app.get("/api/units")
def units(_: object = Depends(require_role(RoleName.admin, RoleName.supervisor)), db=Depends(get_session)):
    return list_units(db)


@app.post("/api/units", response_model=Unit)
def unit_create(payload: UnitCreateRequest, user=Depends(require_role(RoleName.admin)), db=Depends(get_session)):
    try:
        return create_unit(db, payload, actor_id=user.id)
    except KeyError as exc:
        key = exc.args[0] if exc.args else "unit_not_found"
        detail = "Unit could not be created"
        status_code = status.HTTP_400_BAD_REQUEST
        if key == "organization_not_found":
            detail = "Organization not found"
            status_code = status.HTTP_404_NOT_FOUND
        elif key == "unit_code_exists":
            detail = "Unit code already exists"
        raise HTTPException(status_code=status_code, detail=detail)


@app.patch("/api/units/{unit_id}")
def unit_update(unit_id: str, payload: UnitUpdateRequest, user=Depends(require_role(RoleName.admin)), db=Depends(get_session)):
    try:
        return update_unit(db, unit_id, payload, actor_id=user.id)
    except KeyError as exc:
        key = exc.args[0] if exc.args else "unit_not_found"
        detail = "Unit not found"
        status_code = status.HTTP_404_NOT_FOUND
        if key == "organization_not_found":
            detail = "Organization not found"
        elif key == "unit_code_exists":
            detail = "Unit code already exists"
            status_code = status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=detail)


@app.delete("/api/units/{unit_id}")
def unit_delete(unit_id: str, user=Depends(require_role(RoleName.admin)), db=Depends(get_session)):
    try:
        return delete_unit(db, unit_id, actor_id=user.id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")


@app.get("/api/users")
def users(_: object = Depends(require_role(RoleName.admin, RoleName.supervisor)), db=Depends(get_session)):
    return list_users(db)


@app.post("/api/users", response_model=User)
def user_create(payload: UserCreateRequest, user=Depends(require_role(RoleName.admin)), db=Depends(get_session)):
    try:
        return create_user(db, payload, actor_id=user.id)
    except KeyError as exc:
        key = exc.args[0] if exc.args else "user_not_found"
        detail = "User could not be created"
        status_code = status.HTTP_400_BAD_REQUEST
        if key == "organization_not_found":
            detail = "Organization not found"
            status_code = status.HTTP_404_NOT_FOUND
        elif key == "unit_not_found":
            detail = "Unit not found"
            status_code = status.HTTP_404_NOT_FOUND
        elif key == "unit_organization_mismatch":
            detail = "Unit does not belong to organization"
        elif key == "user_email_exists":
            detail = "Email already exists"
        raise HTTPException(status_code=status_code, detail=detail)


@app.patch("/api/users/{user_id}")
def user_update(user_id: str, payload: UserUpdateRequest, user=Depends(require_role(RoleName.admin)), db=Depends(get_session)):
    try:
        return update_user(db, user_id, payload, actor_id=user.id)
    except KeyError as exc:
        key = exc.args[0] if exc.args else "user_not_found"
        detail = "User not found"
        status_code = status.HTTP_404_NOT_FOUND
        if key == "organization_not_found":
            detail = "Organization not found"
        elif key == "unit_not_found":
            detail = "Unit not found"
        elif key == "unit_organization_mismatch":
            detail = "Unit does not belong to organization"
            status_code = status.HTTP_400_BAD_REQUEST
        elif key == "user_email_exists":
            detail = "Email already exists"
            status_code = status.HTTP_400_BAD_REQUEST
        elif key == "cannot_delete_self":
            detail = "You cannot delete your own account"
            status_code = status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=detail)


@app.delete("/api/users/{user_id}")
def user_delete(user_id: str, user=Depends(require_role(RoleName.admin)), db=Depends(get_session)):
    try:
        return delete_user(db, user_id, actor_id=user.id)
    except KeyError as exc:
        key = exc.args[0] if exc.args else "user_not_found"
        detail = "User not found"
        status_code = status.HTTP_404_NOT_FOUND
        if key == "cannot_delete_self":
            detail = "You cannot delete your own account"
            status_code = status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=detail)


@app.get("/api/aircraft")
def aircraft(user=Depends(get_current_user), db=Depends(get_session)):
    return [item for item in list_aircraft(db) if item.organization_id == user.organization_id]


@app.post("/api/aircraft")
def create_aircraft_endpoint(payload: AircraftCreateRequest, user=Depends(require_role(RoleName.admin)), db=Depends(get_session)):
    organization = db.get(OrganizationModel, payload.organization_id)
    if organization is None or organization.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    try:
        return create_aircraft(db, payload, actor_id=user.id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")


@app.get("/api/flights")
def flights(
    status_filter: FlightStatus | None = None,
    user_id: str | None = None,
    aircraft_id: str | None = None,
    user=Depends(get_current_user),
    db=Depends(get_session),
):
    if user_id and user.role not in {RoleName.supervisor, RoleName.admin} and user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    return list_flights(db, organization_id=user.organization_id, user_id=user_id, aircraft_id=aircraft_id, status=status_filter)


@app.get("/api/flights/{flight_id}", response_model=FlightEntry)
def flight_detail(flight_id: str, user=Depends(get_current_user), db=Depends(get_session)):
    flight = db.get(FlightModel, flight_id)
    if flight is None or flight.organization_id != user.organization_id or flight.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flight not found")
    return FlightEntry.model_validate(flight)


@app.post("/api/flights")
def flight_create(payload: FlightCreateRequest, user=Depends(get_current_user), db=Depends(get_session)):
    if user.id != payload.pilot_id and user.role != RoleName.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only create own flights")
    try:
        return create_flight(db, payload, actor_id=user.id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aircraft not found")


@app.post("/api/flights/{flight_id}/submit")
def flight_submit(flight_id: str, user=Depends(get_current_user), db=Depends(get_session)):
    flight = db.get(FlightModel, flight_id)
    if flight is None or flight.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flight not found")
    if user.id != flight.pilot_id and user.role != RoleName.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only submit own flights")
    try:
        return submit_flight(db, flight_id, user.id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flight not found")


@app.post("/api/flights/{flight_id}/review")
def flight_review(flight_id: str, payload: ReviewRequest, user=Depends(require_role(RoleName.supervisor, RoleName.admin)), db=Depends(get_session)):
    try:
        return review_flight(
            db,
            flight_id=flight_id,
            actor_id=user.id,
            decision=payload.decision,
            comment=payload.comment,
            signature=payload.signature,
        )
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flight not found")


@app.get("/api/dashboards/pilot/{user_id}")
def pilot_dashboard(user_id: str, user=Depends(get_current_user), db=Depends(get_session)):
    if user.id != user_id and user.role != RoleName.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    try:
        return dashboard_for_user(db, user_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


@app.get("/api/dashboards/unit/{unit_id}")
def unit_dashboard(unit_id: str, user=Depends(require_role(RoleName.supervisor, RoleName.admin)), db=Depends(get_session)):
    try:
        return dashboard_for_unit(db, unit_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")


@app.get("/api/audit")
def audit(organization_id: str | None = None, user=Depends(require_role(RoleName.supervisor, RoleName.admin)), db=Depends(get_session)):
    return audit_for_organization(db, organization_id or user.organization_id)


@app.post("/api/exports")
def exports(payload: ExportRequest, user=Depends(get_current_user), db=Depends(get_session)):
    if payload.format.lower() == "csv":
        csv_content = export_flights_csv(
            db,
            organization_id=payload.organization_id or user.organization_id,
            user_id=payload.user_id,
            status=payload.status,
        )
        filename = f"flylogx-export-{user.organization_id}.csv"
        return PlainTextResponse(
            csv_content,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    if payload.format.lower() == "pdf":
        pdf_content = export_flights_pdf(
            db,
            organization_id=payload.organization_id or user.organization_id,
            user_id=payload.user_id,
            status=payload.status,
        )
        filename = f"flylogx-export-{user.organization_id}.pdf"
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    return export_summary(payload.format, db)
