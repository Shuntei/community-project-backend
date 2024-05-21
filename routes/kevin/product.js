import express from "express";
import db from "../../utils/mysql2-connect.js";
import dayjs from "dayjs";

const router = express.Router();

const getListData = async (req, res) => {
  let page = +req.query.page || 1; //用戶要求查看第幾頁
  let where = " WHERE 1 "; //後面不確定有幾個搜尋條件

  // 關鍵字搜尋
  let keyword =
    req.query.keyword && typeof req.query.keyword === "string"
      ? req.query.keyword.trim()
      : ""; //處理送進來的資料
  let keywordEsc = db.escape(`%${keyword}%`); // 跳脫，避免SQL injection

  // 主分類篩選
  let main_category =
    req.query.main_category && typeof req.query.main_category === "string"
      ? req.query.main_category
      : "";
  let categoryEsc = db.escape(`${main_category}`);

  // 副分類篩選
  let sub_category =
    req.query.sub_category && typeof req.query.sub_category === "string"
      ? req.query.sub_category
      : "";
  let sub_categoryEsc = db.escape(`${sub_category}`);

  // 價格由高到低、低到高、最新上架
  let sortBy =
    req.query.sortBy && typeof req.query.sortBy === "string"
      ? req.query.sortBy.trim()
      : "";

  if (keyword) {
    where += ` AND ( \`name\` LIKE ${keywordEsc})`;
  }
  if (main_category) {
    where += ` AND (category_id = ${categoryEsc})`;
  }

  if (sub_category) {
    where += ` AND (sub_category_id = ${sub_categoryEsc})`;
  }

  if (sortBy) {
    if (sortBy === "priceFromHighToLow") {
      where += ` ORDER BY \`price\` DESC `;
    } else if (sortBy === "priceFromLowToHigh") {
      where += ` ORDER BY \`price\` ASC `;
    } else if (sortBy === "latest") {
      where += ` ORDER BY \`create_at\` ASC `;
    }
  } else {
    where += ` ORDER BY \`create_at\` ASC `;
  }

  if (page < 1) {
    return { success: false, redirect: "?page=1" };
  }
  const perPage = 8; //每頁幾筆
  const t_sql = `SELECT COUNT(1) totalRows FROM ca_products ${where}`;
  const [[{ totalRows }]] = await db.query(t_sql);

  let rows = []; // 預設值
  let totalPages = 0;
  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      return { success: false, redirect: `?page=${totalPages}` };
    }
    const sql = `SELECT * FROM ca_products 
    ${where}
    LIMIT ${(page - 1) * perPage}, ${perPage}`;
    [rows] = await db.query(sql);
  }
  return {
    success: true,
    totalRows,
    totalPages,
    page,
    perPage,
    rows,
    query: req.query,
  };
};

// 取得商品所有資料
router.get("/api", async (req, res) => {
  res.json(await getListData(req));
});

// 取得單筆商品資料
router.get("/api/getProduct/:pid", async (req, res) => {
  const pid = +req.params.pid;

  const sql = `SELECT * FROM ca_products WHERE pid=?`;
  const [rows] = await db.query(sql, [pid]);
  if (!rows.length) {
    return res.json({ success: false });
  }
  const row = rows[0];

  res.json({ success: true, row });
});

//取得商品評價
const getComment = async (req) => {
  let pid = +req.params.pid;
  let where = ` WHERE 1 AND pc.pid = ?`;
  let totalRows = 0;
  let rows = [];

  let output = {
    success: false,
    rows,
    totalRows,
    redirect: "",
    info: "",
  };

  // const t_sql = `SELECT COUNT(1) totalRows FROM ca_product_comment  ${where} `;
  const t_sql =`SELECT COUNT(1) totalRows FROM ca_product_comment pc JOIN ca_products p ON pc.pid = p.pid LEFT JOIN mb_user m ON m.id = pc.member_id ${where} ORDER BY pc.create_at DESC`;

  [[{ totalRows }]] = await db.query(t_sql, [pid]);

  if (totalRows > 0) {
    const sql = `SELECT * FROM ca_product_comment pc LEFT JOIN mb_user m ON m.id = pc.member_id ${where} ORDER BY pc.create_at DESC`;
    // const sql = `SELECT p.pid, pc.pid, pc.score, pc.comment, pc.mid, pc.create_at, m.username FROM ca_product_comment pc LEFT JOIN ca_products p ON pc.pid = p.pid LEFT JOIN mb_user m ON m.id = pc.member_id ${where} ORDER BY pc.create_at DESC`
    [rows] = await db.query(sql, [pid]);
    output = { ...output, success: true, rows, totalRows };
  }

  return output;
};
router.get("/api/getProductComment/:pid", async (req, res) => {
  res.json(await getComment(req));
});

// 相關商品區：取得 10 筆同類別商品 row.sub_category
router.get("/api/relatedProducts", async (req, res) => {
  const sub_category = +req.query.sub_category || 2;
  const pid = +req.query.pid || 1;
  const sql =
    "SELECT * FROM `ca_products` WHERE `sub_category_id` = ? AND `pid` != ? LIMIT 20 ";

  const [rows] = await db.query(sql, [sub_category, pid]);
  if (!rows.length) {
    return res.json({ success: false });
  }

  res.json({ success: true, rows });
});

