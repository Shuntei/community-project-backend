import express from "express";
import db from "../../utils/mysql2-connect.js";
import multer from "multer";
import bodyParser from "body-parser";

const router = express.Router();
router.use(bodyParser.json());

// 用來篩選檔案, 並且決定副檔名
// const exts = {
//   "image/png": ".png",
//   "image/jpeg": ".jpg",
//   "image/webp": ".webp",
// };

// const fileFilter = (req, file, callback) => {
//   callback(null, !!exts[file.mimetype]);
// };

// 設定 multer 儲存位置 public/images/borou
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/img");
  },
  filename: (req, file, cb) => {
    const filenojpg = file.originalname.split('.')[0];
    cb(null, filenojpg); // You can customize the filename if needed
  },
});
// Configure multer
const upload = multer({ limits: { fileSize: 1000000 }, storage: storage });

// 取得揪團文章列表
const getTourList = async (req, res) => {
  let page = +req.query.page || 1; //用戶要求查看第幾頁
  let keyword = req.query.keyword || ""; // 設定關鍵字
  let level = req.query.level || 0; // 難易度
  let ePeriod = req.query.ePeriod || 0; // 活動時長
  let area = req.query.area || 0; // 地區北中南東
  let latest = req.query.latest || ""; // 最新揪團
  let soon = req.query.soon || ""; //
  let where = " WHERE 1 "; // 後面不確定有幾個搜尋條件
  let order = "";

  // 搜尋篩選
  if (keyword.trim() !== "") {
    where += ` AND (tour_post.title LIKE '%${keyword}%')`;
  }
  // 揪團主題篩選
  if (req.query.category) {
    where += ` AND tour_location.cid = ${req.query.category}`;
  }

  // 難易度篩選
  if (req.query.level) {
    where += ` AND tour_post.level_id = ${level}`;
  }
  // 活動時長篩選
  if (req.query.ePeriod) {
    if (ePeriod === "一日") {
      where += ` AND tour_post.event_period > 6`; // Greater than 6
    } else if (ePeriod === "半日") {
      where += ` AND tour_post.event_period <= 6`; // Less than or equal to 6
    }
  }
  // 地區篩選
  if (req.query.area) {
    where += ` AND tour_location.area = ${area}`;
  }

  // 最新上架,即創建最晚
  if (latest) {
    order += ` ORDER BY tour_post.created_at DESC`;
  }
  // 最受歡迎

  // 最快出發,即日期最早
  if (soon) {
    order += ` ORDER BY tour_post.event_date`;
  }

  if (page < 1) {
    return { success: false, redirect: "?page=1" };
  }
  const perPage = 20; //每頁幾筆

  const t_sql = `SELECT COUNT(DISTINCT tour_post.tour_id) AS totalRows
  FROM tony_tour_post AS tour_post
  LEFT JOIN tony_tour_location AS tour_location 
  ON tour_post.ruin_id = tour_location.ruin_id
  ${where};`;
  const [[{ totalRows }]] = await db.query(t_sql);

  let rows = []; // 預設值
  let totalPages = 0;
  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      return { success: false, redirect: `?page=${totalPages}` };
    }
    const sql = `
    SELECT tour_post.*, MIN(tour_images.image_url) AS image_url, tour_location.*
    FROM tony_tour_post AS tour_post
    LEFT JOIN tony_tour_images AS tour_images 
    ON tour_post.tour_id = tour_images.tour_id
    LEFT JOIN tony_tour_location AS tour_location 
    ON tour_post.ruin_id = tour_location.ruin_id
    ${where}
    GROUP BY tour_post.tour_id
    ${order}
      LIMIT ${(page - 1) * perPage}, ${perPage};
    `;
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

// 取得單筆文章所需內容
const getTourPost = async (req, tid) => {
  try {
    // 文章列表+圖片+地點(廢墟名)+主題分類
    const sql = `SELECT tour_post.*, tour_images.*, tour_location.*, tour_category.category_name
      FROM tony_tour_post AS tour_post
      LEFT JOIN tony_tour_images AS tour_images 
      ON tour_post.tour_id = tour_images.tour_id
      LEFT JOIN tony_tour_location AS tour_location 
      ON tour_post.ruin_id = tour_location.ruin_id
      LEFT JOIN tony_tour_category AS tour_category
      ON tour_location.cid = tour_category.cid 
      WHERE tour_post.tour_id=?`;

    const [rows] = await db.query(sql, [tid]);
    if (!rows.length) {
      return { success: false };
    }
    const row = rows;

    return { success: true, row };
  } catch (error) {
    return { success: false, message: "Internal server error" };
  }
};

