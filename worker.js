export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/order" && request.method === "POST") {
      try {
        const data = await request.json();

        const required = ["game", "package", "playerId", "serverId", "phone"];

        if (required.some((key) => !String(data[key] ?? "").trim())) {
          return json(
            { ok: false, error: "အချက်အလက်အားလုံး ဖြည့်ပါ။" },
            400
          );
        }

        // Check Cloudflare Secrets
        if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
          return json(
            {
              ok: false,
              error: "Telegram Secret မတွေ့ပါ။ TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID ကို စစ်ပါ။"
            },
            500
          );
        }

        const text = [
          "🛒 NEW ORDER",
          "",
          `🎮 Game: ${safe(data.game)}`,
          `📦 Package: ${safe(data.package)}`,
          `🆔 Player ID: ${safe(data.playerId)}`,
          `🌐 Server: ${safe(data.serverId)}`,
          `📱 Phone: ${safe(data.phone)}`,
          `⏰ Time: ${new Date().toISOString()}`
        ].join("\n");

        const telegramUrl =
          `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

        const tg = await fetch(telegramUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text
          })
        });

        const tgResult = await tg.json();

        if (!tg.ok || !tgResult.ok) {
          return json(
            {
              ok: false,
              error: `Telegram Error: ${tgResult.description || "Unknown error"}`
            },
            502
          );
        }

        return json({ ok: true });
      } catch (error) {
        return json(
          {
            ok: false,
            error: `Server Error: ${error.message || "Unknown error"}`
          },
          500
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};

function safe(value) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .slice(0, 500);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}
