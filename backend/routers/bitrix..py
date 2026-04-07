from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse

router = APIRouter(tags=["bitrix"])  # ← THIS LINE IS MISSING

FRONTEND_URL = "https://longish-palma-unmeddled.ngrok-free.dev" 

@router.post("/install")
async def install(request: Request):
    body = await request.form()
    print("INSTALL:", dict(body))

    return HTMLResponse(f"""
        <script>
            window.location.href = "{FRONTEND_URL}";
        </script>
    """)

# --------------------------------------------------
# APP LOAD
# --------------------------------------------------
@router.api_route("/app", methods=["GET", "POST"])
async def app_entry():
    return HTMLResponse(f"""
        <html>
        <body>
            <script>
                window.location.href = "{FRONTEND_URL}";
            </script>
        </body>
        </html>
    """)