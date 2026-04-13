from fastapi import APIRouter, Request, Response, Depends
from fastapi.responses import HTMLResponse
from datetime import datetime, timedelta

from backend.config import settings
from backend.models import Portal, Integration, User
from backend.routers.auth import get_current_user_optional

router = APIRouter(prefix="/bitrix", tags=["Bitrix"])

FRONTEND_URL = settings.FRONTEND_URL


# ===========================================================
# ✅ INSTALL (BITRIX MARKETPLACE INSTALL HANDLER)
# ===========================================================
@router.post("/install", response_class=HTMLResponse)
async def install(
    request: Request,
    current_user: User = Depends(get_current_user_optional)
):
    try:
        query = dict(request.query_params)

        # ✅ HANDLE JSON + FORM (BITRIX sends FORM)
        try:
            body = await request.json()
        except:
            form = await request.form()
            body = dict(form)

        AUTH_ID = body.get("AUTH_ID")
        REFRESH_ID = body.get("REFRESH_ID")
        member_id = body.get("member_id")
        AUTH_EXPIRES = int(body.get("AUTH_EXPIRES", 3600))
        DOMAIN = body.get("DOMAIN") or query.get("DOMAIN", "")

        if not AUTH_ID or not member_id:
            return Response(content="INVALID", status_code=400)

        expires_at = datetime.utcnow() + timedelta(seconds=AUTH_EXPIRES)

        company_id = str(current_user.companyId) if current_user and current_user.companyId else None

        existing = await Portal.find_one(Portal.member_id == member_id)

        if existing:
            existing.access_token = AUTH_ID
            existing.refresh_token = REFRESH_ID
            existing.domain = DOMAIN
            existing.expires_at = expires_at

            if company_id:
                existing.companyId = company_id

            await existing.save()
        else:
            await Portal(
                member_id=member_id,
                access_token=AUTH_ID,
                refresh_token=REFRESH_ID,
                domain=DOMAIN,
                expires_at=expires_at,
                companyId=company_id
            ).insert()

        print("✅ Portal saved:", member_id)

        # ✅ IMPORTANT: Finish install (NO redirect here)
        return HTMLResponse("""
        <html>
          <head>
            <script src="//api.bitrix24.com/api/v1/"></script>
          </head>
          <body>
            <script>
              BX24.installFinish();
            </script>
          </body>
        </html>
        """)

    except Exception as e:
        print("❌ /install error:", str(e))
        return Response(content="ERROR", status_code=500)


# ===========================================================
# OPTIONAL GET INSTALL (fallback)
# ===========================================================
@router.get("/install", response_class=HTMLResponse)
async def install_redirect():
    return HTMLResponse("""
    <html>
      <head>
        <script src="//api.bitrix24.com/api/v1/"></script>
      </head>
      <body>
        <script>
          BX24.installFinish();
        </script>
      </body>
    </html>
    """)


# ===========================================================
# ✅ UNINSTALL
# ===========================================================
@router.post("/uninstall")
async def uninstall(request: Request):
    try:
        try:
            body = await request.json()
        except:
            form = await request.form()
            body = dict(form)

        member_id = body.get("member_id")

        if member_id:
            await Portal.find(Portal.member_id == member_id).delete()
            await Integration.find(Integration.member_id == member_id).delete()

        print("🗑️ Uninstalled:", member_id)

        return Response(content="OK", status_code=200)

    except Exception:
        return Response(content="OK", status_code=200)


# ===========================================================
# ✅ APP (MAIN UI INSIDE BITRIX IFRAME)
# ===========================================================
@router.api_route("/app", methods=["GET", "POST"], response_class=HTMLResponse)
async def app_launcher(request: Request):
    try:
        query_params = dict(request.query_params)

        try:
            body = await request.json()
        except:
            body = {}

        params = {**query_params, **body}
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])

        redirect_url = f"{FRONTEND_URL}/dashboard/integrations?{query_string}"

        # ✅ PROPER IFRAME LOAD (NO WHITE BORDER)
        return HTMLResponse(f"""
        <html>
          <head>
            <script src="//api.bitrix24.com/api/v1/"></script>
            <style>
              html, body {{
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: hidden;
              }}
            </style>
          </head>
          <body>
            <script>
              BX24.init(function() {{
                BX24.resizeWindow(window.innerWidth, window.innerHeight);
                window.location.replace("{redirect_url}");
              }});
            </script>
          </body>
        </html>
        """)

    except Exception as e:
        print("❌ /app error:", str(e))
        return Response(content="ERROR", status_code=500)