// 會員收藏行程分類
const getFavTourBook = async (req, res) => {
  try {
    const id = req.params.id;
    // 加入第二個 subquery 為每個 tour_id 抓一張照片當封面
    const sql = `SELECT favtour_list.*, favtour_book.book_name, 
    (SELECT image_url 
    FROM tony_tour_images AS tour_images 
    WHERE tour_images.tour_id = favtour_list.tour_id 
    ORDER BY favtour_list.tour_id ASC LIMIT 1 ) AS image_url 
    FROM tony_favtour_list AS favtour_list 
    LEFT JOIN tony_favtour_book AS favtour_book 
    ON favtour_list.bid = favtour_book.bid WHERE favtour_list.user_id = ?`;
    const [rows] = await db.query(sql, id);

    if (!rows.length) {
      return { success: false, message: "no favorite tour found" };
    }
    const row = rows;
    return { success: true, row };
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 收藏細項
const getFavTours = async (bid) => {
  try {
    const sql = `SELECT tour_post.*,  favlist.*,
    (SELECT image_url 
    FROM tony_tour_images AS tour_images 
    WHERE tour_images.tour_id = tour_post.tour_id 
    ORDER BY tour_post.tour_id ASC LIMIT 1 ) AS image_url 
    FROM tony_tour_post AS tour_post
    LEFT JOIN tony_favtour_list AS favlist
    ON tour_post.tour_id = favlist.tour_id
    WHERE favlist.bid = ?`;

    const [rows] = await db.query(sql, bid);

    if (!rows.length) {
      return { success: false };
    }
    const row = rows;

    return { success: true, row };
  } catch (error) {
    return { success: false, message: "Internal server error" };
  }
};

// 新增發文表單資料
const handleAddPost = async (req, res) => {
  const output = {
    success: false,
    formData: req.body,
  };

  try {
    // Extract form data from the request body
    const formData = req.body;
    // Access uploaded images
    const images = req.files;
    console.log(formData);
    console.log(images);
    // Insert data into the 'tony_tour_post' table
    const postSql = `
      INSERT INTO tony_tour_post 
        (user_id, ruin_id, event_date, max_groupsize, event_period, level_id, title, description, content, created_at) 
      VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const postValues = [
      formData.user_id,
      formData.ruin_id,
      formData.event_date,
      formData.max_groupsize,
      formData.event_period,
      formData.level_id,
      formData.title,
      formData.description,
      formData.content,
    ];
    await db.query(postSql, postValues);

    // Get the last inserted tour_id
    const [lastInsertIdRows] = await db.query(
      "SELECT LAST_INSERT_ID() AS tour_id"
    );
    const lastInsertId = lastInsertIdRows[0].tour_id;

    // Insert data into the 'tony_tour_images' table
    const imagesSql = `
      INSERT INTO tony_tour_images
        (tour_id, image_url, image_descrip)
      VALUES
        (?, ?, ?)
    `;

    console.log(req.body);
    for (let i in images) {
      const image = images[i];
      const imagePath = `${image.filename}`; // Path to the uploaded image
      const imageValues = [
        lastInsertId, // Using the last inserted tour_id
        imagePath, // Use the file path of the uploaded image
        req.body.image_descrip[i],
      ];
      await db.query(imagesSql, imageValues);
    }

    output.success = true;
    res.json(output);
  } catch (error) {
    console.error("Error handling form submission:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
// 新增揪團文章加入資料庫, 加上 middleware
router.post("/api/add-post", upload.array('images', 10), async(req, res)=>{
  const data = await handleAddPost(req, res);
  res.json(data);
});

// 修改揪團的表單資料
const handleEditPost = async(req, res)=>{
  const output = {
    success: false,
    formData: req.body,
  };

  try {
    const formData = req.body;
    // const images = req.body.images;
    // const images = req.body.images; // New images uploaded by the user
    const files = req.files; // New images uploaded by the user
    
    // console.log('images:',images);
    // console.log('files:',files.map(v => v.filename));
    // console.log(files);
    // const images = files.map(v => v.filename)
    // console.log(images);
    console.log(formData);

    const postEditSql = `UPDATE tony_tour_post
      SET 
        ruin_id = ?,
        event_date = ?,
        max_groupsize = ?,
        event_period = ?,
        level_id = ?,
        title = ?,
        description = ?,
        content = ?
      WHERE tour_id = ?;`;

    const postEditParams = [
      formData.ruin_id,
      formData.event_date,
      formData.max_groupsize,
      formData.event_period,
      formData.level_id,
      formData.title,
      formData.description,
      formData.content,
      formData.tour_id,
    ];
    await db.query(postEditSql, postEditParams);
    console.log(postEditSql);
    
    // Update tour images
    // 1. Delete existing images for this tour
    const deleteImagesSql = `
      DELETE FROM tony_tour_images WHERE tour_id = ?;
    `;
    await db.query(deleteImagesSql, [formData.tour_id]);

    // 2. Insert new images for this tour
    const insertImagesSql = `
      INSERT INTO tony_tour_images (tour_id, image_url, image_descrip)
      VALUES (?, ?, ?);
    `;
    // Execute insert query for each new image
    

    // for (const image of images) {
    //   await db.query(insertImagesSql, [formData.tour_id, image, image]);
    // }
  //  for (const image of files) {
  //     await db.query(insertImagesSql, [formData.tour_id, image.filename, image.filename]);
  //   }

    await files.map( (v, i) => db.query(insertImagesSql, [formData.tour_id, v.filename, formData.image_descrip[i]]))
 
    output.success = true;
    res.json(output);

  } catch (error) {
    console.error('Error updating tour post:', error);
    output.error = 'Error updating tour post';
    res.status(500).json(output);
  }
}

// 修改揪團文章
// router.put("/api/edit-post/:postId", handleEditPost);
router.put("/api/edit-post/:postId", upload.array('images', 10), async(req, res)=>{
  const data = await handleEditPost(req, res);
  res.json(data);
});


// 刪除揪團文章
router.delete("/api/delete-post/:postId", async (req, res) => {
  const postId = req.params.postId;

  try {
    // Delete associated images from tony_tour_images table
    const deleteImagesSql = "DELETE FROM tony_tour_images WHERE tour_id = ?";
    await db.query(deleteImagesSql, postId);

    // Perform deletion operation on tony_tour_post table
    const deletePostSql = "DELETE FROM tony_tour_post WHERE tour_id = ?";
    const [postDeletionResult] = await db.query(deletePostSql, postId);

    // Check if the post deletion was successful
    if (postDeletionResult.affectedRows > 0) {
      res.json({ success: true, message: "Post and associated images deleted successfully" });
    } else {
      res.json({ success: false, message: "Post not found or already deleted" });
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// 從資料庫取得表單資料
router.get("/api", async (req, res) => {
  try {
    const result = await getTourList(req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// 取得單筆資料
router.get("/api/tourpost/:tid", async (req, res) => {
  const tid = req.params.tid;
  const result = await getTourPost(req, tid);
  res.json(result);
});

// 以會員編號取得發文資料
router.get("/api/get-post/:id", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    message: "",
    data: null,
  };

  const id = req.params.id;
  const sql = `SELECT tour_post.*, MIN(tour_images.image_url) AS image_url
    FROM tony_tour_post AS tour_post
    LEFT JOIN tony_tour_images AS tour_images 
    ON tour_post.tour_id = tour_images.tour_id
    WHERE user_id = ?
    GROUP BY tour_post.tour_id`;
  const [rows] = await db.query(sql, id);

  if (!rows.length) {
    output.code = 1;
    output.message = "There is no tour info";
    return res.json(output);
  }

  output.data = rows;
  output.success = true;

  res.json(output);
});

// 會員收藏行程分類
router.get("/api/favtourbook/:id", async (req, res) => {
  const result = await getFavTourBook(req);
  res.json(result);
});

// 會員收藏細項
router.get("/api/favtours/:bid", async (req, res) => {
  const bid = +req.params.bid;
  console.log("bid", bid);
  const result = await getFavTours(bid);

  res.json(result);
});

// 只是測試路徑頁面
router.get("/test", (req, res) => {
  res.send("<h2>Hi</h2>");
});

export default router;

// 搜尋 台北 的syql語法
// SELECT tour_post.*, MIN(tour_images.image_url) AS image_url
//     FROM tony_tour_post AS tour_post
//     LEFT JOIN tony_tour_images AS tour_images
//     ON tour_post.tour_id = tour_images.tour_id
//     WHERE 1
//     AND (tour_post.title LIKE '%台北%')
//     GROUP BY tour_post.tour_id
//     ORDER BY tour_post.event_date

// 合併 tour_post 和 tour_location.cid, 並且重複的 ruin_id 會顯示
//   SELECT tour_post.*, tour_location.cid
// FROM tony_tour_post AS tour_post
// LEFT JOIN (
//     SELECT ruin_id, cid
//     FROM tony_tour_location
// ) AS tour_location
// ON tour_post.ruin_id = tour_location.ruin_id
// ORDER BY tour_post.event_date ASC;
