import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        logger.info("[email] SMTP not configured, skipping send to %s (%s)", to, subject)
        return False
    try:
        port = int(os.environ.get("SMTP_PORT", "587"))
        user = os.environ.get("SMTP_USER", "")
        password = os.environ.get("SMTP_PASS", "")
        from_email = os.environ.get("SMTP_FROM", user or "hello@swelldesignla.com")
        from_name = os.environ.get("SMTP_FROM_NAME", "swell design + media")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to
        if text:
            msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            try:
                server.starttls()
                server.ehlo()
            except Exception:
                pass
            if user and password:
                server.login(user, password)
            server.sendmail(from_email, [to], msg.as_string())
        logger.info("[email] Sent to %s: %s", to, subject)
        return True
    except Exception as e:
        logger.warning("[email] Failed to send to %s: %s", to, e)
        return False


def inquiry_confirmation_html(name: str, event_type: str) -> str:
    friendly = event_type.replace("_", " ") if event_type else "celebration"
    return f"""
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color:#1F1E1C; background:#FBF6EF; padding: 32px; border-radius: 20px;">
      <h1 style="font-family: Georgia, serif; font-weight: 400; font-size: 28px; margin: 0 0 8px 0;">Thank you, {name}.</h1>
      <p style="line-height: 1.6; color:#5E5A55;">We received your {friendly} inquiry and can't wait to look it over. We'll be in touch within 1-2 business days with next steps and any follow-up questions.</p>
      <p style="line-height: 1.6; color:#5E5A55;">In the meantime, feel free to browse our gallery or reply to this email with any additional inspiration.</p>
      <p style="margin-top: 24px; color:#6F8F7A; font-style: italic;">— swell design + media</p>
    </div>
    """


def consultation_confirmation_html(name: str, date: str, time: str, ctype: str) -> str:
    label = {"phone": "phone consultation", "video": "video consultation", "in_person": "in-person consultation"}.get(ctype, "consultation")
    return f"""
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color:#1F1E1C; background:#FBF6EF; padding: 32px; border-radius: 20px;">
      <h1 style="font-family: Georgia, serif; font-weight: 400; font-size: 28px; margin: 0 0 8px 0;">You're on the calendar, {name}!</h1>
      <p style="line-height: 1.6; color:#5E5A55;">Your <strong>{label}</strong> is confirmed for <strong>{date}</strong> at <strong>{time}</strong>.</p>
      <p style="line-height: 1.6; color:#5E5A55;">If anything changes, just reply to this email and we'll reschedule with pleasure.</p>
      <p style="margin-top: 24px; color:#6F8F7A; font-style: italic;">— swell design + media</p>
    </div>
    """
