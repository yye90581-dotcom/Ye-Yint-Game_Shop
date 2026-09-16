function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export default {
  async fetch(request, env) {

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    const url = new URL(request.url);

    if (url.pathname !== "/api/order") {
      return new Response("Y2 Game Shop API OK");
    }

    if (request.method !== "POST") {
      return json({
        ok: false,
        error: "POST method only"
      }, 405);
    }

    try {
      const form = await request.formData();

      const game = String(form.get("game") || "");
      const pack = String(form.get("package") || "");
      const playerId = String(form.get("playerId") || "");
      const serverId = String(form.get("serverId") || "");
      const phone = String(form.get("phone") || "");
      const quantity = String(form.get("quantity") || "1");
      const paymentMethod = String(form.get("paymentMethod") || "");

      const slip = form.get("paymentSlip");

      if (!game || !pack || !playerId || !serverId || !phone) {
        return json({
          ok: false,
          error: "Order အချက်အလက် မပြည့်စုံပါ"
        }, 400);
      }

      if (!paymentMethod) {
        return json({
          ok: false,
          error: "Payment Method ရွေးပါ"
        }, 400);
      }

      if (!slip || typeof slip === "string") {
        return json({
          ok: false,
          error: "Payment Slip တင်ပါ"
        }, 400);
      }

      if (slip.size > 5 * 1024 * 1024) {
        return json({
          ok: false,
          error: "Payment Slip 5MB ထက်မကြီးရပါ"
        }, 400);
      }

      // Secret name အမျိုးမျိုးကို စစ်ပေးမယ်
      const BOT_TOKEN =
        env.TELEGRAM_BOT_TOKEN ||
        env.TELEGRAM_TOKEN ||
        env.BOT_TOKEN;

      const CHAT_ID =
        env.TELEGRAM_CHAT_ID ||
        env.ADMIN_CHAT_ID ||
        env.CHAT_ID;

      if (!BOT_TOKEN) {
        return json({
          ok: false,
          error: "Telegram Bot Token Secret မတွေ့ပါ"
        }, 500);
      }

      if (!CHAT_ID) {
        return json({
          ok: false,
          error: "Telegram Chat ID Secret မတွေ့ပါ"
        }, 500);
      }

      const text =
`🛒 NEW Y2 GAME SHOP ORDER

🎮 Game: ${game}
📦 Package: ${pack}
👤 Game ID: ${playerId}
🌐 Server ID: ${serverId}
🔢 Quantity: ${quantity}
📱 Phone: ${phone}

💳 Payment Method: ${paymentMethod}

🧾 Payment Slip Attached`;

      const tgForm = new FormData();

      tgForm.append("chat_id", CHAT_ID);
      tgForm.append(
        "photo",
        slip,
        slip.name || "payment-slip.jpg"
      );
      tgForm.append("caption", text);

      const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
        {
          method: "POST",
          body: tgForm
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        return json({
          ok: false,
          error: "Telegram Error: " +
            (result.description || "Unknown Telegram error")
        }, 500);
      }

      return json({
        ok: true
      });

    } catch (error) {
      return json({
        ok: false,
        error: "Server Error: " + error.message
      }, 500);
    }
  }
};
