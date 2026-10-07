const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const RUPAYEX_TOKEN = process.env.RUPAYEX_TOKEN;

const RUPAYEX_URL = "https://rupayex.net/api";

if (!RUPAYEX_TOKEN) {
  console.warn("WARNING: RUPAYEX_TOKEN is not set");
}

/* Home / server test */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "DerbyFashion payment server is running"
  });
});

/* Create RuPayX payment order */
app.post("/create-order", async (req, res) => {
  try {
    if (!RUPAYEX_TOKEN) {
      return res.status(500).json({
        success: false,
        message: "Payment server token is not configured"
      });
    }

    const amount = Number(req.body.amount);
    const customerMobile = String(req.body.customer_mobile || "").trim();

    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
      });
    }

    /*
      Unique order ID
    */
    const orderId =
      "DF-" +
      Date.now() +
      "-" +
      Math.floor(Math.random() * 1000);

    /*
      IMPORTANT:
      Replace this with your actual Render backend URL
      after deployment.
    */
    const publicBaseUrl =
      process.env.PUBLIC_BASE_URL ||
      `https://${process.env.RENDER_EXTERNAL_HOSTNAME || "localhost:3000"}`;

    const redirectUrl =
      `${publicBaseUrl}/payment/callback`;

    const form = new URLSearchParams();

    form.append("amount", amount.toString());
    form.append("order_id", orderId);
    form.append("redirect_url", redirectUrl);

    if (customerMobile) {
      form.append("customer_mobile", customerMobile);
    }

    form.append("remark1", "DerbyFashion Order");

    const response = await fetch(
      `${RUPAYEX_URL}/create-order`,
      {
        method: "POST",
        headers: {
          "X-Api-Token": RUPAYEX_TOKEN,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form.toString()
      }
    );

    const data = await response.json();

    console.log("RuPayX response:", data);

    if (!response.ok || !data.status) {
      return res.status(400).json({
        success: false,
        message: data.message || "Unable to create payment order",
        provider_response: data
      });
    }

    /*
      Send payment_url to DerbyFashion frontend
    */
    return res.json({
      success: true,
      order_id: data.order_id || orderId,
      amount: data.amount || amount,
      payment_url: data.payment_url,
      provider_response: data
    });

  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment server error"
    });
  }
});

/* Payment callback / webhook */
app.post("/payment/callback", async (req, res) => {
  try {
    console.log("Payment callback received:", req.body);

    const orderId = req.body.order_id;

    if (!orderId) {
      return res.status(400).send("Invalid callback");
    }

    /*
      Payment status should be verified with RuPayX
      instead of trusting callback alone.
    */

    const statusUrl =
      `${RUPAYEX_URL}/order-status` +
      `?user_token=${encodeURIComponent(RUPAYEX_TOKEN)}` +
      `&order_id=${encodeURIComponent(orderId)}`;

    const response = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "X-Api-Token": RUPAYEX_TOKEN
      }
    });

    const statusData = await response.json();

    console.log("Verified payment status:", statusData);

    return res.json({
      success: true,
      order_id: orderId,
      payment_status: statusData.payment_status || statusData.status,
      provider_response: statusData
    });

  } catch (error) {
    console.error("Callback error:", error);

    return res.status(500).json({
      success: false,
      message: "Callback verification failed"
    });
  }
});

/* Check order status from frontend */
app.get("/order-status", async (req, res) => {
  try {
    const orderId = String(req.query.order_id || "").trim();

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "order_id is required"
      });
    }

    if (!RUPAYEX_TOKEN) {
      return res.status(500).json({
        success: false,
        message: "Payment server token is not configured"
      });
    }

    const url =
      `${RUPAYEX_URL}/order-status` +
      `?user_token=${encodeURIComponent(RUPAYEX_TOKEN)}` +
      `&order_id=${encodeURIComponent(orderId)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Api-Token": RUPAYEX_TOKEN
      }
    });

    const data = await response.json();

    return res.json({
      success: true,
      provider_response: data
    });

  } catch (error) {
    console.error("Order status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check payment status"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`DerbyFashion payment server running on port ${PORT}`);
});