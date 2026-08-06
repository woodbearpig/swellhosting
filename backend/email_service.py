import os
import smtplib
import logging
import uuid
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List

logger = logging.getLogger(__name__)


def _smtp_send(msg, from_email: str, to_list: List[str]) -> bool:
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        logger.info("[email] SMTP not configured, skipping send to %s (%s)", to_list, msg.get("Subject", ""))
        return False
    try:
        port = int(os.environ.get("SMTP_PORT", "587"))
        user = os.environ.get("SMTP_USER", "")
        password = os.environ.get("SMTP_PASS", "")
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            try:
                server.starttls()
                server.ehlo()
            except Exception:
                pass
            if user and password:
                server.login(user, password)
            server.sendmail(from_email, to_list, msg.as_string())
        logger.info("[email] Sent to %s: %s", to_list, msg.get("Subject", ""))
        return True
    except Exception as e:
        logger.warning("[email] Failed to send to %s: %s", to_list, e)
        return False


def send_email(to: str, subject: str, html: str, text: Optional[str] = None,
               ics_content: Optional[str] = None, ics_filename: str = "consultation.ics",
               reply_to: Optional[str] = None, bcc: Optional[str] = None) -> bool:
    """Send an HTML email. Optionally attach a calendar (.ics) invite."""
    from_email = os.environ.get("SMTP_FROM", os.environ.get("SMTP_USER", "hello@swelldesignla.com"))
    from_name = os.environ.get("SMTP_FROM_NAME", "swell design + media")

    # Use mixed if attachment present
    if ics_content:
        msg = MIMEMultipart("mixed")
        alt = MIMEMultipart("alternative")
        if text:
            alt.attach(MIMEText(text, "plain"))
        alt.attach(MIMEText(html, "html"))
        msg.attach(alt)
        # Attach the .ics as a calendar invite
        ics_part = MIMEBase("text", "calendar", method="REQUEST", name=ics_filename)
        ics_part.set_payload(ics_content.encode("utf-8"))
        encoders.encode_base64(ics_part)
        ics_part.add_header("Content-Disposition", f'attachment; filename="{ics_filename}"')
        ics_part.add_header("Content-Class", "urn:content-classes:calendarmessage")
        msg.attach(ics_part)
    else:
        msg = MIMEMultipart("alternative")
        if text:
            msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to
    if reply_to:
        msg["Reply-To"] = reply_to

    recipients = [to]
    if bcc:
        recipients.append(bcc)
    return _smtp_send(msg, from_email, recipients)


def make_ics(*, summary: str, description: str, start_local: datetime, duration_minutes: int,
             organizer_email: str, attendee_email: str, uid: Optional[str] = None,
             location: str = "Phone call") -> str:
    """Build a minimal RFC5545 .ics content string.
    Times are emitted in the site's local time as floating times (no TZID) — most calendar
    apps interpret this as "the local time of the recipient", which is what we want for a phone call
    where both parties are told the same wall-clock time.
    """
    uid = uid or f"{uuid.uuid4().hex}@swelldesignla.com"
    end_local = start_local + timedelta(minutes=int(duration_minutes))
    fmt = lambda dt: dt.strftime("%Y%m%dT%H%M%S")
    dtstamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    # Escape newlines per iCal spec
    def esc(s: str) -> str:
        return (s or "").replace("\\", "\\\\").replace("\n", "\\n").replace(",", "\\,").replace(";", "\\;")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//swell design + media//Booking//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{dtstamp}",
        f"DTSTART:{fmt(start_local)}",
        f"DTEND:{fmt(end_local)}",
        f"SUMMARY:{esc(summary)}",
        f"DESCRIPTION:{esc(description)}",
        f"LOCATION:{esc(location)}",
        f"ORGANIZER;CN=swell design + media:mailto:{organizer_email}",
        f"ATTENDEE;RSVP=TRUE;CN={attendee_email}:mailto:{attendee_email}",
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "BEGIN:VALARM",
        "TRIGGER:-PT30M",
        "ACTION:DISPLAY",
        "DESCRIPTION:Reminder",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(lines) + "\r\n"


def _format_time_12h(hhmm: str) -> str:
    try:
        h, m = hhmm.split(":")
        h = int(h)
        m = int(m)
        ampm = "AM" if h < 12 else "PM"
        h12 = h % 12 or 12
        return f"{h12}:{m:02d} {ampm}"
    except Exception:
        return hhmm


