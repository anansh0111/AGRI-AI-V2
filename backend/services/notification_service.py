"""
Email notification service.
Sends email alerts for critical anomalies.
Configure EMAIL_FROM and EMAIL_PASSWORD in .env to enable.
App works fine without email configured.
"""
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

EMAIL_FROM     = os.getenv("EMAIL_FROM",     "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
SMTP_HOST      = os.getenv("SMTP_HOST",      "smtp.gmail.com")
SMTP_PORT      = int(os.getenv("SMTP_PORT",  "587"))
ALERT_EMAIL    = os.getenv("ALERT_EMAIL",    "")


class NotificationService:

    async def send_alert(self, field_id, anomaly: str, severity: str):
        logger.warning(f"ALERT [{severity.upper()}] field={field_id} | {anomaly}")

        if severity == "critical" and EMAIL_FROM and ALERT_EMAIL and EMAIL_PASSWORD:
            try:
                self._send_email(
                    subject=f"CRITICAL Farm Alert: {anomaly}",
                    body=(
                        f"CRITICAL ALERT DETECTED\n\n"
                        f"Field:    {field_id}\n"
                        f"Issue:    {anomaly}\n"
                        f"Severity: CRITICAL\n\n"
                        f"Please check your dashboard immediately:\n"
                        f"http://localhost:3000"
                    ),
                )
            except Exception as e:
                logger.warning(f"Email failed: {e}")

    def _send_email(self, subject: str, body: str):
        msg             = MIMEMultipart()
        msg["From"]     = EMAIL_FROM
        msg["To"]       = ALERT_EMAIL
        msg["Subject"]  = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_FROM, EMAIL_PASSWORD)
            server.send_message(msg)

        logger.info(f"Alert email sent to {ALERT_EMAIL}")
