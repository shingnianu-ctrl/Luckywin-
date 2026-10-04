const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;
const RUPAYEX_TOKEN = process.env.RUPAYEX_TOKEN;
const BASE_URL = "https://rupayex.net/api";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true, service: "DerbyFashion payment backend" });
});

app.post("/create-order", async (req, res) => {
  try {
    if (!RUPAYEX_TOKEN) return res.status(500).json({ok:false,error:"RUPAYEX_TOKEN is not configured"});
    const { amount, order_id, redirect_url, customer_mobile, remark1 } = req.body || {};
    if (!amount || !order_id || !redirect_url) {
      return res.status(400).json({ok:false,error:"amount, order_id and redirect_url are required"});
    }

    const params = new URLSearchParams({
      user_token: RUPAYEX_TOKEN,
      amount: String(amount),
      order_id: String(order_id),
      redirect_url: String(redirect_url)
    });
    if (customer_mobile) params.set("customer_mobile", String(customer_mobile));
    if (remark1) params.set("remark1", String(remark1));

    const response = await fetch(`${BASE_URL}/create-order`, {
      method: "POST",
      headers: {"Content-Type":"application/x-www-form-urlencoded"},
      body: params.toString()
    });
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = {raw:text}; }
    res.status(response.ok ? 200 : response.status).json(data);
  } catch {
    res.status(500).json({ok:false,error:"Payment provider request failed"});
  }
});

app.get("/order-status", async (req, res) => {
  try {
    if (!RUPAYEX_TOKEN) return res.status(500).json({ok:false,error:"RUPAYEX_TOKEN is not configured"});
    const { order_id } = req.query;
    if (!order_id) return res.status(400).json({ok:false,error:"order_id is required"});

    const params = new URLSearchParams({user_token:RUPAYEX_TOKEN, order_id:String(order_id)});
    const response = await fetch(`${BASE_URL}/order-status?${params.toString()}`);
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = {raw:text}; }
    res.status(response.ok ? 200 : response.status).json(data);
  } catch {
    res.status(500).json({ok:false,error:"Payment provider request failed"});
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`Backend running on port ${PORT}`));