def _format_date_long(yyyy_mm_dd: str) -> str:
    try:
        d = datetime.strptime(yyyy_mm_dd, "%Y-%m-%d").date()
        return d.strftime("%A, %B %-d, %Y")
    except Exception:
        return yyyy_mm_dd


def inquiry_confirmation_html(name: str, event_type: str, consult_date: str = "", consult_time: str = "") -> str:
    friendly = (event_type or "celebration").replace("_", " ")
    consult_block = ""
    if consult_date and consult_time:
        consult_block = f"""
        <div style="margin-top: 20px; padding: 16px 20px; background:#EFEAE1; border-radius: 12px;">
          <p style="margin: 0 0 6px 0; font-weight:600;">📞 Your phone consultation is scheduled</p>
          <p style="margin: 0; color:#5E5A55;"><strong>{_format_date_long(consult_date)}</strong> at <strong>{_format_time_12h(consult_time)}</strong></p>
          <p style="margin: 8px 0 0 0; color:#5E5A55; font-size: 14px;">We'll call you at the number you provided. A calendar invite is attached.</p>
        </div>
        """
    return f"""
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color:#1F1E1C; background:#FBF6EF; padding: 32px; border-radius: 20px;">
      <h1 style="font-family: Georgia, serif; font-weight: 400; font-size: 28px; margin: 0 0 8px 0;">Thank you, {name}.</h1>
      <p style="line-height: 1.6; color:#5E5A55;">We received your {friendly} inquiry and can't wait to look it over. We'll be in touch within 1-2 business days with next steps and any follow-up questions.</p>
      {consult_block}
      <p style="line-height: 1.6; color:#5E5A55; margin-top: 20px;">In the meantime, feel free to browse our gallery or reply to this email with any additional inspiration.</p>
      <p style="margin-top: 24px; color:#6F8F7A; font-style: italic;">— swell design + media</p>
    </div>
    """


def consultation_confirmation_html(name: str, date: str, time: str, ctype: str = "phone") -> str:
    label = {"phone": "phone consultation", "video": "video consultation", "in_person": "in-person consultation"}.get(ctype, "consultation")
    return f"""
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color:#1F1E1C; background:#FBF6EF; padding: 32px; border-radius: 20px;">
      <h1 style="font-family: Georgia, serif; font-weight: 400; font-size: 28px; margin: 0 0 8px 0;">You're on the calendar, {name}!</h1>
      <p style="line-height: 1.6; color:#5E5A55;">Your <strong>{label}</strong> is confirmed for <strong>{_format_date_long(date)}</strong> at <strong>{_format_time_12h(time)}</strong>.</p>
      <p style="line-height: 1.6; color:#5E5A55;">A calendar invite is attached to this email — tap it to add to your calendar.</p>
      <p style="line-height: 1.6; color:#5E5A55;">If anything changes, just reply to this email and we'll reschedule with pleasure.</p>
      <p style="margin-top: 24px; color:#6F8F7A; font-style: italic;">— swell design + media</p>
    </div>
    """


def owner_new_inquiry_html(name: str, email: str, phone: str, event_type: str, consult_date: str = "", consult_time: str = "", admin_url: str = "") -> str:
    friendly = (event_type or "celebration").replace("_", " ")
    consult_block = ""
    if consult_date and consult_time:
        consult_block = f"""
        <p style="margin: 8px 0; padding: 10px 14px; background:#EFEAE1; border-radius: 8px;">
          📞 <strong>Phone consult booked</strong>: {_format_date_long(consult_date)} at {_format_time_12h(consult_time)}
        </p>
        """
    admin_link = f'<p style="margin-top: 20px;"><a href="{admin_url}" style="color:#6F8F7A;">View in admin →</a></p>' if admin_url else ""
    return f"""
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color:#1F1E1C; background:#FBF6EF; padding: 24px; border-radius: 16px;">
      <h2 style="font-family: Georgia, serif; font-weight: 400; font-size: 22px; margin: 0 0 10px 0;">New inquiry — {name}</h2>
      <p style="margin: 4px 0; color:#5E5A55;"><strong>Event:</strong> {friendly}</p>
      <p style="margin: 4px 0; color:#5E5A55;"><strong>Email:</strong> <a href="mailto:{email}" style="color:#6F8F7A;">{email}</a></p>
      <p style="margin: 4px 0; color:#5E5A55;"><strong>Phone:</strong> {phone or '—'}</p>
      {consult_block}
      {admin_link}
    </div>
    """