// 相關商品區：取得 全部商品 row.sub_category
router.get("/api/allProducts", async (req, res) => {
  const sub_category = +req.query.sub_category || 2;
  const pid = +req.query.pid || 1;
  const sql =
    "SELECT * FROM `ca_products` ";

  const [rows] = await db.query(sql, [sub_category, pid]);
  if (!rows.length) {
    return res.json({ success: false });
  }

  res.json({ success: true, rows });
});

// 取得全部歷史訂單
router.get("/api/getAllPo/:mid", async (req, res) => {
  let output = {
    success: false,
    rows: [],
  };
  // 取得 member_id 去搜尋
  const mid = req.params.mid;

  const sql =
    "SELECT `sid`, `purchase_order_id`, `member_id`, `total_amount`, `payment_status`, `status`, `created_at` FROM `ca_purchase_order` WHERE `member_id` = ? ORDER BY created_at DESC";

  const [rows] = await db.query(sql, [mid]);
  if (!rows.length) {
    return res.json({ success: false });
  }

  res.json({ success: true, rows });
});

// 取得歷史訂單 - status:訂單處理中
router.get("/api/getOngoingPo/:mid", async (req, res) => {
  let output = {
    success: false,
    rows: [],
  };
  // 取得 member_id 去搜尋
  const mid = req.params.mid;

  const sql =
    "SELECT `sid`, `purchase_order_id`, `member_id`, `total_amount`, `payment_status`, `status`, `created_at` FROM `ca_purchase_order` WHERE `member_id` = ? AND (`status` = '訂單處理中' OR `status` = '運送中' OR `status` = '待取貨') ORDER BY created_at DESC";

  const [rows] = await db.query(sql, [mid]);
  if (!rows.length) {
    return res.json({ success: false });
  }

  res.json({ success: true, rows });
});

// 取得歷史訂單 - status:已完成
router.get("/api/getCompletedPo/:mid", async (req, res) => {
  let output = {
    success: false,
    rows: [],
  };
  // 取得 member_id 去搜尋
  const mid = req.params.mid;

  const sql =
    "SELECT `sid`, `purchase_order_id`, `member_id`, `total_amount`, `payment_status`, `status`, `created_at` FROM `ca_purchase_order` WHERE `member_id` = ? AND `status` = '已完成' ORDER BY created_at DESC";

  const [rows] = await db.query(sql, [mid]);
  if (!rows.length) {
    return res.json({ success: false });
  }

  res.json({ success: true, rows });
});

// 新增商品評論
router.post("/product-comment", async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
    add_comment: false,

    update_comment_result: false,
    exception: "",
  };

  try {
    const { pid, member_id, purchase_order_id, score, comment } = req.body;

    // 1. 新增評論
    const addCommentSql =
      "INSERT INTO `ca_product_comment`(`pid`, `member_id`, `purchase_order_id`, `score`, `comment`, `create_at`) VALUES (?, ?, ?, ?, ?, NOW())";

    const [addCommentResult] = await db.query(addCommentSql, [
      pid,
      member_id,
      purchase_order_id,
      score,
      comment,
    ]);

    output.add_comment = !!addCommentResult.affectedRows;
    if (addCommentResult.affectedRows) {
      try {
        // 3. 更新 order_detail 的評論紀錄
        const updateCommentRecordSql = `UPDATE ca_order_detail od
          JOIN ca_purchase_order po ON od.purchase_order_sid = po.sid
          SET od.is_comment = 1
          WHERE od.pid = ? AND po.purchase_order_id = ?`;

        const [updateCommentResult] = await db.query(updateCommentRecordSql, [
          pid,
          purchase_order_id,
        ]);

        output.update_comment_result = !!updateCommentResult.affectedRows;
        output.success = !!addCommentResult.affectedRows;
      } catch (ex) {
        output.exception = ex;
      }
    }
  } catch (ex) {
    output.exception = ex;
  }

  res.json(output);
});

//取得收藏商品
router.get("/product-fav/:mid", async (req, res) => {
  let output = {
    success: false,
    rows: [],
  };
  // 取得 member_id 去搜尋
  const mid = req.params.mid;

  const sql =
    "SELECT `like_id`, `mid`, `pid` FROM `ca_product_like` WHERE `mid` = ? ";

  const [rows] = await db.query(sql, [mid]);
  if (!rows.length) {
    return res.json({ success: false });
  }

  res.json({ success: true, rows });
})

// 商品加入收藏
router.post('/add-product-fav', async (req, res) => {
  const output = {
    success: false,
    postData: req.body,
  }
  const { member_id, product_sid } = req.body

  try {
    const sql = `
    INSERT INTO product_collection(member_id, product_sid) VALUES (?, ?)
    `
    const [result] = await db.query(sql, [member_id, product_sid])

    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    console.log(ex)
  }

  return res.json(output)
})

// 商品移除收藏
router.post('/remove-product-fav', async (req, res) => {
  const output = {
    success: false,
    postData: req.body,
  }
  const { member_id, product_sid } = req.body

  try {
    const sql = `
    DELETE FROM product_collection WHERE member_id = ? AND product_sid = ?
    `
    const [result] = await db.query(sql, [member_id, product_sid])

    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    console.log(ex)
  }

  return res.json(output)
})

export default router;
