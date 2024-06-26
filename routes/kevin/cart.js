import express from "express";
import db from "../../utils/mysql2-connect.js";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import Base64 from "crypto-js/enc-base64.js";
import pkg from "crypto-js";
const { HmacSHA256 } = pkg;
const {
  LINEPAY_CHANNEL_ID,
  LINEPAY_VERSION,
  LINEPAY_SITE,
  LINEPAY_CHANNEL_SECRET_KEY,
  LINEPAY_RETURN_HOST,
  LINEPAY_RETURN_CONFIRM_URL,
  LINEPAY_RETURN_CANCEL_URL,
} = process.env;

const router = express.Router();
// 拿到會員資料
router.get("/member-info/:mid", async (req, res) => {
  const mid = req.params.mid || "";

  try {
    const sql = `SELECT * FROM mb_user WHERE id = ?`;
    const [rows] = await db.query(sql, [mid]);
    if (!rows.length) {
      return res.json({ success: false });
    }
    const row = rows[0];
    res.json({ success: true, row });
  } catch (ex) {
    console.log(ex);
  }
});

// 訂單資訊
router.get("/api/purchase-order", async (req, res) => {
  const poid = req.query.poid || "";
  // console.log(poid)

  try {
    const sql = `SELECT * FROM ca_purchase_order WHERE purchase_order_id = ?`;
    const [rows] = await db.query(sql, [poid]);
    if (!rows.length) {
      return res.json({ success: false });
    }
    const row = rows[0];

    res.json({ success: true, row });
  } catch (ex) {
    console.log(ex);
  }
});

// 訂單明細
router.get("/api/order-detail", async (req, res) => {
  const poid = req.query.poid || "";
  // console.log(poid)
  try {
    const sql = `SELECT * FROM ca_order_detail od
    JOIN ca_purchase_order po ON po.sid = od.purchase_order_sid
    LEFT JOIN ca_products p ON p.pid = od.pid
    WHERE po.purchase_order_id = ?`;
    const [rows] = await db.query(sql, [poid]);
    if (!rows.length) {
      return res.json({ success: false });
    }

    res.json({ success: true, rows });
  } catch (ex) {
    console.log(ex);
  }
});

router.post("/add-purchase-order", async (req, res) => {
  const output = {
    success: false,
    postData: req.body,
    exception: "",
    purchase_order_id: "",
  };
  // console.log(req.body)

  const {
    member_id,
    recipient,
    recipient_mobile,
    store_id,
    store_name,
    shipping_method,
    shipping_fee,
    total_amount,
    payment_method,
    products,
  } = req.body;

  // Start a transaction: 操作兩個 sql 加入兩個資料表
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // Start a transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    const purchaseOrderSql =
      "INSERT INTO `ca_purchase_order`(`purchase_order_id`, `member_id`, `recipient`, `recipient_mobile`, `store_id`, `store_name`, `shipping_method`, `shipping_fee`, `total_amount`, `payment_method`, `payment_status`, `status`, `created_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '未付款', '訂單處理中', NOW())";

    const PurchaseOrderId = uuidv4().replace(/-/g, "");

    // 會拿到 promise 所以要用 await，加到資料庫會是陣列
    const [result] = await connection.query(purchaseOrderSql, [
      PurchaseOrderId,
      member_id,
      recipient,
      recipient_mobile,
      store_id,
      store_name,
      shipping_method,
      shipping_fee,
      total_amount,
      payment_method,
    ]);

    const purchaseOrderSid = result.insertId;

    const productOrderDetailSql =
      "INSERT INTO `ca_order_detail`( `purchase_order_sid`, `pid`, `price`, `qty`, `total_price`, `is_comment`) VALUES ( ?, ?, ?, ?, ?, ?)";

    for (let product of products) {
      const { pid, qty, price } = product;
      const amount = qty * price;

      await connection.query(productOrderDetailSql, [
        purchaseOrderSid,
        pid,
        price,
        qty,
        amount,
        0,
      ]);
    }

    // Commit the transaction
    await connection.commit();

    output.result = result;
    output.success = !!result.affectedRows;
    output.purchase_order_id = PurchaseOrderId;
  } catch (ex) {
    // Rollback the transaction in case of an error
    await connection.rollback();
    output.exception = ex;
  } finally {
    // Release the connection
    connection.release();
  }

  res.json(output);
});
// 7-11 店到店：與資料庫無關，單純轉向使用
const callback_url = process.env.SHIP_711_STORE_CALLBACK_URL;

