"""Google Calendar OAuth + API helpers.

Supports:
- OAuth 2.0 authorization code flow with offline access
- Storing encrypted refresh tokens in MongoDB
- Auto-refreshing access tokens
- Creating/deleting calendar events
- Listing events in a date range (for double-booking prevention)
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

import requests
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build

from crypto_utils import encrypt, decrypt

log = logging.getLogger("gcal")

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
]

AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
TOKEN_URI = "https://oauth2.googleapis.com/token"
USERINFO_URI = "https://www.googleapis.com/oauth2/v2/userinfo"


def build_auth_url(client_id: str, redirect_uri: str, state: str) -> str:
    from urllib.parse import urlencode
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{AUTH_URI}?{urlencode(params)}"


def exchange_code_for_tokens(client_id: str, client_secret: str, redirect_uri: str, code: str) -> Dict[str, Any]:
    r = requests.post(TOKEN_URI, data={
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }, timeout=15)
    r.raise_for_status()
    return r.json()


def get_userinfo(access_token: str) -> Dict[str, Any]:
    r = requests.get(USERINFO_URI, headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
    r.raise_for_status()
    return r.json()


async def _load_settings(db) -> Optional[Dict[str, Any]]:
    return await db.integrations.find_one({"id": "google_calendar"}, {"_id": 0})


async def _save_settings(db, patch: Dict[str, Any]):
    patch["id"] = "google_calendar"
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.integrations.update_one({"id": "google_calendar"}, {"$set": patch}, upsert=True)


async def get_credentials(db) -> Optional[Credentials]:
    doc = await _load_settings(db)
    if not doc or not doc.get("refresh_token_enc"):
        return None
    client_id = doc.get("client_id") or os.environ.get("GOOGLE_CLIENT_ID", "")
    client_secret = decrypt(doc.get("client_secret_enc", "")) or os.environ.get("GOOGLE_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        return None

    refresh_token = decrypt(doc.get("refresh_token_enc", ""))
    if not refresh_token:
        return None

    access_token = decrypt(doc.get("access_token_enc", "")) if doc.get("access_token_enc") else None

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri=TOKEN_URI,
        client_id=client_id,
        client_secret=client_secret,
        scopes=SCOPES,
    )

    try:
        if not creds.valid:
            creds.refresh(GoogleRequest())
            await _save_settings(db, {
                "access_token_enc": encrypt(creds.token),
                "expires_at": (creds.expiry.replace(tzinfo=timezone.utc).isoformat() if creds.expiry else None),
            })
    except Exception as e:
        log.warning("Google Calendar credentials refresh failed: %s", e)
        return None
    return creds


async def get_service(db):
    creds = await get_credentials(db)
    if not creds:
        return None
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


async def create_event(db, *, summary: str, description: str, start_iso: str, end_iso: str, attendee_email: Optional[str] = None, timezone_name: str = "America/Los_Angeles") -> Optional[Dict[str, Any]]:
    service = await get_service(db)
    if not service:
        return None
    body: Dict[str, Any] = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_iso, "timeZone": timezone_name},
        "end":   {"dateTime": end_iso,   "timeZone": timezone_name},
    }
    if attendee_email:
        body["attendees"] = [{"email": attendee_email}]
    try:
        return service.events().insert(calendarId="primary", body=body, sendUpdates="none").execute()
    except Exception as e:
        log.warning("Failed to create calendar event: %s", e)
        return None


async def delete_event(db, event_id: str) -> bool:
    service = await get_service(db)
    if not service:
        return False
    try:
        service.events().delete(calendarId="primary", eventId=event_id).execute()
        return True
    except Exception as e:
        log.warning("Failed to delete calendar event %s: %s", event_id, e)
        return False


async def list_busy(db, date_str: str, timezone_name: str = "America/Los_Angeles") -> List[Dict[str, str]]:
    """Return a list of {start, end} ISO strings for events on that day."""
    service = await get_service(db)
    if not service:
        return []
    try:
        start = datetime.fromisoformat(f"{date_str}T00:00:00+00:00")
        end = start + timedelta(days=1)
        events = service.events().list(
            calendarId="primary",
            timeMin=start.isoformat(),
            timeMax=end.isoformat(),
            singleEvents=True,
            orderBy="startTime",
        ).execute()
        busy = []
        for e in events.get("items", []):
            s = e.get("start", {}).get("dateTime") or e.get("start", {}).get("date")
            en = e.get("end", {}).get("dateTime") or e.get("end", {}).get("date")
            if s and en:
                busy.append({"start": s, "end": en})
        return busy
    except Exception as e:
        log.warning("Failed to list Google Calendar events: %s", e)
        return []
