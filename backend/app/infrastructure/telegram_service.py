"""Telegram Service for sending notifications to the administrator."""

import logging
import httpx
from app.infrastructure.config import get_settings

logger = logging.getLogger(__name__)

class TelegramService:
    """Service to send messages via Telegram Bot API."""

    def __init__(self):
        settings = get_settings()
        self.bot_token = settings.telegram_bot_token
        self.chat_id = settings.telegram_chat_id
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"

    async def send_message(self, text: str) -> bool:
        """Send a text message to the configured chat ID."""
        if not self.bot_token or not self.chat_id:
            logger.warning("Telegram notification skipped: credentials not configured.")
            return False

        url = f"{self.base_url}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML"
        }

        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, timeout=10.0)
                res.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {e}")
            return False

    async def notify_new_ticket(self, user_email: str, user_name: str, subject: str, message: str):
        """Send a formatted notification for a new support ticket."""
        text = (
            f"🆘 <b>Новое обращение в поддержку!</b>\n\n"
            f"👤 <b>От кого:</b> {user_name} ({user_email})\n"
            f"📌 <b>Тема:</b> {subject}\n\n"
            f"💬 <b>Сообщение:</b>\n{message}\n\n"
            f"<i>Интерфейс админа: KedenFlow Admin</i>"
        )
        await self.send_message(text)

    async def notify_new_registration(self, user_email: str, display_name: str):
        """Send a notification when a new user registers and awaits approval."""
        text = (
            f"🆕 <b>Новая регистрация!</b>\n\n"
            f"👤 <b>Имя:</b> {display_name}\n"
            f"📧 <b>Email:</b> {user_email}\n\n"
            f"⏳ Аккаунт ожидает подтверждения.\n"
            f"Откройте <b>Admin → Заявки</b> чтобы одобрить."
        )
        await self.send_message(text)