router.post("/711", function (req, res) {
  // console.log(req.body);
  res.redirect(callback_url + "?" + new URLSearchParams(req.body).toString());
  // const queryString = QueryString.stringify(req.body)
  // console.log(queryString)
  // res.redirect(callback_url + '?' + queryString)
});

//linepay

//測試訂單

router.post("/createLinePayOrder", async (req, res) => {
  const { orderId, linePayOrder, total_amount } = req.body;
  // const packageId = uuidv4()

  linePayOrder.orderId = orderId;
  linePayOrder.amount = total_amount;
  // linePayOrder.packages.id = packageId


  try {
    const linePayBody = {
      ...linePayOrder,
      // ...orders,
      redirectUrls: {
        confirmUrl: `${LINEPAY_RETURN_HOST}${LINEPAY_RETURN_CONFIRM_URL}`,
        cancelUrl: `${LINEPAY_RETURN_HOST}${LINEPAY_RETURN_CANCEL_URL}`,
      },
    };
    // console.log(linePayBody);

    const uri = "/payments/request";
    const headers = createSignature(uri, linePayBody);

    // 準備送給 LINE Pay 的資訊
    // console.log(linePayBody, headers)
    const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`; // 發出請求的路徑

    const linePayRes = await axios.post(url, linePayBody, { headers });
    // console.log("linePayResDataInfo", linePayRes.data);

    if (linePayRes?.data?.returnCode === "0000") {
      res.json(linePayRes?.data?.info?.paymentUrl.web);
      // res.redirect(linePayRes?.data?.info.paymentUrl.web) //cors error 不能直接讓前端轉址
    }
  } catch (error) {
    console.log(error);
    // 錯誤的回饋
    res.end();
  }
});

// 本地端頁面，轉回來的路由
router.get("/linePay/confirm", async (req, res) => {
  const { transactionId, orderId } = req.query;
  // console.log(transactionId, orderId);

  const sql = `SELECT * FROM ca_purchase_order WHERE purchase_order_id = ?`;
  const [rows] = await db.query(sql, [orderId]);

  if (!rows.length) {
    return res.json({ success: false });
  }
  const row = rows[0];
  // console.log('row:', row)

  try {
    // 比對本地端訂單
    const linePayBody = {
      amount: row.total_amount,
      currency: "TWD",
    };
    const uri = `/payments/${transactionId}/confirm`;
    const headers = createSignature(uri, linePayBody);

    const url = `${LINEPAY_SITE}/${LINEPAY_VERSION}${uri}`;
    const linePayRes = await axios.post(url, linePayBody, { headers });
    // console.log('linePayRes', linePayRes)

    // 付款成功後
    if (linePayRes?.data?.returnCode === "0000") {
      // 1.更新訂單 payment_status:已付款
      const updatePoStatusSql =
        'UPDATE `ca_purchase_order` SET `payment_status` = "已付款" WHERE `purchase_order_id` = ?';

      const [result] = await db.query(updatePoStatusSql, [orderId]);

      if (result.affectedRows > 0) {
        
        return res.json({
          success: true,
          lineResult: linePayRes?.data?.returnCode,
          updatePaymentStatus: { success: true },
        });
      } else {
        return res.json({
          success: false,
          lineResult: linePayRes?.data?.returnCode,
          updatePaymentStatus: {
            success: false,
            error: "Failed to update payment status",
          },
        });
      }
    } else {
      return res.json({
        success: false,
        lineResult: linePayRes?.data?.returnCode,
        error: "LinePay API returned an error",
      });
    }
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      error: "An error occurred while processing the payment",
    });
  }
});

// LinePay function：創建 Line Pay 簽章
function createSignature(uri, linePayBody) {
  const nonce = parseInt(new Date().getTime() / 1000);
  const string = `${LINEPAY_CHANNEL_SECRET_KEY}/${LINEPAY_VERSION}${uri}${JSON.stringify(
    linePayBody
  )}${nonce}`;

  const signature = Base64.stringify(
    HmacSHA256(string, LINEPAY_CHANNEL_SECRET_KEY)
  );

  const headers = {
    "X-LINE-ChannelId": LINEPAY_CHANNEL_ID,
    "Content-Type": "application/json",
    "X-LINE-Authorization-Nonce": nonce,
    "X-LINE-Authorization": signature,
  };
  return headers;
}

export default router;
